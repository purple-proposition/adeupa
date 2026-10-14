// Adeupa : API des événements publiés (partagés entre tous les visiteurs) + fichiers statiques
const CATS = ["Musique", "Culture", "Sport", "Brocante", "Fête", "Atelier", "Bar", "Humour"];
const MAX_EVENTS = 200;
const MAX_IMAGE = 900_000; // caractères de la data URL JPEG
const MAX_IMAGE_BYTES = 700_000;

const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra } });

const clean = s => String(s ?? "").replace(/[\u0000-\u001f]/g, " ").trim();

async function listIds(env) {
  return (await env.ADEUPA_EVENTS.get("index", "json")) || [];
}

function publicEvent(ev, hasImage) {
  const { image, owner, ...rest } = ev;
  return { ...rest, image: hasImage ? `/evenements/${ev.id}/image` : null };
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
  const user = await currentUser(req, env);
  if (!user) return json({ error: "Connectez-vous pour publier un événement." }, 401);
  let b, file = null;
  try {
    const form = await req.formData();
    b = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string"));
    file = form.get("image");
  } catch (_) { return json({ error: "Envoi invalide" }, 400); }
  if (file && typeof file !== "string" && file.size > 0) {
    if (file.size > MAX_IMAGE_BYTES) return json({ error: "Image trop lourde" }, 413);
    const bytes = new Uint8Array(await file.arrayBuffer());
    let bin = ""; for (let i = 0; i < bytes.length; i += 8192) bin += String.fromCharCode(...bytes.subarray(i, i + 8192));
    b.image = "data:image/jpeg;base64," + btoa(bin);
  }
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
    id, title, desc: clean(b.desc).slice(0, 1000), cat, status, lat, lng, owner: user.id,
    org: user.name, date: clean(b.date).slice(0, 60), hours: clean(b.hours).slice(0, 40),
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


// ---------- Comptes : inscription par code d'invitation, connexion, session signée ----------
const enc = new TextEncoder();
const b64 = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)));
const fromB64 = str => Uint8Array.from(atob(str), c => c.charCodeAt(0));
const PBKDF2_ITER = 100000;

async function hashPassword(password, saltB64) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: fromB64(saltB64), iterations: PBKDF2_ITER }, key, 256);
  return b64(bits);
}

async function sign(text, secret) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64(await crypto.subtle.sign("HMAC", key, enc.encode(text))).replace(/[+/=]/g, c => ({ "+": "-", "/": "_", "=": "" }[c]));
}

const WEEK = 7 * 24 * 3600;
async function sessionCookie(userId, env) {
  const exp = Math.floor(Date.now() / 1000) + WEEK;
  const body = `${userId}.${exp}`;
  return `adeupa_session=${body}.${await sign(body, env.SESSION_SECRET)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${WEEK}`;
}

async function currentUser(req, env) {
  const m = (req.headers.get("cookie") || "").match(/(?:^|;\s*)adeupa_session=([^;]+)/);
  if (!m) return null;
  const parts = m[1].split(".");
  if (parts.length !== 3) return null;
  const [id, exp, sig] = parts;
  if (await sign(`${id}.${exp}`, env.SESSION_SECRET) !== sig || Number(exp) < Date.now() / 1000) return null;
  return await env.DB.prepare("SELECT id, email, name FROM users WHERE id = ?").bind(id).first();
}

const publicUser = u => ({ id: u.id, email: u.email, name: u.name });

