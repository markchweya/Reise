import { create } from 'zustand';
import { badgeStats, persistUnlocked, unlockedBadgeIds } from '../db/repo';
import { evaluateBadges, type BadgeState } from '../achievements/engine';
import { EMPTY_STATS, type Badge, type BadgeStats } from '../achievements/catalog';

interface BadgeStore {
  stats: BadgeStats;
  states: BadgeState[];
  toast: Badge | null;
  refresh: () => Promise<void>;
  dismissToast: () => void;
}

export const useBadges = create<BadgeStore>((set) => ({
  stats: EMPTY_STATS,
  states: evaluateBadges(EMPTY_STATS),
  toast: null,

  refresh: async () => {
    const stats = await badgeStats();
    const states = evaluateBadges(stats);
    const alreadyKnown = await unlockedBadgeIds();
    const fresh = states.filter((s) => s.unlocked && !alreadyKnown.has(s.badge.id)).map((s) => s.badge);
    await persistUnlocked(fresh.map((b) => b.id));
    set({ stats, states, toast: fresh[0] ?? null });
  },

  dismissToast: () => set({ toast: null }),
}));
