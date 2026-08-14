export type BadgeTier = 'bronze' | 'silver' | 'gold';

export interface BadgeStats {
  notesReady: number;
  chunksIndexed: number;
  charactersIndexed: number;
  questionsAsked: number;
  summariesRun: number;
  explainsRun: number;
  rewritesRun: number;
  citationsOpened: number;
  distinctSourceTypes: number;
  imagesIngested: number;
  distinctDaysActive: number;
  longestDayStreak: number;
  lateNightMessages: number;
  threadsStarted: number;
  longestThreadTurns: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  /** Shown while locked, so the badge is a goal rather than a mystery. */
  hint: string;
  icon: string;
  tier: BadgeTier;
  /** Progress toward unlocking, 0..target. */
  progress: (s: BadgeStats) => number;
  target: number;
}

export const BADGES: readonly Badge[] = [
  { id: 'first-note', name: 'Day One', description: 'You imported your first note.', hint: 'Import a note to get started.', icon: 'document-text', tier: 'bronze', target: 1, progress: (s) => s.notesReady },
  { id: 'shelf-of-five', name: 'Shelf', description: 'Five notes indexed and searchable.', hint: 'Get five notes to ready.', icon: 'library', tier: 'bronze', target: 5, progress: (s) => s.notesReady },
  { id: 'stacks', name: 'The Stacks', description: 'Twenty-five notes in your library.', hint: 'Twenty-five notes indexed.', icon: 'albums', tier: 'gold', target: 25, progress: (s) => s.notesReady },
  { id: 'first-question', name: 'First Question', description: 'You asked Soma something about your notes.', hint: 'Ask a question about a note.', icon: 'chatbubble-ellipses', tier: 'bronze', target: 1, progress: (s) => s.questionsAsked },
  { id: 'hundred-questions', name: 'Interrogator', description: 'A hundred questions asked.', hint: 'Ask a hundred questions.', icon: 'help-circle', tier: 'gold', target: 100, progress: (s) => s.questionsAsked },
  { id: 'quad-mode', name: 'Full Toolkit', description: 'You used Ask, Summarize, Explain and Rewrite.', hint: 'Try all four modes on a note.', icon: 'color-wand', tier: 'silver', target: 4, progress: (s) => [s.questionsAsked, s.summariesRun, s.explainsRun, s.rewritesRun].filter((n) => n > 0).length },
  { id: 'source-hunter', name: 'Show Your Working', description: 'You opened ten source chips to check an answer.', hint: 'Tap the source chips under an answer.', icon: 'link', tier: 'silver', target: 10, progress: (s) => s.citationsOpened },
  { id: 'polyglot-inputs', name: 'Any Format', description: 'Text, documents and photos all imported.', hint: 'Import three different kinds of file.', icon: 'layers', tier: 'silver', target: 3, progress: (s) => s.distinctSourceTypes },
  { id: 'camera-scholar', name: 'Handwriting Decoder', description: 'You turned five photos of notes into text.', hint: 'Import five photos of notes.', icon: 'camera', tier: 'silver', target: 5, progress: (s) => s.imagesIngested },
  { id: 'ten-thousand', name: 'Ten Thousand Words', description: 'Fifty thousand characters indexed.', hint: 'Index fifty thousand characters.', icon: 'text', tier: 'silver', target: 50000, progress: (s) => s.charactersIndexed },
  { id: 'week-streak', name: 'Seven Straight', description: 'You studied seven days in a row.', hint: 'Use Soma seven days running.', icon: 'flame', tier: 'gold', target: 7, progress: (s) => s.longestDayStreak },
  { id: 'night-owl', name: 'Night Owl', description: 'Twenty messages sent between midnight and 4am.', hint: 'Study late. Twenty times.', icon: 'moon', tier: 'bronze', target: 20, progress: (s) => s.lateNightMessages },
  { id: 'deep-dive', name: 'Deep Dive', description: 'A single conversation ran twenty turns.', hint: 'Keep one thread going for twenty turns.', icon: 'infinite', tier: 'silver', target: 20, progress: (s) => s.longestThreadTurns },
  { id: 'librarian', name: 'Librarian', description: 'A thousand chunks indexed across your library.', hint: 'Index a thousand chunks.', icon: 'server', tier: 'gold', target: 1000, progress: (s) => s.chunksIndexed },
];

export const EMPTY_STATS: BadgeStats = {
  notesReady: 0, chunksIndexed: 0, charactersIndexed: 0, questionsAsked: 0,
  summariesRun: 0, explainsRun: 0, rewritesRun: 0, citationsOpened: 0,
  distinctSourceTypes: 0, imagesIngested: 0, distinctDaysActive: 0,
  longestDayStreak: 0, lateNightMessages: 0, threadsStarted: 0, longestThreadTurns: 0,
};
