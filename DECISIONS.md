# Decisions

Architectural choices made during the build that were not specified in the brief.

## A local lexical embedder ships as the default

`src/ai/hashEmbed.ts` is a deterministic bag-of-trigrams embedding. It exists because the alternative was an app that does nothing until you have a key and a running proxy — a bad first launch, and untestable in CI.

It captures lexical overlap only, so it will not match "car" to "automobile". Real vectors come from the proxy's `/embed` route and have the identical shape, so retrieval code cannot tell the difference. The remote provider falls back to it if `/embed` fails, which keeps ingestion working offline rather than failing the note.

Anthropic has no first-party embedding endpoint, which is why `/embed` is wired for Voyage and returns 501 until you configure it.

## `notes.text` holds the extracted text

The brief's schema does not include it. Storing it means the reader view works without re-joining chunks, extraction is skipped on a resumed ingest, and re-chunking after a parameter change needs no re-extraction. Chunks remain the retrieval unit; this is a cache of the source.

## An `events` table drives the badges

Badge progress derives from a log of `ask` / `summarize` / `citation_opened` / … rows plus counts over `notes` and `chunks`, rather than incrementing counters. Counters drift when a write fails halfway; a log recomputes correctly every time, and streaks need the dated rows anyway.

`unlocked_badges` exists only so the unlock toast fires once rather than on every recount.

## Chunks are ranges over the source, not concatenated strings

The first implementation built chunk text by appending units and tracking offsets alongside — the offsets drifted, because the joiners inserted between units are not always the separators in the source. Chunks are now `[start, end)` ranges and the text is sliced from the source, so `charStart` / `charEnd` always point back at real positions. Overlap is a backward move of the start pointer to the nearest whitespace boundary.

## Chunk ids are `noteId::ordinal`

Deterministic rather than random. Re-chunking a note produces the same ids, so a re-run cannot orphan embeddings or silently duplicate a chunk. This is what makes `replaceChunks` safe to call after a crash.

## SSE is read through XMLHttpRequest

React Native's `fetch` does not give you a `ReadableStream` body, so streaming through it is not possible. `src/ai/sse.ts` reads `XMLHttpRequest.responseText` progressively and parses SSE frames out of it, exposing an async iterable. This is contained in one file; if RN's fetch gains streaming, only that file changes.

## `expo-file-system/legacy`

SDK 54 ships a new object-oriented File API and keeps the previous one at `/legacy`. The legacy API is used deliberately: it is the one with the widest body of working examples, and the calls needed here (copy, read as UTF-8, read as base64) are stable in it. Worth revisiting once the new API settles.

## One thread per note, plus one free-chat thread

The schema supports many threads, but the UI resolves to the most recent thread for a given scope instead of exposing thread management. A thread list is easy to add later; shipping it now would be a screen students have not asked for.

## Retrieval relevance floor

Set at cosine 0.12, and only applied when keyword search also came back empty. With the lexical embedder in play a real match usually scores well above it; with real vectors it will need retuning. It is a named constant in `src/rag/retrieve.ts` for that reason.

## The classifier's model fallback is best-effort

`routeLocally` returns a `confident` flag; when it is false the model is asked for a label. If that call fails for any reason the local guess stands. A router that throws would break chat entirely for a message it merely found ambiguous.

## Modes force their intent

Tapping Summarize on a note sends a fixed message with `forceIntent: 'summarize'`, bypassing classification. The user has already stated their intent by pressing the button; asking a model to re-derive it would only introduce a way to get it wrong.
