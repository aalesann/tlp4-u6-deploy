const API = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

async function parse(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? res.statusText);
  }
  return res.json();
}

export const getJson = (path) => fetch(`${API}${path}`).then(parse);

export function uploadFile(file) {
  const body = new FormData();
  body.append("file", file);
  return fetch(`${API}/files`, { method: "POST", body }).then(parse);
}
