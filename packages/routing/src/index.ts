import type {
  Journey,
  JourneyLeg,
  JourneyRequest,
  Route,
  Stop,
  Travelcard,
  Trip,
} from "@reise/shared";
import type { TransitSnapshot } from "@reise/transit-providers";

const normalize = (value: string) =>
  value.toLocaleLowerCase().replace(/[^a-zà-ž0-9]/gi, "");

export const findStop = (query: string, stops: Stop[]): Stop | undefined => {
  const needle = normalize(query);
  return stops.find(
    (stop) =>
      normalize(stop.name).includes(needle) ||
      needle.includes(normalize(stop.name.split(", ").at(-1) ?? "")),
  );
};

const fareFor = (legs: JourneyLeg[], travelcard: Travelcard) => {
  const zones = Math.max(
    1,
    Math.ceil(
      legs.reduce((sum, leg) => sum + (leg.kind === "transit" ? 1 : 0), 0) / 2,
    ),
  );
  const regular = Number((3.8 + (zones - 1) * 1.4).toFixed(2));
  const supersaver = Number((regular * 0.7).toFixed(2));
  const factor =
    travelcard === "ga"
      ? 0
      : travelcard === "half_fare"
        ? 0.5
        : travelcard === "regional"
          ? 0.25
          : 1;
  const adjusted = Number((Math.min(regular, supersaver) * factor).toFixed(2));
  return {
    regular,
    supersaver,
    adjusted,
    cheapestLabel:
      travelcard === "ga" ? "Covered by GA Travelcard" : "Prototype supersaver",
    currency: "CHF" as const,
    isPrototype: true as const,
  };
};

const stopTime = (
  route: Route,
  trip: Trip,
  stopId: string,
): number | undefined => {
  const index = route.stopIds.indexOf(stopId);
  if (index < 0) return undefined;
  return (
    trip.departureMinutes +
    trip.segmentMinutes.slice(0, index).reduce((sum, value) => sum + value, 0)
  );
};

const buildTransitLeg = (
  route: Route,
  trip: Trip,
  from: Stop,
  to: Stop,
): JourneyLeg | undefined => {
  const fromIndex = route.stopIds.indexOf(from.id);
  const toIndex = route.stopIds.indexOf(to.id);
  if (fromIndex < 0 || toIndex <= fromIndex || trip.cancelled) return undefined;
  const departure = stopTime(route, trip, from.id);
  const scheduledArrival = stopTime(route, trip, to.id);
  if (departure === undefined || scheduledArrival === undefined)
    return undefined;
  const delay = trip.delayMinutes;
  return {
    kind: "transit",
    from,
    to,
    lineCode: route.lineCode,
    direction: route.destination,
    tripId: trip.id,
    departureMinutes: departure + delay,
    arrivalMinutes: scheduledArrival + delay,
    scheduledArrivalMinutes: scheduledArrival,
    ...(delay
      ? {
          predictedArrivalMinutes: scheduledArrival + delay,
          liveEstimateMinutes: scheduledArrival + delay + 1,
        }
      : {}),
    walkingMetres: 0,
    accessible: trip.accessible,
    source: delay ? "reise_live_estimate" : "scheduled",
  };
};

const scoreJourney = (journey: Journey, request: JourneyRequest): number => {
  switch (request.priority) {
    case "fewest_transfers":
      return journey.transfers * 1000 + journey.durationMinutes;
    case "least_walking":
      return journey.walkingMetres * 10 + journey.durationMinutes;
    case "cheapest":
      return journey.fare.adjusted * 100 + journey.durationMinutes;
    case "accessible":
      return (journey.accessible ? 0 : 10000) + journey.durationMinutes;
    default:
      return journey.durationMinutes + journey.transfers * 6;
  }
};

