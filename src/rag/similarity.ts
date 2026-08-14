/** Vectors from the provider are unit length, but nothing guarantees that for
 *  a future provider, so this normalises properly. */
export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    dot += x * y;
    magA += x * x;
    magB += y * y;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export function vectorToBlob(vec: Float32Array): Uint8Array {
  const buf = new ArrayBuffer(vec.length * 4);
  const view = new DataView(buf);
  for (let i = 0; i < vec.length; i += 1) view.setFloat32(i * 4, vec[i] ?? 0, true);
  return new Uint8Array(buf);
}

export function blobToVector(blob: Uint8Array): Float32Array {
  const view = new DataView(blob.buffer, blob.byteOffset, blob.byteLength);
  const out = new Float32Array(Math.floor(blob.byteLength / 4));
  for (let i = 0; i < out.length; i += 1) out[i] = view.getFloat32(i * 4, true);
  return out;
}
