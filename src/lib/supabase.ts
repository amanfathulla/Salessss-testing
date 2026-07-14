import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

if (!url || !key) {
  // Papar amaran sekali sahaja (jangan crash app).
  console.error(
    "⚠️  Konfigurasi Supabase tidak lengkap. Sila isi VITE_SUPABASE_URL dan " +
      "VITE_SUPABASE_PUBLISHABLE_KEY di dalam fail .env (copy dari .env.example)."
  );
}

// Jika tiada key, client tetap dibina supaya app tak crash; panggilan akan gagal
// secara anggun dan kita papar mesej "Sila tetapkan .env".
export const supabase = createClient(url ?? "https://placeholder.supabase.co", key ?? "placeholder");

export const isConfigured = Boolean(url && key);
