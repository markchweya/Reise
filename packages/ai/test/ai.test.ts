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
});