async function signup(req, env) {
  let b; try { b = await req.json(); } catch (_) { return json({ error: "Envoi invalide" }, 400); }
  if (!b.invite || b.invite !== env.INVITE_CODE) return json({ error: "Code d'invitation incorrect." }, 403);
  const email = clean(b.email).toLowerCase(), name = clean(b.name).slice(0, 80), password = String(b.password || "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Adresse e-mail invalide." }, 400);
  if (name.length < 2) return json({ error: "Indiquez le nom de votre structure." }, 400);
  if (password.length < 8) return json({ error: "Le mot de passe doit faire au moins 8 caractères." }, 400);
  if (await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first()) return json({ error: "Un compte existe déjà avec cette adresse." }, 409);
  const salt = b64(crypto.getRandomValues(new Uint8Array(16)));
  const id = crypto.randomUUID().slice(0, 12);
  const hash = await hashPassword(password, salt);
  await env.DB.prepare("INSERT INTO users (id, email, name, password_hash, salt) VALUES (?, ?, ?, ?, ?)").bind(id, email, name, hash, salt).run();
  return json(publicUser({ id, email, name }), 201, { "set-cookie": await sessionCookie(id, env) });
}

async function login(req, env) {
  let b; try { b = await req.json(); } catch (_) { return json({ error: "Envoi invalide" }, 400); }
  const u = await env.DB.prepare("SELECT id, email, name, password_hash, salt FROM users WHERE email = ?").bind(clean(b.email).toLowerCase()).first();
  if (!u || (await hashPassword(String(b.password || ""), u.salt)) !== u.password_hash) return json({ error: "E-mail ou mot de passe incorrect." }, 401);
  return json(publicUser(u), 200, { "set-cookie": await sessionCookie(u.id, env) });
}

async function deleteAccount(req, env) {
  const u = await currentUser(req, env);
  if (!u) return json({ error: "Non connecté" }, 401);
  // Supprime d'abord les événements du compte (fiches, images, index), puis le compte
  const ids = await listIds(env);
  const keep = [];
  for (const id of ids) {
    const ev = await env.ADEUPA_EVENTS.get(`event:${id}`, "json");
    if (ev && ev.owner === u.id) {
      await env.ADEUPA_EVENTS.delete(`event:${id}`);
      await env.ADEUPA_EVENTS.delete(`image:${id}`);
    } else keep.push(id);
  }
  await env.ADEUPA_EVENTS.put("index", JSON.stringify(keep));
  await env.DB.prepare("DELETE FROM users WHERE id = ?").bind(u.id).run();
  return json({ ok: true }, 200, { "set-cookie": "adeupa_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0" });
}


// ---------- Connexion par code e-mail (code à 6 chiffres, valable 10 minutes) ----------
const CODE_TTL = 600, CODE_COOLDOWN = 60, CODE_MAX_TRIES = 5;

async function sendCode(email, code, name, env) {
  // Envoi via Brevo, depuis l'adresse expéditrice vérifiée chez Brevo
  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": env.BREVO_API_KEY, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender: { name: "Adeupa", email: env.SENDER_EMAIL },
      to: [{ email, name }],
      subject: `${code} : votre code de connexion Adeupa`,
      htmlContent: `<div style="font-family:Arial,sans-serif;color:#171717"><div style="display:flex;align-items:center;gap:12px;margin:0 0 24px"><img src="https://adeupa.lyon-map-demo.workers.dev/assets/logo-email.png" width="40" height="40" alt="" style="display:block"><span style="font-size:24px;font-weight:800;color:#4169E1">Adeupa</span></div><p>Bonjour ${name},</p><p>Votre code de connexion Adeupa :</p><p style="font-size:32px;font-weight:800;letter-spacing:4px">${code}</p><p>Il est valable 10 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p></div>`,
    }),
  });
  if (!r.ok) console.log("brevo", r.status, await r.text());
  return r.ok;
}

