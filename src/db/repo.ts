import { db, dayKey, newId } from './index';
import { blobToVector, vectorToBlob } from '../rag/similarity';
import { longestStreak } from '../achievements/engine';
import { EMPTY_STATS, type BadgeStats } from '../achievements/catalog';

export type NoteStatus = 'pending' | 'extracting' | 'indexing' | 'ready' | 'failed';
export type SourceType = 'sample' | 'text' | 'document' | 'image';

export interface NoteRow {
  id: string;
  title: string;
  source_type: SourceType;
  original_uri: string | null;
  created_at: number;
  byte_size: number;
  status: NoteStatus;
  error_message: string | null;
  text: string;
}

export interface NoteSummary extends Omit<NoteRow, 'text'> {
  chunk_count: number;
  embedded_count: number;
}

export interface ChunkRow {
  id: string;
  note_id: string;
  ordinal: number;
  text: string;
  char_start: number;
  char_end: number;
  token_estimate: number;
}

export async function listNotes(): Promise<NoteSummary[]> {
  const conn = await db();
  return conn.getAllAsync<NoteSummary>(`
    SELECT n.id, n.title, n.source_type, n.original_uri, n.created_at, n.byte_size,
           n.status, n.error_message,
           (SELECT COUNT(*) FROM chunks c WHERE c.note_id = n.id) AS chunk_count,
           (SELECT COUNT(*) FROM chunks c JOIN embeddings e ON e.chunk_id = c.id WHERE c.note_id = n.id) AS embedded_count
    FROM notes n
    ORDER BY n.created_at DESC
  `);
}

export async function getNote(id: string): Promise<NoteRow | null> {
  const conn = await db();
  return (await conn.getFirstAsync<NoteRow>('SELECT * FROM notes WHERE id = ?', id)) ?? null;
}

export async function createNote(input: {
  title: string;
  sourceType: SourceType;
  originalUri: string | null;
  byteSize: number;
  text?: string;
}): Promise<string> {
  const conn = await db();
  const id = newId('note');
  await conn.runAsync(
    `INSERT INTO notes (id, title, source_type, original_uri, created_at, byte_size, status, text)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
    id, input.title, input.sourceType, input.originalUri, Date.now(), input.byteSize, input.text ?? '',
  );
  return id;
}

export async function setNoteStatus(id: string, status: NoteStatus, errorMessage?: string): Promise<void> {
  const conn = await db();
  await conn.runAsync('UPDATE notes SET status = ?, error_message = ? WHERE id = ?', status, errorMessage ?? null, id);
}

export async function setNoteText(id: string, text: string): Promise<void> {
  const conn = await db();
  await conn.runAsync('UPDATE notes SET text = ?, byte_size = ? WHERE id = ?', text, text.length, id);
}

export async function deleteNote(id: string): Promise<void> {
  const conn = await db();
  await conn.withTransactionAsync(async () => {
    await conn.runAsync('DELETE FROM chunks_fts WHERE note_id = ?', id);
    await conn.runAsync('DELETE FROM notes WHERE id = ?', id);
  });
}

/** Idempotent: re-running after a crash replaces the chunk set cleanly. */
export async function replaceChunks(
  noteId: string,
  chunks: { ordinal: number; text: string; charStart: number; charEnd: number; tokenEstimate: number }[],
): Promise<void> {
  const conn = await db();
  await conn.withTransactionAsync(async () => {
    await conn.runAsync('DELETE FROM chunks_fts WHERE note_id = ?', noteId);
    await conn.runAsync('DELETE FROM chunks WHERE note_id = ?', noteId);
    for (const c of chunks) {
      const id = `${noteId}::${c.ordinal}`;
      await conn.runAsync(
        `INSERT INTO chunks (id, note_id, ordinal, text, char_start, char_end, token_estimate)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        id, noteId, c.ordinal, c.text, c.charStart, c.charEnd, c.tokenEstimate,
      );
      await conn.runAsync('INSERT INTO chunks_fts (text, chunk_id, note_id) VALUES (?, ?, ?)', c.text, id, noteId);
    }
  });
}

/** Only chunks with no vector yet — this is what makes indexing resumable and
 *  guarantees a chunk is never embedded twice. */
export async function pendingChunks(noteId: string): Promise<ChunkRow[]> {
  const conn = await db();
  return conn.getAllAsync<ChunkRow>(
    `SELECT c.* FROM chunks c LEFT JOIN embeddings e ON e.chunk_id = c.id
     WHERE c.note_id = ? AND e.chunk_id IS NULL ORDER BY c.ordinal`,
    noteId,
  );
}

