import { create } from "zustand";
import type {
  Journey,
  JourneyPriority,
  Language,
  Travelcard,
} from "@reise/shared";

type ReiseState = {
  userName: string;
  language: Language;
  travelcard: Travelcard;
  priority: JourneyPriority;
  selectedJourney?: Journey;
  unlockedAchievements: string[];
  setLanguage(language: Language): void;
  setTravelcard(travelcard: Travelcard): void;
  setPriority(priority: JourneyPriority): void;
  setJourney(journey: Journey): void;
  unlock(id: string): void;
};

export const useReiseStore = create<ReiseState>((set) => ({
  userName: "Mark",
  language: "en",
  travelcard: "half_fare",
  priority: "fastest",
  unlockedAchievements: ["first-route", "right-way", "fare-finder"],
  setLanguage: (language) => set({ language }),
  setTravelcard: (travelcard) => set({ travelcard }),
  setPriority: (priority) => set({ priority }),
  setJourney: (selectedJourney) =>
    set((state) => ({
      selectedJourney,
      unlockedAchievements: [
        ...new Set([...state.unlockedAchievements, "first-route"]),
      ],
    })),
  unlock: (id) =>
    set((state) => ({
      unlockedAchievements: [...new Set([...state.unlockedAchievements, id])],
    })),
}));
