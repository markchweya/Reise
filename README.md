# Soma

Upload your notes. Ask them anything.

Soma is a React Native + Expo study companion. You import lecture notes — text, Markdown, PDF, Word, or a photo of a page — and Soma indexes them on the device so you can ask questions, get summaries, have passages explained, or have hurried notes rewritten. Every answer comes from your own material, with the passages it used shown underneath. And it keeps score: fourteen badges track what you have built and how consistently you study.

Say "hey" and it says hey back. It does not search your library for a greeting.

## Running it

```bash
npm install
cp .env.example .env
npx expo start
```

Scan the QR code with Expo Go. Works on iOS and Android; developed against Expo SDK 54.

The app runs out of the box with no key — ingestion and retrieval use a local lexical embedder, so you can import notes and search them immediately. For actual conversation you need a model. Two ways:

**The right way — run the proxy.** `cd server && npm install && cp .env.example .env`, add your key, `npm run dev`, then set `SOMA_PROXY_URL` in the app's `.env` to your laptop's LAN address. See [server/README.md](server/README.md).

**The quick way — dev only.** Set `SOMA_PROVIDER=direct` and `SOMA_DEV_API_KEY` in `.env`. The key ends up in the JS bundle. Your own phone only; never a build you share.

Restart with `npx expo start -c` after changing `.env`.

## How it works

**One AI seam.** Everything a model does goes through `AIProvider` in `src/ai/types.ts` — embeddings, chat, document extraction. `RemoteProvider` implements it today. `OnDeviceProvider` is a stub that throws with an explanation, because Expo Go cannot load native inference modules; when you move to an EAS dev build, fill it in and flip a config flag. No UI code imports a provider or an SDK.

**Ingestion.** Pick a file → copy it into the app's document directory → extract text → chunk at ~900 characters with ~150 of overlap, breaking on paragraphs first and sentences second, never mid-word → embed in batches of eight with live progress. Interrupt it at any point and it resumes: chunking is idempotent and a chunk with a vector is never embedded twice.

PDF, DOCX and photos go to the provider's document/vision path. Pure-JS PDF parsing on React Native is fragile and `pdfjs-dist` does not run under Expo Go at all, so this is not a compromise so much as the only honest option in this phase. It is isolated behind `extractText(note)`.

**Query.** The message is routed before anything is retrieved — greetings and small talk answer directly, questions about the library itself answer from the SQLite catalog, everything else takes the RAG path. Cheap deterministic rules decide; the model is only consulted when they genuinely cannot tell.

Retrieval is hybrid: cosine similarity over the vectors (top 20) and BM25 over an FTS5 index (top 20), fused with Reciprocal Rank Fusion at k=60, top 6 kept. Vector search alone fails on exact terms, dates and formulas, which is most of what students actually search for. Context is capped at roughly 6K tokens, the last six turns come along, and tokens stream in with a cursor. If nothing clears the relevance floor, Soma says it found nothing rather than inventing an answer.

**Modes.** Ask, Summarize, Explain and Rewrite are four system prompts in `src/ai/prompts/`, reachable from any note.

## Badges

Fourteen of them, in `src/achievements/catalog.ts`. Locked badges show their hint and a progress bar rather than a question mark, so they read as goals. A few:

| Badge | Earned by |
| --- | --- |
| Day One | Importing your first note |
| Full Toolkit | Using Ask, Summarize, Explain and Rewrite |
| Show Your Working | Opening ten source chips to check an answer |
| Any Format | Importing text, a document and a photo |
| Seven Straight | Studying seven days in a row |
| Night Owl | Twenty messages between midnight and 4am |
| Librarian | A thousand passages indexed |

Progress is derived from an event log in SQLite, so it survives restarts and cannot drift out of sync with the library.

## Layout

```
app/                    expo-router screens (tabs: Library, Ask Soma, Badges; note/[id])
src/ai/                 provider interface, remote provider, on-device stub, prompts
src/chat/               intent router + the query pipeline
src/db/                 schema, migrations, repository, sample note
src/ingest/             chunking, extraction, the resumable pipeline
src/rag/                cosine similarity, RRF, hybrid retrieval
src/achievements/       badge catalog and evaluation
src/store/              zustand stores
server/                 Hono proxy that holds the real key
__tests__/              45 tests over the parts that silently rot
```

## Tests

```bash
npm test
```

Covers `chunkText`, `cosineSimilarity`, `reciprocalRankFusion`, the intent router and the badge engine — the pure logic where a regression is invisible until an answer is quietly wrong.

## Status

Phases 1–7 of the build plan are in: scaffold and schema, text import, chat with routing and streaming, hybrid retrieval with citation chips, PDF/DOCX/image ingestion, the four modes, and the dark-first design pass. Not yet done: on-device inference (needs a dev build), folders, and note editing.

See [DECISIONS.md](DECISIONS.md) for the choices made along the way that were not specified.
