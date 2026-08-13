import { z } from 'zod';

export const languages = ['en', 'de', 'fr', 'it'] as const;
export type Language = (typeof languages)[number];

export const locationSourceSchema = z.enum([
  'reise_simulated_gps',
  'reise_browser_gps',
  'official_vehicle_position',
  'future_onboard_system',
  'scheduled_interpolation',
]);
export type LocationSource = z.infer<typeof locationSourceSchema>;

export const journeyPrioritySchema = z.enum([
  'fastest',
  'fewest_transfers',
  'least_walking',
  'cheapest',
  'accessible',
]);
export type JourneyPriority = z.infer<typeof journeyPrioritySchema>;

export const travelcardSchema = z.enum(['none', 'half_fare', 'ga', 'regional']);
export type Travelcard = z.infer<typeof travelcardSchema>;

export const stopSchema = z.object({
  id: z.string(),
  name: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  accessible: z.boolean(),
  platform: z.string().optional(),
});
export type Stop = z.infer<typeof stopSchema>;

export const routeSchema = z.object({
  id: z.string(),
  lineCode: z.string(),
  directionId: z.string(),
  destination: z.string(),
  stopIds: z.array(z.string()).min(2),
  colour: z.string(),
});
export type Route = z.infer<typeof routeSchema>;

export const tripSchema = z.object({
  id: z.string(),
  routeId: z.string(),
  departureMinutes: z.number().int(),
  segmentMinutes: z.array(z.number().int().positive()),
  cancelled: z.boolean().default(false),
  delayMinutes: z.number().int().default(0),
  accessible: z.boolean().default(true),
});
export type Trip = z.infer<typeof tripSchema>;

export const disruptionSchema = z.object({
  id: z.string(),
  category: z.enum([
    'traffic',
    'roadworks',
    'accident',
    'event',
    'stop_closure',
    'diversion',
    'breakdown',
    'cancellation',
  ]),
  severity: z.enum(['minor', 'moderate', 'major']),
  affectedRouteIds: z.array(z.string()),
  affectedStopIds: z.array(z.string()),
  note: z.string(),
  active: z.boolean(),
});
export type Disruption = z.infer<typeof disruptionSchema>;

export const vehiclePositionSchema = z.object({
  vehicleId: z.string(),
  fleetNumber: z.string(),
  lineCode: z.string(),
  routeId: z.string(),
  directionId: z.string(),
  tripId: z.string(),
  shiftId: z.string(),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  bearing: z.number().min(0).max(360),
  speedKph: z.number().nonnegative(),
  accuracyMetres: z.number().positive(),
  currentStopId: z.string(),
  nextStopId: z.string(),
  delayMinutes: z.number().int(),
  locationSource: locationSourceSchema,
  deviceTimestamp: z.string().datetime(),
  serverTimestamp: z.string().datetime(),
});
export type VehiclePosition = z.infer<typeof vehiclePositionSchema>;

export type FareQuote = {
  regular: number;
  supersaver: number;
  adjusted: number;
  cheapestLabel: string;
  currency: 'CHF';
  isPrototype: true;
};

export type JourneyLeg = {
  kind: 'walk' | 'transit';
  from: Stop;
  to: Stop;
  lineCode?: string;
  direction?: string;
  tripId?: string;
  departureMinutes: number;
  arrivalMinutes: number;
  scheduledArrivalMinutes: number;
  predictedArrivalMinutes?: number;
  liveEstimateMinutes?: number;
  walkingMetres: number;
  accessible: boolean;
  source: 'scheduled' | 'official_prediction' | 'reise_live_estimate';
};

export type Journey = {
  id: string;
  legs: JourneyLeg[];
  departureMinutes: number;
  arrivalMinutes: number;
  durationMinutes: number;
  transfers: number;
  walkingMetres: number;
  accessible: boolean;
  fare: FareQuote;
  warnings: string[];
  reason: string;
};

export type JourneyRequest = {
  origin: string;
  destination: string;
  departureMinutes: number;
  priority: JourneyPriority;
  maxTransfers: number;
  maxWalkingMetres: number;
  accessibilityRequired: boolean;
  travelcard: Travelcard;
};

export type VehicleCheck = {
  status: 'correct' | 'uncertain' | 'wrong';
  title: string;
  message: string;
};

export const isFreshPosition = (
  position: VehiclePosition,
  now = new Date(),
  thresholdSeconds = 20,
): boolean =>
  now.getTime() - new Date(position.serverTimestamp).getTime() <= thresholdSeconds * 1000;

