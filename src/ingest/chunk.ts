export interface Chunk {
  ordinal: number;
  text: string;
  charStart: number;
  charEnd: number;
  tokenEstimate: number;
}

export interface ChunkOptions {
  target?: number;
  overlap?: number;
}

const TARGET = 900;
const OVERLAP = 150;

/** Rough but stable. Good enough for budgeting a context window. */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function splitParagraphs(text: string): { text: string; start: number }[] {
  const out: { text: string; start: number }[] = [];
  const re = /\n\s*\n/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    out.push({ text: text.slice(cursor, match.index), start: cursor });
    cursor = match.index + match[0].length;
  }
  out.push({ text: text.slice(cursor), start: cursor });
  return out.filter((p) => p.text.trim().length > 0);
}

function splitSentences(text: string, base: number): { text: string; start: number }[] {
  const out: { text: string; start: number }[] = [];
  const re = /[^.!?\n]+(?:[.!?]+|\n|$)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    if (match[0].trim().length === 0) continue;
    out.push({ text: match[0], start: base + match.index });
  }
  return out.length > 0 ? out : [{ text, start: base }];
}

/** Hard split for a single run longer than the target, e.g. a wall of text
 *  with no punctuation. Always breaks on whitespace so no word is cut. */
function splitLongRun(text: string, base: number, target: number): { text: string; start: number }[] {
  const out: { text: string; start: number }[] = [];
  let cursor = 0;
  while (cursor < text.length) {
    let end = Math.min(cursor + target, text.length);
    if (end < text.length) {
      const space = text.lastIndexOf(' ', end);
      if (space > cursor + target * 0.5) end = space;
    }
    out.push({ text: text.slice(cursor, end), start: base + cursor });
    cursor = end;
  }
  return out;
}

/**
 * Splits text into overlapping chunks on paragraph boundaries first, sentence
 * boundaries second, whitespace last. A word is never split.
 */
export function chunkText(input: string, options: ChunkOptions = {}): Chunk[] {
  const target = options.target ?? TARGET;
  const overlap = options.overlap ?? OVERLAP;
  const text = input.replace(/\r\n/g, '\n');
  if (text.trim().length === 0) return [];

  const units: { text: string; start: number }[] = [];
  for (const para of splitParagraphs(text)) {
    if (para.text.length <= target) {
      units.push(para);
      continue;
    }
    for (const sentence of splitSentences(para.text, para.start)) {
      if (sentence.text.length <= target) units.push(sentence);
      else units.push(...splitLongRun(sentence.text, sentence.start, target));
    }
  }

  // Chunks are tracked as ranges over the source, never as concatenated
  // strings — that is the only way the offsets stay honest.
  const chunks: Chunk[] = [];

  const push = (from: number, to: number): void => {
    const raw = text.slice(from, to);
    const trimmed = raw.trim();
    if (trimmed.length === 0) return;
    const start = from + (raw.length - raw.trimStart().length);
    chunks.push({
      ordinal: chunks.length,
      text: trimmed,
      charStart: start,
      charEnd: start + trimmed.length,
      tokenEstimate: estimateTokens(trimmed),
    });
  };

  let start = units[0]?.start ?? 0;
  let end = start;

  for (const unit of units) {
    const unitEnd = unit.start + unit.text.length;
    if (end > start && unitEnd - start > target) {
      push(start, end);
      // Carry the tail of the chunk we just closed into the next one, so a
      // fact spanning a boundary is still retrievable from one chunk alone.
      let back = Math.max(start, end - overlap);
      if (back > start) {
        const space = text.indexOf(' ', back);
        if (space > back && space < end) back = space + 1;
      }
      start = back;
    }
    end = unitEnd;
  }
  push(start, end);

  return chunks;
}
