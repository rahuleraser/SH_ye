import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, Auth, setToken } from "./api";
import { t } from "./i18n";
import {
  PublicNav, Footer, MobileNav, Badge, Chart, Field, DataTable,
  CrudPage, Empty, useToast, portalPath
} from "./components.jsx";
import { causeImage, campaignImage, eventImage, storyImage, ngoImage, GALLERY, PROGRAMS } from "./images";

export function Shell({ user, lang, onLang, onLogout, children }) {
  return (
    <>
      <PublicNav user={user} lang={lang} onLang={onLang} onLogout={onLogout} />
      {children}
      <Footer lang={lang} />
      <MobileNav lang={lang} />
    </>
  );
}

export function Home({ lang }) {
  const [impact, setImpact] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [ngos, setNgos] = useState([]);
  useEffect(() => {
    api("/impact").then(setImpact);
    api("/campaigns", { query: { limit: 3 } }).then((r) => setCampaigns(r.data || []));
    api("/ngos", { query: { limit: 5 } }).then((r) => setNgos(r.data || []));
  }, []);
  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <p className="badge">On-premises · Multi-NGO · Education & Relief</p>
            <h1>{t(lang, "brand")}</h1>
            <p style={{ fontSize: 20, maxWidth: 640 }}>{t(lang, "tagline")}. Verified organisations. Transparent utilisation. Privacy by design.</p>
            <div className="toolbar">
              <Link className="btn gold" to="/donate">{t(lang, "ctaDonate")}</Link>
              <Link className="btn secondary" to="/volunteer">{t(lang, "ctaVolunteer")}</Link>
              <Link className="btn ghost" to="/ngos">Browse NGOs</Link>
            </div>
          </div>
          <img className="cover hero-img" src="/images/hero.svg" alt="Children learning with volunteers at a community centre" />
        </div>
      </section>
      <div className="wrap">
        <div className="grid grid-4">
          {[
            [impact?.beneficiaries, t(lang, "children")],
            [impact?.students, t(lang, "students")],
            [impact?.clothes, t(lang, "clothes")],
            [impact?.meals, t(lang, "meals")],
          ].map(([n, l]) => (
            <div className="card stat" key={l}><b>{n ?? "—"}</b>{l}</div>
          ))}
        </div>
        <h2>Active campaigns</h2>
        <div className="grid grid-3">
          {campaigns.map((c) => (
            <Link key={c.id} to={`/campaigns/${c.slug}`} className="card media">
              <img className="cover" src={campaignImage(c)} alt="" />
              <h3>{c.name}</h3>
              <p>{c.ngo_name} · {c.location}</p>
              <div className="progress"><div style={{ width: `${Math.min(100, (c.raised_amount / c.goal_amount) * 100)}%` }} /></div>
              <p>₹{c.raised_amount} / ₹{c.goal_amount}</p>
            </Link>
          ))}
        </div>
        <h2>Partner NGOs</h2>
        <div className="grid grid-3">
          {ngos.map((n) => (
            <Link key={n.id} to={`/ngos/${n.slug}`} className="card media">
              <img className="cover" src={causeImage(n.cause)} alt="" />
              <div className="toolbar">
                <img className="cover logo" src={ngoImage(n)} alt="" />
                <h3>{n.name} <Badge>verified</Badge></h3>
              </div>
              <p>{n.city}, {n.state}</p>
              <p>{n.cause}</p>
            </Link>
          ))}
        </div>
        <h2>From the field</h2>
        <div className="gallery">
          {GALLERY.map((g) => <img key={g.src} src={g.src} alt={g.alt} />)}
        </div>
      </div>
    </>
  );
}

