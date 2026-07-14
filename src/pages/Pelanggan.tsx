import { useEffect, useState } from "react";
import { supabase, isConfigured } from "../lib/supabase";
import { NEGERI } from "../lib/banner";
import type { Pelanggan, Produk, Pesanan, PesananLengkap, ItemPesanan } from "../types";

type DraftItem = {
  produk_id: string | null;
  nama_produk: string;
  kuantiti: number;
  harga_satuan: number;
  kos_satuan: number;
  _open?: boolean;
};

type EditOrderItem = {
  id?: string;
  nama_produk: string;
  kuantiti: number;
  harga_satuan: number;
  kos_satuan: number;
};

export default function PelangganPage() {
  const [rows, setRows] = useState<Pelanggan[]>([]);
  const [produk, setProduk] = useState<Produk[]>([]);
  const [pesananAll, setPesananAll] = useState<PesananLengkap[]>([]);
  const [negeriAgg, setNegeriAgg] = useState<{ negeri: string; orders: number; jualan: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showOrder, setShowOrder] = useState(false);
  const [showView, setShowView] = useState(false);
  const [showEditOrder, setShowEditOrder] = useState(false);
  const [editOrder, setEditOrder] = useState<PesananLengkap | null>(null);
  const [editOrderTarikh, setEditOrderTarikh] = useState("");
  const [editOrderCatatan, setEditOrderCatatan] = useState("");
  const [editOrderItems, setEditOrderItems] = useState<EditOrderItem[]>([]);
  const [edit, setEdit] = useState<Pelanggan | null>(null);
  const [orderCust, setOrderCust] = useState<Pelanggan | null>(null);
  const [viewCust, setViewCust] = useState<Pelanggan | null>(null);
  const [form, setForm] = useState<{ nama: string; phone: string; email: string; lokasi: string | null }>({ nama: "", phone: "", email: "", lokasi: null });

  const [items, setItems] = useState<DraftItem[]>([
    { produk_id: null, nama_produk: "", kuantiti: 1, harga_satuan: 0, kos_satuan: 0 },
  ]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("pelanggan")
      .select("*")
      .order("nama");
    if (!error && data) setRows(data as Pelanggan[]);
    setLoading(false);
  }

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }
    (async () => {
      const [{ data: pr }, { data: pes }, { data: its }, { data: custs }] = await Promise.all([
        supabase.from("produk").select("*").order("nama"),
        supabase.from("pesanan").select("*").order("tarikh", { ascending: false }),
        supabase.from("item_pesanan").select("*"),
        supabase.from("pelanggan").select("*"),
      ]);
      setProduk((pr ?? []) as Produk[]);

      const itemMap = new Map<string, ItemPesanan[]>();
      for (const it of (its ?? []) as ItemPesanan[]) {
        const arr = itemMap.get(it.pesanan_id) ?? [];
        arr.push(it);
        itemMap.set(it.pesanan_id, arr);
      }
      setPesananAll(
        ((pes ?? []) as Pesanan[]).map((p) => ({
          ...p,
          pelanggan_nama: null,
          items: itemMap.get(p.id) ?? [],
        }))
      );
      load();

      // kira order per negeri
      const custNegeri = new Map<string, string | null>((custs ?? []).map((c: any) => [c.id, c.lokasi]));
      const byNegeri = new Map<string, { orders: number; jualan: number }>();
      for (const p of (pes ?? []) as Pesanan[]) {
        const negeri = custNegeri.get(p.pelanggan_id ?? "") ?? null;
        if (!negeri) continue;
        const cur = byNegeri.get(negeri) ?? { orders: 0, jualan: 0 };
        cur.orders += 1;
        cur.jualan += Number(p.jumlah);
        byNegeri.set(negeri, cur);
      }
      setNegeriAgg(
        [...byNegeri.entries()]
          .map(([negeri, v]) => ({ negeri, ...v }))
          .sort((a, b) => b.orders - a.orders)
      );
    })();
  }, []);

  function openAdd() {
    setEdit(null);
    setForm({ nama: "", phone: "", email: "", lokasi: "" });
    setShowModal(true);
  }

  function openEdit(p: Pelanggan) {
    setEdit(p);
    setForm({
      nama: p.nama,
      phone: p.phone ?? "",
      email: p.email ?? "",
      lokasi: p.lokasi ?? "",
    });
    setShowModal(true);
  }

  function openOrder(p: Pelanggan) {
    setOrderCust(p);
    setItems([{ produk_id: null, nama_produk: "", kuantiti: 1, harga_satuan: 0, kos_satuan: 0 }]);
    setShowOrder(true);
  }

  function openView(p: Pelanggan) {
    setViewCust(p);
    setShowView(true);
  }

  function openEditOrder(p: PesananLengkap) {
    setEditOrder(p);
    setEditOrderTarikh(p.tarikh.slice(0, 16));
    setEditOrderCatatan(p.catatan ?? "");
    setEditOrderItems(
      p.items.map((it) => ({
        id: it.id,
        nama_produk: it.nama_produk,
        kuantiti: it.kuantiti,
        harga_satuan: it.harga_satuan,
        kos_satuan: it.kos_satuan,
      }))
    );
    setShowEditOrder(true);
  }

  function updateOrderItem(idx: number, patch: Partial<EditOrderItem>) {
    setEditOrderItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function addOrderItemRow() {
    setEditOrderItems((prev) => [
      ...prev,
      { nama_produk: "", kuantiti: 1, harga_satuan: 0, kos_satuan: 0 },
    ]);
  }

  async function saveEditOrder() {
    if (!editOrder) return;
    const jumlah = editOrderItems.reduce(
      (s, it) => s + (Number(it.kuantiti) || 0) * (Number(it.harga_satuan) || 0),
      0
    );
    await supabase
      .from("pesanan")
      .update({
        catatan: editOrderCatatan || null,
        jumlah,
        tarikh: new Date(editOrderTarikh).toISOString(),
      })
      .eq("id", editOrder.id);

    await supabase.from("item_pesanan").delete().eq("pesanan_id", editOrder.id);
    const lineItems = editOrderItems.map((it) => ({
      pesanan_id: editOrder.id,
      nama_produk: it.nama_produk,
      kuantiti: Number(it.kuantiti) || 0,
      harga_satuan: Number(it.harga_satuan) || 0,
      kos_satuan: Number(it.kos_satuan) || 0,
      subtotal: (Number(it.kuantiti) || 0) * (Number(it.harga_satuan) || 0),
      untung:
        (Number(it.kuantiti) || 0) *
        ((Number(it.harga_satuan) || 0) - (Number(it.kos_satuan) || 0)),
    }));
    await supabase.from("item_pesanan").insert(lineItems);

    setShowEditOrder(false);
    load();
    // refresh pesananAll
    const { data: pes } = await supabase.from("pesanan").select("*").order("tarikh", { ascending: false });
    const { data: its } = await supabase.from("item_pesanan").select("*");
    const itemMap = new Map<string, ItemPesanan[]>();
    for (const it of (its ?? []) as ItemPesanan[]) {
      const arr = itemMap.get(it.pesanan_id) ?? [];
      arr.push(it);
      itemMap.set(it.pesanan_id, arr);
    }
    setPesananAll(((pes ?? []) as Pesanan[]).map((p) => ({ ...p, pelanggan_nama: null, items: itemMap.get(p.id) ?? [] })));
  }

  async function deleteOrder(id: string) {
    if (!confirm("Padam pesanan ini? (semua item juga dipadam)")) return;
    await supabase.from("pesanan").delete().eq("id", id);
    setShowView(false);
    load();
    const { data: pes } = await supabase.from("pesanan").select("*").order("tarikh", { ascending: false });
    const { data: its } = await supabase.from("item_pesanan").select("*");
    const itemMap = new Map<string, ItemPesanan[]>();
    for (const it of (its ?? []) as ItemPesanan[]) {
      const arr = itemMap.get(it.pesanan_id) ?? [];
      arr.push(it);
      itemMap.set(it.pesanan_id, arr);
    }
    setPesananAll(((pes ?? []) as Pesanan[]).map((p) => ({ ...p, pelanggan_nama: null, items: itemMap.get(p.id) ?? [] })));
  }

  async function save() {
    const payload = {
      nama: form.nama,
      phone: form.phone || null,
      email: form.email || null,
      lokasi: form.lokasi || null,
    };
    if (edit) {
      await supabase.from("pelanggan").update(payload).eq("id", edit.id);
    } else {
      await supabase.from("pelanggan").insert(payload);
    }
    setShowModal(false);
    load();
  }

  async function hapus(id: string) {
    if (!confirm("Padam pelanggan ini?")) return;
    await supabase.from("pelanggan").delete().eq("id", id);
    load();
  }

  function onPickProduk(idx: number, produkId: string) {
    const p = produk.find((x) => x.id === produkId);
    setItems((prev) =>
      prev.map((it, i) =>
        i === idx
          ? {
              ...it,
              produk_id: produkId || null,
              nama_produk: p?.nama ?? "",
              harga_satuan: p ? Number(p.harga) : 0,
              kos_satuan: p ? Number(p.kos) : 0,
            }
          : it
      )
    );
  }

  function updateItem(idx: number, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }

  function addItemRow() {
    setItems((prev) => [
      ...prev,
      { produk_id: null, nama_produk: "", kuantiti: 1, harga_satuan: 0, kos_satuan: 0 },
    ]);
  }

  function removeItemRow(idx: number) {
    setItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev));
  }

  const jumlah = items.reduce(
    (s, it) => s + (Number(it.kuantiti) || 0) * (Number(it.harga_satuan) || 0),
    0
  );
  const untung = items.reduce(
    (s, it) =>
      s + (Number(it.kuantiti) || 0) * ((Number(it.harga_satuan) || 0) - (Number(it.kos_satuan) || 0)),
    0
  );

  async function saveOrder() {
    const valid = items.filter((it) => it.nama_produk.trim() !== "");
    if (!orderCust || valid.length === 0) {
      alert("Sila tambah sekurang-kurangnya satu item.");
      return;
    }
    const { data: inserted, error } = await supabase
      .from("pesanan")
      .insert({ pelanggan_id: orderCust.id, jumlah })
      .select()
      .single();
    if (error || !inserted) {
      alert("Gagal simpan pesanan: " + (error?.message ?? "unknown"));
      return;
    }
    const lineItems = valid.map((it) => ({
      pesanan_id: (inserted as Pesanan).id,
      produk_id: it.produk_id,
      nama_produk: it.nama_produk,
      kuantiti: Number(it.kuantiti) || 0,
      harga_satuan: Number(it.harga_satuan) || 0,
      kos_satuan: Number(it.kos_satuan) || 0,
      subtotal: (Number(it.kuantiti) || 0) * (Number(it.harga_satuan) || 0),
      untung:
        (Number(it.kuantiti) || 0) *
        ((Number(it.harga_satuan) || 0) - (Number(it.kos_satuan) || 0)),
    }));
    const { error: e2 } = await supabase.from("item_pesanan").insert(lineItems);
    if (e2) {
      alert("Pesanan simpan tapi item gagal: " + e2.message);
      return;
    }
    setShowOrder(false);
    alert("Pesanan disimpan! Ia akan muncul di Dashboard & page ini.");
    // refresh pesanan list
    const { data: pes } = await supabase.from("pesanan").select("*").order("tarikh", { ascending: false });
    const { data: its } = await supabase.from("item_pesanan").select("*");
    const itemMap = new Map<string, ItemPesanan[]>();
    for (const it of (its ?? []) as ItemPesanan[]) {
      const arr = itemMap.get(it.pesanan_id) ?? [];
      arr.push(it);
      itemMap.set(it.pesanan_id, arr);
    }
    setPesananAll(((pes ?? []) as Pesanan[]).map((p) => ({ ...p, pelanggan_nama: null, items: itemMap.get(p.id) ?? [] })));
  }

  const fmt = (n: number) =>
    "RM " + n.toLocaleString("ms-MY", { minimumFractionDigits: 2 });

  const custOrders = viewCust ? pesananAll.filter((p) => p.pelanggan_id === viewCust.id) : [];

  return (
    <div>
      <h1 className="page-title">Pelanggan</h1>
      {!isConfigured && (
        <div className="banner">
          ⚠️ Sila salin <code>.env.example</code> ke <code>.env</code> dan isi
          <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>, kemudian restart dev server.
        </div>
      )}

      <div className="negeri-layout">
        {loading ? (
          <p className="muted">Memuatkan graf…</p>
        ) : negeriAgg.length === 0 ? (
          <div className="empty">Tiada data negeri. Pastikan pelanggan ada lokasi negeri & pesanan.</div>
        ) : (
          <NegeriPie data={negeriAgg} />
        )}

        <div className="top-negeri">
          <h3>5 Teratas (Order)</h3>
          {negeriAgg.slice(0, 5).map((n, i) => (
            <div className="top-row" key={n.negeri}>
              <span className="top-rank">{i + 1}</span>
              <span className="top-name">{n.negeri}</span>
              <span className="top-val">{n.orders} order</span>
            </div>
          ))}
        </div>
      </div>

      <div className="toolbar">
        <button className="btn" onClick={openAdd}>
          + Tambah Pelanggan
        </button>
      </div>

      {loading ? (
        <p className="muted">Memuatkan…</p>
      ) : rows.length === 0 ? (
        <div className="empty">Tiada pelanggan lagi. Klik “Tambah Pelanggan”.</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Nama</th>
              <th>Telefon</th>
              <th>Email</th>
              <th>Lokasi</th>
              <th># Pesanan</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => {
              const bil = pesananAll.filter((x) => x.pelanggan_id === p.id).length;
              return (
                <tr key={p.id}>
                  <td>{p.nama}</td>
                  <td>{p.phone ?? "-"}</td>
                  <td>{p.email ?? "-"}</td>
                  <td>{p.lokasi ?? "-"}</td>
                  <td>{bil}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <button className="btn secondary" onClick={() => openView(p)}>
                      Lihat
                    </button>{" "}
                    <button className="btn" onClick={() => openOrder(p)}>
                      + Pesanan
                    </button>{" "}
                    <button className="btn secondary" onClick={() => openEdit(p)}>
                      Edit
                    </button>{" "}
                    <button className="btn danger" onClick={() => hapus(p.id)}>
                      Padam
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{edit ? "Edit Pelanggan" : "Tambah Pelanggan"}</h3>
            <div className="field">
              <label>Nama</label>
              <input
                value={form.nama}
                onChange={(e) => setForm({ ...form, nama: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Telefon</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Email</label>
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="field">
              <label>Lokasi (Negeri)</label>
              <select
                value={form.lokasi ?? ""}
                onChange={(e) => setForm({ ...form, lokasi: e.target.value || null })}
              >
                <option value="">— Pilih negeri —</option>
                {NEGERI.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
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

      {showOrder && orderCust && (
        <div className="modal-backdrop" onClick={() => setShowOrder(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Pesanan untuk {orderCust.nama}</h3>
            {items.map((it, idx) => (
              <div className="item-row" key={idx}>
                <div className="prod-picker">
                  <button
                    type="button"
                    className="prod-picker-btn"
                    onClick={() =>
                      setItems((prev) =>
                        prev.map((x, i) =>
                          i === idx ? { ...x, _open: !x._open } : { ...x, _open: false }
                        )
                      )
                    }
                  >
                    {it.nama_produk || "— Pilih produk —"}
                  </button>
                  {it._open && (
                    <div className="prod-list">
                      {produk.map((p) => (
                        <button
                          type="button"
                          key={p.id}
                          className="prod-opt"
                          onClick={() => {
                            onPickProduk(idx, p.id);
                            setItems((prev) =>
                              prev.map((x, i) => (i === idx ? { ...x, _open: false } : x))
                            );
                          }}
                        >
                          {p.nama} (RM{p.harga})
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  type="number"
                  min="1"
                  value={it.kuantiti}
                  onChange={(e) => updateItem(idx, { kuantiti: Number(e.target.value) })}
                />
                <input
                  type="number"
                  step="0.01"
                  value={it.harga_satuan}
                  onChange={(e) =>
                    updateItem(idx, { harga_satuan: Number(e.target.value) })
                  }
                />
                <div className="muted" style={{ alignSelf: "center" }}>
                  {fmt((Number(it.kuantiti) || 0) * (Number(it.harga_satuan) || 0))}
                </div>
                <button
                  className="btn danger"
                  onClick={() => removeItemRow(idx)}
                  disabled={items.length === 1}
                >
                  ×
                </button>
              </div>
            ))}
            <button className="btn secondary" onClick={addItemRow} style={{ marginBottom: 14 }}>
              + Item lain
            </button>
            <div style={{ textAlign: "right", fontWeight: 700, fontSize: 18 }}>
              Jualan: {fmt(jumlah)} · <span style={{ color: "var(--green)" }}>Untung: {fmt(untung)}</span>
            </div>
            <div className="modal-actions">
              <button className="btn secondary" onClick={() => setShowOrder(false)}>
                Batal
              </button>
              <button className="btn" onClick={saveOrder}>
                Simpan Pesanan
              </button>
            </div>
          </div>
        </div>
      )}

      {showView && viewCust && (
        <div className="modal-backdrop" onClick={() => setShowView(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Pesanan: {viewCust.nama}</h3>
            {custOrders.length === 0 ? (
              <p className="muted">Pelanggan ini belum ada pesanan.</p>
            ) : (
              custOrders.map((p) => (
                <div key={p.id} style={{ marginBottom: 16, borderBottom: "1px solid var(--border)", paddingBottom: 12 }}>
                  <div className="muted">
                    {new Date(p.tarikh).toLocaleString("ms-MY")} · {fmt(Number(p.jumlah))}
                  </div>
                  <table className="table" style={{ marginTop: 8 }}>
                    <thead>
                      <tr>
                        <th>Produk</th>
                        <th>Qty</th>
                        <th>Untung</th>
                      </tr>
                    </thead>
                    <tbody>
                      {p.items.map((it) => (
                        <tr key={it.id}>
                          <td>{it.nama_produk}</td>
                          <td>{it.kuantiti}</td>
                          <td style={{ color: "var(--green)" }}>+{fmt(Number(it.untung))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="toolbar" style={{ marginTop: 8 }}>
                    <button className="btn" onClick={() => openEditOrder(p)}>Edit</button>{" "}
                    <button className="btn danger" onClick={() => deleteOrder(p.id)}>Padam</button>
                  </div>
                </div>
              ))
            )}
            <div className="modal-actions">
              <button className="btn secondary" onClick={() => setShowView(false)}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditOrder && editOrder && (
        <div className="modal-backdrop" onClick={() => setShowEditOrder(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Pesanan</h3>
            <div className="field">
              <label>Tarikh</label>
              <input
                type="datetime-local"
                value={editOrderTarikh}
                onChange={(e) => setEditOrderTarikh(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Catatan</label>
              <input
                value={editOrderCatatan}
                onChange={(e) => setEditOrderCatatan(e.target.value)}
              />
            </div>
            <label className="muted" style={{ fontSize: 13 }}>Item</label>
            {editOrderItems.map((it, idx) => (
              <div className="item-row" key={idx}>
                <input
                  value={it.nama_produk}
                  placeholder="Nama produk"
                  onChange={(e) => updateOrderItem(idx, { nama_produk: e.target.value })}
                />
                <input
                  type="number"
                  min="1"
                  value={it.kuantiti}
                  onChange={(e) => updateOrderItem(idx, { kuantiti: Number(e.target.value) })}
                />
                <input
                  type="number"
                  step="0.01"
                  value={it.harga_satuan}
                  onChange={(e) => updateOrderItem(idx, { harga_satuan: Number(e.target.value) })}
                />
                <button
                  className="btn danger"
                  onClick={() =>
                    setEditOrderItems((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== idx) : prev))
                  }
                  disabled={editOrderItems.length === 1}
                >
                  ×
                </button>
              </div>
            ))}
            <button className="btn secondary" onClick={addOrderItemRow} style={{ marginBottom: 12 }}>
              + Item lain
            </button>
            <div className="modal-actions">
              <button className="btn secondary" onClick={() => setShowEditOrder(false)}>
                Batal
              </button>
              <button className="btn" onClick={saveEditOrder}>
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      <NegeriPie data={negeriAgg} />
    </div>
  );
}

const NEGERI_COLORS = [
  "#38bdf8", "#a855f7", "#22c55e", "#f59e0b", "#ef4444",
  "#06b6d4", "#ec4899", "#84cc16", "#f97316", "#6366f1",
  "#14b8a6", "#eab308", "#d946ef", "#0ea5e9",
];

function NegeriPie({ data }: { data: { negeri: string; orders: number; jualan: number }[] }) {
  const total = data.reduce((s, d) => s + d.orders, 0) || 1;
  let acc = 0;
  const R = 80, C = 100, circ = 2 * Math.PI * R;
  return (
    <div className="negeri-pie-wrap">
      <svg viewBox="0 0 200 200" className="negeri-pie">
        {data.map((d, i) => {
          const frac = d.orders / total;
          const dash = frac * circ;
          const el = (
            <circle
              key={d.negeri}
              cx={C}
              cy={C}
              r={R}
              fill="none"
              stroke={NEGERI_COLORS[i % NEGERI_COLORS.length]}
              strokeWidth={36}
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-acc * circ}
              transform="rotate(-90 100 100)"
            />
          );
          acc += frac;
          return el;
        })}
        <text x={C} y={C - 4} textAnchor="middle" fontSize={20} fill="#e2e8f0" fontWeight={700}>
          {total}
        </text>
        <text x={C} y={C + 16} textAnchor="middle" fontSize={12} fill="#94a3b8">
          orders
        </text>
      </svg>
      <div className="negeri-legend">
        {data.map((d, i) => (
          <div className="negeri-leg" key={d.negeri}>
            <span
              className="swatch"
              style={{ background: NEGERI_COLORS[i % NEGERI_COLORS.length] }}
            />
            {d.negeri} ({d.orders})
          </div>
        ))}
      </div>
    </div>
  );
}
