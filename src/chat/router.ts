/** Intent routing.
 *
 *  A greeting that triggers a document search feels broken, so this runs
 *  before any retrieval. Cheap deterministic rules first; the model is only
 *  consulted when the rules genuinely cannot tell. */

export type Intent = 'greeting' | 'meta' | 'note_question' | 'summarize' | 'explain' | 'rewrite';

export interface RouteResult {
  intent: Intent;
  confident: boolean;
}

const GREETINGS = [
  'hi', 'hii', 'hiii', 'hey', 'heyy', 'hello', 'hallo', 'yo', 'sup', 'wassup', 'whatsup',
  'good morning', 'good afternoon', 'good evening', 'good night', 'gm', 'gn',
  'thanks', 'thank you', 'thx', 'ty', 'cheers', 'nice', 'cool', 'ok', 'okay', 'k',
  'bye', 'goodbye', 'see ya', 'later', 'lol', 'haha', 'nvm', 'never mind',
  'how are you', 'how are you doing', 'hows it going', 'how is it going',
  'who are you', 'what are you', 'what can you do', 'help',
];

const META = [
  /\bwhat (notes|files|documents|docs)\b/,
  /\bmy (notes|library|uploads|files)\b.*\b(have|got|list|show|many)\b/,
  /\b(list|show me)\b.*\b(notes|files|uploads|library)\b/,
  /\bhow many\b.*\b(notes|files|chunks|documents|uploads)\b/,
  /\bwhen did i (upload|add|import)\b/,
  /\bwhat(?:'s| is| have) in my library\b/,
];

const SUMMARIZE = [/\bsummar(y|ise|ize|ised|ized)\b/, /\btl;?dr\b/, /\bkey (points|takeaways|ideas)\b/, /\boverview of\b/, /\bgist\b/, /\brecap\b/];
const EXPLAIN = [/\bexplain\b/, /\bwhat does .* mean\b/, /\bwhat is meant by\b/, /\bbreak (this|it) down\b/, /\bin (simple|plain) (terms|english|words)\b/, /\bel(i|li)5\b/, /\bhelp me understand\b/, /\bi don'?t (get|understand)\b/];
const REWRITE = [/\brewrite\b/, /\brewrote\b/, /\bclean (this |it |them )?up\b/, /\btidy\b/, /\breorganis?z?e\b/, /\breword\b/, /\brephrase\b/, /\bmake (this|it|these) (readable|clearer|neater|prettier)\b/, /\bturn (this|these) into (bullets|prose|notes)\b/, /\bpolish\b/];

const QUESTIONISH = /\?|^(what|why|how|when|where|which|who|whose|does|do|did|is|are|was|were|can|could|should|would|list|name|define|compare|contrast|describe|give)\b/;

function normalise(message: string): string {
  return message.toLowerCase().replace(/[^\p{L}\p{N}\s;']/gu, ' ').replace(/\s+/g, ' ').trim();
}

/** Deterministic pass. `confident: false` means "ask the model". */
export function routeLocally(message: string): RouteResult {
  const text = normalise(message);
  if (!text) return { intent: 'greeting', confident: true };

  const words = text.split(' ');

  // Short and matches a greeting: nothing else it could be.
  if (words.length <= 6 && GREETINGS.includes(text)) return { intent: 'greeting', confident: true };
  if (words.length <= 3 && GREETINGS.some((g) => text.startsWith(`${g} `) || text === g)) {
    return { intent: 'greeting', confident: true };
  }

  if (META.some((re) => re.test(text))) return { intent: 'meta', confident: true };
  if (REWRITE.some((re) => re.test(text))) return { intent: 'rewrite', confident: true };
  if (SUMMARIZE.some((re) => re.test(text))) return { intent: 'summarize', confident: true };
  if (EXPLAIN.some((re) => re.test(text))) return { intent: 'explain', confident: true };

  if (QUESTIONISH.test(text)) return { intent: 'note_question', confident: true };

  // A long statement that is not a question and not a greeting: could be a
  // pasted passage to work on, could be thinking out loud. Let the model say.
  if (words.length > 8) return { intent: 'note_question', confident: false };

  // Short, unrecognised, not a question. Most often conversational filler.
  return { intent: 'greeting', confident: false };
}

const VALID: readonly Intent[] = ['greeting', 'meta', 'note_question', 'summarize', 'explain', 'rewrite'];

export function parseIntentLabel(raw: string, fallback: Intent): Intent {
  const label = raw.toLowerCase().trim().split(/[^a-z_]/).find((t) => (VALID as string[]).includes(t));
  return (label as Intent | undefined) ?? fallback;
}

export function needsRetrieval(intent: Intent): boolean {
  return intent !== 'greeting' && intent !== 'meta';
}