export function NgoDirectory() {
  const [q, setQ] = useState("");
  const [cause, setCause] = useState("all");
  const [state, setState] = useState("all");
  const [data, setData] = useState({ data: [] });
  useEffect(() => {
    api("/ngos", { query: { q, cause, state, limit: 20 } }).then(setData);
  }, [q, cause, state]);
  return (
    <div className="wrap">
      <h1>NGO directory</h1>
      <div className="toolbar">
        <input className="input" style={{ maxWidth: 280 }} placeholder="Search NGO" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input" style={{ maxWidth: 200 }} value={cause} onChange={(e) => setCause(e.target.value)}>
          {["all", "education", "food", "clothing", "healthcare", "women empowerment", "child welfare", "skill development", "rural development"].map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className="input" style={{ maxWidth: 200 }} value={state} onChange={(e) => setState(e.target.value)}>
          {["all", "Karnataka", "Maharashtra", "Rajasthan", "Uttar Pradesh", "Telangana"].map((c) => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div className="grid grid-2">
        {data.data.map((n) => (
          <Link key={n.id} className="card media" to={`/ngos/${n.slug}`}>
            <img className="cover" src={causeImage(n.cause)} alt="" />
            <div className="toolbar">
              <img className="cover logo" src={ngoImage(n)} alt="" />
              <h3>{n.name} <Badge>{n.verification_status}</Badge></h3>
            </div>
            <p>{n.city}, {n.state} · {n.cause}</p>
            <p>{n.mission}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function NgoProfile() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("about");
  useEffect(() => { api(`/ngos/${slug}`).then(setData); }, [slug]);
  if (!data) return <div className="wrap">Loading…</div>;
  const n = data.ngo;
  return (
    <div className="wrap">
      <img className="cover banner" src={causeImage(n.cause)} alt="" />
      <div className="toolbar">
        <img className="cover logo" src={ngoImage(n)} alt="" />
        <h1>{n.name} <Badge>{n.verification_status}</Badge></h1>
      </div>
      <p>{n.city}, {n.state} · {n.ngo_type}</p>
      <div className="tabs">
        {["about", "programs", "campaigns", "events", "contact"].map((t0) => (
          <button key={t0} className={`tab ${tab === t0 ? "on" : ""}`} onClick={() => setTab(t0)}>{t0}</button>
        ))}
      </div>
      {tab === "about" && (
        <div className="card">
          <p>{n.about}</p>
          <p><strong>Mission:</strong> {n.mission}</p>
          <div className="gallery" style={{ marginTop: 16 }}>
            {GALLERY.map((g) => <img key={g.src} src={g.src} alt={g.alt} />)}
          </div>
        </div>
      )}
      {tab === "programs" && (
        <div className="grid grid-3">
          {PROGRAMS.slice(0, 6).map((p) => (
            <div className="card media" key={p.name}>
              <img className="cover" src={p.img} alt="" />
              <h3>{p.name}</h3>
            </div>
          ))}
        </div>
      )}
      {tab === "campaigns" && data.campaigns.map((c) => (
        <Link key={c.id} className="card media" to={`/campaigns/${c.slug}`} style={{ display: "block", marginBottom: 12 }}>
          <img className="cover" src={campaignImage(c)} alt="" />
          <h3>{c.name}</h3>
          <div className="progress"><div style={{ width: `${Math.min(100, (c.raised_amount / c.goal_amount) * 100)}%` }} /></div>
        </Link>
      ))}
      {tab === "events" && data.events.map((e) => (
        <div key={e.id} className="card media">
          <img className="cover" src={eventImage(e)} alt="" />
          <h3>{e.name}</h3>
          <p>{e.date} · {e.location}</p>
        </div>
      ))}
      {tab === "contact" && <div className="card"><p>{n.contact_person}</p><p>{n.email}</p><p>{n.phone}</p><p>Website: {n.website}</p></div>}
      <div className="toolbar">
        <Link className="btn" to={`/donate?ngo=${n.id}`}>Donate to {n.name}</Link>
        <Link className="btn secondary" to={`/volunteer?ngo=${n.id}`}>Volunteer</Link>
        <Link className="btn ghost" to={`/support?ngo=${n.id}`}>Apply for support</Link>
      </div>
    </div>
  );
}

export function CampaignList() {
  const [data, setData] = useState({ data: [] });
  useEffect(() => { api("/campaigns", { query: { limit: 20 } }).then(setData); }, []);
  return (
    <div className="wrap">
      <h1>Fundraising campaigns</h1>
      <div className="grid grid-2">
        {data.data.map((c) => (
          <Link key={c.id} className="card media" to={`/campaigns/${c.slug}`}>
            <img className="cover" src={campaignImage(c)} alt="" />
            <h3>{c.name}</h3>
            <p>{c.ngo_name} · {c.location}</p>
            <div className="progress"><div style={{ width: `${Math.min(100, (c.raised_amount / (c.goal_amount || 1)) * 100)}%` }} /></div>
            <p>₹{Number(c.raised_amount).toLocaleString("en-IN")} raised of ₹{Number(c.goal_amount).toLocaleString("en-IN")}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function CampaignPage() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  useEffect(() => { api(`/campaigns/${slug}`).then(setData); }, [slug]);
  if (!data) return <div className="wrap">Loading…</div>;
  const c = data.campaign;
  return (
    <div className="wrap">
      <img className="cover banner" src={campaignImage(c)} alt="" />
      <h1>{c.name}</h1>
      <p>{c.ngo_name} · {c.location}</p>
      <div className="progress"><div style={{ width: `${Math.min(100, (c.raised_amount / c.goal_amount) * 100)}%` }} /></div>
      <p>₹{c.raised_amount} / ₹{c.goal_amount} ({Math.round((c.raised_amount / c.goal_amount) * 100)}%)</p>
      <p>{c.description}</p>
      <Link className="btn gold" to={`/donate?campaign=${c.id}`}>Donate</Link>
      <h3>Recent donors</h3>
      {(data.donors || []).map((d, i) => <p key={i}>{d.donor_name || "Anonymous"} · ₹{d.amount}</p>)}
    </div>
  );
}

export function DonatePage() {
  const params = new URLSearchParams(window.location.search);
  const [campaigns, setCampaigns] = useState([]);
  const [form, setForm] = useState({
    campaign_id: params.get("campaign") || "",
    amount: 500,
    frequency: "one-time",
    name: "",
    email: "",
    phone: "",
    method: "upi",
  });
  const [done, setDone] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => { api("/campaigns", { query: { limit: 50 } }).then((r) => setCampaigns(r.data || [])); }, []);
  async function submit(e) {
    e.preventDefault();
    setErr("");
    try {
      const res = await api("/donations/public", { method: "POST", body: form });
      setDone(res);
    } catch (ex) { setErr(ex.message); }
  }
  if (done) {
    return (
      <div className="wrap">
        <div className="card">
          <h1>Thank you</h1>
          <p>Donation status: <Badge>{done.donation.status}</Badge></p>
          <p>Receipt: <strong>{done.receipt}</strong></p>
          <p>Reference: {done.payment.payment_ref}</p>
          <p>Amount: ₹{done.donation.amount} ({done.donation.frequency})</p>
          <button className="btn" onClick={() => window.print()}>Download / print receipt</button>
        </div>
      </div>
    );
  }
  return (
    <div className="wrap">
      <h1>Donate</h1>
      {form.campaign_id && campaigns.length > 0 && (
        <img className="cover banner" src={campaignImage(campaigns.find((c) => String(c.id) === String(form.campaign_id)) || campaigns[0])} alt="" />
      )}
      <form className="card" onSubmit={submit} style={{ maxWidth: 560 }}>
        <Field label="Campaign">
          <select className="input" value={form.campaign_id} onChange={(e) => setForm({ ...form, campaign_id: e.target.value })} required>
            <option value="">Select campaign</option>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name} — {c.ngo_name}</option>)}
          </select>
        </Field>
        <div className="toolbar">
          {[100, 500, 1000, 5000].map((n) => (
            <button type="button" key={n} className={`btn ${form.amount === n ? "" : "ghost"}`} onClick={() => setForm({ ...form, amount: n })}>₹{n}</button>
          ))}
        </div>
        <Field label="Custom amount (INR)">
          <input className="input" type="number" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} required />
        </Field>
        <Field label="Frequency">
          <select className="input" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
            <option value="one-time">One-time</option>
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="annual">Annual</option>
          </select>
        </Field>
        <Field label="Your name"><input className="input" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Email"><input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Phone"><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label="Method">
          <select className="input" value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
            <option value="upi">UPI</option>
            <option value="bank">Bank transfer</option>
            <option value="offline">Offline / cash</option>
          </select>
        </Field>
        {err && <p className="err">{err}</p>}
        <button className="btn gold" type="submit">Give ₹{form.amount}</button>
      </form>
    </div>
  );
}

export function VolunteerPage() {
  const params = new URLSearchParams(window.location.search);
  const [ngos, setNgos] = useState([]);
  const [form, setForm] = useState({ ngo_id: params.get("ngo") || "", name: "", email: "", phone: "", city: "", skills: "Teaching", availability: "weekends" });
  const [ok, setOk] = useState(false);
  useEffect(() => { api("/ngos", { query: { limit: 50 } }).then((r) => setNgos(r.data || [])); }, []);
  async function submit(e) {
    e.preventDefault();
    await api("/volunteers/apply", { method: "POST", body: form });
    setOk(true);
  }
  return (
    <div className="wrap">
      <img className="cover banner" src="/images/gallery-2.svg" alt="Volunteers packing kits" />
      <h1>Volunteer with SevaSetu</h1>
      {ok ? <div className="card">Application received. The NGO team will verify and contact you.</div> : (
        <form className="card" style={{ maxWidth: 560 }} onSubmit={submit}>
          <Field label="NGO">
            <select className="input" value={form.ngo_id} onChange={(e) => setForm({ ...form, ngo_id: e.target.value })} required>
              <option value="">Select</option>
              {ngos.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
            </select>
          </Field>
          {["name", "email", "phone", "city"].map((k) => (
            <Field key={k} label={k}><input className="input" required value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></Field>
          ))}
          <Field label="Skills">
            <select className="input" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })}>
              {["Teaching", "IT", "Fundraising", "Event management", "Medical", "Photography", "Social media", "Driving", "Logistics", "Counselling", "Administration"].map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <button className="btn" type="submit">Submit application</button>
        </form>
      )}
    </div>
  );
}

export function SupportPage() {
  const params = new URLSearchParams(window.location.search);
  const [ngos, setNgos] = useState([]);
  const [form, setForm] = useState({ ngo_id: params.get("ngo") || "", name: "", phone: "", city: "", state: "", guardian_name: "" });
  const [res, setRes] = useState(null);
  useEffect(() => { api("/ngos", { query: { limit: 50 } }).then((r) => setNgos(r.data || [])); }, []);
  async function submit(e) {
    e.preventDefault();
    setRes(await api("/support/apply", { method: "POST", body: form }));
  }
  return (
    <div className="wrap">
      <h1>Apply for support</h1>
      {res ? <div className="card">Submitted. Reference <strong>{res.code}</strong>. {res.message}</div> : (
        <form className="card" style={{ maxWidth: 560 }} onSubmit={submit}>
          <Field label="NGO">
            <select className="input" required value={form.ngo_id} onChange={(e) => setForm({ ...form, ngo_id: e.target.value })}>
              <option value="">Select</option>
              {ngos.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
            </select>
          </Field>
          {["name", "guardian_name", "phone", "city", "state"].map((k) => (
            <Field key={k} label={k}><input className="input" required value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></Field>
          ))}
          <button className="btn" type="submit">Submit</button>
        </form>
      )}
    </div>
  );
}

export function EventsPage() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api("/events/public").then(setRows); }, []);
  return (
    <div className="wrap">
      <h1>Events</h1>
      <div className="grid grid-2">
        {rows.map((e) => (
          <div className="card media" key={e.id}>
            <img className="cover" src={eventImage(e)} alt="" />
            <h3>{e.name}</h3>
            <p>{e.type} · {e.date} {e.time} · {e.location}</p>
            <p>Capacity {e.capacity} · Registered {e.registered}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ImpactPage() {
  const [d, setD] = useState(null);
  useEffect(() => { api("/impact").then(setD); }, []);
  if (!d) return <div className="wrap">Loading…</div>;
  return (
    <div className="wrap">
      <h1>Public impact</h1>
      <img className="cover banner" src="/images/hero.svg" alt="Community impact" />
      <div className="grid grid-4">
        {Object.entries({ NGOs: d.ngos, Children: d.beneficiaries, Students: d.students, Scholarships: d.scholarships, Books: d.books, Clothes: d.clothes, Meals: d.meals, Volunteers: d.volunteers, Donors: d.donors, Funds: `₹${d.funds}` }).map(([k, v]) => (
          <div className="card stat" key={k}><b>{v}</b>{k}</div>
        ))}
      </div>
      <div className="card"><h3>Monthly donations</h3><Chart data={d.monthly || []} /></div>
      <div className="card"><h3>State-wise beneficiaries</h3><Chart data={d.by_state || []} /></div>
    </div>
  );
}

export function StoriesPage() {
  const [rows, setRows] = useState([]);
  useEffect(() => { api("/blog").then(setRows); }, []);
  return (
    <div className="wrap">
      <h1>Stories & news</h1>
      {rows.map((p) => (
        <Link key={p.id} to={`/stories/${p.slug}`} className="card media" style={{ display: "block", marginBottom: 12 }}>
          <img className="cover" src={storyImage(p)} alt="" />
          <Badge>{p.type}</Badge>
          <h3>{p.title}</h3>
          <p>{p.description}</p>
        </Link>
      ))}
    </div>
  );
}

export function StoryPage() {
  const { slug } = useParams();
  const [p, setP] = useState(null);
  useEffect(() => { api(`/blog/${slug}`).then(setP); }, [slug]);
  if (!p) return <div className="wrap">Loading…</div>;
  return (
    <div className="wrap">
      <img className="cover banner" src={storyImage(p)} alt="" />
      <h1>{p.title}</h1>
      <p>{p.description}</p>
      <p>By {p.author} · {p.publish_date}</p>
    </div>
  );
}

export function CmsPage({ slug, title }) {
  const [p, setP] = useState(null);
  useEffect(() => { api("/cms", { query: { slug } }).then(setP); }, [slug]);
  return (
    <div className="wrap">
      <h1>{title || (p && p.title)}</h1>
      <img className="cover banner" src="/images/gallery-4.svg" alt="" />
      <div className="card"><p>{p ? p.content : "Loading…"}</p></div>
    </div>
  );
}

export function ProgramsPage() {
  return (
    <div className="wrap">
      <h1>Programs</h1>
      <div className="grid grid-3">
        {PROGRAMS.map((p) => (
          <div className="card media" key={p.name}>
            <img className="cover" src={p.img} alt="" />
            <h3>{p.name}</h3>
            <p>Delivered by partner NGOs with inventory, attendance and impact tracking.</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ContactPage() {
  const [ok, setOk] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  async function submit(e) {
    e.preventDefault();
    await api("/contact", { method: "POST", body: form });
    setOk(true);
  }
  return (
    <div className="wrap">
      <h1>Contact</h1>
      {ok ? <div className="card">Message sent.</div> : (
        <form className="card" style={{ maxWidth: 560 }} onSubmit={submit}>
          {["name", "email", "subject"].map((k) => <Field key={k} label={k}><input className="input" required value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} /></Field>)}
          <Field label="Message"><textarea className="input" rows={5} required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} /></Field>
          <button className="btn" type="submit">Send</button>
        </form>
      )}
    </div>
  );
}

export function TransparencyPage() {
  const [d, setD] = useState(null);
  useEffect(() => { api("/impact").then(setD); }, []);
  return (
    <div className="wrap">
      <h1>Transparency</h1>
      <img className="cover banner" src="/images/campaign-scholarship.svg" alt="" />
      <div className="card">
        <p>Funds received: ₹{d?.funds ?? "—"}</p>
        <p>Programs, utilisation and annual reports are published by each approved NGO. Sensitive beneficiary identities are never listed here.</p>
        <Chart data={d?.monthly || []} />
      </div>
    </div>
  );
}

export function MapPage() {
  const [ngos, setNgos] = useState([]);
  useEffect(() => { api("/ngos", { query: { limit: 50 } }).then((r) => setNgos(r.data || [])); }, []);
  return (
    <div className="wrap">
      <h1>NGO map</h1>
      <p>Public locations only. Private beneficiary addresses are never shown.</p>
      <div className="card">
        {ngos.map((n) => <p key={n.id}><Link to={`/ngos/${n.slug}`}>{n.name}</Link> — {n.city} ({n.lat}, {n.lng})</p>)}
      </div>
    </div>
  );
}

export function LoginPage({ onLogin }) {
  const nav = useNavigate();
  const [email, setEmail] = useState("admin@abcyz.in");
  const [password, setPassword] = useState("ChangeMe_Admin_123");
  const [err, setErr] = useState("");
  const [tab, setTab] = useState("login");
  const [info, setInfo] = useState("");
  async function submit(e) {
    e.preventDefault();
    setErr("");
    try {
      if (tab === "login") {
        const r = await Auth.login(email, password);
        setToken(r.token);
        onLogin(r.user);
        nav(portalPath(r.user.role));
      } else if (tab === "register") {
        const r = await Auth.register({ email, password, name: email.split("@")[0], role: "donor" });
        setToken(r.token);
        onLogin(r.user);
        nav("/dashboard");
      } else {
        await Auth.forgot(email);
        setInfo("If the account exists, a reset token was emailed (logged on server for on-prem SMTP).");
      }
    } catch (ex) { setErr(ex.message); }
  }
  return (
    <div className="wrap">
      <div className="card" style={{ maxWidth: 460, margin: "40px auto" }}>
        <img className="cover" src="/images/logo-gyan.svg" alt="" style={{ width: 72, height: 72, margin: "0 auto 12px" }} />
        <div className="tabs">
          {["login", "register", "forgot"].map((x) => <button key={x} className={`tab ${tab === x ? "on" : ""}`} onClick={() => setTab(x)}>{x}</button>)}
        </div>
        <form onSubmit={submit}>
          <Field label="Email"><input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></Field>
          {tab !== "forgot" && <Field label="Password"><input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></Field>}
          {err && <p className="err">{err}</p>}
          {info && <p className="ok">{info}</p>}
          <button className="btn" type="submit">{tab === "login" ? "Sign in" : tab === "register" ? "Create account" : "Send reset"}</button>
        </form>
        <p style={{ fontSize: 13, color: "#5c6b64" }}>Demo: admin@abcyz.in / ChangeMe_Admin_123 · NGO admin@gyan-jyoti.org / Seva@12345</p>
      </div>
    </div>
  );
}

export function ResetPage() {
  const [token, setTok] = useState("");
  const [password, setPassword] = useState("");
  const [ok, setOk] = useState(false);
  async function submit(e) {
    e.preventDefault();
    await Auth.reset(token, password);
    setOk(true);
  }
  return (
    <div className="wrap">
      <form className="card" style={{ maxWidth: 460 }} onSubmit={submit}>
        <h1>Reset password</h1>
        <Field label="Token"><input className="input" value={token} onChange={(e) => setTok(e.target.value)} required /></Field>
        <Field label="New password"><input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></Field>
        <button className="btn">Reset</button>
        {ok && <p className="ok">Password updated. You may login.</p>}
      </form>
    </div>
  );
}

export function ErrorPage({ code }) {
  const map = {
    404: ["Page not found", "The link may be outdated."],
    403: ["Permission denied", "Your role cannot open this area."],
    500: ["Something went wrong", "The operations team has been notified."],
  };
  const [t0, d] = map[code] || map[404];
  return <div className="wrap"><h1>{code} — {t0}</h1><p>{d}</p><Link to="/">Go home</Link></div>;
}

export function DashboardHome({ user }) {
  const [d, setD] = useState(null);
  const [notes, setNotes] = useState([]);
  useEffect(() => {
    api("/dashboard").then(setD);
    api("/notifications").then(setNotes);
  }, []);
  if (!d) return <p>Loading dashboard…</p>;
  return (
    <div>
      <h1>{user.role.replace("_", " ")} dashboard</h1>
      <div className="gallery" style={{ marginBottom: 16 }}>
        {GALLERY.map((g) => <img key={g.src} src={g.src} alt={g.alt} />)}
      </div>
      <div className="grid grid-4">
        {Object.entries(d.cards).map(([k, v]) => <div className="card stat" key={k}><b>{typeof v === "number" ? v.toLocaleString("en-IN") : v}</b>{k.replaceAll("_", " ")}</div>)}
      </div>
      <div className="card"><h3>Donation trend</h3><Chart data={d.trends || []} /></div>
      <div className="card">
        <h3>Notifications</h3>
        {notes.length ? notes.slice(0, 8).map((n) => <p key={n.id}><strong>{n.title}</strong> — {n.body}</p>) : <Empty text="No notifications" />}
      </div>
    </div>
  );
}

export function InventoryPage() {
  const toast = useToast();
  const extra = (row) => (
    <>
      <button className="btn ghost" onClick={async () => {
        const qty = Number(prompt("Stock IN quantity", "5"));
        if (!qty) return;
        await api("/inventory/stock", { method: "POST", body: { item_id: row.id, type: "in", quantity: qty } });
        toast.show("Stock updated");
        location.reload();
      }}>Stock IN</button>
      <button className="btn ghost" onClick={async () => {
        const qty = Number(prompt("Stock OUT quantity", "1"));
        if (!qty) return;
        await api("/inventory/stock", { method: "POST", body: { item_id: row.id, type: "out", quantity: qty } });
        toast.show("Stock updated");
        location.reload();
      }}>Stock OUT</button>
    </>
  );
  return (
    <>
      <CrudPage
        title="Inventory"
        resourceName="inventory"
        extra={extra}
        columns={[
          { key: "item_name", label: "Item" },
          { key: "category", label: "Category" },
          { key: "size", label: "Size" },
          { key: "available", label: "Avail" },
          { key: "reserved", label: "Reserved" },
          { key: "distributed", label: "Distributed" },
          { key: "barcode", label: "Barcode" },
        ]}
        fields={[
          { key: "item_name", label: "Item name", required: true },
          { key: "category", label: "Category", type: "select", options: ["Books", "Clothes", "Uniforms", "Food", "Shoes", "School bags", "Blankets", "Hygiene products", "Laptops", "Other"] },
          { key: "size", label: "Size" },
          { key: "quantity", label: "Quantity", type: "number" },
          { key: "available", label: "Available", type: "number" },
          { key: "barcode", label: "Barcode" },
        ]}
      />
      {toast.node}
    </>
  );
}

export function RequestsPage() {
  return (
    <CrudPage
      title="Item requests"
      resourceName="requests"
      columns={[
        { key: "id", label: "#" },
        { key: "item_type", label: "Type" },
        { key: "status", label: "Status", render: (r) => <Badge>{r.status}</Badge> },
        { key: "details", label: "Details" },
      ]}
      fields={[
        { key: "beneficiary_id", label: "Beneficiary ID", required: true },
        { key: "item_type", label: "Item type", required: true },
        { key: "details", label: "Details", type: "textarea" },
      ]}
      extra={(row) => (
        <select defaultValue={row.status} onChange={async (e) => {
          await api(`/requests/${row.id}/workflow`, { method: "POST", body: { status: e.target.value } });
          location.reload();
        }}>
          {["requested", "under_review", "approved", "reserved", "scheduled", "distributed", "completed", "rejected"].map((s) => <option key={s}>{s}</option>)}
        </select>
      )}
    />
  );
}

export function DistributionPage() {
  const [form, setForm] = useState({ beneficiary_id: "", item_name: "", quantity: 1, location: "" });
  const toast = useToast();
  async function record(e) {
    e.preventDefault();
    await api("/distributions/record", { method: "POST", body: form });
    toast.show("Distribution recorded");
  }
  async function syncOffline() {
    const raw = localStorage.getItem("sevasetu_offline") || "[]";
    const records = JSON.parse(raw);
    if (!records.length) { toast.show("Nothing queued"); return; }
    await api("/sync/offline", { method: "POST", body: { records } });
    localStorage.removeItem("sevasetu_offline");
    toast.show("Synced");
  }
  function queueOffline() {
    const raw = JSON.parse(localStorage.getItem("sevasetu_offline") || "[]");
    raw.push({ ...form });
    localStorage.setItem("sevasetu_offline", JSON.stringify(raw));
    toast.show("Saved offline");
  }
  return (
    <div>
      <CrudPage
        title="Distribution events"
        resourceName="distributions"
        columns={[{ key: "name", label: "Event" }, { key: "date", label: "Date" }, { key: "location", label: "Location" }, { key: "status", label: "Status" }]}
        fields={[{ key: "name", label: "Name", required: true }, { key: "date", label: "Date", type: "date" }, { key: "location", label: "Location" }]}
      />
      <div className="card">
        <h3>Record a hand-over</h3>
        <form onSubmit={record} className="grid grid-2">
          <Field label="Beneficiary ID"><input className="input" value={form.beneficiary_id} onChange={(e) => setForm({ ...form, beneficiary_id: e.target.value })} required /></Field>
          <Field label="Item"><input className="input" value={form.item_name} onChange={(e) => setForm({ ...form, item_name: e.target.value })} required /></Field>
          <Field label="Qty"><input className="input" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></Field>
          <Field label="Location"><input className="input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
          <button className="btn" type="submit">Record</button>
          <button className="btn ghost" type="button" onClick={queueOffline}>Save offline</button>
          <button className="btn secondary" type="button" onClick={syncOffline}>Sync queue</button>
        </form>
      </div>
      {toast.node}
    </div>
  );
}

export function AttendancePage() {
  return (
    <CrudPage
      title="Attendance"
      resourceName="attendance"
      columns={[{ key: "student_id", label: "Student" }, { key: "date", label: "Date" }, { key: "status", label: "Status" }]}
      fields={[
        { key: "student_id", label: "Student ID", required: true },
        { key: "date", label: "Date", type: "date", required: true },
        { key: "status", label: "Status", type: "select", options: ["present", "absent", "late"] },
      ]}
    />
  );
}

export function ReportsPage() {
  const [type, setType] = useState("donations");
  const [data, setData] = useState({ data: [] });
  async function load() {
    setData(await api(`/reports/${type}`, { query: { limit: 30 } }));
  }
  useEffect(() => { load(); }, [type]);
  async function exp() {
    const res = await api(`/reports/${type}`, { query: { export: "csv", limit: 1000 }, raw: true });
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${type}.csv`;
    a.click();
  }
  return (
    <div>
      <div className="toolbar">
        <h2>Reports</h2>
        <select className="input" style={{ maxWidth: 220 }} value={type} onChange={(e) => setType(e.target.value)}>
          {["donations", "inventory", "distribution", "beneficiaries", "students", "attendance", "scholarships", "expenses", "volunteers", "campaigns", "ngos"].map((t0) => <option key={t0}>{t0}</option>)}
        </select>
        <button className="btn" onClick={exp}>Export CSV / Excel</button>
      </div>
      <DataTable rows={data.data} columns={Object.keys(data.data[0] || { id: 1 }).slice(0, 6).map((k) => ({ key: k, label: k }))} />
    </div>
  );
}

export function ImportPage() {
  const [kind, setKind] = useState("beneficiaries");
  const [csv, setCsv] = useState("name,city,state,phone\nTest Child,Pune,Maharashtra,9999999999");
  const [res, setRes] = useState(null);
  async function run(e) {
    e.preventDefault();
    setRes(await api("/import", { method: "POST", body: { kind, csv } }));
  }
  async function tpl() {
    const r = await api("/import/template", { query: { kind }, raw: true });
    setCsv(await r.text());
  }
  return (
    <div className="card">
      <h2>Import / export</h2>
      <select className="input" value={kind} onChange={(e) => setKind(e.target.value)}>
        {["beneficiaries", "students", "inventory", "donors", "ngos"].map((k) => <option key={k}>{k}</option>)}
      </select>
      <textarea className="input" rows={8} value={csv} onChange={(e) => setCsv(e.target.value)} />
      <div className="toolbar">
        <button className="btn ghost" type="button" onClick={tpl}>Load template</button>
        <button className="btn" onClick={run}>Preview & import</button>
      </div>
      {res && <p>Imported {res.imported}/{res.total}. Errors: {res.errors.length}</p>}
    </div>
  );
}

export function SettingsPage() {
  const [s, setS] = useState({});
  const toast = useToast();
  useEffect(() => { api("/settings").then(setS).catch(() => {}); }, []);
  async function save(e) {
    e.preventDefault();
    await api("/settings", { method: "PUT", body: s });
    toast.show("Settings saved");
  }
  return (
    <form className="card" onSubmit={save}>
      <h2>System settings</h2>
      {["site_name", "domain", "primary_color", "accent_color", "payment_provider", "language", "contact_email", "contact_phone", "footer"].map((k) => (
        <Field key={k} label={k}><input className="input" value={s[k] || ""} onChange={(e) => setS({ ...s, [k]: e.target.value })} /></Field>
      ))}
      <button className="btn">Save</button>
      {toast.node}
    </form>
  );
}

export function BackupPage() {
  const [files, setFiles] = useState([]);
  const toast = useToast();
  async function load() { setFiles(await api("/backups")); }
  useEffect(() => { load(); }, []);
  async function run() {
    await api("/backup", { method: "POST" });
    toast.show("Backup created");
    load();
  }
  return (
    <div className="card">
      <h2>Backups</h2>
      <button className="btn" onClick={run}>Create backup now</button>
      <ul>{files.map((f) => <li key={f.file}>{f.file} — {Math.round(f.size / 1024)} KB</li>)}</ul>
      {toast.node}
    </div>
  );
}

export function MessagesPage() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState({ subject: "", body: "" });
  useEffect(() => { api("/messages").then(setRows); }, []);
  async function send(e) {
    e.preventDefault();
    await api("/messages", { method: "POST", body: form });
    setRows(await api("/messages"));
  }
  return (
    <div>
      <h2>Messages</h2>
      <form className="card" onSubmit={send}>
        <Field label="Subject"><input className="input" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} /></Field>
        <Field label="Body"><textarea className="input" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required /></Field>
        <button className="btn">Send</button>
      </form>
      {rows.map((m) => <div className="card" key={m.id}><strong>{m.subject}</strong><p>{m.body}</p></div>)}
    </div>
  );
}

export function SearchPage() {
  const [q, setQ] = useState("");
  const [res, setRes] = useState(null);
  async function run(e) {
    e.preventDefault();
    setRes(await api("/search", { query: { q } }));
  }
  return (
    <div>
      <form className="toolbar" onSubmit={run}>
        <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Global search" />
        <button className="btn">Search</button>
      </form>
      {res && Object.entries(res).map(([k, rows]) => (
        <div key={k} className="card"><h3>{k}</h3>{rows.map((r) => <p key={r.id}>{r.name || r.title || r.item_name} #{r.id}</p>)}</div>
      ))}
    </div>
  );
}

export function ProfilePage({ user, onUser }) {
  const [form, setForm] = useState({ name: user.name, phone: user.phone || "", language: user.language || "en" });
  const [pw, setPw] = useState({ current: "", password: "" });
  const toast = useToast();
  async function save(e) {
    e.preventDefault();
    const u = await api("/profile", { method: "PUT", body: form });
    onUser(u);
    toast.show("Profile updated");
  }
  async function changePw(e) {
    e.preventDefault();
    await Auth.password(pw.current, pw.password);
    toast.show("Password changed");
  }
  return (
    <div className="grid grid-2">
      <form className="card" onSubmit={save}>
        <h2>Profile</h2>
        <Field label="Name"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
        <Field label="Phone"><input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <button className="btn">Save</button>
      </form>
      <form className="card" onSubmit={changePw}>
        <h2>Password</h2>
        <Field label="Current"><input className="input" type="password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} /></Field>
        <Field label="New"><input className="input" type="password" value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} /></Field>
        <button className="btn">Change</button>
      </form>
      {toast.node}
    </div>
  );
}

export function ScanPage() {
  const [barcode, setBarcode] = useState("");
  const [item, setItem] = useState(null);
  const [err, setErr] = useState("");
  async function scan(e) {
    e.preventDefault();
    setErr("");
    try { setItem(await api("/barcode/scan", { method: "POST", body: { barcode } })); }
    catch (ex) { setErr(ex.message); }
  }
  return (
    <div className="card">
      <h2>Barcode / QR scan</h2>
      <form onSubmit={scan} className="toolbar">
        <input className="input" value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="Scan or type barcode" />
        <button className="btn">Lookup</button>
      </form>
      {err && <p className="err">{err}</p>}
      {item && <pre>{JSON.stringify(item, null, 2)}</pre>}
    </div>
  );
}


