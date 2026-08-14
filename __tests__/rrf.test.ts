import { describe, expect, it } from 'vitest';
import { reciprocalRankFusion } from '../src/rag/rrf';

describe('reciprocalRankFusion', () => {
  it('returns an empty result for empty input', () => {
    expect(reciprocalRankFusion([])).toEqual([]);
    expect(reciprocalRankFusion([{ ids: [] }])).toEqual([]);
  });

  it('preserves order for a single list', () => {
    const fused = reciprocalRankFusion([{ ids: ['a', 'b', 'c'] }]);
    expect(fused.map((f) => f.id)).toEqual(['a', 'b', 'c']);
  });

  it('promotes a document that both lists agree on', () => {
    const fused = reciprocalRankFusion([
      { ids: ['x', 'agreed', 'y'] },
      { ids: ['z', 'agreed', 'w'] },
    ]);
    expect(fused[0]?.id).toBe('agreed');
  });

  it('beats a single first place with two second places', () => {
    const fused = reciprocalRankFusion([
      { ids: ['solo', 'both'] },
      { ids: ['other', 'both'] },
    ]);
    expect(fused[0]?.id).toBe('both');
  });

  it('deduplicates ids across lists', () => {
    const fused = reciprocalRankFusion([{ ids: ['a', 'b'] }, { ids: ['b', 'a'] }]);
    expect(fused).toHaveLength(2);
  });

  it('honours list weights', () => {
    const unweighted = reciprocalRankFusion([{ ids: ['keyword'] }, { ids: ['vector'] }]);
    expect(unweighted[0]?.id).toBe('keyword');
    const weighted = reciprocalRankFusion([{ ids: ['keyword'], weight: 1 }, { ids: ['vector'], weight: 5 }]);
    expect(weighted[0]?.id).toBe('vector');
  });

  it('decays with rank as 1/(k+rank)', () => {
    const fused = reciprocalRankFusion([{ ids: ['first', 'second'] }], 60);
    expect(fused[0]?.score).toBeCloseTo(1 / 61, 8);
    expect(fused[1]?.score).toBeCloseTo(1 / 62, 8);
  });
});
