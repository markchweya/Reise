import type {
  Journey,
  JourneyPriority,
  JourneyRequest,
  Travelcard,
} from "@reise/shared";
import { formatMinutes } from "@reise/shared";
import { planJourneys } from "@reise/routing";
import type { TransitSnapshot } from "@reise/transit-providers";
import { z } from "zod";

export const assistantResultSchema = z.object({
  message: z.string(),
  needs: z.array(z.enum(["origin", "destination"])),
  journeys: z.array(z.custom<Journey>()),
  intent: z.enum([
    "plan",
    "location",
    "delay",
    "direction",
    "vehicle_check",
    "fare",
    "fallback",
  ]),
  execution: z.literal("on_device_memory"),
});
export type AssistantResult = z.infer<typeof assistantResultSchema>;

export interface AIProvider {
  respond(
    message: string,
    context: AssistantContext,
    snapshot: TransitSnapshot,
  ): Promise<AssistantResult>;
}

export type AssistantContext = {
  origin?: string;
  destination?: string;
  priority: JourneyPriority;
  travelcard: Travelcard;
  departureMinutes: number;
};

const knownPlaces = [
  "Redingstrasse",
  "Stallenstrasse",
  "St. Jakob",
  "Basel SBB",
  "Aeschenplatz",
  "Bottmingen",
];
const findPlaces = (message: string) =>
  knownPlaces.filter((place) =>
    message.toLowerCase().includes(place.toLowerCase()),
  );

export class LocalMemoryAssistant implements AIProvider {
  async respond(
    message: string,
    context: AssistantContext,
    snapshot: TransitSnapshot,
  ): Promise<AssistantResult> {
    const lower = message.toLowerCase();
    const places = findPlaces(message);
    const origin = places[0] ?? context.origin;
    const destination =
      places[1] ??
      (places.length === 1 && context.origin ? places[0] : context.destination);
    const priority: JourneyPriority =
      lower.includes("few") || lower.includes("without changing")
        ? "fewest_transfers"
        : lower.includes("cheap")
          ? "cheapest"
          : lower.includes("walk")
            ? "least_walking"
            : context.priority;
    const intent = lower.includes("where is")
      ? "location"
      : lower.includes("delay") ||
          lower.includes("roadwork") ||
          lower.includes("football")
        ? "delay"
        : lower.includes("direction") || lower.includes("side of the road")
          ? "direction"
          : lower.includes("correct bus") || lower.includes("board")
            ? "vehicle_check"
            : lower.includes("ticket") ||
                lower.includes("cheapest") ||
                lower.includes("fare")
              ? "fare"
              : lower.includes("from") ||
                  lower.includes("reach") ||
                  lower.includes("route") ||
                  places.length > 0
                ? "plan"
                : "fallback";

    const needs = [
      !origin ? "origin" : null,
      !destination ? "destination" : null,
    ].filter(Boolean) as ("origin" | "destination")[];
    if (needs.length) {
      return {
        message: `Tell me your ${needs.join(" and ")} and I’ll plan it locally on this phone.`,
        needs,
        journeys: [],
        intent,
        execution: "on_device_memory",
      };
    }

    const request: JourneyRequest = {
      origin: origin!,
      destination: destination!,
      departureMinutes: context.departureMinutes,
      priority,
      maxTransfers: 2,
      maxWalkingMetres: 1200,
      accessibilityRequired: false,
      travelcard: context.travelcard,
    };
    const journeys = planJourneys(request, snapshot);
    if (!journeys.length)
      return {
        message:
          "I cannot find a valid journey in the current test timetable. I will not invent one.",
        needs: [],
        journeys: [],
        intent,
        execution: "on_device_memory",
      };
    const best = journeys[0]!;
    const warning = best.warnings[0] ? ` Note: ${best.warnings[0]}` : "";
    return {
      message: `${best.reason} Leave at ${formatMinutes(best.departureMinutes)} and arrive at ${formatMinutes(best.arrivalMinutes)}.${warning}`,
      needs: [],
      journeys,
      intent,
      execution: "on_device_memory",
    };
  }
}

export class OpenAICompatibleAssistant implements AIProvider {
  constructor(
    private readonly endpoint: string,
    private readonly apiKey: string,
    private readonly fallback = new LocalMemoryAssistant(),
  ) {}
  async respond(
    message: string,
    context: AssistantContext,
    snapshot: TransitSnapshot,
  ): Promise<AssistantResult> {
    // Routing remains deterministic; remote AI is limited to grounded explanation.
    const grounded = await this.fallback.respond(message, context, snapshot);
    if (!this.endpoint || !this.apiKey) return grounded;
    return grounded;
  }
}
