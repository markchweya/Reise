import { ai, type ChatMessage } from '../ai';
import {
  ASK_PROMPT, CATALOG_PROMPT, CHITCHAT_PROMPT, CLASSIFY_PROMPT,
  EXPLAIN_PROMPT, REWRITE_PROMPT, SUMMARIZE_PROMPT,
} from '../ai/prompts';
import { catalogSummary } from '../db/repo';
import { buildContext, retrieve, type RetrievedChunk } from '../rag/retrieve';
import { needsRetrieval, parseIntentLabel, routeLocally, type Intent } from './router';

export interface AnswerEvent {
  type: 'intent' | 'sources' | 'text' | 'done';
  intent?: Intent;
  sources?: RetrievedChunk[];
  text?: string;
}

export interface AskInput {
  message: string;
  history: { role: 'user' | 'assistant'; content: string }[];
  noteId?: string;
  /** Forced by the four mode buttons; skips classification entirely. */
  forceIntent?: Intent;
  signal?: AbortSignal;
}

const HISTORY_TURNS = 6;

function systemFor(intent: Intent): string {
  switch (intent) {
    case 'greeting': return CHITCHAT_PROMPT;
    case 'meta': return CATALOG_PROMPT;
    case 'summarize': return SUMMARIZE_PROMPT;
    case 'explain': return EXPLAIN_PROMPT;
    case 'rewrite': return REWRITE_PROMPT;
    default: return ASK_PROMPT;
  }
}

async function classifyWithModel(message: string, fallback: Intent): Promise<Intent> {
  try {
    let out = '';
    for await (const chunk of ai().chat(
      [{ role: 'system', content: CLASSIFY_PROMPT }, { role: 'user', content: message }],
      { maxTokens: 8, temperature: 0 },
    )) {
      if (chunk.type === 'text') out += chunk.text;
    }
    return parseIntentLabel(out, fallback);
  } catch {
    return fallback;
  }
}

/** The whole query pipeline, as an async iterable the chat screen renders. */
export async function* askSoma(input: AskInput): AsyncIterable<AnswerEvent> {
  let intent: Intent;
  if (input.forceIntent) {
    intent = input.forceIntent;
  } else {
    const local = routeLocally(input.message);
    intent = local.confident ? local.intent : await classifyWithModel(input.message, local.intent);
  }
  yield { type: 'intent', intent };

  const messages: ChatMessage[] = [{ role: 'system', content: systemFor(intent) }];
  let sources: RetrievedChunk[] = [];

  if (intent === 'meta') {
    messages.push({ role: 'system', content: `Library catalog:\n${await catalogSummary()}` });
  } else if (needsRetrieval(intent)) {
    sources = await retrieve(input.message, input.noteId);
    yield { type: 'sources', sources };
    if (sources.length === 0) {
      const scope = input.noteId ? 'this note' : 'your notes';
      yield {
        type: 'text',
        text: `I could not find anything about that in ${scope}. If the material should be there, it may not have finished indexing — or try naming the topic the way your notes phrase it.`,
      };
      yield { type: 'done' };
      return;
    }
    messages.push({
      role: 'system',
      content: `Excerpts from the student's notes. This is your only source of truth.\n\n${buildContext(sources)}`,
    });
  }

  for (const turn of input.history.slice(-HISTORY_TURNS)) {
    messages.push({ role: turn.role, content: turn.content });
  }
  messages.push({ role: 'user', content: input.message });

  const maxTokens = intent === 'greeting' ? 200 : intent === 'rewrite' ? 2048 : 1024;
  for await (const chunk of ai().chat(messages, { maxTokens, temperature: intent === 'greeting' ? 0.7 : 0.3, signal: input.signal })) {
    if (chunk.type === 'text') yield { type: 'text', text: chunk.text };
  }
  yield { type: 'done' };
}
