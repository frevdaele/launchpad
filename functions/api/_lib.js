// Optional: the API (sync the order, count clicks) only works when your site sits behind
// Cloudflare Access. Without Access it refuses (403) and the page simply keeps the order
// in your browser. Set the variable LAUNCHPAD_HOST in Cloudflare Pages to your own host name
// (e.g. start.example.com) to shut out the *.pages.dev name.
export const allowed = (request, env) =>
  request.headers.has('Cf-Access-Jwt-Assertion') &&
  (!env.LAUNCHPAD_HOST || new URL(request.url).hostname === env.LAUNCHPAD_HOST);

export const schema = (db) =>
  db.exec('CREATE TABLE IF NOT EXISTS clicks (ts INTEGER NOT NULL, url TEXT NOT NULL, name TEXT); CREATE INDEX IF NOT EXISTS clicks_ts ON clicks(ts);');
