// Saved order of the links (sort mode on the page), in D1.
//   GET  /api/order  → { "<section>": ["<href>", …], … } (empty object = default order from index.html)
//   POST /api/order  → stores such an object; empty body {} = back to the default
// One JSON row in table `settings`; only written when you drop a link.
import { allowed } from './_lib.js';

const schema = (db) =>
  db.exec('CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);');

export async function onRequestGet({ request, env }) {
  if (!allowed(request, env)) return new Response('forbidden', { status: 403 });
  if (!env.DB) return new Response('no database', { status: 503 });
  await schema(env.DB);
  const row = await env.DB.prepare("SELECT value FROM settings WHERE key = 'order'").first();
  return new Response(row ? row.value : '{}', { headers: { 'content-type': 'application/json' } });
}

export async function onRequestPost({ request, env }) {
  if (!allowed(request, env)) return new Response('forbidden', { status: 403 });
  if (!env.DB) return new Response('no database', { status: 503 });
  const text = await request.text();
  if (text.length > 50000) return new Response('too large', { status: 413 });
  let d;
  try { d = JSON.parse(text); } catch (e) { return new Response('bad request', { status: 400 }); }
  const valid = d && typeof d === 'object' && !Array.isArray(d) &&
    Object.values(d).every((l) => Array.isArray(l) && l.every((h) => typeof h === 'string' && h.length < 500));
  if (!valid) return new Response('bad request', { status: 400 });
  await schema(env.DB);
  await env.DB.prepare("INSERT INTO settings (key, value) VALUES ('order', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .bind(JSON.stringify(d)).run();
  return new Response(null, { status: 204 });
}
