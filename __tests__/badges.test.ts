import { describe, expect, it } from 'vitest';
import { evaluateBadges, longestStreak, newlyUnlocked } from '../src/achievements/engine';
import { BADGES, EMPTY_STATS, type BadgeStats } from '../src/achievements/catalog';

const stats = (over: Partial<BadgeStats>): BadgeStats => ({ ...EMPTY_STATS, ...over });

describe('badges', () => {
  it('unlocks nothing on a fresh install', () => {
    expect(evaluateBadges(EMPTY_STATS).filter((b) => b.unlocked)).toHaveLength(0);
  });

  it('unlocks Day One on the first ready note', () => {
    const state = evaluateBadges(stats({ notesReady: 1 })).find((b) => b.badge.id === 'first-note');
    expect(state?.unlocked).toBe(true);
  });

  it('clamps progress at the target', () => {
    const state = evaluateBadges(stats({ notesReady: 999 })).find((b) => b.badge.id === 'shelf-of-five');
    expect(state?.progress).toBe(5);
    expect(state?.ratio).toBe(1);
  });

  it('reports only the newly crossed badges', () => {
    const fresh = newlyUnlocked(stats({ notesReady: 1 }), stats({ notesReady: 5 }));
    expect(fresh.map((b) => b.id)).toEqual(['shelf-of-five']);
  });

  it('needs all four modes for Full Toolkit', () => {
    const three = stats({ questionsAsked: 3, summariesRun: 1, explainsRun: 1 });
    expect(evaluateBadges(three).find((b) => b.badge.id === 'quad-mode')?.unlocked).toBe(false);
    const four = stats({ ...three, rewritesRun: 1 });
    expect(evaluateBadges(four).find((b) => b.badge.id === 'quad-mode')?.unlocked).toBe(true);
  });

  it('gives every badge a unique id and a positive target', () => {
    expect(new Set(BADGES.map((b) => b.id)).size).toBe(BADGES.length);
    for (const badge of BADGES) expect(badge.target).toBeGreaterThan(0);
  });
});

describe('longestStreak', () => {
  it('is 0 with no activity', () => {
    expect(longestStreak([])).toBe(0);
  });

  it('counts consecutive days', () => {
    expect(longestStreak(['2026-03-01', '2026-03-02', '2026-03-03'])).toBe(3);
  });

  it('resets on a gap and keeps the best run', () => {
    expect(longestStreak(['2026-03-01', '2026-03-02', '2026-03-09', '2026-03-10', '2026-03-11'])).toBe(3);
  });

  it('ignores duplicate days', () => {
    expect(longestStreak(['2026-03-01', '2026-03-01', '2026-03-02'])).toBe(2);
  });

  it('crosses a month boundary', () => {
    expect(longestStreak(['2026-01-31', '2026-02-01'])).toBe(2);
  });
});
