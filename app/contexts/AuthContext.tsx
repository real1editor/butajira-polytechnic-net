"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export type UserRole = "admin" | "technician" | "viewer";

export type Profile = {
  id: string;
  role: UserRole;
  display_name: string | null;
  created_at: string;
};

type AuthContextType = {
  user: { id: string; email: string | null } | null;
  profile: Profile | null;
  role: UserRole;
  canManage: boolean;
  canDelete: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  role: "viewer",
  canManage: false,
  canDelete: false,
  loading: true,
  signIn: async () => null,
  signOut: async () => {},
  refreshProfile: async () => {},
});

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, display_name, created_at")
    .eq("id", userId)
    .single();
  if (error || !data) return null;
  return data as Profile;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<{ id: string; email: string | null } | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email ?? null });
        fetchProfile(session.user.id).then((p) => {
          setProfile(p);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email ?? null });
        fetchProfile(session.user.id).then(setProfile);
      } else {
        setUser(null);
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const p = await fetchProfile(user.id);
    setProfile(p);
  }, [user]);

  // Live role sync: when an admin changes this user's role, the new role
  // applies without a re-login. Safe no-op if Realtime is not enabled.
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`profile-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${userId}`,
        },
        () => {
          fetchProfile(userId).then(setProfile);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<string | null> => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) return error.message;
      router.refresh();
      return null;
    },
    [router]
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    router.refresh();
    router.push("/login");
  }, [router]);

  // Fail-closed defaults: until the profile resolves (or if it is missing)
  // the session is treated as the least-privileged 'viewer' role.
  const role: UserRole = profile?.role ?? "viewer";
  const canManage = role === "admin" || role === "technician";
  const canDelete = role === "admin";

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        canManage,
        canDelete,
        loading,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

/** Minimal subscription to the current user + role (alias of useAuth). */
export function useUser() {
  const { user, profile, role, loading } = useAuth();
  return { user, profile, role, loading };
}

/** Derivable permission flags used to gate UI actions by role. */
export function usePermissions() {
  const { role, canManage, canDelete } = useAuth();
  return {
    role,
    isAdmin: role === "admin",
    isTechnician: role === "technician",
    isViewer: role === "viewer",
    canManage,
    canEdit: canManage,
    canDelete,
  };
}