export async function saveEmbeddings(rows: { chunkId: string; vector: Float32Array }[]): Promise<void> {
  const conn = await db();
  await conn.withTransactionAsync(async () => {
    for (const row of rows) {
      await conn.runAsync(
        'INSERT OR REPLACE INTO embeddings (chunk_id, vector, dim) VALUES (?, ?, ?)',
        row.chunkId, vectorToBlob(row.vector), row.vector.length,
      );
    }
  });
}

export interface EmbeddedChunk extends ChunkRow {
  note_title: string;
  vector: Float32Array;
}

export async function allEmbeddedChunks(noteId?: string): Promise<EmbeddedChunk[]> {
  const conn = await db();
  const rows = await conn.getAllAsync<ChunkRow & { note_title: string; vector: Uint8Array }>(
    `SELECT c.*, n.title AS note_title, e.vector AS vector
     FROM chunks c
     JOIN embeddings e ON e.chunk_id = c.id
     JOIN notes n ON n.id = c.note_id
     ${noteId ? 'WHERE c.note_id = ?' : ''}`,
    ...(noteId ? [noteId] : []),
  );
  return rows.map((r) => ({ ...r, vector: blobToVector(r.vector) }));
}

export async function ftsSearch(query: string, limit: number, noteId?: string): Promise<string[]> {
  const conn = await db();
  const terms = query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);
  if (terms.length === 0) return [];
  const match = terms.map((t) => `"${t}"`).join(' OR ');
  try {
    const rows = await conn.getAllAsync<{ chunk_id: string }>(
      `SELECT chunk_id FROM chunks_fts
       WHERE chunks_fts MATCH ? ${noteId ? 'AND note_id = ?' : ''}
       ORDER BY bm25(chunks_fts) LIMIT ?`,
      ...(noteId ? [match, noteId, limit] : [match, limit]),
    );
    return rows.map((r) => r.chunk_id);
  } catch {
    // A malformed MATCH expression should degrade to vector-only, not crash chat.
    return [];
  }
}

