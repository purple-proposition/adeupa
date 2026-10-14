// Adeupa : API des événements publiés (partagés entre tous les visiteurs) + fichiers statiques
const CATS = ["Musique", "Culture", "Sport", "Brocante", "Fête", "Atelier"];
const MAX_EVENTS = 200;
const MAX_IMAGE = 900_000; // caractères de la data URL JPEG

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

const clean = s => String(s ?? "").replace(/[\u0000-\u001f]/g, " ").trim();

async function listIds(env) {
  return (await env.ADEUPA_EVENTS.get("index", "json")) || [];
}

function publicEvent(ev, hasImage) {
  const { image, ...rest } = ev;
  return { ...rest, image: hasImage ? `/api/events/${ev.id}/image` : null };
}

async function getEvents(env) {
  const ids = await listIds(env);
  const out = [];
  for (const id of ids) {
    const ev = await env.ADEUPA_EVENTS.get(`event:${id}`, "json");
    if (ev) out.push(publicEvent(ev, ev.hasImage));
  }
  return out;
}

async function createEvent(req, env) {
  let b;
  try { b = await req.json(); } catch (_) { return json({ error: "JSON invalide" }, 400); }
  const title = clean(b.title).slice(0, 120);
  const cat = CATS.includes(b.cat) ? b.cat : null;
  const lat = Number(b.lat), lng = Number(b.lng);
  const status = b.status === "live" ? "live" : "soon";
  // Lyon et sa métropole uniquement
  const inLyon = lat > 45.6 && lat < 45.9 && lng > 4.7 && lng < 5.0;
  if (!title || !cat || !inLyon) return json({ error: "Champs invalides" }, 400);
  const image = typeof b.image === "string" && b.image.startsWith("data:image/jpeg;base64,") ? b.image : null;
  if (image && image.length > MAX_IMAGE) return json({ error: "Image trop lourde" }, 413);
  const ids = await listIds(env);
  if (ids.length >= MAX_EVENTS) return json({ error: "Limite atteinte" }, 409);
  const id = crypto.randomUUID().slice(0, 8);
  const ev = {
    id, title, cat, status, lat, lng,
    org: clean(b.org).slice(0, 80), date: clean(b.date).slice(0, 60), hours: clean(b.hours).slice(0, 40),
    address: clean(b.address).slice(0, 200), tickets: 0, interested: 0, user: true, hasImage: !!image,
  };
  await env.ADEUPA_EVENTS.put(`event:${id}`, JSON.stringify(ev));
  if (image) await env.ADEUPA_EVENTS.put(`image:${id}`, image);
  await env.ADEUPA_EVENTS.put("index", JSON.stringify([...ids, id]));
  return json(publicEvent(ev, !!image), 201);
}

async function getImage(id, env) {
  const data = await env.ADEUPA_EVENTS.get(`image:${id}`);
  if (!data) return new Response("Introuvable", { status: 404 });
  const bytes = Uint8Array.from(atob(data.split(",")[1]), c => c.charCodeAt(0));
  return new Response(bytes, { headers: { "content-type": "image/jpeg", "cache-control": "public, max-age=3600" } });
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === "/api/events") {
      if (req.method === "GET") return json(await getEvents(env));
      if (req.method === "POST") return createEvent(req, env);
      return json({ error: "Méthode non autorisée" }, 405);
    }
    const img = url.pathname.match(/^\/api\/events\/([a-z0-9-]+)\/image$/);
    if (img && req.method === "GET") return getImage(img[1], env);
    if (url.pathname.startsWith("/api/")) return json({ error: "Introuvable" }, 404);
    return env.ASSETS.fetch(req);
  },
};
