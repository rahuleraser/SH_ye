import React, { useEffect, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { t } from "./i18n";
import { api, getLang, setLang, getToken, setToken } from "./api";

export function useToast() {
  const [msg, setMsg] = useState("");
  useEffect(() => {
    if (!msg) return;
    const id = setTimeout(() => setMsg(""), 3200);
    return () => clearTimeout(id);
  }, [msg]);
  return {
    msg,
    show: setMsg,
    node: msg ? <div className="toast" role="status">{msg}</div> : null,
  };
}

export function Badge({ children }) {
  const v = String(children || "").toLowerCase();
  return <span className={`badge ${v}`}>{children}</span>;
}

export function Modal({ title, onClose, children }) {
  return (
    <div className="modal-back" onClick={onClose} role="dialog">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="toolbar">
          <h3 style={{ margin: 0 }}>{title}</h3>
          <button className="btn ghost" onClick={onClose}>Close</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

export function Pager({ page, pages, onPage }) {
  return (
    <div className="toolbar">
      <button className="btn ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}>Prev</button>
      <span>Page {page} / {pages}</span>
      <button className="btn ghost" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
    </div>
  );
}

export function Chart({ data }) {
  const max = Math.max(1, ...data.map((d) => Number(d.total || d.c || 0)));
  return (
    <div className="chart" aria-hidden="true">
      {data.map((d, i) => (
        <i key={i} title={`${d.month || d.state || i}: ${d.total || d.c}`} style={{ height: `${(Number(d.total || d.c || 0) / max) * 100}%` }} />
      ))}
    </div>
  );
}

export function Empty({ text }) {
  return <div className="empty">{text || "No records yet."}</div>;
}

export function PublicNav({ user, onLogout, lang, onLang }) {
  return (
    <header className="nav">
      <Link className="brand" to="/">
        <img src="/logo.svg" alt="" /> {t(lang, "brand")}
      </Link>
      <nav className="links">
        <Link to="/ngos">{t(lang, "ngos")}</Link>
        <Link to="/campaigns">{t(lang, "campaigns")}</Link>
        <Link to="/programs">{t(lang, "programs")}</Link>
        <Link to="/events">{t(lang, "events")}</Link>
        <Link to="/volunteer">{t(lang, "volunteer")}</Link>
        <Link to="/impact">{t(lang, "impact")}</Link>
        <Link to="/stories">{t(lang, "stories")}</Link>
        <button className="lang" onClick={onLang}>{t(lang, "language")}</button>
        {user ? (
          <>
            <Link to={portalPath(user.role)}>{t(lang, "dashboard")}</Link>
            <button className="btn secondary" onClick={onLogout}>{t(lang, "logout")}</button>
          </>
        ) : (
          <>
            <Link to="/login">{t(lang, "login")}</Link>
            <Link className="btn" to="/donate">{t(lang, "ctaDonate")}</Link>
          </>
        )}
      </nav>
    </header>
  );
}

export function portalPath(role) {
  if (role === "super_admin") return "/admin";
  if (["ngo_admin", "ngo_staff", "teacher"].includes(role)) return "/ngo";
  return "/dashboard";
}

export function Footer({ lang }) {
  return (
    <footer className="footer wrap">
      <div className="grid grid-3">
        <div>
          <strong>SevaSetu</strong>
          <p>{t(lang, "tagline")}</p>
        </div>
        <div>
          <Link to="/about">{t(lang, "about")}</Link><br />
          <Link to="/transparency">{t(lang, "transparency")}</Link><br />
          <Link to="/contact">{t(lang, "contact")}</Link>
        </div>
        <div>
          <Link to="/privacy">{t(lang, "privacy")}</Link><br />
          <Link to="/terms">{t(lang, "terms")}</Link><br />
          <Link to="/refund">{t(lang, "refund")}</Link>
        </div>
      </div>
      <p>On-premises datacenter edition. Domain: abcyz.in (configurable).</p>
    </footer>
  );
}

export function MobileNav({ lang }) {
  return (
    <nav className="mobile-nav" aria-label="Mobile">
      <Link to="/">{t(lang, "home")}</Link>
      <Link to="/programs">{t(lang, "programs")}</Link>
      <Link to="/donate">{t(lang, "donate")}</Link>
      <Link to="/events">{t(lang, "events")}</Link>
      <Link to="/login">{t(lang, "login")}</Link>
    </nav>
  );
}

export function DataTable({ rows, columns, onEdit, onRemove, actions }) {
  if (!rows || !rows.length) return <Empty />;
  return (
    <div style={{ overflowX: "auto" }}>
      <table>
        <thead>
          <tr>
            {columns.map((c) => <th key={c.key}>{c.label}</th>)}
            {(onEdit || onRemove || actions) && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              {columns.map((c) => (
                <td key={c.key}>{c.render ? c.render(r) : String(r[c.key] ?? "")}</td>
              ))}
              {(onEdit || onRemove || actions) && (
                <td>
                  {onEdit && <button className="btn ghost" onClick={() => onEdit(r)}>Edit</button>}{" "}
                  {onRemove && <button className="btn danger" onClick={() => onRemove(r)}>Delete</button>}
                  {actions && actions(r)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CrudPage({ title, resourceName, columns, fields, extra, queryExtra }) {
  const [data, setData] = useState({ data: [], page: 1, pages: 1, total: 0 });
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null);
  const [err, setErr] = useState("");
  const toast = useToast();

  async function load() {
    try {
      const res = await api(`/${resourceName}`, { query: { q, page, limit: 15, ...queryExtra } });
      setData(res);
    } catch (e) {
      setErr(e.message);
    }
  }
  useEffect(() => { load(); }, [q, page, resourceName]);

  async function save(e) {
    e.preventDefault();
    try {
      if (form.id) await api(`/${resourceName}/${form.id}`, { method: "PUT", body: form });
      else await api(`/${resourceName}`, { method: "POST", body: form });
      setForm(null);
      toast.show("Saved");
      load();
    } catch (ex) {
      setErr(ex.message);
    }
  }

  async function remove(row) {
    if (!confirm("Delete this record?")) return;
    await api(`/${resourceName}/${row.id}`, { method: "DELETE" });
    toast.show("Deleted");
    load();
  }

  async function exportCsv() {
    const res = await api(`/${resourceName}`, { query: { q, export: "csv", limit: 1000 }, raw: true });
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${resourceName}.csv`;
    a.click();
  }

  return (
    <div>
      <div className="toolbar">
        <h2 style={{ margin: 0 }}>{title}</h2>
        <input className="input" style={{ maxWidth: 240 }} placeholder="Search" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <button className="btn" onClick={() => setForm({})}>Add</button>
        <button className="btn ghost" onClick={exportCsv}>Export CSV</button>
      </div>
      {err && <p className="err">{err}</p>}
      <DataTable rows={data.data} columns={columns} onEdit={setForm} onRemove={remove} actions={extra} />
      <Pager page={data.page} pages={data.pages} onPage={setPage} />
      {form && (
        <Modal title={form.id ? "Edit" : "Create"} onClose={() => setForm(null)}>
          <form onSubmit={save}>
            {fields.map((f) => (
              <Field key={f.key} label={f.label}>
                {f.type === "textarea" ? (
                  <textarea className="input" rows={4} value={form[f.key] || ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} required={f.required} />
                ) : f.type === "select" ? (
                  <select className="input" value={form[f.key] || ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
                    <option value="">Select</option>
                    {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input className="input" type={f.type || "text"} value={form[f.key] ?? ""} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} required={f.required} />
                )}
              </Field>
            ))}
            <button className="btn" type="submit">Save</button>
          </form>
        </Modal>
      )}
      {toast.node}
    </div>
  );
}

export function Side({ items }) {
  return (
    <aside className="side">
      <Link className="brand" to="/" style={{ color: "#fff", marginBottom: 16 }}>
        <img src="/logo.svg" alt="" /> SevaSetu
      </Link>
      {items.map((it) =>
        it.group ? (
          <div key={it.group} style={{ opacity: 0.6, fontSize: 12, margin: "14px 10px 6px" }}>{it.group}</div>
        ) : (
          <NavLink key={it.to} to={it.to} className={({ isActive }) => (isActive ? "active" : "")}>{it.label}</NavLink>
        )
      )}
    </aside>
  );
}

export function Guard({ user, roles, children }) {
  const nav = useNavigate();
  useEffect(() => {
    if (!getToken()) nav("/login");
    else if (user && roles && !roles.includes(user.role) && user.role !== "super_admin") nav("/403");
  }, [user]);
  if (!user) return <p className="wrap">Loading session…</p>;
  return children;
}

export function useSession() {
  const [user, setUser] = useState(null);
  const [lang, setL] = useState(getLang());
  const [ready, setReady] = useState(false);
  useEffect(() => {
    (async () => {
      if (!getToken()) {
        setReady(true);
        return;
      }
      try {
        setUser(await api("/auth/me"));
      } catch {
        setToken("");
      }
      setReady(true);
    })();
  }, []);
  function toggleLang() {
    const n = lang === "en" ? "hi" : "en";
    setLang(n);
    setL(n);
  }
  async function logout() {
    try { await api("/auth/logout", { method: "POST" }); } catch {}
    setToken("");
    setUser(null);
  }
  return { user, setUser, lang, toggleLang, logout, ready };
}
