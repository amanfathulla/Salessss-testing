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

// 5 warna mengikut bilangan pelanggan (gradient panas)
function colorForCount(count: number, max: number): string {
  if (count === 0) return "#1e293b";       // gelap — tiada data
  const ratio = count / max;
  if (ratio <= 0.2) return "#1e3a5f";       // biru gelap — sikit
  if (ratio <= 0.4) return "#2563eb";       // biru — sederhana
  if (ratio <= 0.6) return "#0891b2";       // cyan — ramai
  if (ratio <= 0.8) return "#f59e0b";       // oren — lebih ramai
  return "#dc2626";                          // merah — paling ramai
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
  const maxCount = Math.max(1, ...projectedStates.map((s) => s.count));

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
          background: "#0f172a",
          borderRadius: 14,
          padding: "0.5rem",
          border: "1px solid #1e293b",
          boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
        }}
      >
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} role="img" style={{ width: "100%", height: "100%", display: "block" }}>
          <title>Peta jumlah pelanggan ikut negeri</title>
          {projectedStates.map((s) => {
            const isActive = activeSlug === s.slug;
            const isDimmed = activeSlug !== null && !isActive;
            const fillColor = isActive ? "#fbbf24" : colorForCount(s.count, maxCount);
            return (
              <g key={s.slug}>
                {/* shadow di belakang untuk depth */}
                <path
                  d={s.d}
                  fill="#000000"
                  opacity={0.4}
                  transform="translate(2,2)"
                />
                {/* state shape */}
                <path
                  d={s.d}
                  fill={fillColor}
                  opacity={isDimmed ? 0.3 : 1}
                  stroke={isActive ? "#fff" : "rgba(255,255,255,0.4)"}
                  strokeWidth={isActive ? 2 : 1}
                  style={{ cursor: "pointer", transition: "opacity 0.15s ease" }}
                  onMouseEnter={() => setHovered(s.slug)}
                  onMouseLeave={() => setHovered(null)}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend bar — 5 warna */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginTop: "0.6rem",
        padding: "0 0.25rem",
        flexWrap: "wrap",
      }}>
        <span style={{ fontSize: 11, color: "var(--muted)" }}>Sikit</span>
        <div style={{ display: "flex", gap: 2, flex: 1, maxWidth: 200 }}>
          {["#1e293b", "#1e3a5f", "#2563eb", "#0891b2", "#f59e0b", "#dc2626"].map((c) => (
            <div key={c} style={{ flex: 1, height: 10, background: c, borderRadius: 2 }} />
          ))}
        </div>
        <span style={{ fontSize: 11, color: "var(--muted)" }}>Ramai</span>
      </div>

      <div
        style={{
          marginTop: "0.6rem",
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
