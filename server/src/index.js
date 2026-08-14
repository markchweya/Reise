import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { createHash } from 'node:crypto';

const KEY = process.env.ANTHROPIC_API_KEY;
const PORT = Number(process.env.PORT ?? 8787);
const RATE_LIMIT = Number(process.env.RATE_LIMIT ?? 60);
const UPSTREAM = 'https://api.anthropic.com';
const VERSION = '2023-06-01';

if (!KEY) {
  console.error('ANTHROPIC_API_KEY is not set. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

const app = new Hono();

/* --------------------------- per-device limiter --------------------------- */
const buckets = new Map();

function deviceId(c) {
  const header = c.req.header('x-soma-device');
  if (header) return createHash('sha256').update(header).digest('hex').slice(0, 16);
  return c.env?.incoming?.socket?.remoteAddress ?? 'unknown';
}

app.use('*', async (c, next) => {
  const id = deviceId(c);
  const now = Date.now();
  const bucket = buckets.get(id) ?? { count: 0, resetAt: now + 60_000 };
  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + 60_000;
  }
  bucket.count += 1;
  buckets.set(id, bucket);
  if (bucket.count > RATE_LIMIT) {
    return c.json({ error: { message: 'Too many requests. Try again in a minute.' } }, 429);
  }
  await next();
});

app.get('/health', (c) => c.json({ ok: true, upstream: UPSTREAM }));

const upstreamHeaders = {
  'content-type': 'application/json',
  'x-api-key': KEY,
  'anthropic-version': VERSION,
};

/** Streaming chat. Pipes SSE straight through so the app sees tokens as they land. */
app.post('/chat', async (c) => {
  const body = await c.req.json();
  const upstream = await fetch(`${UPSTREAM}/v1/messages`, {
    method: 'POST',
    headers: upstreamHeaders,
    body: JSON.stringify({ ...body, stream: true }),
  });
  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text();
    return c.json({ error: { message: `Upstream ${upstream.status}: ${text.slice(0, 300)}` } }, upstream.status);
  }
  return new Response(upstream.body, {
    headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' },
  });
});

/** Non-streaming document/vision extraction. */
app.post('/extract', async (c) => {
  const body = await c.req.json();
  const upstream = await fetch(`${UPSTREAM}/v1/messages`, {
    method: 'POST',
    headers: upstreamHeaders,
    body: JSON.stringify({ ...body, stream: false }),
  });
  const json = await upstream.json();
  return c.json(json, upstream.status);
});

/**
 * Embeddings.
 *
 * Anthropic has no first-party embedding endpoint, so point this at whichever
 * provider you use (Voyage, Cohere, a self-hosted model). Until you do, it
 * returns 501 and the app falls back to its local lexical embedder, which
 * keeps retrieval working — just weaker on synonyms.
 */
app.post('/embed', async (c) => {
  const { texts } = await c.req.json();
  if (!Array.isArray(texts)) return c.json({ error: { message: 'texts must be an array' } }, 400);

  const voyageKey = process.env.VOYAGE_API_KEY;
  if (!voyageKey) {
    return c.json({ error: { message: 'No embedding provider configured. Set VOYAGE_API_KEY.' } }, 501);
  }
  const upstream = await fetch('https://api.voyageai.com/v1/embeddings', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${voyageKey}` },
    body: JSON.stringify({ input: texts, model: 'voyage-3-lite', input_type: 'document' }),
  });
  if (!upstream.ok) {
    return c.json({ error: { message: `Embedding upstream ${upstream.status}` } }, upstream.status);
  }
  const json = await upstream.json();
  return c.json({ vectors: json.data.map((d) => d.embedding) });
});

serve({ fetch: app.fetch, port: PORT, hostname: '0.0.0.0' });
console.log(`Soma proxy on http://0.0.0.0:${PORT} — point SOMA_PROXY_URL at your LAN IP.`);
