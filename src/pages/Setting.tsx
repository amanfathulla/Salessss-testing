import { useState, useEffect } from "react";
import { useAuth } from "../lib/auth";
import { THEMES, getTheme, applyTheme } from "../lib/theme";
import { getCompany, setCompany } from "../lib/company";
import { supabase, isConfigured } from "../lib/supabase";
import { uploadImage } from "../lib/storage";
import { getSettings, saveSettings } from "../lib/settings";
import type { RekodTahunan } from "../types";
import Logo from "../components/Logo";

const MAX = 3 * 1024 * 1024; // 3MB

export default function Setting() {
  const { user, updateEmail, updatePassword, signOut } = useAuth();
  const [company, setCompLocal] = useState(getCompany());
  const [theme, setThemeLocal] = useState(getTheme());
  const [logo, setLogoLocal] = useState<string | null>(null);
  const [banner, setBannerLocal] = useState<string | null>(null);
  const LAST_YEAR = new Date().getFullYear() - 1;
  const [rekod, setRekod] = useState<RekodTahunan | null>(null);
  const [ryJualan, setRyJualan] = useState("");
  const [ryUntung, setRyUntung] = useState("");

  const [email, setEmail] = useState("");
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");

  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (!isConfigured) return;
    (async () => {
      const s = await getSettings();
      if (s) {
        if (s.company) {
          setCompLocal(s.company);
        }
        setLogoLocal(s.logo_url ?? null);
        setBannerLocal(s.banner_url ?? null);
      }
      const { data } = await supabase
        .from("rekod_tahunan")
        .select("*")
        .eq("tahun", LAST_YEAR)
        .maybeSingle();
      if (data) {
        setRekod(data as RekodTahunan);
        setRyJualan(String(Number(data.jualan)));
        setRyUntung(String(Number(data.untung)));
      }
    })();
  }, [isConfigured]);

  function saveCompany() {
    setCompany(company);
    saveSettings({ company });
    setMsg({ type: "ok", text: "Nama syarikat disimpan." });
  }

  async function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX) {
      setMsg({ type: "err", text: "Imej terlalu besar (max 3MB)." });
      return;
    }
    setMsg({ type: "ok", text: "Memuat naik logo…" });
    const { url, error } = await uploadImage(f, "logo");
    if (error) {
      setMsg({ type: "err", text: "Gagal: " + error });
      return;
    }
    setLogoLocal(url);
    await saveSettings({ logo_url: url });
    setMsg({ type: "ok", text: "Logo disimpan (SQL)." });
  }

  async function removeLogo() {
    setLogoLocal(null);
    await saveSettings({ logo_url: null });
    setMsg({ type: "ok", text: "Logo dibuang." });
  }

  async function onBanner(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX) {
      setMsg({ type: "err", text: "Imej terlalu besar (max 3MB)." });
      return;
    }
    setMsg({ type: "ok", text: "Memuat naik banner…" });
    const { url, error } = await uploadImage(f, "banner");
    if (error) {
      setMsg({ type: "err", text: "Gagal: " + error });
      return;
    }
    setBannerLocal(url);
    await saveSettings({ banner_url: url });
    setMsg({ type: "ok", text: "Banner disimpan (SQL)." });
  }

  async function removeBanner() {
    setBannerLocal(null);
    await saveSettings({ banner_url: null });
    setMsg({ type: "ok", text: "Banner dibuang." });
  }

  async function saveRekod() {
    const payload = {
      tahun: LAST_YEAR,
      jualan: Number(ryJualan) || 0,
      untung: Number(ryUntung) || 0,
    };
    if (rekod) {
      await supabase.from("rekod_tahunan").update(payload).eq("id", rekod.id);
    } else {
      const { data } = await supabase.from("rekod_tahunan").insert(payload).select().single();
      if (data) setRekod(data as RekodTahunan);
    }
    setMsg({ type: "ok", text: `Rekod ${LAST_YEAR} disimpan.` });
  }

  function pickTheme(id: string) {
    setThemeLocal(id);
    applyTheme(id);
  }

  async function changeEmail(e: React.FormEvent) {
    e.preventDefault();
    const r = await updateEmail(email, curPw);
    setMsg(r.error ? { type: "err", text: r.error } : { type: "ok", text: "Email dikemaskini." });
  }

  async function changePw(e: React.FormEvent) {
    e.preventDefault();
    const r = await updatePassword(newPw, curPw);
    setMsg(r.error ? { type: "err", text: r.error } : { type: "ok", text: "Kata laluan dikemaskini." });
  }

  return (
    <div>
      <h1 className="page-title">Setting</h1>

      {msg && <div className={msg.type === "err" ? "banner" : "ok-banner"}>{msg.text}</div>}

      <div className="settings-grid">
        <section className="panel-box">
          <h3>🖼️ Logo</h3>
          <div style={{ marginBottom: 12 }}>
            <Logo size={64} />
          </div>
          <div className="toolbar">
            <label className="btn secondary" style={{ display: "inline-block", cursor: "pointer" }}>
              Upload Imej
              <input type="file" accept="image/*" onChange={onLogo} style={{ display: "none" }} />
            </label>
            {logo && (
              <button className="btn danger" onClick={removeLogo}>
                Buang Logo
              </button>
            )}
          </div>
          <p className="muted" style={{ fontSize: 13 }}>
            PNG/JPG max 3MB. Papar di Login & sidebar.
          </p>
        </section>

        <section className="panel-box">
          <h3>🎯 Banner Dashboard</h3>
          <div style={{ marginBottom: 12 }}>
            {banner ? (
              <img src={banner} alt="banner" style={{ width: "100%", borderRadius: 8, maxHeight: 120, objectFit: "cover" }} />
            ) : (
              <div className="muted">Tiada banner.</div>
            )}
          </div>
          <div className="toolbar">
            <label className="btn secondary" style={{ display: "inline-block", cursor: "pointer" }}>
              Upload Banner
              <input type="file" accept="image/*" onChange={onBanner} style={{ display: "none" }} />
            </label>
            {banner && (
              <button className="btn danger" onClick={removeBanner}>
                Buang Banner
              </button>
            )}
          </div>
          <p className="muted" style={{ fontSize: 13 }}>
            PNG/JPG max 3MB. Papar di atas Dashboard.
          </p>
        </section>

        <section className="panel-box">
          <h3>🏢 Syarikat</h3>
          <div className="field">
            <label>Nama Syarikat / Perniagaan</label>
            <input value={company} onChange={(e) => setCompLocal(e.target.value)} />
          </div>
          <button className="btn" onClick={saveCompany}>
            Simpan Nama
          </button>
          <p className="muted" style={{ fontSize: 13 }}>
            Paparan ini muncul di Login & header.
          </p>
        </section>

        <section className="panel-box">
          <h3>🎨 Tema Warna</h3>
          <div className="theme-row">
            {THEMES.map((t) => (
              <button
                key={t.id}
                className={"theme-chip" + (theme === t.id ? " active" : "")}
                onClick={() => pickTheme(t.id)}
                title={t.name}
              >
                <span style={{ background: t.swatch }} />
                {t.name}
              </button>
            ))}
          </div>
          <p className="muted" style={{ fontSize: 13 }}>
            Tersimpan di peranti ini.
          </p>
        </section>

        <section className="panel-box">
          <h3>📊 Rekod Tahunan ({LAST_YEAR})</h3>
          <p className="muted" style={{ fontSize: 13 }}>
            Isi angka {LAST_YEAR} secara manual untuk perbandingan dengan {new Date().getFullYear()}.
          </p>
          <div className="field">
            <label>Jualan {LAST_YEAR} (RM)</label>
            <input type="number" step="0.01" value={ryJualan} onChange={(e) => setRyJualan(e.target.value)} />
          </div>
          <div className="field">
            <label>Untung {LAST_YEAR} (RM)</label>
            <input type="number" step="0.01" value={ryUntung} onChange={(e) => setRyUntung(e.target.value)} />
          </div>
          <button className="btn" onClick={saveRekod}>
            Simpan Rekod {LAST_YEAR}
          </button>
        </section>

        <section className="panel-box">
          <h3>🔐 Akaun Admin</h3>
          <p className="muted">{user?.email ?? "-"}</p>

          <h4 style={{ marginTop: 10 }}>Tukar Email</h4>
          <form onSubmit={changeEmail}>
            <div className="field">
              <label>Email Baru</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="field">
              <label>Kata Laluan Semasa</label>
              <input type="password" required value={curPw} onChange={(e) => setCurPw(e.target.value)} />
            </div>
            <button className="btn">Kemaskini Email</button>
          </form>

          <h4 style={{ marginTop: 16 }}>Tukar Kata Laluan</h4>
          <form onSubmit={changePw}>
            <div className="field">
              <label>Kata Laluan Baru</label>
              <input
                type="password"
                required
                minLength={6}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Kata Laluan Semasa</label>
              <input type="password" required value={curPw} onChange={(e) => setCurPw(e.target.value)} />
            </div>
            <button className="btn">Kemaskini Kata Laluan</button>
          </form>

          <button className="btn danger" style={{ marginTop: 18 }} onClick={() => signOut()}>
            Log Keluar
          </button>
        </section>
      </div>
    </div>
  );
}
