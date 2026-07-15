import { useEffect, useState } from "react";
import { Routes, Route, NavLink, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import { initTheme, getTheme } from "./lib/theme";
import { getCompany } from "./lib/company";
import Logo from "./components/Logo";
import { IconDashboard, IconBox, IconUsers, IconGear, IconLogout, IconChevron, IconMenu, IconClose } from "./components/icons";
import Dashboard from "./pages/Dashboard";
import ProdukPage from "./pages/Produk";
import PelangganPage from "./pages/Pelanggan";
import Setting from "./pages/Setting";
import Login from "./pages/Login";

const nav = [
  { to: "/", label: "Dashboard", icon: IconDashboard, end: true },
  { to: "/produk", label: "Produk", icon: IconBox },
  { to: "/pelanggan", label: "Pelanggan", icon: IconUsers },
  { to: "/setting", label: "Setting", icon: IconGear },
];

const SIDEBAR_KEY = "sp_sidebar_collapsed";

function initials(email?: string | null): string {
  if (!email) return "?";
  const name = email.split("@")[0];
  const parts = name.split(/[._-]/).filter(Boolean);
  const chars = parts.length > 1 ? parts[0][0] + parts[1][0] : name.slice(0, 2);
  return chars.toUpperCase();
}

function Shell() {
  const { user, signOut } = useAuth();
  const company = getCompany();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(SIDEBAR_KEY) === "1");
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, collapsed ? "1" : "0");
  }, [collapsed]);

  // tutup drawer bila skrin ditukar ke desktop
  useEffect(() => {
    const onResize = () => { if (window.innerWidth > 860) setMobileOpen(false); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // elak scroll belakang bila drawer terbuka
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  return (
    <div className="layout">
      <header className="mobile-topbar">
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileOpen(true)}
          aria-label="Buka menu"
        >
          <IconMenu size={20} />
        </button>
        <div className="mobile-brand">
          <Logo size={22} />
          <span>{company}</span>
        </div>
        <span className="avatar avatar-sm">{initials(user?.email)}</span>
      </header>

      {mobileOpen && <div className="sidebar-backdrop" onClick={() => setMobileOpen(false)} />}

      <aside className={`sidebar${collapsed ? " collapsed" : ""}${mobileOpen ? " mobile-open" : ""}`}>
        <button
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Kembangkan bar sisi" : "Kuncupkan bar sisi"}
          title={collapsed ? "Kembangkan" : "Kuncupkan"}
        >
          <span className="collapse-chevron"><IconChevron size={13} /></span>
        </button>

        <button
          className="sidebar-close-btn"
          onClick={() => setMobileOpen(false)}
          aria-label="Tutup menu"
        >
          <IconClose size={18} />
        </button>

        <div className="brand">
          <Logo size={26} />
          <span className="brand-name">{company}</span>
        </div>

        <div className="nav-section-label">Menu</div>
        <nav>
          {nav.map((n) => {
            const Icon = n.icon;
            return (
              <NavLink key={n.to} to={n.to} end={n.end} title={n.label} onClick={() => setMobileOpen(false)}>
                <span className="nav-icon"><Icon size={18} /></span>
                <span className="nav-label">{n.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="sidebar-foot">
          <div className="sidebar-user" title={user?.email ?? undefined}>
            <span className="avatar">{initials(user?.email)}</span>
            <span className="user-email">{user?.email}</span>
          </div>
          <button
            className="sidebar-logout-btn"
            onClick={() => signOut()}
            title="Log Keluar"
            aria-label="Log Keluar"
          >
            <IconLogout size={17} />
            <span className="nav-label">Log Keluar</span>
          </button>
        </div>
      </aside>
      <main className="content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/produk" element={<ProdukPage />} />
          <Route path="/pelanggan" element={<PelangganPage />} />
          <Route path="/setting" element={<Setting />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

function Root() {
  const { user, loading, configured } = useAuth();

  useEffect(() => {
    initTheme();
  }, []);

  if (!configured)
    return (
      <div className="login-wrap">
        <div className="login-card">
          <div className="login-logo">💼</div>
          <h2>{getCompany()}</h2>
          <div className="banner">
            Sila isi <code>.env</code> dengan <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> dan
            restart dev server.
          </div>
        </div>
      </div>
    );

  if (loading) return <div className="login-wrap"><div className="muted">Memuatkan…</div></div>;

  if (!user) return <Login />;

  return <Shell />;
}

export default function App() {
  // pastikan data-theme ada sekali gus (untuk flash awal)
  if (typeof document !== "undefined" && !document.documentElement.getAttribute("data-theme")) {
    document.documentElement.setAttribute("data-theme", getTheme());
  }
  return (
    <AuthProvider>
      <Root />
    </AuthProvider>
  );
}
