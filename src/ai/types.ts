/** The single seam between Soma and any model. Nothing above this file knows
 *  whether inference happens in a datacentre or on the phone. */

export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatOpts {
  /** Overrides the provider default. Kept small so replies stay snappy. */
  maxTokens?: number;
  temperature?: number;
  signal?: AbortSignal;
}

export type StreamChunk =
  | { type: 'text'; text: string }
  | { type: 'done'; stopReason: 'end' | 'max_tokens' | 'aborted' };

/** A document or photo handed to the provider for text extraction. */
export interface DocumentInput {
  base64: string;
  mediaType: string;
  filename: string;
}

export interface AIProvider {
  readonly id: string;
  readonly supportsVision: boolean;
  embed(texts: string[]): Promise<Float32Array[]>;
  chat(messages: ChatMessage[], opts: ChatOpts): AsyncIterable<StreamChunk>;
  /** Pulls plain text out of a PDF, DOCX or photo. */
  extractDocumentText(doc: DocumentInput): Promise<string>;
}

export class NotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotImplementedError';
  }
}
