import { describe, expect, it } from "vitest";
import { planJourneys, recalculateAfterMissedConnection } from "../src/index";
import { testNetwork } from "@reise/transit-providers";

const request = {
  origin: "Redingstrasse",
  destination: "Stallenstrasse",
  departureMinutes: 455,
  priority: "fastest" as const,
  maxTransfers: 2,
  maxWalkingMetres: 1200,
  accessibilityRequired: false,
  travelcard: "none" as const,
};

describe("time-dependent routing", () => {
  it("finds a transfer journey and ranks fewest transfers", () => {
    const journeys = planJourneys(
      { ...request, priority: "fewest_transfers" },
      testNetwork,
    );
    expect(journeys[0]?.transfers).toBe(1);
    expect(journeys[0]?.legs.map((leg) => leg.lineCode)).toEqual([
      "B60",
      "B47",
    ]);
  });

  it("finds direct journeys", () => {
    const direct = planJourneys(
      { ...request, destination: "St. Jakob" },
      testNetwork,
    );
    expect(direct[0]?.transfers).toBe(0);
    expect(direct[0]?.legs[0]?.lineCode).toBe("B60");
  });

  it("excludes cancelled trips and avoids closed destinations", () => {
    const cancelled = structuredClone(testNetwork);
    cancelled.trips.forEach((trip) => {
      if (trip.routeId === "b60-east") trip.cancelled = true;
    });
    expect(
      planJourneys({ ...request, destination: "St. Jakob" }, cancelled),
    ).toHaveLength(0);
    const closed = structuredClone(testNetwork);
    closed.disruptions.push({
      id: "closed",
      category: "stop_closure",
      severity: "major",
      affectedRouteIds: [],
      affectedStopIds: ["stallen"],
      note: "Closed",
      active: true,
    });
    expect(planJourneys(request, closed)).toHaveLength(0);
  });

  it("recalculates after a missed connection", () => {
    const alternatives = recalculateAfterMissedConnection(
      request,
      testNetwork,
      490,
    );
    expect(
      alternatives.every((journey) => journey.departureMinutes >= 490),
    ).toBe(true);
  });

  it("applies travelcard pricing", () => {
    const full = planJourneys(request, testNetwork)[0]!;
    const half = planJourneys(
      { ...request, travelcard: "half_fare" },
      testNetwork,
    )[0]!;
    const ga = planJourneys({ ...request, travelcard: "ga" }, testNetwork)[0]!;
    expect(half.fare.adjusted).toBe(full.fare.adjusted / 2);
    expect(ga.fare.adjusted).toBe(0);
  });
});
