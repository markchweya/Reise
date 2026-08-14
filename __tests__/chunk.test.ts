import { describe, expect, it } from 'vitest';
import { chunkText, estimateTokens } from '../src/ingest/chunk';

const para = (n: number, word: string) => Array.from({ length: n }, () => word).join(' ');

describe('chunkText', () => {
  it('returns nothing for empty input', () => {
    expect(chunkText('')).toEqual([]);
    expect(chunkText('   \n\n  ')).toEqual([]);
  });

  it('keeps short text as a single chunk', () => {
    const chunks = chunkText('Photosynthesis happens in the chloroplast.');
    expect(chunks).toHaveLength(1);
    expect(chunks[0]?.text).toBe('Photosynthesis happens in the chloroplast.');
    expect(chunks[0]?.ordinal).toBe(0);
  });

  it('splits long text into multiple chunks near the target size', () => {
    const text = [para(60, 'alpha'), para(60, 'beta'), para(60, 'gamma'), para(60, 'delta')].join('\n\n');
    const chunks = chunkText(text, { target: 400, overlap: 60 });
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) expect(chunk.text.length).toBeLessThanOrEqual(500);
  });

  it('never splits mid-word', () => {
    const text = para(500, 'photosynthesis');
    for (const chunk of chunkText(text, { target: 300, overlap: 50 })) {
      for (const word of chunk.text.split(/\s+/).filter(Boolean)) {
        expect(word).toBe('photosynthesis');
      }
    }
  });

  it('overlaps consecutive chunks so facts spanning a boundary survive', () => {
    const text = Array.from({ length: 40 }, (_, i) => `Sentence number ${i} about the Calvin cycle.`).join(' ');
    const chunks = chunkText(text, { target: 300, overlap: 80 });
    expect(chunks.length).toBeGreaterThan(2);
    const first = chunks[0]?.text ?? '';
    const second = chunks[1]?.text ?? '';
    const tail = first.split(/\s+/).slice(-4).join(' ');
    expect(second.includes(tail.split(' ')[0] ?? '')).toBe(true);
  });

  it('numbers chunks consecutively from zero', () => {
    const chunks = chunkText(para(600, 'word'), { target: 300 });
    chunks.forEach((c, i) => expect(c.ordinal).toBe(i));
  });

  it('records offsets that point back into the source text', () => {
    const text = `First paragraph here.\n\n${para(200, 'body')}`;
    for (const chunk of chunkText(text, { target: 300 })) {
      expect(chunk.charEnd).toBeGreaterThan(chunk.charStart);
      expect(chunk.charStart).toBeGreaterThanOrEqual(0);
      expect(chunk.charEnd).toBeLessThanOrEqual(text.length + 1);
    }
  });

  it('estimates tokens as roughly a quarter of the characters', () => {
    expect(estimateTokens('a'.repeat(400))).toBe(100);
  });
});
