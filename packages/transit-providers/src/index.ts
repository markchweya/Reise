import type {
  Disruption,
  Route,
  Stop,
  Trip,
  VehiclePosition,
} from "@reise/shared";

export type TransitSnapshot = {
  stops: Stop[];
  routes: Route[];
  trips: Trip[];
  disruptions: Disruption[];
  vehicles: VehiclePosition[];
  provenance: "reise_test_network" | "official_swiss_data";
};

export interface TimetableProvider {
  getSnapshot(): Promise<TransitSnapshot>;
}
export interface JourneyPlanningProvider {
  getSnapshot(): Promise<TransitSnapshot>;
}
export interface VehiclePositionProvider {
  getPositions(): Promise<VehiclePosition[]>;
}
export interface DisruptionProvider {
  getDisruptions(): Promise<Disruption[]>;
}
export interface FareProvider {
  getBaseFare(zoneCount: number): Promise<number>;
}
export interface TicketProvider {
  createCheckout(): Promise<never>;
}

const stops: Stop[] = [
  {
    id: "reding",
    name: "Basel, Redingstrasse",
    latitude: 47.5408,
    longitude: 7.5709,
    accessible: true,
  },
  {
    id: "schutzen",
    name: "Basel, Schützenhaus",
    latitude: 47.5481,
    longitude: 7.5759,
    accessible: true,
  },
  {
    id: "bahnhof",
    name: "Basel SBB",
    latitude: 47.5476,
    longitude: 7.5896,
    accessible: true,
    platform: "Kante A",
  },
  {
    id: "aeschen",
    name: "Basel, Aeschenplatz",
    latitude: 47.5521,
    longitude: 7.5928,
    accessible: true,
  },
  {
    id: "jakob",
    name: "Basel, St. Jakob",
    latitude: 47.5417,
    longitude: 7.6182,
    accessible: true,
    platform: "Kante B",
  },
  {
    id: "muttenz",
    name: "Muttenz, Industriepark",
    latitude: 47.5322,
    longitude: 7.6392,
    accessible: true,
  },
  {
    id: "stallen",
    name: "Reinach BL, Stallenstrasse",
    latitude: 47.4934,
    longitude: 7.5895,
    accessible: true,
  },
  {
    id: "bottmingen",
    name: "Bottmingen, Schloss",
    latitude: 47.5238,
    longitude: 7.5722,
    accessible: true,
  },
  {
    id: "biel",
    name: "Biel-Benken, Brücke",
    latitude: 47.5075,
    longitude: 7.5262,
    accessible: false,
  },
];

const routes: Route[] = [
  {
    id: "b60-east",
    lineCode: "B60",
    directionId: "east",
    destination: "Muttenz, Industriepark",
    stopIds: [
      "biel",
      "reding",
      "schutzen",
      "bahnhof",
      "aeschen",
      "jakob",
      "muttenz",
    ],
    colour: "#e2001a",
  },
  {
    id: "b60-west",
    lineCode: "B60",
    directionId: "west",
    destination: "Biel-Benken, Brücke",
    stopIds: [
      "muttenz",
      "jakob",
      "aeschen",
      "bahnhof",
      "schutzen",
      "reding",
      "biel",
    ],
    colour: "#e2001a",
  },
  {
    id: "b47-south",
    lineCode: "B47",
    directionId: "south",
    destination: "Reinach BL, Stallenstrasse",
    stopIds: ["bahnhof", "bottmingen", "stallen"],
    colour: "#343a40",
  },
  {
    id: "b47-north",
    lineCode: "B47",
    directionId: "north",
    destination: "Basel SBB",
    stopIds: ["stallen", "bottmingen", "bahnhof"],
    colour: "#343a40",
  },
  {
    id: "b57-event",
    lineCode: "B57",
    directionId: "event",
    destination: "Basel, St. Jakob",
    stopIds: ["stallen", "bottmingen", "aeschen", "jakob"],
    colour: "#5b6670",
  },
];

const trips: Trip[] = routes.flatMap((route, routeIndex) =>
  [7 * 60 + 42, 8 * 60 + 2, 8 * 60 + 22].map((departure, index) => ({
    id: `${route.id}-${index + 1}`,
    routeId: route.id,
    departureMinutes: departure + routeIndex * 2,
    segmentMinutes: route.stopIds
      .slice(1)
      .map(() => (route.lineCode === "B60" ? 5 : 7)),
    cancelled: false,
    delayMinutes: route.id === "b60-east" && index === 1 ? 4 : 0,
    accessible: route.id !== "b60-west",
  })),
);

const disruptions: Disruption[] = [
  {
    id: "st-jakob-event",
    category: "event",
    severity: "moderate",
    affectedRouteIds: ["b60-east", "b60-west"],
    affectedStopIds: ["jakob"],
    note: "Football event traffic near St. Jakob. Allow extra transfer time.",
    active: false,
  },
  {
    id: "roadworks-aeschen",
    category: "roadworks",
    severity: "major",
    affectedRouteIds: ["b60-east"],
    affectedStopIds: ["aeschen"],
    note: "Roadworks divert B60. Aeschenplatz is temporarily not served.",
    active: false,
  },
];

const now = new Date();
const position = (
  vehicleId: string,
  fleetNumber: string,
  tripId: string,
  offset: number,
): VehiclePosition => ({
  vehicleId,
  fleetNumber,
  lineCode: "B60",
  routeId: "b60-east",
  directionId: "east",
  tripId,
  shiftId: `shift-${vehicleId}`,
  latitude: 47.5481 + offset,
  longitude: 7.5759 + offset,
  bearing: 86,
  speedKph: 28,
  accuracyMetres: 8,
  currentStopId: "schutzen",
  nextStopId: "bahnhof",
  delayMinutes: 4,
  locationSource: "reise_simulated_gps",
  deviceTimestamp: now.toISOString(),
  serverTimestamp: now.toISOString(),
});

export const testNetwork: TransitSnapshot = {
  stops,
  routes,
  trips,
  disruptions,
  vehicles: [
    position("vehicle-6007", "6007", "b60-east-2", 0),
    position("vehicle-6012", "6012", "b60-east-3", -0.012),
  ],
  provenance: "reise_test_network",
};

export class TestNetworkProvider
  implements TimetableProvider, VehiclePositionProvider, DisruptionProvider
{
  async getSnapshot() {
    return structuredClone(testNetwork);
  }
  async getPositions() {
    return structuredClone(testNetwork.vehicles);
  }
  async getDisruptions() {
    return structuredClone(testNetwork.disruptions);
  }
}

export class OfficialSwissProvider implements TimetableProvider {
  constructor(private readonly apiKey?: string) {}
  async getSnapshot(): Promise<TransitSnapshot> {
    if (!this.apiKey)
      return {
        ...structuredClone(testNetwork),
        provenance: "official_swiss_data",
      };
    throw new Error(
      "Official provider activation requires endpoint-specific credentials; see docs/DATA-SOURCES.md.",
    );
  }
}

export const futureSbbIntegration = {
  timetable: "Swiss GTFS Static / OJP",
  predictions: "GTFS-Realtime trip updates",
  disruptions: "GTFS-Realtime service alerts / SIRI",
  positions: "Official vehicle positions or approved onboard systems",
} as const;
