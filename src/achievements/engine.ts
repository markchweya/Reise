import { BADGES, type Badge, type BadgeStats } from './catalog';

export interface BadgeState {
  badge: Badge;
  unlocked: boolean;
  progress: number;
  ratio: number;
}

export function evaluateBadges(stats: BadgeStats): BadgeState[] {
  return BADGES.map((badge) => {
    const progress = Math.min(badge.progress(stats), badge.target);
    return {
      badge,
      progress,
      ratio: badge.target === 0 ? 1 : progress / badge.target,
      unlocked: progress >= badge.target,
    };
  });
}

/** Badges present in `next` but not in `prev`. Drives the unlock toast. */
export function newlyUnlocked(prev: BadgeStats, next: BadgeStats): Badge[] {
  const before = new Set(evaluateBadges(prev).filter((b) => b.unlocked).map((b) => b.badge.id));
  return evaluateBadges(next).filter((b) => b.unlocked && !before.has(b.badge.id)).map((b) => b.badge);
}

/** Longest run of consecutive calendar days in a set of YYYY-MM-DD strings. */
export function longestStreak(days: string[]): number {
  const sorted = [...new Set(days)].sort();
  let best = 0;
  let run = 0;
  let previous: number | null = null;
  for (const day of sorted) {
    const t = Date.parse(`${day}T00:00:00Z`);
    if (Number.isNaN(t)) continue;
    run = previous !== null && t - previous === 86400000 ? run + 1 : 1;
    previous = t;
    if (run > best) best = run;
  }
  return best;
}
