import { ai } from '../ai';
import { allEmbeddedChunks, chunksByIds, ftsSearch } from '../db/repo';
import { cosineSimilarity } from './similarity';
import { reciprocalRankFusion } from './rrf';

export interface RetrievedChunk {
  id: string;
  noteId: string;
  noteTitle: string;
  text: string;
  ordinal: number;
  score: number;
}

export const TOP_K = 6;
const CANDIDATES = 20;
/** Below this, the best vector match is noise; better to admit we found nothing. */
const RELEVANCE_FLOOR = 0.12;
const CONTEXT_CHAR_BUDGET = 24000; // ~6K tokens

export async function retrieve(query: string, noteId?: string): Promise<RetrievedChunk[]> {
  const [queryVec] = await ai().embed([query]);

  const embedded = await allEmbeddedChunks(noteId);
  const scored = queryVec
    ? embedded
        .map((c) => ({ id: c.id, score: cosineSimilarity(queryVec, c.vector) }))
        .sort((a, b) => b.score - a.score)
    : [];
  const vectorIds = scored.slice(0, CANDIDATES).map((s) => s.id);
  const keywordIds = await ftsSearch(query, CANDIDATES, noteId);

  // Vector search misses exact terms, dates and formulas; BM25 misses
  // paraphrase. Fusing covers both without tuning a threshold.
  const fused = reciprocalRankFusion([{ ids: vectorIds }, { ids: keywordIds }], 60).slice(0, TOP_K);
  if (fused.length === 0) return [];

  const bestVector = scored[0]?.score ?? 0;
  if (bestVector < RELEVANCE_FLOOR && keywordIds.length === 0) return [];

  const rows = await chunksByIds(fused.map((f) => f.id));
  const scoreById = new Map(fused.map((f) => [f.id, f.score]));
  return rows.map((r) => ({
    id: r.id,
    noteId: r.note_id,
    noteTitle: r.note_title,
    text: r.text,
    ordinal: r.ordinal,
    score: scoreById.get(r.id) ?? 0,
  }));
}

export function buildContext(chunks: RetrievedChunk[]): string {
  const parts: string[] = [];
  let budget = CONTEXT_CHAR_BUDGET;
  for (const chunk of chunks) {
    const block = `[from: ${chunk.noteTitle} · passage ${chunk.ordinal + 1}]\n${chunk.text}`;
    if (block.length > budget) break;
    budget -= block.length;
    parts.push(block);
  }
  return parts.join('\n\n---\n\n');
}
