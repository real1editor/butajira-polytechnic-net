"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ToastType = "success" | "error" | "info";

export type ToastItem = {
  id: number;
  message: string;
  type: ToastType;
  duration: number;
};

type ToastOptions = {
  type?: ToastType;
  duration?: number;
};

type ToastContextValue = {
  items: ToastItem[];
  toast: (message: string, options?: ToastOptions) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
  dismiss: (id: number) => void;
};

const ToastContext = createContext<ToastContextValue>({
  items: [],
  toast: () => {},
  success: () => {},
  error: () => {},
  info: () => {},
  dismiss: () => {},
});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, options?: ToastOptions) => {
      const id = ++nextId.current;
      const item: ToastItem = {
        id,
        message,
        type: options?.type ?? "info",
        duration: options?.duration ?? 4000,
      };
      setItems((prev) => [...prev.slice(-3), item]);
    },
    []
  );

  const success = useCallback(
    (message: string) => toast(message, { type: "success", duration: 3500 }),
    [toast]
  );
  const error = useCallback(
    (message: string) => toast(message, { type: "error", duration: 6000 }),
    [toast]
  );
  const info = useCallback(
    (message: string) => toast(message, { type: "info", duration: 4000 }),
    [toast]
  );

  const value = useMemo(
    () => ({ items, toast, success, error, info, dismiss }),
    [items, toast, success, error, info, dismiss]
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export const useToast = () => useContext(ToastContext);