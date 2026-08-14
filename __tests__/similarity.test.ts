import { describe, expect, it } from 'vitest';
import { blobToVector, cosineSimilarity, vectorToBlob } from '../src/rag/similarity';
import { hashEmbed } from '../src/ai/hashEmbed';

describe('cosineSimilarity', () => {
  it('is 1 for identical vectors', () => {
    const v = Float32Array.from([0.2, 0.5, 0.9]);
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 6);
  });

  it('is 0 for orthogonal vectors', () => {
    expect(cosineSimilarity(Float32Array.from([1, 0]), Float32Array.from([0, 1]))).toBe(0);
  });

  it('is -1 for opposed vectors', () => {
    expect(cosineSimilarity(Float32Array.from([1, 2]), Float32Array.from([-1, -2]))).toBeCloseTo(-1, 6);
  });

  it('ignores magnitude', () => {
    const a = Float32Array.from([1, 2, 3]);
    const b = Float32Array.from([10, 20, 30]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(1, 6);
  });

  it('returns 0 rather than NaN for a zero vector', () => {
    expect(cosineSimilarity(Float32Array.from([0, 0]), Float32Array.from([1, 1]))).toBe(0);
  });

  it('returns 0 on a dimension mismatch instead of throwing', () => {
    expect(cosineSimilarity(Float32Array.from([1]), Float32Array.from([1, 2]))).toBe(0);
  });

  it('scores related text above unrelated text', () => {
    const query = hashEmbed('what does RuBisCO do in the Calvin cycle', 256);
    const near = hashEmbed('RuBisCO fixes CO2 onto RuBP in the Calvin cycle', 256);
    const far = hashEmbed('the treaty was signed in Vienna in 1815', 256);
    expect(cosineSimilarity(query, near)).toBeGreaterThan(cosineSimilarity(query, far));
  });
});

describe('float32 blob round-trip', () => {
  it('preserves values through the SQLite BLOB encoding', () => {
    const original = hashEmbed('photosynthesis in the thylakoid membrane', 64);
    const restored = blobToVector(vectorToBlob(original));
    expect(restored.length).toBe(original.length);
    for (let i = 0; i < original.length; i += 1) {
      expect(restored[i]).toBeCloseTo(original[i] ?? 0, 6);
    }
  });
});