export const detectImpossibleJump = (
  previous: VehiclePosition,
  next: VehiclePosition,
  maxKph = 140,
): boolean => {
  const elapsedHours =
    (new Date(next.deviceTimestamp).getTime() - new Date(previous.deviceTimestamp).getTime()) /
    3_600_000;
  if (elapsedHours <= 0) return true;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(next.latitude - previous.latitude);
  const dLon = toRad(next.longitude - previous.longitude);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(previous.latitude)) *
      Math.cos(toRad(next.latitude)) *
      Math.sin(dLon / 2) ** 2;
  const kilometres = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return kilometres / elapsedHours > maxKph;
};

export const formatMinutes = (minutes: number): string => {
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(wrapped / 60)).padStart(2, '0')}:${String(wrapped % 60).padStart(2, '0')}`;
};

export const translations = {
  en: { home: 'Home', ai: 'Reise AI', liveJourney: 'Live Journey', tickets: 'Tickets', profile: 'Profile', planJourney: 'Plan journey', from: 'From', to: 'To', testNetwork: 'Reise Test Network — simulated transport data', prototypeFare: 'Prototype fare — verify the final price with the transport provider.' },
  de: { home: 'Start', ai: 'Reise AI', liveJourney: 'Live-Reise', tickets: 'Billette', profile: 'Profil', planJourney: 'Reise planen', from: 'Von', to: 'Nach', testNetwork: 'Reise-Testnetz — simulierte Verkehrsdaten', prototypeFare: 'Prototyp-Preis — endgültigen Preis beim Transportunternehmen prüfen.' },
  fr: { home: 'Accueil', ai: 'Reise AI', liveJourney: 'Trajet en direct', tickets: 'Billets', profile: 'Profil', planJourney: 'Planifier le trajet', from: 'De', to: 'À', testNetwork: 'Réseau test Reise — données de transport simulées', prototypeFare: 'Tarif prototype — vérifiez le prix final auprès du transporteur.' },
  it: { home: 'Home', ai: 'Reise AI', liveJourney: 'Viaggio in diretta', tickets: 'Biglietti', profile: 'Profilo', planJourney: 'Pianifica viaggio', from: 'Da', to: 'A', testNetwork: 'Rete di prova Reise — dati di trasporto simulati', prototypeFare: 'Tariffa prototipo — verifica il prezzo finale con il fornitore.' },
} satisfies Record<Language, Record<string, string>>;

export const achievementDefinitions = [
  { id: 'first-route', title: 'First departure', detail: 'Plan your first Reise journey', icon: '↗' },
  { id: 'smooth-transfer', title: 'Smooth transfer', detail: 'Complete a transfer with time to spare', icon: '⇄' },
  { id: 'right-way', title: 'Right way', detail: 'Confirm the correct vehicle and direction', icon: '✓' },
  { id: 'delay-dodger', title: 'Delay dodger', detail: 'Accept a faster alternative', icon: '⚡' },
  { id: 'basel-explorer', title: 'Basel explorer', detail: 'Visit five Basel-area stops', icon: '◇' },
  { id: 'fare-finder', title: 'Fare finder', detail: 'Compare travelcard-adjusted fares', icon: '₣' },
  { id: 'offline-ready', title: 'Offline ready', detail: 'Open a saved journey without internet', icon: '↓' },
  { id: 'polyglot', title: 'Polyglot', detail: 'Use Reise in two languages', icon: 'Aa' },
] as const;

export const checkVehicle = (
  journey: Journey,
  route: Route | undefined,
  vehicle: Pick<VehiclePosition, 'lineCode' | 'routeId' | 'directionId' | 'nextStopId'>,
): VehicleCheck => {
  const transit = journey.legs.find((leg) => leg.kind === 'transit');
  if (!transit || !route) {
    return { status: 'uncertain', title: 'Check needed', message: 'There is not enough information to confirm this vehicle.' };
  }
  if (vehicle.lineCode !== transit.lineCode || vehicle.routeId !== route.id) {
    return { status: 'wrong', title: 'Do not board', message: `This is ${vehicle.lineCode}. Your journey requires ${transit.lineCode} toward ${transit.direction}.` };
  }
  if (vehicle.directionId !== route.directionId) {
    return { status: 'wrong', title: 'Wrong direction', message: `Do not board ${vehicle.lineCode} toward ${route.destination}. Check the destination shown on the vehicle.` };
  }
  const nextIndex = route.stopIds.indexOf(vehicle.nextStopId);
  const destinationIndex = route.stopIds.indexOf(transit.to.id);
  if (destinationIndex !== -1 && nextIndex > destinationIndex) {
    return { status: 'wrong', title: 'Destination passed', message: 'This vehicle has already passed your destination.' };
  }
  return { status: 'correct', title: 'Correct vehicle', message: `${vehicle.lineCode} is travelling toward ${transit.direction} and serves ${transit.to.name}.` };
};
