import { useEffect, useState } from "react";
import { isConfigured } from "../lib/supabase";
import { getSettings } from "../lib/settings";

export default function Logo({ size = 48 }: { size?: number }) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!isConfigured) return;
    getSettings().then((s) => setUrl(s?.logo_url ?? null));
  }, []);

  if (url) {
    return (
      <img
        src={url}
        alt="logo"
        style={{ width: size, height: size, borderRadius: 10, objectFit: "contain" }}
      />
    );
  }
  return (
    <span style={{ fontSize: size * 0.9, lineHeight: 1 }}>💼</span>
  );
}
