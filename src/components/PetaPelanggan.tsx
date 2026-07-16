import { useEffect, useMemo, useState } from "react";
import { data } from "krackedmaps";
import { supabase, isConfigured } from "../lib/supabase";

// ---------------------------------------------------------------------------
// Case-insensitive lookup: negeri name (any case) -> krackedmaps slug
// ---------------------------------------------------------------------------
const LOKASI_MAP: Record<string, string> = {
  // exact + common variants, all lowercase keys
  johor: "johor",
  kedah: "kedah",
  kelantan: "kelantan",
  melaka: "melaka",
  melacca: "melaka",
  "negeri sembilan": "negeri-sembilan",
  ns: "negeri-sembilan",
  pahang: "pahang",
  "pulau pinang": "penang",
  penang: "penang",
  "pinang": "penang",
  perak: "perak",
  perlis: "perlis",
  sabah: "sabah",
  sarawak: "sarawak",
  selangor: "selangor",
  terengganu: "terengganu",
  trengganu: "terengganu",
  "wilayah persekutuan": "kuala-lumpur",
  "wilayah persekutuan kuala lumpur": "kuala-lumpur",
  "wilayah persekutuan putrajaya": "putrajaya",
  "wilayah persekutuan labuan": "labuan",
  wp: "kuala-lumpur",
  "w.p": "kuala-lumpur",
  "kuala lumpur": "kuala-lumpur",
  kl: "kuala-lumpur",
  putrajaya: "putrajaya",
  labuan: "labuan",
};

function lokasiToSlug(raw: string): string | null {
  const key = raw.trim().toLowerCase();
  // try exact match
  if (LOKASI_MAP[key]) return LOKASI_MAP[key];
  // try without "wilayah persekutuan" prefix
  if (key.startsWith("wilayah persekutuan ")) {
    const sub = key.slice(20);
    if (LOKASI_MAP[sub]) return LOKASI_MAP[sub];
    if (sub.includes("kuala lumpur") || sub === "kl") return "kuala-lumpur";
    if (sub.includes("putrajaya")) return "putrajaya";
    if (sub.includes("labuan")) return "labuan";
  }
  // try partial match for pulau pinang
  if (key.includes("pinang") || key.includes("penang")) return "penang";
  return null;
}

const SLUG_TO_NAME: Record<string, string> = {
  johor: "Johor",
  kedah: "Kedah",
  kelantan: "Kelantan",
  melaka: "Melaka",
  "negeri-sembilan": "Negeri Sembilan",
  pahang: "Pahang",
  penang: "Pulau Pinang",
  perak: "Perak",
  perlis: "Perlis",
  sabah: "Sabah",
  sarawak: "Sarawak",
  selangor: "Selangor",
  terengganu: "Terengganu",
  "kuala-lumpur": "Kuala Lumpur",
  putrajaya: "Putrajaya",
  labuan: "Labuan",
};

// 16 unique colors — satu per negeri, meriah
const STATE_COLORS: Record<string, string> = {
  johor: "#e63946",
  kedah: "#f4a261",
  kelantan: "#2a9d8f",
  melaka: "#e9c46a",
  "negeri-sembilan": "#457b9d",
  pahang: "#a855f7",
  penang: "#06b6d4",
  perak: "#84cc16",
  perlis: "#f97316",
  sabah: "#ec4899",
  sarawak: "#14b8a6",
  selangor: "#3b82f6",
  terengganu: "#ef4444",
  "kuala-lumpur": "#fbbf24",
  putrajaya: "#a78bfa",
  labuan: "#22c55e",
};

const NO_DATA_COLOR = "#1a2332";

interface ProjectedState {
  slug: string;
  name: string;
  d: string;
  count: number;
  centroid: { x: number; y: number };
}

const VIEW_W = 799.85;
const VIEW_H = 352.74;

export default function PetaPelanggan({ refreshKey }: { refreshKey?: number }) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ProjectedState | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchCounts() {
      setLoading(true);
      setError(null);

      if (!isConfigured) {
        setLoading(false);
        return;
      }

      const { data: rows, error: err } = await supabase
        .from("pelanggan")
        .select("lokasi");

      if (cancelled) return;

      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }

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
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const states = useMemo(() => (data as any).STATES as any[], []);

  const projectedStates: ProjectedState[] = useMemo(
    () =>
      states.map((f) => {
        const slug = f.slug as string;
        return {
          slug,
          name: SLUG_TO_NAME[slug] ?? f.name,
          d: f.d as string,
          count: counts[slug] ?? 0,
          centroid: f.centroid ?? { x: 0, y: 0 },
        };
      }),
    [states, counts]
  );

  const totalPelanggan = projectedStates.reduce((s, st) => s + st.count, 0);

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
          margin: "0 auto",
          width: "100%",
          maxWidth: 720,
          aspectRatio: "799.85 / 352.74",
        }}
      >
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} role="img" style={{ width: "100%", height: "100%", display: "block" }}>
          <title>Peta jumlah pelanggan ikut negeri</title>
          {projectedStates.map((s) => {
            const hasData = s.count > 0;
            const baseColor = STATE_COLORS[s.slug] ?? "#555";
            const fillColor = hasData ? baseColor : NO_DATA_COLOR;
            const isSelected = selected?.slug === s.slug;
            const opacity = hasData ? 1 : 0.4;
            return (
              <g
                key={s.slug}
                style={{ cursor: "pointer" }}
                onClick={() => setSelected(s)}
              >
                <path
                  d={s.d}
                  fill="#000000"
                  opacity={0.3}
                  transform="translate(2,2)"
                />
                <path
                  d={s.d}
                  fill={fillColor}
                  opacity={opacity}
                  stroke={isSelected ? "#fff" : "rgba(255,255,255,0.2)"}
                  strokeWidth={isSelected ? 1.5 : 0.5}
                />
                {hasData && (
                  <text
                    x={s.centroid.x}
                    y={s.centroid.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={9}
                    fontWeight={800}
                    fill="#fff"
                    style={{ pointerEvents: "none", textShadow: "0 1px 3px rgba(0,0,0,0.9)" }}
                  >
                    {s.count}
                  </text>
                )}
              </g>
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
          padding: "0 0.5rem",
        }}
      >
        <div>
          <p style={{ fontSize: 16, color: "var(--text)", margin: 0, fontWeight: 600 }}>
            {selected ? selected.name : "Klik satu negeri"}
          </p>
          <p style={{ fontSize: 12, color: "var(--muted)", margin: "3px 0 0" }}>
            {selected ? "Jumlah pelanggan direkod" : `Total: ${totalPelanggan} pelanggan`}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontSize: 26, fontWeight: 600, color: selected ? STATE_COLORS[selected.slug] : "var(--muted)", margin: 0 }}>
            {selected ? selected.count : "-"}
          </p>
          <p style={{ fontSize: 11, color: "var(--muted)", margin: "2px 0 0" }}>pelanggan</p>
        </div>
      </div>
    </div>
  );
}
