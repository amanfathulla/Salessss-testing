import { useEffect, useState } from "react";
import { supabase, isConfigured } from "../lib/supabase";
import { getCompany, setCompany } from "../lib/company";
import { getSettings } from "../lib/settings";
import type { Pesanan, ItemPesanan, RekodTahunan } from "../types";

const BULAN = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogo", "Sep", "Okt", "Nov", "Dis"];
const THIS_YEAR = new Date().getFullYear();
const LAST_YEAR = THIS_YEAR - 1;

type MonthAgg = { label: string; jualan: number; untung: number };

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [company, setComp] = useState(getCompany());
  const [editing, setEditing] = useState(false);
  const [banner, setBannerImg] = useState<string | null>(null);

  const [kpi, setKpi] = useState({ hariIni: 0, bulanIni: 0, tahunIni: 0, untung: 0 });
  const [curCost, setCurCost] = useState(0);
  const [lastYear, setLastYear] = useState<RekodTahunan | null>(null);
  const [months, setMonths] = useState<MonthAgg[]>([]);
  const [recent, setRecent] = useState<Pesanan[]>([]);
  const [nowTick, setNowTick] = useState(new Date());
  const [latestAt, setLatestAt] = useState<string | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNowTick(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (isConfigured) getSettings().then((s) => s && setBannerImg(s.banner_url ?? null));
  }, [isConfigured]);

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }
    (async () => {
      const [{ data: pes }, { data: its }, { data: rekod }] = await Promise.all([
        supabase.from("pesanan").select("*"),
        supabase.from("item_pesanan").select("*"),
        supabase.from("rekod_tahunan").select("*"),
      ]);

      const allPes = (pes ?? []) as Pesanan[];
      const allItems = (its ?? []) as ItemPesanan[];
      const thisYear = new Date().getFullYear();

      const untungByPesanan = new Map<string, number>();
      const kosByPesanan = new Map<string, number>();
      for (const it of allItems) {
        untungByPesanan.set(it.pesanan_id, (untungByPesanan.get(it.pesanan_id) ?? 0) + Number(it.untung));
        kosByPesanan.set(
          it.pesanan_id,
          (kosByPesanan.get(it.pesanan_id) ?? 0) + Number(it.kos_satuan) * Number(it.kuantiti)
        );
      }

      const now = new Date();
      const today = now.toISOString().slice(0, 10);
      const thisMonth = now.getMonth();

      let hariIni = 0, bulanIni = 0, tahunIni = 0, untung = 0, kosTahun = 0;
      const agg: MonthAgg[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        agg.push({ label: BULAN[d.getMonth()], jualan: 0, untung: 0 });
      }
      let latest = "";

      for (const p of allPes) {
        const d = new Date(p.tarikh);
        const j = Number(p.jumlah);
        const u = untungByPesanan.get(p.id) ?? 0;
        const k = kosByPesanan.get(p.id) ?? 0;
        untung += u;
        kosTahun += d.getFullYear() === thisYear ? k : 0;
        if (p.created_at > latest) latest = p.created_at;

        if (p.tarikh.slice(0, 10) === today) hariIni += j;
        if (d.getMonth() === thisMonth && d.getFullYear() === thisYear) bulanIni += j;
        if (d.getFullYear() === thisYear) tahunIni += j;

        const diffMonths = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
        if (diffMonths >= 0 && diffMonths < 12) {
          const idx = 11 - diffMonths;
          if (agg[idx]) { agg[idx].jualan += j; agg[idx].untung += u; }
        }
      }

      const rekodMap = new Map<number, RekodTahunan>(
        ((rekod ?? []) as RekodTahunan[]).map((r) => [r.tahun, r])
      );

      setKpi({ hariIni, bulanIni, tahunIni, untung });
      setCurCost(kosTahun);
      setLastYear(rekodMap.get(LAST_YEAR) ?? null);
      setMonths(agg);
      setLatestAt(latest || null);
      setRecent([...allPes].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 8));
      setLoading(false);
    })();
  }, []);

  const fmt = (n: number) => "RM " + n.toLocaleString("ms-MY", { minimumFractionDigits: 2 });
  const maxVal = Math.max(1, ...months.map((m) => Math.max(m.jualan, m.untung)));

  return (
    <div>
      {banner && (
        <div className="dash-banner">
          <img src={banner} alt="banner" />
        </div>
      )}

      <div className="dash-head">
        <h1 className="page-title">
          Dashboard
          <button className="btn secondary" style={{ marginLeft: 12, padding: "4px 10px", fontSize: 13 }} onClick={() => setEditing(true)}>
            ✏️ {company}
          </button>
        </h1>
        <div className="live-badge">
          <span className="dot" /> LIVE · {nowTick.toLocaleString("ms-MY")}
          <span className="muted" style={{ marginLeft: 10, fontSize: 12 }}>
            Rekod terkini: {latestAt ? new Date(latestAt).toLocaleString("ms-MY") : "—"}
          </span>
        </div>
      </div>

      {editing && (
        <div className="toolbar">
          <input value={company} onChange={(e) => setComp(e.target.value)} style={{ maxWidth: 280 }} />
          <button className="btn" onClick={() => { setCompany(company); setEditing(false); }}>Simpan</button>
          <button className="btn secondary" onClick={() => setEditing(false)}>Batal</button>
        </div>
      )}

      {!isConfigured && (
        <div className="banner">⚠️ Sila salin <code>.env.example</code> ke <code>.env</code> dan isi <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>, kemudian restart dev server.</div>
      )}

      <div className="cards cards-lg">
        <div className="card card-c1">
          <div className="label">Jualan Hari Ini</div>
          <div className="value">{fmt(kpi.hariIni)}</div>
        </div>
        <div className="card card-c2">
          <div className="label">Jualan Bulan Ini</div>
          <div className="value">{fmt(kpi.bulanIni)}</div>
        </div>
        <div className="card card-c3">
          <div className="label">Jualan {THIS_YEAR} (auto)</div>
          <div className="value">{fmt(kpi.tahunIni)}</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>Kos {fmt(curCost)}</div>
        </div>
        <div className="card card-c4">
          <div className="label">Total Untung</div>
          <div className="value">{fmt(kpi.untung)}</div>
        </div>
      </div>

      <div className="cards cards-lg">
        <div className="card card-c2">
          <div className="label">Jualan {LAST_YEAR} (rekod)</div>
          <div className="value">{lastYear ? fmt(Number(lastYear.jualan)) : "—"}</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            {lastYear ? "Untung " + fmt(Number(lastYear.untung)) : "Tiada rekod"}
          </div>
        </div>
        <div className="card card-c4">
          <div className="label">Beza {THIS_YEAR} vs {LAST_YEAR}</div>
          <div className="value">
            {lastYear && Number(lastYear.jualan) > 0
              ? (((kpi.tahunIni - Number(lastYear.jualan)) / Number(lastYear.jualan)) * 100).toFixed(1) + "%"
              : "—"}
          </div>
        </div>
        <div className="card card-c1" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div className="muted" style={{ fontSize: 13 }}>Tahun aktif</div>
          <div className="value" style={{ fontSize: 28 }}>{THIS_YEAR}</div>
        </div>
        <div className="card card-c3" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div className="muted" style={{ fontSize: 13 }}>Tahun lepas</div>
          <div className="value" style={{ fontSize: 28 }}>{LAST_YEAR}</div>
        </div>
      </div>

      <div className="panel-chart">
        <h3 style={{ marginTop: 0 }}>Jualan & Untung Bulanan ({THIS_YEAR}, 12 bulan)</h3>
        {loading ? (
          <p className="muted">Memuatkan graf…</p>
        ) : (
          <Chart months={months} maxVal={maxVal} />
        )}
        <div className="legend">
          <span><i style={{ background: "var(--accent)" }} /> Jualan</span>
          <span><i style={{ background: "var(--green)" }} /> Untung</span>
        </div>
      </div>

      <h3 style={{ marginTop: 24 }}>Rekod Terkini</h3>
      {loading ? (
        <p className="muted">Memuatkan…</p>
      ) : recent.length === 0 ? (
        <div className="empty">Tiada rekod lagi. Buat pesanan dari page Pelanggan.</div>
      ) : (
        <div className="recent-list">
          {recent.map((p) => (
            <div className="recent-item" key={p.id}>
              <div>
                <div className="recent-date">
                  {new Date(p.tarikh).toLocaleString("ms-MY", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </div>
                <div className="muted">{p.catatan ?? "Pesanan"}</div>
              </div>
              <div className="recent-amount">{fmt(Number(p.jumlah))}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Chart({ months, maxVal }: { months: MonthAgg[]; maxVal: number }) {
  const W = 720, H = 260, pad = 30;
  const innerW = W - pad * 2, innerH = H - pad * 2;
  const bw = innerW / months.length, barW = bw * 0.32;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" preserveAspectRatio="xMidYMid meet">
      {[0, 0.25, 0.5, 0.75, 1].map((g) => {
        const y = pad + innerH * (1 - g);
        return <line key={g} x1={pad} x2={W - pad} y1={y} y2={y} stroke="#334155" strokeWidth={1} />;
      })}
      {months.map((m, i) => {
        const x = pad + i * bw + bw / 2;
        const hJ = (m.jualan / maxVal) * innerH, hU = (m.untung / maxVal) * innerH;
        const yJ = pad + innerH - hJ, yU = pad + innerH - hU;
        return (
          <g key={i}>
            <rect x={x - barW - 1} y={yJ} width={barW} height={hJ} fill="var(--accent)" rx={3} />
            <rect x={x + 1} y={yU} width={barW} height={hU} fill="var(--green)" rx={3} />
            <text x={x} y={H - 10} fontSize={11} fill="#94a3b8" textAnchor="middle">{m.label}</text>
          </g>
        );
      })}
    </svg>
  );
}
