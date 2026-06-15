export default async function handler(req, res) {
  const { path, ...rest } = req.query;

  const apiPath = Array.isArray(path) ? path.join('/') : path || '';

  const qs = Object.keys(rest).length ? '?' + new URLSearchParams(rest).toString() : '';

  const url = `https://api.football-data.org/v4/${apiPath}${qs}`;

  // Allow requests from your Firebase app
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const upstream = await fetch(url, {
      headers: { 'X-Auth-Token': process.env.FOOTBALL_DATA_API_KEY || '' },
    });
    const data = await upstream.json();
    // Live scores must never be served from the edge cache — a manual sync should
    // always hit the upstream so it gets the freshest score the API has. Other
    // endpoints (standings/teams) change slowly, so a short cache spares the
    // free-tier rate limit (10 req/min).
    const isLive = apiPath.includes('/matches');
    res.setHeader('Cache-Control', isLive ? 'no-store' : 's-maxage=60, stale-while-revalidate=30');
    res.status(upstream.status).json(data);
  } catch (err) {
    res.status(502).json({ error: 'Proxy error', detail: err.message });
  }
}
