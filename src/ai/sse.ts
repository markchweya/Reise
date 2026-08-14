/** Minimal server-sent-events reader.
 *  React Native's fetch has no ReadableStream body, so we read the XHR
 *  response progressively instead. Everything above this file just awaits
 *  an async iterable of parsed SSE payloads. */

export interface SSEEvent {
  event: string;
  data: string;
}

export async function* streamSSE(
  url: string,
  init: { headers: Record<string, string>; body: string; signal?: AbortSignal },
): AsyncIterable<SSEEvent> {
  const queue: SSEEvent[] = [];
  let resolveNext: (() => void) | null = null;
  let finished = false;
  let failure: Error | null = null;

  const wake = (): void => {
    const r = resolveNext;
    resolveNext = null;
    r?.();
  };

  const xhr = new XMLHttpRequest();
  xhr.open('POST', url);
  for (const [k, v] of Object.entries(init.headers)) xhr.setRequestHeader(k, v);

  let consumed = 0;
  let buffer = '';

  const drain = (): void => {
    const parts = buffer.split('\n\n');
    buffer = parts.pop() ?? '';
    for (const block of parts) {
      let event = 'message';
      let data = '';
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) data += line.slice(5).trim();
      }
      if (data) queue.push({ event, data });
    }
    wake();
  };

  xhr.onprogress = (): void => {
    const text = xhr.responseText;
    buffer += text.slice(consumed);
    consumed = text.length;
    drain();
  };
  xhr.onload = (): void => {
    if (xhr.status >= 400) failure = new Error(`Model request failed (${xhr.status}). ${xhr.responseText.slice(0, 200)}`);
    buffer += xhr.responseText.slice(consumed);
    drain();
    finished = true;
    wake();
  };
  xhr.onerror = (): void => {
    failure = new Error('Could not reach the model. Check your connection or the proxy URL in .env.');
    finished = true;
    wake();
  };
  xhr.onabort = (): void => {
    finished = true;
    wake();
  };
  init.signal?.addEventListener('abort', () => xhr.abort());
  xhr.send(init.body);

  while (true) {
    if (queue.length > 0) {
      yield queue.shift() as SSEEvent;
      continue;
    }
    if (finished) break;
    await new Promise<void>((resolve) => {
      resolveNext = resolve;
    });
  }
  if (failure) throw failure;
}
