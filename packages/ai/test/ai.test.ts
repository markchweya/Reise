import { describe, expect, it } from "vitest";
import { assistantResultSchema, LocalMemoryAssistant } from "../src/index";
import { testNetwork } from "@reise/transit-providers";

describe("phone-memory assistant", () => {
  it("returns validated grounded journey output without an API key", async () => {
    const result = await new LocalMemoryAssistant().respond(
      "How do I get from Redingstrasse to Stallenstrasse?",
      { priority: "fastest", travelcard: "half_fare", departureMinutes: 455 },
      testNetwork,
    );
    expect(assistantResultSchema.safeParse(result).success).toBe(true);
    expect(result.execution).toBe("on_device_memory");
    expect(result.journeys.length).toBeGreaterThan(0);
  });

  it("asks for missing structured inputs instead of inventing them", async () => {
    const result = await new LocalMemoryAssistant().respond(
      "Find a route",
      { priority: "fastest", travelcard: "none", departureMinutes: 455 },
      testNetwork,
    );
    expect(result.needs).toEqual(["origin", "destination"]);
    expect(result.journeys).toHaveLength(0);
  });

  it("answers a greeting without repeating the journey prompt", async () => {
    const result = await new LocalMemoryAssistant().respond(
      "hey",
      { priority: "fastest", travelcard: "none", departureMinutes: 455 },
      testNetwork,
    );

    expect(result.intent).toBe("fallback");
    expect(result.needs).toHaveLength(0);
    expect(result.message).toContain("Hey!");
    expect(result.message).not.toContain("What journey can I help with?");
  });

  it("keeps origin and destination across two messages", async () => {
    const assistant = new LocalMemoryAssistant();
    const first = await assistant.respond(
      "Basel SBB",
      { priority: "fastest", travelcard: "none", departureMinutes: 455 },
      testNetwork,
    );
    const second = await assistant.respond(
      "Stallenstrasse",
      {
        origin: first.resolvedJourney.origin!,
        priority: "fastest",
        travelcard: "none",
        departureMinutes: 455,
      },
      testNetwork,
    );

    expect(first.resolvedJourney.origin).toBe("Basel SBB");
    expect(first.needs).toEqual(["destination"]);
    expect(second.resolvedJourney.destination).toBe("Stallenstrasse");
    expect(second.journeys.length).toBeGreaterThan(0);
  });
});
