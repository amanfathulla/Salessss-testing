import { useEffect, useState } from "react";
import { supabase, isConfigured } from "../lib/supabase";
import type { Nota } from "../types";

export default function NotaPage() {
  const [rows, setRows] = useState<Nota[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [viewNota, setViewNota] = useState<Nota | null>(null);
  const [edit, setEdit] = useState<Nota | null>(null);
  const [form, setForm] = useState({ tajuk: "", isi: "" });

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("nota")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setRows(data as Nota[]);
    setLoading(false);
  }

  useEffect(() => {
    if (isConfigured) load();
    else setLoading(false);
  }, []);

  function openDetail(n: Nota) {
    setViewNota(n);
    setShowDetail(true);
  }

  function openAdd() {
    setEdit(null);
    setForm({ tajuk: "", isi: "" });
    setShowModal(true);
  }

  function openEdit(n: Nota) {
    setShowDetail(false);
    setEdit(n);
    setForm({ tajuk: n.tajuk, isi: n.isi ?? "" });
    setShowModal(true);
  }

  async function save() {
    if (!form.tajuk.trim() && !form.isi.trim()) {
      alert("Sila isi tajuk atau isi nota.");
      return;
    }
    if (edit) {
      await supabase.from("nota").update({ tajuk: form.tajuk, isi: form.isi || null }).eq("id", edit.id);
    } else {
      await supabase.from("nota").insert({ tajuk: form.tajuk, isi: form.isi || null });
    }
    setShowModal(false);
    load();
  }

  async function hapus(id: string) {
    if (!confirm("Padam nota ini?")) return;
    setShowDetail(false);
    await supabase.from("nota").delete().eq("id", id);
    load();
  }

  return (
    <div>
      <h1 className="page-title">Marketing Nota</h1>
      {!isConfigured && (
        <div className="banner">
          ⚠️ Sila salin <code>.env.example</code> ke <code>.env</code> dan isi
          <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>, kemudian restart dev server.
        </div>
      )}

      <div className="toolbar">
        <button className="btn" onClick={openAdd}>
          + Nota Baru
        </button>
      </div>

      {loading ? (
        <p className="muted">Memuatkan…</p>
      ) : rows.length === 0 ? (
        <div className="empty">Tiada nota lagi. Klik “Nota Baru”.</div>
      ) : (
        <div className="simple-list">
          {rows.map((n) => (
            <button key={n.id} className="list-row" onClick={() => openDetail(n)}>
              <div className="list-row-main">
                <span className="list-row-title">{n.tajuk || "(tanpa tajuk)"}</span>
                <span className="list-row-sub">
                  {new Date(n.created_at).toLocaleString("ms-MY")}
                  {n.isi ? " · " + n.isi.slice(0, 60) + (n.isi.length > 60 ? "…" : "") : ""}
                </span>
              </div>
              <span className="list-row-chevron">›</span>
            </button>
          ))}
        </div>
      )}

      {showDetail && viewNota && (
        <div className="modal-backdrop" onClick={() => setShowDetail(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{viewNota.tajuk || "(tanpa tajuk)"}</h3>
            <div className="detail-grid">
              <div className="detail-row">
                <span className="muted">Tarikh</span>
                <span>{new Date(viewNota.created_at).toLocaleString("ms-MY")}</span>
              </div>
              <div className="detail-row" style={{ flexDirection: "column", alignItems: "stretch", gap: 6 }}>
                <span className="muted">Isi</span>
                <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{viewNota.isi || "—"}</span>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn secondary" onClick={() => setShowDetail(false)}>
                Tutup
              </button>
              <button className="btn secondary" onClick={() => openEdit(viewNota)}>
                Edit
              </button>
              <button className="btn danger" onClick={() => hapus(viewNota.id)}>
                Padam
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{edit ? "Edit Nota" : "Nota Baru"}</h3>
            <div className="field">
              <label>Tajuk</label>
              <input
                value={form.tajuk}
                placeholder="Contoh: Idea promosi Hari Raya"
                onChange={(e) => setForm({ ...form, tajuk: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Isi</label>
              <textarea
                rows={6}
                style={{ width: "100%", resize: "vertical" }}
                placeholder="Tulis nota pemasaran di sini…"
                value={form.isi}
                onChange={(e) => setForm({ ...form, isi: e.target.value })}
              />
            </div>
            <div className="modal-actions">
              <button className="btn secondary" onClick={() => setShowModal(false)}>
                Batal
              </button>
              <button className="btn" onClick={save}>
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
