import { useEffect } from "react";
import { Routes, Route, NavLink, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import { initTheme, getTheme } from "./lib/theme";
import { getCompany } from "./lib/company";
import Logo from "./components/Logo";
import Dashboard from "./pages/Dashboard";
import ProdukPage from "./pages/Produk";
import PelangganPage from "./pages/Pelanggan";
import Setting from "./pages/Setting";
import Login from "./pages/Login";

const nav = [
  { to: "/", label: "📊 Dashboard", end: true },
  { to: "/produk", label: "📦 Produk" },
  { to: "/pelanggan", label: "👥 Pelanggan" },
  { to: "/setting", label: "⚙️ Setting" },
];

function Shell() {
  const { user, signOut } = useAuth();
  const company = getCompany();

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <Logo size={26} />
          <span>{company}</span>
        </div>
        <nav>
          {nav.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="muted" style={{ marginBottom: 8, fontSize: 12 }}>
            {user?.email}
          </div>
          <button
            className="btn secondary"
            style={{ width: "100%" }}
            onClick={() => signOut()}
          >
            Log Keluar
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
