import { useEffect, useState } from "react";
import { supabase, isConfigured } from "../lib/supabase";
import type { Produk } from "../types";

export default function ProdukPage() {
  const [rows, setRows] = useState<Produk[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [viewProduk, setViewProduk] = useState<Produk | null>(null);
  const [edit, setEdit] = useState<Produk | null>(null);
  const [form, setForm] = useState({ nama: "", harga: "", kos: "", stok: "" });

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("produk")
      .select("*")
      .order("nama");
    if (!error && data) setRows(data as Produk[]);
    setLoading(false);
  }

  useEffect(() => {
    if (isConfigured) load();
    else setLoading(false);
  }, []);

  function openDetail(p: Produk) {
    setViewProduk(p);
    setShowDetail(true);
  }

  function openAdd() {
    setEdit(null);
    setForm({ nama: "", harga: "", kos: "", stok: "" });
    setShowModal(true);
  }

  function openEdit(p: Produk) {
    setShowDetail(false);
    setEdit(p);
    setForm({
      nama: p.nama,
      harga: String(p.harga),
      kos: String(p.kos),
      stok: String(p.stok),
    });
    setShowModal(true);
  }

  async function save() {
    const payload = {
      nama: form.nama,
      harga: Number(form.harga) || 0,
      kos: Number(form.kos) || 0,
      stok: Number(form.stok) || 0,
    };
    if (edit) {
      await supabase.from("produk").update(payload).eq("id", edit.id);
    } else {
      await supabase.from("produk").insert(payload);
    }
    setShowModal(false);
    load();
  }

  async function hapus(id: string) {
    if (!confirm("Padam produk ini?")) return;
    setShowDetail(false);
    await supabase.from("produk").delete().eq("id", id);
    load();
  }

  const fmt = (n: number) =>
    "RM " + n.toLocaleString("ms-MY", { minimumFractionDigits: 2 });
  const untungUnit = (p: Produk) => Number(p.harga) - Number(p.kos);

  // margin live semasa isi borang tambah/edit produk
  const formHarga = Number(form.harga) || 0;
  const formKos = Number(form.kos) || 0;
  const formUntung = formHarga - formKos;
  const formMarginPct = formHarga > 0 ? (formUntung / formHarga) * 100 : 0;

  return (
    <div>
      <h1 className="page-title">Produk</h1>
      {!isConfigured && (
        <div className="banner">
          ⚠️ Sila salin <code>.env.example</code> ke <code>.env</code> dan isi
          <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>, kemudian restart dev server.
        </div>
      )}

      <div className="toolbar">
        <button className="btn" onClick={openAdd}>
          + Tambah Produk
        </button>
      </div>

      {loading ? (
        <p className="muted">Memuatkan…</p>
      ) : rows.length === 0 ? (
        <div className="empty">Tiada produk lagi. Klik “Tambah Produk”.</div>
      ) : (
        <div className="simple-list">
          {rows.map((p) => (
            <button key={p.id} className="list-row" onClick={() => openDetail(p)}>
              <div className="list-row-main">
                <span className="list-row-title">{p.nama}</span>
                <span className="list-row-sub">Stok: {p.stok}</span>
              </div>
              <div className="list-row-value">{fmt(Number(p.harga))}</div>
              <span className="list-row-chevron">›</span>
            </button>
          ))}
        </div>
      )}

      {showDetail && viewProduk && (
        <div className="modal-backdrop" onClick={() => setShowDetail(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{viewProduk.nama}</h3>
            <div className="detail-grid">
              <div className="detail-row">
                <span className="muted">Harga Jual</span>
                <span>{fmt(Number(viewProduk.harga))}</span>
              </div>
              <div className="detail-row">
                <span className="muted">Kos Produk</span>
                <span>{fmt(Number(viewProduk.kos))}</span>
              </div>
              <div className="detail-row">
                <span className="muted">Untung/Unit</span>
                <span style={{ color: "var(--green)", fontWeight: 700 }}>
                  +{fmt(untungUnit(viewProduk))} (
                  {Number(viewProduk.harga) > 0
                    ? ((untungUnit(viewProduk) / Number(viewProduk.harga)) * 100).toFixed(1)
                    : "0.0"}
                  %)
                </span>
              </div>
              <div className="detail-row">
                <span className="muted">Stok</span>
                <span>{viewProduk.stok}</span>
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn secondary" onClick={() => setShowDetail(false)}>
                Tutup
              </button>
              <button className="btn secondary" onClick={() => openEdit(viewProduk)}>
                Edit
              </button>
              <button className="btn danger" onClick={() => hapus(viewProduk.id)}>
                Padam
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{edit ? "Edit Produk" : "Tambah Produk"}</h3>
            <div className="field">
              <label>Nama</label>
              <input
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Harga Jual (RM)</label>
              <input
                type="number"
                step="0.01"
                value={form.harga}
                onChange={(e) => setForm({ ...form, harga: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Kos Produk (RM)</label>
              <input
                type="number"
                step="0.01"
                value={form.kos}
                onChange={(e) => setForm({ ...form, kos: e.target.value })}
              />
            </div>

            <div className="margin-preview">
              <span>Margin Untung</span>
              <strong style={{ color: formUntung >= 0 ? "var(--green)" : "var(--red)" }}>
                {fmt(formUntung)} ({formMarginPct.toFixed(1)}%)
              </strong>
            </div>

            <div className="field">
              <label>Stok</label>
              <input
                type="number"
                value={form.stok}
                onChange={(e) => setForm({ ...form, stok: e.target.value })}
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
