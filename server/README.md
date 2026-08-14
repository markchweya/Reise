# Soma proxy

Holds the real API key so the phone never does.

```bash
cd server
npm install
cp .env.example .env      # add your key
npm run dev
```

Then find your machine's LAN address (`ipconfig getifaddr en0` on macOS) and put it in the app's `.env`:

```
SOMA_PROVIDER=proxy
SOMA_PROXY_URL=http://192.168.1.23:8787
```

Restart Expo with `npx expo start -c` so the new config is picked up. Your phone and laptop must be on the same network.

## Routes

| Route | Purpose |
| --- | --- |
| `POST /chat` | Streams SSE from the model straight through to the app. |
| `POST /extract` | Non-streaming document and vision extraction for PDF, DOCX and photos. |
| `POST /embed` | Batch embeddings. Returns 501 until `VOYAGE_API_KEY` is set — the app then falls back to its local lexical embedder. |
| `GET /health` | Liveness. |

## Swapping to direct mode (dev only)

Set `SOMA_PROVIDER=direct` and `SOMA_DEV_API_KEY` in the app's `.env` and the phone talks to the model itself, no server needed. **The key ends up in the JS bundle.** Use it on your own device only, never in a build you share or submit.

## Deploying

Any Node host works — Fly, Render, Railway, a VPS. Set `ANTHROPIC_API_KEY`, `VOYAGE_API_KEY` and `RATE_LIMIT` as environment variables, deploy, and point `SOMA_PROXY_URL` at the public URL. The rate limiter is in-memory, so move it to Redis before running more than one instance.
