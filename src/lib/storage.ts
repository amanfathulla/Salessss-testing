import { supabase } from "./supabase";

const BUCKET = "assets";

export async function uploadImage(
  file: File,
  folder: "banner" | "logo"
): Promise<{ url: string | null; error: string | null }> {
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: true,
  });
  if (error) return { url: null, error: error.message };
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, error: null };
}
