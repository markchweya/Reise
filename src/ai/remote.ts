import type { AIProvider, ChatMessage, ChatOpts, DocumentInput, StreamChunk } from './types';
import { CHAT_MODEL, EMBED_DIM, devApiKey, devBaseUrl, proxyUrl, providerKind } from './config';
import { streamSSE } from './sse';
import { hashEmbed } from './hashEmbed';

interface Endpoint {
  chatUrl: string;
  embedUrl: string;
  extractUrl: string;
  headers: Record<string, string>;
}

function endpoint(): Endpoint {
  const json = { 'content-type': 'application/json' };
  if (providerKind() === 'direct') {
    // ------------------------------------------------------------------
    // DEV ONLY. The key lives in the JS bundle here. Ship the proxy instead.
    // ------------------------------------------------------------------
    const base = devBaseUrl();
    return {
      chatUrl: `${base}/v1/messages`,
      embedUrl: `${base}/v1/embeddings`,
      extractUrl: `${base}/v1/messages`,
      headers: {
        ...json,
        'x-api-key': devApiKey(),
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
    };
  }
  const base = proxyUrl();
  return { chatUrl: `${base}/chat`, embedUrl: `${base}/embed`, extractUrl: `${base}/extract`, headers: json };
}

function splitSystem(messages: ChatMessage[]): { system: string; turns: ChatMessage[] } {
  const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
  return { system, turns: messages.filter((m) => m.role !== 'system') };
}

export class RemoteProvider implements AIProvider {
  readonly id = 'remote';
  readonly supportsVision = true;

  async embed(texts: string[]): Promise<Float32Array[]> {
    const ep = endpoint();
    if (providerKind() === 'direct') {
      // No first-party embedding endpoint to hit directly, so dev mode uses the
      // deterministic local embedder. Retrieval still works; it is just weaker
      // on synonyms. The proxy path uses real vectors.
      return texts.map((t) => hashEmbed(t, EMBED_DIM));
    }
    try {
      const res = await fetch(ep.embedUrl, {
        method: 'POST',
        headers: ep.headers,
        body: JSON.stringify({ texts }),
      });
      if (!res.ok) throw new Error(`Embed failed (${res.status})`);
      const json = (await res.json()) as { vectors: number[][] };
      return json.vectors.map((v) => Float32Array.from(v));
    } catch (err) {
      // Falling back keeps ingestion usable offline rather than failing the note.
      if (__DEV__) console.warn('embed fallback:', err);
      return texts.map((t) => hashEmbed(t, EMBED_DIM));
    }
  }

  async *chat(messages: ChatMessage[], opts: ChatOpts): AsyncIterable<StreamChunk> {
    const ep = endpoint();
    const { system, turns } = splitSystem(messages);
    const body = JSON.stringify({
      model: CHAT_MODEL,
      max_tokens: opts.maxTokens ?? 1024,
      temperature: opts.temperature ?? 0.3,
      stream: true,
      system,
      messages: turns.map((m) => ({ role: m.role, content: m.content })),
    });

    let stop: 'end' | 'max_tokens' | 'aborted' = 'end';
    for await (const evt of streamSSE(ep.chatUrl, { headers: ep.headers, body, signal: opts.signal })) {
      if (evt.data === '[DONE]') break;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- provider wire format, narrowed immediately below
      let parsed: any;
      try {
        parsed = JSON.parse(evt.data);
      } catch {
        continue;
      }
      if (parsed?.type === 'content_block_delta' && typeof parsed.delta?.text === 'string') {
        yield { type: 'text', text: parsed.delta.text as string };
      } else if (parsed?.type === 'message_delta' && parsed.delta?.stop_reason === 'max_tokens') {
        stop = 'max_tokens';
      } else if (parsed?.type === 'error') {
        throw new Error(String(parsed.error?.message ?? 'The model returned an error.'));
      }
    }
    yield { type: 'done', stopReason: opts.signal?.aborted ? 'aborted' : stop };
  }

  async extractDocumentText(doc: DocumentInput): Promise<string> {
    const ep = endpoint();
    const isImage = doc.mediaType.startsWith('image/');
    const instruction =
      'Transcribe every word of this document to plain text. Keep headings, lists and ' +
      'ordering. Do not summarise, do not add commentary, do not invent anything that is ' +
      'not visible. If a passage is unreadable, write [unreadable] in its place.';

    const res = await fetch(ep.extractUrl, {
      method: 'POST',
      headers: ep.headers,
      body: JSON.stringify({
        model: CHAT_MODEL,
        max_tokens: 8192,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: isImage ? 'image' : 'document',
                source: { type: 'base64', media_type: doc.mediaType, data: doc.base64 },
              },
              { type: 'text', text: instruction },
            ],
          },
        ],
      }),
    });
    if (!res.ok) {
      throw new Error(`Could not read ${doc.filename}. The extraction service returned ${res.status}.`);
    }
    const json = (await res.json()) as { content?: { type: string; text?: string }[]; text?: string };
    if (typeof json.text === 'string') return json.text;
    const text = (json.content ?? []).filter((c) => c.type === 'text').map((c) => c.text ?? '').join('\n');
    if (!text.trim()) throw new Error(`No text could be read out of ${doc.filename}.`);
    return text;
  }
}
