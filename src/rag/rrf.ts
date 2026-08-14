export interface RankedList<T> {
  ids: T[];
  weight?: number;
}

/**
 * Reciprocal Rank Fusion. Combines rankings without needing their scores to be
 * comparable — cosine similarity and BM25 are on wildly different scales, so
 * this is the only sane way to merge them.
 */
export function reciprocalRankFusion<T extends string | number>(
  lists: RankedList<T>[],
  k = 60,
): { id: T; score: number }[] {
  const scores = new Map<T, number>();
  const firstSeen = new Map<T, number>();
  let order = 0;

  for (const list of lists) {
    const weight = list.weight ?? 1;
    list.ids.forEach((id, index) => {
      scores.set(id, (scores.get(id) ?? 0) + weight / (k + index + 1));
      if (!firstSeen.has(id)) {
        firstSeen.set(id, order);
        order += 1;
      }
    });
  }

  return [...scores.entries()]
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score || (firstSeen.get(a.id) ?? 0) - (firstSeen.get(b.id) ?? 0));
}