async function requestCode(req, env) {
  let b; try { b = await req.json(); } catch (_) { return json({ error: "Envoi invalide" }, 400); }
  const email = clean(b.email).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Adresse e-mail invalide." }, 400);
  const now = Math.floor(Date.now() / 1000);
  const existing = await env.DB.prepare("SELECT id, name FROM users WHERE email = ?").bind(email).first();
  const displayName = existing ? existing.name : clean(b.name).slice(0, 80);
  if (!existing) {
    // Inscription : prénom et nom obligatoires
    if (clean(b.name).length < 2) return json({ error: "Indiquez votre prénom et votre nom." }, 400);
  }
  const prev = await env.DB.prepare("SELECT sent_at FROM login_codes WHERE email = ?").bind(email).first();
  if (prev && now - prev.sent_at < CODE_COOLDOWN) return json({ error: "Patientez une minute avant de demander un nouveau code." }, 429);
  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, "0");
  const hash = await sign(`${email}:${code}`, env.SESSION_SECRET);
  await env.DB.prepare("INSERT OR REPLACE INTO login_codes (email, code_hash, name, expires_at, attempts, sent_at) VALUES (?, ?, ?, ?, 0, ?)")
    .bind(email, hash, clean(b.name).slice(0, 80) || null, now + CODE_TTL, now).run();
  if (!(await sendCode(email, code, displayName, env))) return json({ error: "Envoi du code impossible pour le moment." }, 502);
  return json({ ok: true });
}

async function verifyCode(req, env) {
  let b; try { b = await req.json(); } catch (_) { return json({ error: "Envoi invalide" }, 400); }
  const email = clean(b.email).toLowerCase(), code = String(b.code || "").trim();
  const row = await env.DB.prepare("SELECT * FROM login_codes WHERE email = ?").bind(email).first();
  const now = Math.floor(Date.now() / 1000);
  if (!row || row.expires_at < now) return json({ error: "Code expiré. Demandez-en un nouveau." }, 401);
  if (row.attempts >= CODE_MAX_TRIES) return json({ error: "Trop de tentatives. Demandez un nouveau code." }, 429);
  if ((await sign(`${email}:${code}`, env.SESSION_SECRET)) !== row.code_hash) {
    await env.DB.prepare("UPDATE login_codes SET attempts = attempts + 1 WHERE email = ?").bind(email).run();
    return json({ error: "Code incorrect." }, 401);
  }
  await env.DB.prepare("DELETE FROM login_codes WHERE email = ?").bind(email).run();
  let u = await env.DB.prepare("SELECT id, email, name FROM users WHERE email = ?").bind(email).first();
  if (!u) {
    if (!row.name) return json({ error: "Compte introuvable." }, 404);
    const id = crypto.randomUUID().slice(0, 12);
    await env.DB.prepare("INSERT INTO users (id, email, name, password_hash, salt) VALUES (?, ?, ?, '', '')").bind(id, email, row.name).run();
    u = { id, email, name: row.name };
  }
  return json(publicUser(u), 200, { "set-cookie": await sessionCookie(u.id, env) });
}

const logout = () => json({ ok: true }, 200, { "set-cookie": "adeupa_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0" });

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === "/api/logout" && req.method === "POST") return logout();
    if (url.pathname === "/api/code" && req.method === "POST") return requestCode(req, env);
    if (url.pathname === "/api/verify" && req.method === "POST") return verifyCode(req, env);
    if (url.pathname === "/api/me" && req.method === "DELETE") return deleteAccount(req, env);
    if (url.pathname === "/api/me" && req.method === "GET") {
      const u = await currentUser(req, env);
      return u ? json(publicUser(u)) : json({ error: "Non connecté" }, 401);
    }
    if (url.pathname === "/api/mine" && req.method === "GET") {
      const u = await currentUser(req, env);
      if (!u) return json({ error: "Non connecté" }, 401);
      const mine = [];
      for (const id of await listIds(env)) {
        const ev = await env.ADEUPA_EVENTS.get(`event:${id}`, "json");
        if (ev && ev.owner === u.id) mine.push(publicEvent(ev, ev.hasImage));
      }
      return json(mine);
    }
    if (url.pathname === "/api/events" || url.pathname === "/evenements") {
      if (req.method === "GET") return json(await getEvents(env));
      if (req.method === "POST") return createEvent(req, env);
      return json({ error: "Méthode non autorisée" }, 405);
    }
    const img = url.pathname.match(/^\/(?:api\/events|evenements)\/([a-z0-9-]+)\/image$/);
    if (img && req.method === "GET") return getImage(img[1], env);
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/evenements")) return json({ error: "Introuvable" }, 404);
    return env.ASSETS.fetch(req);
  },
};