export const planJourneys = (
  request: JourneyRequest,
  snapshot: TransitSnapshot,
): Journey[] => {
  const origin = findStop(request.origin, snapshot.stops);
  const destination = findStop(request.destination, snapshot.stops);
  if (!origin || !destination || origin.id === destination.id) return [];
  const closedStops = new Set(
    snapshot.disruptions
      .filter((item) => item.active && item.category === "stop_closure")
      .flatMap((item) => item.affectedStopIds),
  );
  if (closedStops.has(origin.id) || closedStops.has(destination.id)) return [];

  const journeys: Journey[] = [];
  const addJourney = (legs: JourneyLeg[], routeIds: string[]) => {
    if (
      !legs.length ||
      legs.some((leg) => leg.departureMinutes < request.departureMinutes)
    )
      return;
    const transfers = Math.max(
      0,
      legs.filter((leg) => leg.kind === "transit").length - 1,
    );
    const walkingMetres = legs.reduce((sum, leg) => sum + leg.walkingMetres, 0);
    if (
      transfers > request.maxTransfers ||
      walkingMetres > request.maxWalkingMetres
    )
      return;
    const active = snapshot.disruptions.filter(
      (item) =>
        item.active &&
        item.affectedRouteIds.some((id) => routeIds.includes(id)),
    );
    const departureMinutes = legs[0]!.departureMinutes;
    const arrivalMinutes = legs.at(-1)!.arrivalMinutes;
    const accessible = legs.every((leg) => leg.accessible);
    if (request.accessibilityRequired && !accessible) return;
    const fare = fareFor(legs, request.travelcard);
    journeys.push({
      id: legs.map((leg) => leg.tripId ?? "walk").join("-"),
      legs,
      departureMinutes,
      arrivalMinutes,
      durationMinutes: arrivalMinutes - departureMinutes,
      transfers,
      walkingMetres,
      accessible,
      fare,
      warnings: active.map((item) => item.note),
      reason:
        transfers === 0
          ? "Direct route with no changes."
          : `Best timed connection with ${transfers} transfer${transfers === 1 ? "" : "s"}.`,
    });
  };

  for (const route of snapshot.routes) {
    for (const trip of snapshot.trips.filter(
      (item) => item.routeId === route.id,
    )) {
      const leg = buildTransitLeg(route, trip, origin, destination);
      if (leg) addJourney([leg], [route.id]);
    }
  }

  for (const firstRoute of snapshot.routes) {
    const originIndex = firstRoute.stopIds.indexOf(origin.id);
    if (originIndex < 0) continue;
    for (const transferId of firstRoute.stopIds.slice(originIndex + 1)) {
      const transfer = snapshot.stops.find((stop) => stop.id === transferId);
      if (!transfer) continue;
      for (const secondRoute of snapshot.routes) {
        if (
          secondRoute.id === firstRoute.id ||
          !secondRoute.stopIds.includes(transferId) ||
          !secondRoute.stopIds.includes(destination.id)
        )
          continue;
        for (const firstTrip of snapshot.trips.filter(
          (item) => item.routeId === firstRoute.id,
        )) {
          const firstLeg = buildTransitLeg(
            firstRoute,
            firstTrip,
            origin,
            transfer,
          );
          if (!firstLeg) continue;
          for (const secondTrip of snapshot.trips.filter(
            (item) => item.routeId === secondRoute.id,
          )) {
            const secondLeg = buildTransitLeg(
              secondRoute,
              secondTrip,
              transfer,
              destination,
            );
            if (
              secondLeg &&
              secondLeg.departureMinutes >= firstLeg.arrivalMinutes + 3
            )
              addJourney(
                [firstLeg, secondLeg],
                [firstRoute.id, secondRoute.id],
              );
          }
        }
      }
    }
  }

  return journeys
    .sort((a, b) => scoreJourney(a, request) - scoreJourney(b, request))
    .slice(0, 3);
};

export const recalculateAfterMissedConnection = (
  request: JourneyRequest,
  snapshot: TransitSnapshot,
  nowMinutes: number,
) => planJourneys({ ...request, departureMinutes: nowMinutes }, snapshot);
