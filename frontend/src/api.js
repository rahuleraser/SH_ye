const TOKEN_KEY = "sevasetu_token";
const LANG_KEY = "sevasetu_lang";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}
export function setToken(t) {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
}
export function getLang() {
  return localStorage.getItem(LANG_KEY) || "en";
}
export function setLang(l) {
  localStorage.setItem(LANG_KEY, l);
}

export async function api(path, { method = "GET", body, query, raw } = {}) {
  const qs = query
    ? "?" +
      Object.entries(query)
        .filter(([, v]) => v !== undefined && v !== "" && v !== "all")
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("&")
    : "";
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(`/api/v1${path}${qs}`, { method, headers, body: payload });
  if (raw) return res;
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = text;
  }
  if (!res.ok) {
    const err = new Error((data && data.error) || res.statusText);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const Auth = {
  login: (email, password) => api("/auth/login", { method: "POST", body: { email, password } }),
  register: (body) => api("/auth/register", { method: "POST", body }),
  me: () => api("/auth/me"),
  logout: () => api("/auth/logout", { method: "POST" }),
  forgot: (email) => api("/auth/forgot", { method: "POST", body: { email } }),
  reset: (token, password) => api("/auth/reset", { method: "POST", body: { token, password } }),
  password: (current, password) => api("/auth/password", { method: "POST", body: { current, password } }),
};

export function resource(name) {
  return {
    list: (query) => api(`/${name}`, { query }),
    get: (id) => api(`/${name}/${id}`),
    create: (body) => api(`/${name}`, { method: "POST", body }),
    update: (id, body) => api(`/${name}/${id}`, { method: "PUT", body }),
    remove: (id) => api(`/${name}/${id}`, { method: "DELETE" }),
  };
}
