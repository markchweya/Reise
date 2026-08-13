import { describe, expect, it } from "vitest";
import {
  ShiftRegistry,
  checkVehicle,
  detectImpossibleJump,
  languages,
  translations,
} from "../src/index";
import { planJourneys } from "@reise/routing";
import { testNetwork } from "@reise/transit-providers";

describe("safety and lifecycle rules", () => {
  it("detects the wrong direction", () => {
    const journey = planJourneys(
      {
        origin: "Redingstrasse",
        destination: "St. Jakob",
        departureMinutes: 455,
        priority: "fastest",
        maxTransfers: 2,
        maxWalkingMetres: 1000,
        accessibilityRequired: false,
        travelcard: "none",
      },
      testNetwork,
    )[0]!;
    const wrongRoute = testNetwork.routes.find(
      (route) => route.id === "b60-west",
    )!;
    const result = checkVehicle(journey, wrongRoute, {
      ...testNetwork.vehicles[0]!,
      routeId: "b60-west",
      directionId: "west",
    });
    expect(result.status).toBe("wrong");
  });

  it("detects impossible GPS jumps", () => {
    const previous = testNetwork.vehicles[0]!;
    const next = {
      ...previous,
      latitude: 48.7,
      deviceTimestamp: new Date(
        new Date(previous.deviceTimestamp).getTime() + 5000,
      ).toISOString(),
    };
    expect(detectImpossibleJump(previous, next)).toBe(true);
  });

  it("prevents duplicate assignments and post-checkout GPS", () => {
    const registry = new ShiftRegistry();
    const shift = registry.start({
      driverId: "driver-1",
      vehicleId: "vehicle-1",
      tripId: "trip-1",
    });
    expect(() =>
      registry.start({
        driverId: "driver-2",
        vehicleId: "vehicle-1",
        tripId: "trip-1",
      }),
    ).toThrow("vehicle_already_assigned");
    registry.checkout(shift.id);
    expect(registry.acceptsPosition(shift.id, "vehicle-1")).toBe(false);
  });

  it("hands over once using a hashed short-lived token", async () => {
    const registry = new ShiftRegistry();
    const shift = registry.start({
      driverId: "driver-1",
      vehicleId: "vehicle-1",
      tripId: "trip-1",
    });
    await registry.createHandover(shift.id, "secret-123");
    const incoming = await registry.acceptHandover(
      shift.id,
      "secret-123",
      "driver-2",
    );
    expect(incoming.driverId).toBe("driver-2");
    await expect(
      registry.acceptHandover(shift.id, "secret-123", "driver-3"),
    ).rejects.toThrow("handover_invalid");
  });
});

describe("translations", () => {
  it("contains every required key in all four languages", () => {
    const keys = Object.keys(translations.en).sort();
    expect(languages).toHaveLength(4);
    languages.forEach((language) =>
      expect(Object.keys(translations[language]).sort()).toEqual(keys),
    );
  });
});
