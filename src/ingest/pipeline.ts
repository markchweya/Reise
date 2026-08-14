import { ai } from '../ai';
import { chunkText } from './chunk';
import { extractText } from './extract';
import {
  getNote, listNotes, pendingChunks, replaceChunks, saveEmbeddings, setNoteStatus, setNoteText,
} from '../db/repo';

export interface IngestProgress {
  noteId: string;
  phase: 'extracting' | 'chunking' | 'embedding' | 'done' | 'failed';
  done: number;
  total: number;
  message: string;
}

const BATCH = 8;

/**
 * Indexes one note. Safe to call repeatedly: extraction is skipped when text
 * already exists, chunking is idempotent, and only chunks without a vector are
 * embedded. That is what makes a backgrounded import resumable.
 */
export async function ingestNote(noteId: string, onProgress?: (p: IngestProgress) => void): Promise<void> {
  const report = (p: Omit<IngestProgress, 'noteId'>): void => onProgress?.({ noteId, ...p });

  try {
    const note = await getNote(noteId);
    if (!note) throw new Error('That note is no longer in your library.');

    let text = note.text;
    if (text.trim().length === 0) {
      await setNoteStatus(noteId, 'extracting');
      report({ phase: 'extracting', done: 0, total: 0, message: 'Reading the file…' });
      text = await extractText(note);
      if (text.trim().length === 0) throw new Error('No readable text was found in this file.');
      await setNoteText(noteId, text);
    }

    await setNoteStatus(noteId, 'indexing');
    report({ phase: 'chunking', done: 0, total: 0, message: 'Splitting into passages…' });

    const existing = await pendingChunks(noteId);
    const alreadyChunked = existing.length > 0 || (note.status === 'ready' && text.length > 0);
    if (!alreadyChunked || note.status === 'pending' || note.status === 'extracting') {
      await replaceChunks(noteId, chunkText(text));
    }

    let remaining = await pendingChunks(noteId);
    const total = remaining.length;
    let done = 0;

    while (remaining.length > 0) {
      const batch = remaining.slice(0, BATCH);
      report({ phase: 'embedding', done, total, message: `Indexing ${done}/${total} chunks` });
      const vectors = await ai().embed(batch.map((c) => c.text));
      await saveEmbeddings(
        batch.map((c, i) => ({ chunkId: c.id, vector: vectors[i] ?? new Float32Array(0) })).filter((r) => r.vector.length > 0),
      );
      done += batch.length;
      // Yield to the UI thread between batches so scrolling stays smooth.
      await new Promise((resolve) => setTimeout(resolve, 0));
      remaining = remaining.slice(BATCH);
    }

    await setNoteStatus(noteId, 'ready');
    report({ phase: 'done', done: total, total, message: 'Ready' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Something went wrong while indexing this note.';
    await setNoteStatus(noteId, 'failed', message);
    report({ phase: 'failed', done: 0, total: 0, message });
  }
}

/** Picks up anything left half-indexed by a crash or a backgrounded app. */
export async function resumeUnfinished(onProgress?: (p: IngestProgress) => void): Promise<void> {
  const notes = await listNotes();
  for (const note of notes) {
    const incomplete = note.status === 'pending' || note.status === 'extracting' || note.status === 'indexing'
      || (note.status === 'ready' && note.embedded_count < note.chunk_count);
    if (incomplete) await ingestNote(note.id, onProgress);
  }
}
