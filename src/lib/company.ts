export const COMPANY_KEY = "sp_company";
export const LOGO_KEY = "sp_logo";

export function getCompany(): string {
  return localStorage.getItem(COMPANY_KEY) || "SalesPro";
}

export function setCompany(v: string): void {
  localStorage.setItem(COMPANY_KEY, v.trim() || "SalesPro");
}

export function getLogo(): string | null {
  return localStorage.getItem(LOGO_KEY);
}

export function setLogo(v: string | null): void {
  if (v) localStorage.setItem(LOGO_KEY, v);
  else localStorage.removeItem(LOGO_KEY);
}
