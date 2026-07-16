import { useEffect, useState } from "react";
import { supabase, isConfigured } from "../lib/supabase";
import { NEGERI } from "../lib/banner";
import PetaPelanggan from "../components/PetaPelanggan";
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

const BLANK_ITEMS: DraftItem[] = [
  { produk_id: null, nama_produk: "", kuantiti: 1, harga_satuan: 0, kos_satuan: 0 },
];

// Lightweight lookup: negeri name -> slug (untuk hover highlight pada peta)
const LOKASI_TO_SLUG_LIGHT: Record<string, string> = {
  "Johor": "johor", "Kedah": "kedah", "Kelantan": "kelantan",
  "Melaka": "melaka", "Negeri Sembilan": "negeri-sembilan",
  "Pahang": "pahang", "Pulau Pinang": "penang", "Perak": "perak",
  "Perlis": "perlis", "Sabah": "sabah", "Sarawak": "sarawak",
  "Selangor": "selangor", "Terengganu": "terengganu",
  "Wilayah Persekutuan": "kuala-lumpur", "Kuala Lumpur": "kuala-lumpur",
  "Putrajaya": "putrajaya", "Labuan": "labuan",
};

export default function PelangganPage() {
  const [rows, setRows] = useState<Pelanggan[]>([]);
  const [produk, setProduk] = useState<Produk[]>([]);
  const [pesananAll, setPesananAll] = useState<PesananLengkap[]>([]);
  const [negeriAgg, setNegeriAgg] = useState<{ negeri: string; orders: number; jualan: number }[]>([]);
  const [mapKey, setMapKey] = useState(0); // refresh peta bila data pelanggan berubah
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

  // carian pelanggan sedia ada
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState<Pelanggan | null>(null);
  const [searchMsg, setSearchMsg] = useState<string | null>(null);
  const [searchDup, setSearchDup] = useState(false);

  // hover highlight untuk 5 Teratas -> peta
  const [highlightNegeri, setHighlightNegeri] = useState<string | null>(null);

  const [items, setItems] = useState<DraftItem[]>(BLANK_ITEMS);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("pelanggan")
      .select("*")
      .order("nama");
    if (!error && data) setRows(data as Pelanggan[]);
    setLoading(false);
  }

  async function refreshPesanan() {
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
    setItems(BLANK_ITEMS);
    setShowModal(true);
  }

  function openEdit(p: Pelanggan) {
    setShowView(false);
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
    setShowView(false);
    setOrderCust(p);
    setItems(BLANK_ITEMS);
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
    await refreshPesanan();
    setMapKey((k) => k + 1);
  }

  async function deleteOrder(id: string) {
    if (!confirm("Padam pesanan ini? (semua item juga dipadam)")) return;
    await supabase.from("pesanan").delete().eq("id", id);
    setShowView(false);
    load();
    await refreshPesanan();
    setMapKey((k) => k + 1);
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

  // cari pelanggan sedia ada ikut nama atau nombor telefon
  async function doSearch() {
    const q = search.trim();
    if (!q) {
      setSearchResult(null);
      setSearchMsg(null);
      setSearchDup(false);
      return;
    }
    const { data } = await supabase
      .from("pelanggan")
      .select("*")
      .or(`nama.ilike.%${q}%,phone.ilike.%${q}%`);
    const found = (data ?? []) as Pelanggan[];
    if (found.length > 0) {
      const c = found[0];
      setSearchResult(c);
      const orderCount = pesananAll.filter((p) => p.pelanggan_id === c.id).length;
      setSearchDup(orderCount > 0);
      setSearchMsg(
        orderCount > 0
          ? `Nombor/ nama "${q}" PERNAH ORDER (${orderCount} pesanan). Boleh edit & tambah pesanan sedia ada.`
          : `Pelanggan "${c.nama}" wujud tapi belum pernah order.`
      );
    } else {
      setSearchResult(null);
      setSearchDup(false);
      setSearchMsg(`Tiada padanan untuk "${q}". Boleh tambah baru di bawah.`);
    }
  }

  async function insertOrderFor(pelangganId: string) {
    const valid = items.filter((it) => it.nama_produk.trim() !== "");
    if (valid.length === 0) return;
    const jumlahBaru = valid.reduce(
      (s, it) => s + (Number(it.kuantiti) || 0) * (Number(it.harga_satuan) || 0),
      0
    );
    const { data: inserted, error } = await supabase
      .from("pesanan")
      .insert({ pelanggan_id: pelangganId, jumlah: jumlahBaru })
      .select()
      .single();
    if (error || !inserted) {
      alert("Pelanggan disimpan, tapi pesanan gagal: " + (error?.message ?? "unknown"));
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
    await supabase.from("item_pesanan").insert(lineItems);
  }

  async function saveOrder() {
    const valid = items.filter((it) => it.nama_produk.trim() !== "");
    if (!orderCust || valid.length === 0) {
      alert("Sila tambah sekurang-kurangnya satu item.");
      return;
    }
    await insertOrderFor(orderCust.id);
    setShowOrder(false);
    alert("Pesanan disimpan! Ia akan muncul di Dashboard & page ini.");
    await refreshPesanan();
    setMapKey((k) => k + 1);
  }

  // simpan pelanggan. elak duplicate nombor telefon: kalau nombor wujud,
  // alert & batalkan (guna rekod sedia ada untuk tambah pesanan).
  async function save() {
    const phone = form.phone.trim();
    if (!edit && phone) {
      const { data: dup } = await supabase
        .from("pelanggan")
        .select("*")
        .eq("phone", phone);
      if (dup && dup.length > 0) {
        const existing = dup[0] as Pelanggan;
        const orderCount = pesananAll.filter((p) => p.pelanggan_id === existing.id).length;
        alert(
          `Nombor ${phone} SUDAH WUJUD (${existing.nama})${
            orderCount > 0 ? ` dan pernah order ${orderCount} kali` : ""
          }.\n\nGuna butang "Lihat" pada pelanggan tersebut untuk tambah pesanan, bukan tambah baru.`
        );
        return;
      }
    }

    const payload = {
      nama: form.nama,
      phone: form.phone || null,
      email: form.email || null,
      lokasi: form.lokasi || null,
    };

    if (edit) {
      await supabase.from("pelanggan").update(payload).eq("id", edit.id);
      setShowModal(false);
      load();
      return;
    }

    const { data: newCust, error } = await supabase
      .from("pelanggan")
      .insert(payload)
      .select()
      .single();
    if (error || !newCust) {
      alert("Gagal simpan pelanggan: " + (error?.message ?? "unknown"));
      return;
    }

    await insertOrderFor((newCust as Pelanggan).id);

    setShowModal(false);
    load();
    await refreshPesanan();
    setMapKey((k) => k + 1);
  }

  async function hapus(id: string) {
    if (!confirm("Padam pelanggan ini?")) return;
    setShowView(false);
    await supabase.from("pelanggan").delete().eq("id", id);
    load();
    setMapKey((k) => k + 1);
  }

  const fmt = (n: number) =>
    "RM " + n.toLocaleString("ms-MY", { minimumFractionDigits: 2 });

  const custOrders = viewCust ? pesananAll.filter((p) => p.pelanggan_id === viewCust.id) : [];
  const lastOrder = custOrders.length > 0 ? custOrders[0] : null; // dah sorted desc
  const repeatCount = custOrders.length;

  function totalJualanFor(id: string) {
    return pesananAll.filter((p) => p.pelanggan_id === id).reduce((s, p) => s + Number(p.jumlah), 0);
  }

  function ItemPicker({ compactTitle }: { compactTitle?: string }) {
    return (
      <>
        {compactTitle && (
          <label className="muted" style={{ fontSize: 13, display: "block", marginBottom: 8 }}>
            {compactTitle}
          </label>
        )}
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
              onChange={(e) => updateItem(idx, { harga_satuan: Number(e.target.value) })}
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
        {jumlah > 0 && (
          <div style={{ textAlign: "right", fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
            Jualan: {fmt(jumlah)} · <span style={{ color: "var(--green)" }}>Untung: {fmt(untung)}</span>
          </div>
        )}
      </>
    );
  }

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
        {/* Peta di SEBELAH KIRI */}
        <div>
          <h3 style={{ marginTop: 0, marginBottom: 12 }}>Peta Pelanggan ikut Negeri</h3>
          <PetaPelanggan refreshKey={mapKey} highlightSlug={highlightNegeri} />
        </div>

        {/* 5 Teratas di SEBELAH KANAN */}
        <div className="top-negeri">
          <h3 style={{ marginTop: 0 }}>5 Teratas (Order)</h3>
          {loading ? (
            <p className="muted">Memuatkan…</p>
          ) : negeriAgg.length === 0 ? (
            <div className="empty">Tiada data negeri.</div>
          ) : (
            negeriAgg.slice(0, 5).map((n, i) => (
              <div
                className="top-row"
                key={n.negeri}
                onMouseEnter={() => setHighlightNegeri(LOKASI_TO_SLUG_LIGHT[n.negeri] ?? null)}
                onMouseLeave={() => setHighlightNegeri(null)}
                style={{ cursor: "pointer" }}
              >
                <span className="top-rank">{i + 1}</span>
                <span className="top-name">{n.negeri}</span>
                <span className="top-val">{n.orders} order</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Carian pelanggan sedia ada (elak duplicate) */}
      <div className="search-bar">
        <input
          placeholder="Cari nama atau nombor telefon…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && doSearch()}
        />
        <button className="btn" onClick={doSearch}>
          Cari
        </button>
      </div>
      {searchMsg && (
        <div className={"search-result" + (searchResult ? (searchDup ? " dup" : " found") : "")}>
          {searchResult ? (
            <>
              <div className="sr-name">{searchResult.nama}</div>
              <div className="sr-meta">
                {searchResult.phone ?? "-"} · {searchResult.lokasi ?? "-"}
              </div>
              <div className="toolbar" style={{ margin: "10px 0 0" }}>
                <button className="btn" onClick={() => openView(searchResult)}>Lihat / Tambah Pesanan</button>
                <button className="btn secondary" onClick={() => openEdit(searchResult)}>Edit</button>
              </div>
            </>
          ) : (
            <div className="sr-meta">{searchMsg}</div>
          )}
          {searchResult && <div className="sr-meta" style={{ marginTop: 6 }}>{searchMsg}</div>}
        </div>
      )}

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
        <div className="simple-list">
          {rows.map((p) => {
            const bil = pesananAll.filter((x) => x.pelanggan_id === p.id).length;
            return (
              <button key={p.id} className="list-row" onClick={() => openView(p)}>
                <div className="list-row-main">
                  <span className="list-row-title">{p.nama}</span>
                  <span className="list-row-sub">
                    {p.phone ?? "-"} · {bil} pesanan
                  </span>
                </div>
                <div className="list-row-value">{fmt(totalJualanFor(p.id))}</div>
                <span className="list-row-chevron">›</span>
              </button>
            );
          })}
        </div>
      )}

      {showView && viewCust && (
        <div className="modal-backdrop" onClick={() => setShowView(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>{viewCust.nama}</h3>
            <div className="detail-grid">
              <div className="detail-row">
                <span className="muted">Telefon</span>
                <span>{viewCust.phone ?? "-"}</span>
              </div>
              <div className="detail-row">
                <span className="muted">Email</span>
                <span>{viewCust.email ?? "-"}</span>
              </div>
              <div className="detail-row">
                <span className="muted">Lokasi</span>
                <span>{viewCust.lokasi ?? "-"}</span>
              </div>
              <div className="detail-row">
                <span className="muted">Total Jualan</span>
                <span style={{ color: "var(--accent)", fontWeight: 700 }}>{fmt(totalJualanFor(viewCust.id))}</span>
              </div>
              <div className="detail-row">
                <span className="muted">Jumlah Pesanan</span>
                <span style={{ fontWeight: 700 }}>{repeatCount}</span>
              </div>
              <div className="detail-row">
                <span className="muted">Last Order</span>
                <span style={{ fontWeight: 700 }}>
                  {lastOrder ? new Date(lastOrder.tarikh).toLocaleString("ms-MY") : "—"}
                </span>
              </div>
            </div>

            <div className="toolbar" style={{ marginBottom: 16 }}>
              <button className="btn" onClick={() => openOrder(viewCust)}>+ Pesanan</button>
              <button className="btn secondary" onClick={() => openEdit(viewCust)}>Edit</button>
              <button className="btn danger" onClick={() => hapus(viewCust.id)}>Padam</button>
            </div>

            <h4 style={{ margin: "0 0 10px" }}>Sejarah Pesanan</h4>
            {custOrders.length === 0 ? (
              <p className="muted">Pelanggan ini belum ada pesanan. Klik "+ Pesanan" untuk rekod.</p>
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
                          <td data-label="Produk">{it.nama_produk}</td>
                          <td data-label="Qty">{it.kuantiti}</td>
                          <td data-label="Untung" style={{ color: "var(--green)" }}>+{fmt(Number(it.untung))}</td>
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

            {!edit && (
              <ItemPicker compactTitle="Produk / Pesanan Pertama (pilihan)" />
            )}

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
            <ItemPicker />
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
    </div>
  );
}

// NegeriPie dibuang — hanya peta & 5 teratas digunakan sekarang.
