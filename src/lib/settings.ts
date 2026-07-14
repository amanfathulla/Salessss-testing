import { supabase } from "./supabase";

export type AppSettings = {
  id: string;
  company: string | null;
  banner_url: string | null;
  logo_url: string | null;
};

export async function getSettings(): Promise<AppSettings | null> {
  const { data } = await supabase.from("settings").select("*").eq("id", "default").maybeSingle();
  return (data as AppSettings) ?? null;
}

export async function saveSettings(patch: Partial<AppSettings>): Promise<void> {
  await supabase.from("settings").upsert({ id: "default", ...patch });
}
