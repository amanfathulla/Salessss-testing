import { useEffect, useMemo, useState } from "react";
import { data } from "krackedmaps";
import { supabase, isConfigured } from "../lib/supabase";

// ---------------------------------------------------------------------------
// Case-insensitive lookup
// ---------------------------------------------------------------------------
const LOKASI_MAP: Record<string, string> = {
  johor: "johor", kedah: "kedah", kelantan: "kelantan",
  melaka: "melaka", melacca: "melaka",
  "negeri sembilan": "negeri-sembilan", ns: "negeri-sembilan",
  pahang: "pahang",
  "pulau pinang": "penang", penang: "penang", pinang: "penang",
  perak: "perak", perlis: "perlis",
  sabah: "sabah", sarawak: "sarawak", selangor: "selangor",
  terengganu: "terengganu", trengganu: "terengganu",
  "wilayah persekutuan": "kuala-lumpur",
  "wilayah persekutuan kuala lumpur": "kuala-lumpur",
  "wilayah persekutuan putrajaya": "putrajaya",
  "wilayah persekutuan labuan": "labuan",
  wp: "kuala-lumpur", "w.p": "kuala-lumpur",
  "kuala lumpur": "kuala-lumpur", kl: "kuala-lumpur",
  putrajaya: "putrajaya", labuan: "labuan",
};

function lokasiToSlug(raw: string): string | null {
  const key = raw.trim().toLowerCase();
  if (LOKASI_MAP[key]) return LOKASI_MAP[key];
  if (key.startsWith("wilayah persekutuan ")) {
    const sub = key.slice(20);
    if (LOKASI_MAP[sub]) return LOKASI_MAP[sub];
    if (sub.includes("kuala lumpur") || sub === "kl") return "kuala-lumpur";
    if (sub.includes("putrajaya")) return "putrajaya";
    if (sub.includes("labuan")) return "labuan";
  }
  if (key.includes("pinang") || key.includes("penang")) return "penang";
  return null;
}

const SLUG_TO_NAME: Record<string, string> = {
  johor: "Johor", kedah: "Kedah", kelantan: "Kelantan",
  melaka: "Melaka", "negeri-sembilan": "Negeri Sembilan",
  pahang: "Pahang", penang: "Pulau Pinang", perak: "Perak",
  perlis: "Perlis", sabah: "Sabah", sarawak: "Sarawak",
  selangor: "Selangor", terengganu: "Terengganu",
  "kuala-lumpur": "Kuala Lumpur", putrajaya: "Putrajaya", labuan: "Labuan",
};

// 3 warna sahaja — clean
function colorForCount(count: number): string {
  if (count === 0) return "#e2e8f0";   // gray — tiada data
  if (count <= 2) return "#93c5fd";   // light blue — sikit
  return "#3b82f6";                    // blue — ramai
}

interface ProjectedState {
  slug: string;
  name: string;
  d: string;
  count: number;
  centroid: { x: number; y: number };
}

const VIEW_W = 799.85;
const VIEW_H = 352.74;

export default function PetaPelanggan({
  refreshKey,
  highlightSlug,
}: {
  refreshKey?: number;
  highlightSlug?: string | null;
}) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchCounts() {
      setLoading(true);
      setError(null);
      if (!isConfigured) { setLoading(false); return; }
      const { data: rows, error: err } = await supabase
        .from("pelanggan")
        .select("lokasi");
      if (cancelled) return;
      if (err) { setError(err.message); setLoading(false); return; }
      const tally: Record<string, number> = {};
      for (const row of rows ?? []) {
        const raw = (row as { lokasi: string | null }).lokasi;
        if (!raw) continue;
        const slug = lokasiToSlug(raw);
        if (!slug) continue;
        tally[slug] = (tally[slug] ?? 0) + 1;
      }
      setCounts(tally);
      setLoading(false);
    }
    fetchCounts();
    return () => { cancelled = true; };
  }, [refreshKey]);

  const states = useMemo(() => (data as any).STATES as any[], []);

  const projectedStates: ProjectedState[] = useMemo(
    () =>
      states.map((f) => ({
        slug: f.slug as string,
        name: SLUG_TO_NAME[f.slug] ?? f.name,
        d: f.d as string,
        count: counts[f.slug] ?? 0,
        centroid: f.centroid ?? { x: 0, y: 0 },
      })),
    [states, counts]
  );

  const totalPelanggan = projectedStates.reduce((s, st) => s + st.count, 0);

  // active = hovered on peta OR hovered from 5 Teratas
  const activeSlug = hovered ?? highlightSlug ?? null;
  const activeState = activeSlug ? projectedStates.find((s) => s.slug === activeSlug) : null;

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "var(--muted)" }}>
        Memuatkan peta pelanggan…
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "var(--red)" }}>
        Ralat memuatkan data: {error}
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          width: "100%",
          aspectRatio: "799.85 / 352.74",
          background: "#f8fafc",
          borderRadius: 14,
          padding: "0.75rem",
          border: "1px solid var(--border)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
        }}
      >
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} role="img" style={{ width: "100%", height: "100%", display: "block" }}>
          <title>Peta jumlah pelanggan ikut negeri</title>
          {projectedStates.map((s) => {
            const isActive = activeSlug === s.slug;
            const isDimmed = activeSlug !== null && !isActive;
            const fillColor = isActive ? "#1d4ed8" : colorForCount(s.count);
            return (
              <path
                key={s.slug}
                d={s.d}
                fill={fillColor}
                opacity={isDimmed ? 0.35 : 1}
                stroke={isActive ? "#fff" : "#fff"}
                strokeWidth={isActive ? 2 : 0.8}
                style={{ cursor: "pointer", transition: "opacity 0.15s ease, fill 0.15s ease" }}
                onMouseEnter={() => setHovered(s.slug)}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}
        </svg>
      </div>

      <div
        style={{
          marginTop: "0.75rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 0.25rem",
        }}
      >
        <div>
          <p style={{ fontSize: 16, color: "var(--text)", margin: 0, fontWeight: 600 }}>
            {activeState ? activeState.name : "Hover negeri untuk lihat"}
          </p>
          <p style={{ fontSize: 12, color: "var(--muted)", margin: "3px 0 0" }}>
            {activeState ? "Jumlah pelanggan direkod" : `Total: ${totalPelanggan} pelanggan`}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: 26, fontWeight: 600, color: "var(--accent)", margin: 0 }}>
            {activeState ? activeState.count : "-"}
          </p>
          <p style={{ fontSize: 11, color: "var(--muted)", margin: "2px 0 0" }}>pelanggan</p>
        </div>
      </div>
    </div>
  );
}
