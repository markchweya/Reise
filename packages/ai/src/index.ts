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
  resolvedJourney: z.object({
    origin: z.string().optional(),
    destination: z.string().optional(),
  }),
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

const matchesGreeting = (message: string) =>
  /^(hi|hello|hey|hiya|yo|good (morning|afternoon|evening))[!.?\s]*$/i.test(
    message,
  );

const fallbackMessage = (message: string) => {
  if (matchesGreeting(message)) {
    return "Hey! I’m here. Where are you heading, or what would you like to know about your trip?";
  }
  if (/\b(how are you|how's it going|how are things)\b/i.test(message)) {
    return "I’m ready to help. You can ask me about a route, delay, fare, direction, or vehicle.";
  }
  if (/\b(thanks|thank you|cheers)\b/i.test(message)) {
    return "You’re welcome. Let me know if you need anything else for your journey.";
  }
  if (/\b(help|what can you do)\b/i.test(message)) {
    return "I can plan a route, check delays, explain fares and directions, or help confirm the right vehicle.";
  }
  return "I can help with routes, delays, fares, directions, and vehicle checks. Tell me what you need in your own words.";
};

const resolveJourneyPlaces = (
  places: string[],
  context: AssistantContext,
) => {
  if (places.length >= 2) {
    return { origin: places[0], destination: places[1] };
  }

  const place = places[0];
  if (!place) {
    return {
      origin: context.origin,
      destination: context.destination,
    };
  }
  if (!context.origin) {
    return { origin: place, destination: context.destination };
  }
  if (!context.destination && place !== context.origin) {
    return { origin: context.origin, destination: place };
  }
  return { origin: context.origin, destination: context.destination };
};

export class LocalMemoryAssistant implements AIProvider {
  async respond(
    message: string,
    context: AssistantContext,
    snapshot: TransitSnapshot,
  ): Promise<AssistantResult> {
    const lower = message.toLowerCase();
    const places = findPlaces(message);
    const { origin, destination } = resolveJourneyPlaces(places, context);
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

    if (intent === "fallback") {
      return {
        message: fallbackMessage(message),
        needs: [],
        journeys: [],
        resolvedJourney: { origin, destination },
        intent,
        execution: "on_device_memory",
      };
    }

    if (intent === "delay" && !origin && !destination) {
      const activeDisruptions = snapshot.disruptions.filter(
        (disruption) => disruption.active,
      );
      return {
        message: activeDisruptions.length
          ? activeDisruptions.map((item) => item.note).join(" ")
          : "I’m not seeing an active disruption right now. Tell me your line or stops and I can narrow the check.",
        needs: [],
        journeys: [],
        resolvedJourney: {},
        intent,
        execution: "on_device_memory",
      };
    }

    const needs = [
      !origin ? "origin" : null,
      !destination ? "destination" : null,
    ].filter(Boolean) as ("origin" | "destination")[];
    if (needs.length) {
      const missingDetailsMessage =
        needs.length === 2
          ? "Where are you travelling from, and where would you like to go?"
          : needs[0] === "destination"
            ? `Got it — starting from ${origin}. Where would you like to go?`
            : `Where are you starting from? I have ${destination} as your destination.`;
      return {
        message: missingDetailsMessage,
        needs,
        journeys: [],
        resolvedJourney: { origin, destination },
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
        resolvedJourney: { origin, destination },
        intent,
        execution: "on_device_memory",
      };
    const best = journeys[0]!;
    const warning = best.warnings[0] ? ` Note: ${best.warnings[0]}` : "";
    return {
      message: `${best.reason} Leave at ${formatMinutes(best.departureMinutes)} and arrive at ${formatMinutes(best.arrivalMinutes)}.${warning}`,
      needs: [],
      journeys,
      resolvedJourney: { origin, destination },
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
