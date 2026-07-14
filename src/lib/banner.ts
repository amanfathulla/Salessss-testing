export const BANNER_KEY = "sp_banner";

export function getBanner(): string | null {
  return localStorage.getItem(BANNER_KEY);
}

export function setBanner(v: string | null): void {
  if (v) localStorage.setItem(BANNER_KEY, v);
  else localStorage.removeItem(BANNER_KEY);
}

export const NEGERI = [
  "Johor",
  "Kedah",
  "Kelantan",
  "Melaka",
  "Negeri Sembilan",
  "Pahang",
  "Pulau Pinang",
  "Perak",
  "Perlis",
  "Sabah",
  "Sarawak",
  "Selangor",
  "Terengganu",
  "Wilayah Persekutuan",
];
