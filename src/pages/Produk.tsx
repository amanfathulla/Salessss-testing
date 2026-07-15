import { useEffect, useState } from "react";
import { supabase, isConfigured } from "../lib/supabase";
import type { Produk } from "../types";

export default function ProdukPage() {
  const [rows, setRows] = useState<Produk[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
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

  function openAdd() {
    setEdit(null);
    setForm({ nama: "", harga: "", kos: "", stok: "" });
    setShowModal(true);
  }

  function openEdit(p: Produk) {
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
    await supabase.from("produk").delete().eq("id", id);
    load();
  }

  const fmt = (n: number) =>
    "RM " + n.toLocaleString("ms-MY", { minimumFractionDigits: 2 });
  const untungUnit = (p: Produk) => Number(p.harga) - Number(p.kos);

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
        <table className="table">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Harga Jual</th>
              <th>Kos Beli</th>
              <th>Untung/Unit</th>
              <th>Stok</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id}>
                <td data-label="Nama">{p.nama}</td>
                <td data-label="Harga Jual">{fmt(Number(p.harga))}</td>
                <td data-label="Kos Beli">{fmt(Number(p.kos))}</td>
                <td data-label="Untung/Unit" style={{ color: "var(--green)" }}>+{fmt(untungUnit(p))}</td>
                <td data-label="Stok">{p.stok}</td>
                <td className="actions-cell" style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                  <button className="btn secondary" onClick={() => openEdit(p)}>
                    Edit
                  </button>{" "}
                  <button className="btn danger" onClick={() => hapus(p.id)}>
                    Padam
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
              <label>Kos Beli (RM)</label>
              <input
                type="number"
                step="0.01"
                value={form.kos}
                onChange={(e) => setForm({ ...form, kos: e.target.value })}
              />
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
