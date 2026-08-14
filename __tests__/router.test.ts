import { describe, expect, it } from 'vitest';
import { needsRetrieval, parseIntentLabel, routeLocally } from '../src/chat/router';

const intentOf = (msg: string) => routeLocally(msg).intent;

describe('routeLocally', () => {
  it('treats greetings as chat, confidently', () => {
    for (const msg of ['hey', 'Hi', 'hello!', 'yo', 'good morning', 'thanks!', 'how are you?']) {
      const result = routeLocally(msg);
      expect(result.intent, msg).toBe('greeting');
      expect(result.confident, msg).toBe(true);
    }
  });

  it('never sends a greeting down the retrieval path', () => {
    expect(needsRetrieval(intentOf('hey'))).toBe(false);
  });

  it('recognises questions about the library itself', () => {
    for (const msg of ['what notes do I have?', 'how many notes are there?', 'list my uploads']) {
      expect(intentOf(msg), msg).toBe('meta');
    }
    expect(needsRetrieval('meta')).toBe(false);
  });

  it('routes real questions to retrieval', () => {
    for (const msg of ['what is the Calvin cycle?', 'why does RuBisCO denature above 40C', 'compare PSI and PSII']) {
      expect(intentOf(msg), msg).toBe('note_question');
      expect(needsRetrieval(intentOf(msg))).toBe(true);
    }
  });

  it('picks out the three special modes', () => {
    expect(intentOf('summarize my biology notes')).toBe('summarize');
    expect(intentOf('tldr please')).toBe('summarize');
    expect(intentOf('explain photophosphorylation')).toBe('explain');
    expect(intentOf('eli5 the light reactions')).toBe('explain');
    expect(intentOf('rewrite this into bullets')).toBe('rewrite');
    expect(intentOf('clean up these notes')).toBe('rewrite');
  });

  it('prefers rewrite over summarize when both words appear', () => {
    expect(intentOf('rewrite the summary section')).toBe('rewrite');
  });

  it('defers to the model on an ambiguous long statement', () => {
    const result = routeLocally('the mitochondria bit from last week that the lecturer rushed through at the end');
    expect(result.confident).toBe(false);
  });

  it('handles an empty message without crashing', () => {
    expect(routeLocally('   ').intent).toBe('greeting');
  });
});

describe('parseIntentLabel', () => {
  it('reads a clean label', () => {
    expect(parseIntentLabel('note_question', 'greeting')).toBe('note_question');
  });

  it('reads a label with surrounding noise', () => {
    expect(parseIntentLabel('Label: summarize\n', 'greeting')).toBe('summarize');
  });

  it('falls back when the model returns nonsense', () => {
    expect(parseIntentLabel('I think this is about biology', 'note_question')).toBe('note_question');
  });
});
