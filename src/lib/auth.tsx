import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User } from "@supabase/supabase-js";
import { supabase, isConfigured } from "./supabase";

type AuthCtx = {
  user: User | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null; info?: string }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null; info?: string }>;
  signOut: () => Promise<void>;
  updateEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string, curPassword: string) =>
    Promise<{ error: string | null }>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { error: error.message };
    if (data.user && !data.session)
      return { error: null, info: "Semak email untuk sahkan akaun." };
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
  }

  async function updateEmail(email: string, password: string) {
    const { error: e1 } = await supabase.auth.signInWithPassword({
      email: user?.email ?? "",
      password,
    });
    if (e1) return { error: "Kata laluan semasa salah." };
    const { error } = await supabase.auth.updateUser({ email });
    return { error: error?.message ?? null };
  }

  async function updatePassword(newPassword: string, curPassword: string) {
    const { error: e1 } = await supabase.auth.signInWithPassword({
      email: user?.email ?? "",
      password: curPassword,
    });
    if (e1) return { error: "Kata laluan semasa salah." };
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error?.message ?? null };
  }

  return (
    <Ctx.Provider
      value={{ user, loading, configured: isConfigured, signIn, signUp, signOut, updateEmail, updatePassword }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth mesti dalam AuthProvider");
  return c;
}
