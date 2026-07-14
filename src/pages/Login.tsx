import { useState } from "react";
import { useAuth } from "../lib/auth";
import { getCompany } from "../lib/company";
import Logo from "../components/Logo";

export default function Login() {
  const { signIn, configured } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const company = getCompany();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const r = await signIn(email, password);
    if (r.error) setMsg({ type: "err", text: r.error });
    else setMsg({ type: "ok", text: "Log masuk…" });
    setBusy(false);
  }

  if (!configured) {
    return (
      <div className="login-wrap">
        <div className="login-card">
          <div className="login-logo">
            <Logo size={56} />
          </div>
          <h2>{company}</h2>
          <div className="banner">
            Sila isi <code>.env</code> dengan <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> dan
            restart dev server.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="login-logo">
          <Logo size={56} />
        </div>
        <h2>{company}</h2>
        <p className="muted" style={{ marginTop: -6 }}>
          Log Masuk Admin
        </p>

        <form onSubmit={submit}>
          <div className="field">
            <label>Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label>Kata Laluan</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {msg && (
            <div className={msg.type === "err" ? "banner" : "ok-banner"}>{msg.text}</div>
          )}

          <button className="btn" style={{ width: "100%", marginTop: 6 }} disabled={busy}>
            Log Masuk
          </button>
        </form>
      </div>
    </div>
  );
}
