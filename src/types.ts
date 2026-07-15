export type Produk = {
  id: string;
  nama: string;
  harga: number;
  kos: number;
  stok: number;
  created_at: string;
};

export type Pelanggan = {
  id: string;
  nama: string;
  phone: string | null;
  email: string | null;
  lokasi: string | null;
  created_at: string;
};

export type Pesanan = {
  id: string;
  pelanggan_id: string | null;
  tarikh: string;
  jumlah: number;
  catatan: string | null;
  created_at: string;
};

export type ItemPesanan = {
  id: string;
  pesanan_id: string;
  produk_id: string | null;
  nama_produk: string;
  kuantiti: number;
  harga_satuan: number;
  kos_satuan: number;
  subtotal: number;
  untung: number;
};

// Bentuk pesanan lengkap (join) untuk kegunaan UI.
export type PesananLengkap = Pesanan & {
  pelanggan_nama: string | null;
  items: ItemPesanan[];
};

export type RekodTahunan = {
  id: string;
  tahun: number;
  jualan: number;
  untung: number;
  catatan: string | null;
};

export type Nota = {
  id: string;
  tajuk: string;
  isi: string | null;
  created_at: string;
};
