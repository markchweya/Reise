/** A deterministic bag-of-trigrams embedding.
 *
 *  This exists so that ingestion, retrieval and the tests all work with no
 *  network and no key — the app is usable the moment you open it. It captures
 *  lexical overlap only, so it will not match "car" to "automobile". Real
 *  vectors come from the proxy's /embed route; the shape is identical, so
 *  swapping is invisible to the retrieval code. */

function fnv1a(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function hashEmbed(text: string, dim: number): Float32Array {
  const vec = new Float32Array(dim);
  const norm = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
  if (!norm) return vec;

  const words = norm.split(' ');
  for (const word of words) {
    vec[fnv1a(word) % dim] = (vec[fnv1a(word) % dim] ?? 0) + 1;
    const padded = ` ${word} `;
    for (let i = 0; i + 3 <= padded.length; i += 1) {
      const idx = fnv1a(padded.slice(i, i + 3)) % dim;
      vec[idx] = (vec[idx] ?? 0) + 0.5;
    }
  }

  let mag = 0;
  for (let i = 0; i < dim; i += 1) mag += (vec[i] ?? 0) ** 2;
  mag = Math.sqrt(mag);
  if (mag > 0) for (let i = 0; i < dim; i += 1) vec[i] = (vec[i] ?? 0) / mag;
  return vec;
}
