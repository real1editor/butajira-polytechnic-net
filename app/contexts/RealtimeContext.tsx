"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/app/contexts/AuthContext";

export type LiveStatus = "connecting" | "connected" | "disconnected" | "error" | "signed-out";

type RealtimeContextValue = {
  status: LiveStatus;
  connected: boolean;
  /** Increments (debounced) after any live data change. Depend on this to refetch. */
  version: number;
  lastEventAt: number | null;
};

const RealtimeContext = createContext<RealtimeContextValue>({
  status: "connecting",
  connected: false,
  version: 0,
  lastEventAt: null,
});

const TABLES = ["assets", "ports", "cables", "maintenance_logs", "profiles"] as const;

/**
 * One shared Supabase Realtime channel for the whole app.
 *
 * Any change to a watched table bumps `version`, so data screens can simply
 * depend on it to refetch — no per-page subscriptions or duplicate sockets.
 * Bursts of events are coalesced to one refetch every ~400ms.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [live, setLive] = useState<{ userId: string | null; status: LiveStatus }>({
    userId: null,
    status: "connecting",
  });
  const [version, setVersion] = useState(0);
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);

  const bump = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setVersion((value) => value + 1);
      setLastEventAt(Date.now());
    }, 400);
  }, []);

  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel(`bpc-live-${userId}`);

    for (const table of TABLES) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        () => bump()
      );
    }

    channel.subscribe((next) => {
      const status: LiveStatus =
        next === "SUBSCRIBED"
          ? "connected"
          : next === "CHANNEL_ERROR" || next === "TIMED_OUT"
            ? "error"
            : next === "CLOSED" || next === "LEFT"
              ? "disconnected"
              : "connecting";
      setLive({ userId, status });
    });

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      supabase.removeChannel(channel);
    };
  }, [bump, userId]);

  const status: LiveStatus = userId
    ? live.userId === userId
      ? live.status
      : "connecting"
    : "signed-out";

  const value = useMemo<RealtimeContextValue>(
    () => ({
      status,
      connected: status === "connected",
      version,
      lastEventAt,
    }),
    [lastEventAt, status, version]
  );

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>;
}

export const useRealtime = () => useContext(RealtimeContext);

/** Convenience hook for screens that only need a refetch trigger. */
export function useLiveVersion(): number {
  return useContext(RealtimeContext).version;
}