export async function chunksByIds(ids: string[]): Promise<(ChunkRow & { note_title: string })[]> {
  if (ids.length === 0) return [];
  const conn = await db();
  const holes = ids.map(() => '?').join(',');
  const rows = await conn.getAllAsync<ChunkRow & { note_title: string }>(
    `SELECT c.*, n.title AS note_title FROM chunks c JOIN notes n ON n.id = c.note_id WHERE c.id IN (${holes})`,
    ...ids,
  );
  const order = new Map(ids.map((id, i) => [id, i]));
  return rows.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

/* ------------------------------- threads ------------------------------- */

export interface MessageRow {
  id: string;
  thread_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: number;
  cited_chunk_ids: string;
  intent: string | null;
}

export async function ensureThread(noteId: string | null, title: string): Promise<string> {
  const conn = await db();
  const existing = await conn.getFirstAsync<{ id: string }>(
    noteId ? 'SELECT id FROM threads WHERE note_id = ? ORDER BY created_at DESC LIMIT 1'
           : 'SELECT id FROM threads WHERE note_id IS NULL ORDER BY created_at DESC LIMIT 1',
    ...(noteId ? [noteId] : []),
  );
  if (existing) return existing.id;
  const id = newId('thread');
  await conn.runAsync('INSERT INTO threads (id, title, note_id, created_at) VALUES (?, ?, ?, ?)', id, title, noteId, Date.now());
  await logEvent('thread_started');
  return id;
}

export async function listMessages(threadId: string): Promise<MessageRow[]> {
  const conn = await db();
  return conn.getAllAsync<MessageRow>('SELECT * FROM messages WHERE thread_id = ? ORDER BY created_at', threadId);
}

export async function addMessage(input: {
  threadId: string;
  role: 'user' | 'assistant';
  content: string;
  citedChunkIds?: string[];
  intent?: string | null;
}): Promise<MessageRow> {
  const conn = await db();
  const row: MessageRow = {
    id: newId('msg'),
    thread_id: input.threadId,
    role: input.role,
    content: input.content,
    created_at: Date.now(),
    cited_chunk_ids: JSON.stringify(input.citedChunkIds ?? []),
    intent: input.intent ?? null,
  };
  await conn.runAsync(
    `INSERT INTO messages (id, thread_id, role, content, created_at, cited_chunk_ids, intent)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    row.id, row.thread_id, row.role, row.content, row.created_at, row.cited_chunk_ids, row.intent,
  );
  return row;
}

export async function updateMessage(id: string, content: string, citedChunkIds: string[]): Promise<void> {
  const conn = await db();
  await conn.runAsync('UPDATE messages SET content = ?, cited_chunk_ids = ? WHERE id = ?', content, JSON.stringify(citedChunkIds), id);
}

/* -------------------------------- events -------------------------------- */

export async function logEvent(kind: string): Promise<void> {
  const conn = await db();
  const now = Date.now();
  await conn.runAsync('INSERT INTO events (kind, created_at, day) VALUES (?, ?, ?)', kind, now, dayKey(now));
}

export async function badgeStats(): Promise<BadgeStats> {
  const conn = await db();
  const counts = await conn.getFirstAsync<{
    notes_ready: number; chunks: number; chars: number; source_types: number;
  }>(`
    SELECT
      (SELECT COUNT(*) FROM notes WHERE status = 'ready') AS notes_ready,
      (SELECT COUNT(*) FROM chunks) AS chunks,
      (SELECT COALESCE(SUM(LENGTH(text)), 0) FROM chunks) AS chars,
      (SELECT COUNT(DISTINCT source_type) FROM notes WHERE status = 'ready') AS source_types
  `);
  const events = await conn.getAllAsync<{ kind: string; n: number }>('SELECT kind, COUNT(*) AS n FROM events GROUP BY kind');
  const byKind = new Map(events.map((e) => [e.kind, e.n]));
  const days = await conn.getAllAsync<{ day: string }>('SELECT DISTINCT day FROM events ORDER BY day');
  const late = await conn.getFirstAsync<{ n: number }>(
    "SELECT COUNT(*) AS n FROM messages WHERE role = 'user' AND CAST(strftime('%H', created_at / 1000, 'unixepoch', 'localtime') AS INTEGER) < 4",
  );
  const longest = await conn.getFirstAsync<{ n: number }>(
    'SELECT COALESCE(MAX(n), 0) AS n FROM (SELECT COUNT(*) AS n FROM messages GROUP BY thread_id)',
  );
  const images = await conn.getFirstAsync<{ n: number }>("SELECT COUNT(*) AS n FROM notes WHERE source_type = 'image' AND status = 'ready'");

  return {
    ...EMPTY_STATS,
    notesReady: counts?.notes_ready ?? 0,
    chunksIndexed: counts?.chunks ?? 0,
    charactersIndexed: counts?.chars ?? 0,
    distinctSourceTypes: counts?.source_types ?? 0,
    questionsAsked: byKind.get('ask') ?? 0,
    summariesRun: byKind.get('summarize') ?? 0,
    explainsRun: byKind.get('explain') ?? 0,
    rewritesRun: byKind.get('rewrite') ?? 0,
    citationsOpened: byKind.get('citation_opened') ?? 0,
    imagesIngested: images?.n ?? 0,
    threadsStarted: byKind.get('thread_started') ?? 0,
    distinctDaysActive: days.length,
    longestDayStreak: longestStreak(days.map((d) => d.day)),
    lateNightMessages: late?.n ?? 0,
    longestThreadTurns: longest?.n ?? 0,
  };
}

export async function unlockedBadgeIds(): Promise<Set<string>> {
  const conn = await db();
  const rows = await conn.getAllAsync<{ badge_id: string }>('SELECT badge_id FROM unlocked_badges');
  return new Set(rows.map((r) => r.badge_id));
}

export async function persistUnlocked(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const conn = await db();
  for (const id of ids) {
    await conn.runAsync('INSERT OR IGNORE INTO unlocked_badges (badge_id, unlocked_at) VALUES (?, ?)', id, Date.now());
  }
}

export async function catalogSummary(): Promise<string> {
  const notes = await listNotes();
  if (notes.length === 0) return 'The library is empty. No notes have been imported yet.';
  const lines = notes.map((n) => {
    const when = new Date(n.created_at).toISOString().slice(0, 10);
    return `- "${n.title}" (${n.source_type}, added ${when}, ${n.chunk_count} chunks, status ${n.status})`;
  });
  const total = notes.reduce((sum, n) => sum + n.chunk_count, 0);
  return `${notes.length} note(s), ${total} chunks indexed.\n${lines.join('\n')}`;
}
