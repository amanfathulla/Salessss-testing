import { useEffect, useMemo, useState } from "react";
import { data } from "krackedmaps";
import { supabase, isConfigured } from "../lib/supabase";

// ---------------------------------------------------------------------------
// Map Supabase `pelanggan.lokasi` value -> krackedmaps slug (data.STATES)
// ---------------------------------------------------------------------------
const LOKASI_TO_SLUG: Record<string, string> = {
  "Johor": "johor",
  "Kedah": "kedah",
  "Kelantan": "kelantan",
  "Melaka": "melaka",
  "Negeri Sembilan": "negeri-sembilan",
  "Pahang": "pahang",
  "Pulau Pinang": "penang",
  "Perak": "perak",
  "Perlis": "perlis",
  "Sabah": "sabah",
  "Sarawak": "sarawak",
  "Selangor": "selangor",
  "Terengganu": "terengganu",
  // Wilayah Persekutuan generic -> letak kat KL (tiada slug "wilayah persekutuan")
  "Wilayah Persekutuan": "kuala-lumpur",
  "Kuala Lumpur": "kuala-lumpur",
  "Putrajaya": "putrajaya",
  "Labuan": "labuan",
};

const SLUG_TO_NAME: Record<string, string> = {
  "johor": "Johor",
  "kedah": "Kedah",
  "kelantan": "Kelantan",
  "melaka": "Melaka",
  "negeri-sembilan": "Negeri Sembilan",
  "pahang": "Pahang",
  "penang": "Pulau Pinang",
  "perak": "Perak",
  "perlis": "Perlis",
  "sabah": "Sabah",
  "sarawak": "Sarawak",
  "selangor": "Selangor",
  "terengganu": "Terengganu",
  "kuala-lumpur": "Kuala Lumpur",
  "putrajaya": "Putrajaya",
  "labuan": "Labuan",
};

interface ProjectedState {
  slug: string;
  name: string;
  d: string;
  count: number;
}

function colorForRatio(t: number): string {
  if (t <= 0) return "#2C2C2A";
  if (t < 0.25) return "#4A1B0C";
  if (t < 0.5) return "#712B13";
  if (t < 0.75) return "#993C1D";
  if (t < 0.95) return "#C8203C";
  return "#CFA227";
}

const VIEW_W = 420;
const VIEW_H = 400;

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
        const slug = LOKASI_TO_SLUG[raw.trim()];
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
        };
      }),
    [states, counts]
  );

  const maxCount = Math.max(1, ...projectedStates.map((s) => s.count));

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
    <div style={{ background: "#0C0E11", borderRadius: 12, padding: "1.5rem" }}>
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} role="img" style={{ width: "100%", height: "auto" }}>
        <title>Peta jumlah pelanggan ikut negeri</title>
        {projectedStates.map((s) => {
          const ratio = s.count / maxCount;
          const h = 3 + ratio * 14;
          const isSelected = selected?.slug === s.slug;
          return (
            <g
              key={s.slug}
              style={{ cursor: "pointer" }}
              onClick={() => setSelected(s)}
            >
              <path
                d={s.d}
                fill="#000000"
                opacity={0.35}
                transform={`translate(${h * 1.4},${h * 1.4})`}
              />
              <path
                d={s.d}
                fill={colorForRatio(ratio)}
                stroke={isSelected ? "#CFA227" : "#0C0E11"}
                strokeWidth={isSelected ? 1.6 : 0.6}
              />
            </g>
          );
        })}
      </svg>

      <div
        style={{
          marginTop: "1rem",
          background: "var(--panel)",
          border: "0.5px solid #3C3489",
          borderRadius: 12,
          padding: "1rem 1.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <p
            style={{
              fontSize: 18,
              letterSpacing: 0.5,
              color: "#F1EFE8",
              margin: 0,
              fontWeight: 600,
            }}
          >
            {selected ? selected.name : "Klik satu negeri"}
          </p>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "4px 0 0" }}>
            Jumlah pelanggan direkod
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p
            style={{
              fontSize: 28,
              fontWeight: 500,
              color: "#CFA227",
              margin: 0,
            }}
          >
            {selected ? selected.count : "-"}
          </p>
          <p style={{ fontSize: 12, color: "var(--muted)", margin: "2px 0 0" }}>pelanggan</p>
        </div>
      </div>
    </div>
  );
}
