// POST /api/click  { url, name }  → logs one click in D1 (table `clicks`).
import { allowed, schema } from './_lib.js';

export async function onRequestPost({ request, env }) {
  if (!allowed(request, env)) return new Response('forbidden', { status: 403 });
  if (!env.DB) return new Response('no database', { status: 503 });
  let d;
  try { d = await request.json(); } catch (e) { return new Response('bad request', { status: 400 }); }
  if (typeof d.url !== 'string' || d.url.length > 500) return new Response('bad request', { status: 400 });
  const name = typeof d.name === 'string' ? d.name.slice(0, 100) : null;
  await schema(env.DB);
  await env.DB.prepare('INSERT INTO clicks (ts, url, name) VALUES (?, ?, ?)').bind(Date.now(), d.url, name).run();
  return new Response(null, { status: 204 });
}
