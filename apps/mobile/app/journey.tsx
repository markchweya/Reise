import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { useQuery } from '@tanstack/react-query';
import { checkVehicle, formatMinutes, isFreshPosition, vehiclePositionSchema, disruptionSchema, type Disruption, type VehiclePosition } from '@reise/shared';
import { z } from 'zod';
import { planJourneys } from '@reise/routing';
import { testNetwork } from '@reise/transit-providers';
import { Button, Card, Metric, ScreenHeader, SourceLabel } from '../src/components/ui';
import { useReiseStore } from '../src/store';
import { palette } from '../src/theme';

export default function JourneyScreen() {
  const { selectedJourney, setJourney, unlock } = useReiseStore();
  const driverBaseUrl = process.env.EXPO_PUBLIC_DRIVER_BASE_URL;
  const liveStateSchema = z.object({ position: vehiclePositionSchema, disruption: disruptionSchema.optional(), tracking: z.enum(['offline', 'paused', 'active']), updatedAt: z.string() });
  const liveQuery = useQuery<{ position: VehiclePosition; disruption?: Disruption; tracking: 'offline' | 'paused' | 'active'; updatedAt: string }>({
    queryKey: ['driver-live-state', driverBaseUrl], enabled: Boolean(driverBaseUrl), refetchInterval: 5000,
    queryFn: async () => { const response = await fetch(`${driverBaseUrl}/api/live`); if (!response.ok) throw new Error('Driver feed unavailable'); return liveStateSchema.parse(await response.json()); },
  });
  const fallback = planJourneys({ origin: 'Redingstrasse', destination: 'Stallenstrasse', departureMinutes: 7 * 60 + 35, priority: 'fastest', maxTransfers: 2, maxWalkingMetres: 1200, accessibilityRequired: false, travelcard: 'half_fare' }, testNetwork)[0];
  const journey = selectedJourney ?? fallback;
  const vehicle = liveQuery.data?.position ?? testNetwork.vehicles[0]!;
  const route = testNetwork.routes.find((item) => item.id === vehicle.routeId);
  const vehicleCheck = journey ? checkVehicle(journey, route, vehicle) : undefined;
  const coordinates = (route?.stopIds ?? []).map((id) => testNetwork.stops.find((stop) => stop.id === id)).filter(Boolean).map((stop) => ({ latitude: stop!.latitude, longitude: stop!.longitude }));
  if (!journey) return <View style={styles.center}><Text>No journey selected.</Text></View>;
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
    <ScreenHeader eyebrow="B60 · toward Muttenz" title="Your journey" action={<SourceLabel tone={isFreshPosition(vehicle) ? 'success' : 'warning'}>{isFreshPosition(vehicle) ? 'Fresh position' : 'Stale position'}</SourceLabel>} />
    <View style={styles.mapShell}>{Platform.OS === 'web' ? <View style={styles.mapFallback}><Text style={styles.mapFallbackTitle}>Route map</Text><Text style={styles.mapFallbackText}>Basel, Schützenhaus → Basel SBB</Text></View> : <MapView style={StyleSheet.absoluteFill} initialRegion={{ latitude: 47.548, longitude: 7.591, latitudeDelta: 0.075, longitudeDelta: 0.075 }}><Polyline coordinates={coordinates} strokeColor={palette.red} strokeWidth={5} /><Marker coordinate={{ latitude: vehicle.latitude, longitude: vehicle.longitude }} title={`Fleet ${vehicle.fleetNumber}`} description="Reise simulated GPS" pinColor={palette.red} /></MapView>}<View style={styles.mapOverlay}><Text style={styles.mapLine}>B60</Text><View><Text style={styles.mapStop}>Next · Basel SBB</Text><Text style={styles.mapSource}>Reise simulated GPS · updated moments ago</Text></View></View></View>
    {liveQuery.data?.disruption ? <Card style={styles.disruption}><Text style={styles.disruptionLabel}>SERVICE CHANGE</Text><Text style={styles.disruptionTitle}>{liveQuery.data.disruption.category.replace('_', ' ')}</Text><Text style={styles.disruptionText}>{liveQuery.data.disruption.note}</Text></Card> : null}
    <Card style={styles.summary}><View style={styles.metrics}><Metric value={`${journey.durationMinutes} min`} label="total" /><Metric value={`${journey.transfers}`} label="transfer" /><Metric value={`${journey.walkingMetres} m`} label="walking" /></View><View style={styles.times}><View><Text style={styles.timeLabel}>Scheduled arrival</Text><Text style={styles.timeValue}>{formatMinutes(journey.arrivalMinutes - 5)}</Text></View><View><Text style={styles.timeLabel}>Official prediction</Text><Text style={styles.timeValue}>{formatMinutes(journey.arrivalMinutes - 2)}</Text></View><View><Text style={styles.timeLabel}>Reise estimate</Text><Text style={[styles.timeValue, styles.red]}>{formatMinutes(journey.arrivalMinutes)}</Text></View></View></Card>
    {vehicleCheck ? <Card style={[styles.check, vehicleCheck.status === 'correct' ? styles.checkCorrect : styles.checkWrong]}><Text style={styles.checkLabel}>BOARDING CHECK</Text><Text style={styles.checkTitle}>{vehicleCheck.title}</Text><Text style={styles.checkText}>{vehicleCheck.message}</Text><Button label="I am boarding this vehicle" onPress={() => unlock('right-way')} /></Card> : null}
    <Text style={styles.sectionTitle}>Journey guidance</Text><View style={styles.timeline}>{journey.legs.map((leg, index) => <View key={`${leg.from.id}-${leg.to.id}`} style={styles.timelineItem}><View style={styles.timelineMarker}><Text style={styles.timelineNumber}>{index + 1}</Text><View style={styles.timelineRule} /></View><View style={styles.timelineContent}><Text style={styles.timelineTime}>{formatMinutes(leg.departureMinutes)}</Text><Text style={styles.timelineTitle}>{leg.kind === 'transit' ? `Take ${leg.lineCode} toward ${leg.direction}` : `Walk to ${leg.to.name}`}</Text><Text style={styles.timelineMeta}>{leg.from.name} → {leg.to.name}</Text><SourceLabel>{leg.source.replaceAll('_', ' ')}</SourceLabel></View></View>)}</View>
    <Button secondary label="Refresh journey" onPress={() => setJourney(journey)} />
  </ScrollView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F7F7' }, content: { padding: 20, paddingTop: 66, paddingBottom: 30 }, center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  mapShell: { height: 292, borderRadius: 24, overflow: 'hidden', backgroundColor: '#E6E8E8', marginBottom: 15 },
  mapFallback: { flex: 1, backgroundColor: '#E7E9E8', alignItems: 'center', justifyContent: 'center' }, mapFallbackTitle: { color: palette.ink, fontSize: 22, fontWeight: '800' }, mapFallbackText: { color: palette.slate, marginTop: 8 },
  mapOverlay: { position: 'absolute', left: 12, right: 12, bottom: 12, backgroundColor: palette.paper, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  mapLine: { backgroundColor: palette.red, color: palette.paper, fontWeight: '900', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 9, overflow: 'hidden' }, mapStop: { color: palette.ink, fontWeight: '800', fontSize: 13 }, mapSource: { color: palette.slate, fontSize: 10, marginTop: 3 },
  summary: { marginBottom: 15 }, metrics: { flexDirection: 'row', gap: 10 }, times: { borderTopWidth: 1, borderTopColor: palette.line, marginTop: 15, paddingTop: 14, flexDirection: 'row', justifyContent: 'space-between' },
  disruption: { marginBottom: 15, backgroundColor: palette.warningSoft, borderColor: '#F0C77B' }, disruptionLabel: { color: palette.warning, fontSize: 10, letterSpacing: 1, fontWeight: '900' }, disruptionTitle: { color: palette.ink, fontSize: 19, fontWeight: '800', textTransform: 'capitalize', marginTop: 6 }, disruptionText: { color: palette.warning, lineHeight: 20, marginTop: 5 },
  timeLabel: { color: palette.slate, fontSize: 9, maxWidth: 80, textTransform: 'uppercase', fontWeight: '700' }, timeValue: { color: palette.ink, fontSize: 17, fontWeight: '800', marginTop: 4 }, red: { color: palette.red },
  check: { marginBottom: 24, borderLeftWidth: 4 }, checkCorrect: { borderLeftColor: palette.success }, checkWrong: { borderLeftColor: palette.red }, checkLabel: { color: palette.slate, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  checkTitle: { color: palette.ink, fontSize: 22, fontWeight: '800', marginTop: 8 }, checkText: { color: palette.slate, lineHeight: 21, marginTop: 6, marginBottom: 16 },
  sectionTitle: { color: palette.ink, fontSize: 20, fontWeight: '800', marginBottom: 14 }, timeline: { marginBottom: 16 }, timelineItem: { flexDirection: 'row' }, timelineMarker: { width: 38, alignItems: 'center' }, timelineNumber: { backgroundColor: palette.ink, color: palette.paper, width: 28, height: 28, borderRadius: 14, textAlign: 'center', lineHeight: 28, fontSize: 12, fontWeight: '800', overflow: 'hidden' }, timelineRule: { flex: 1, width: 2, backgroundColor: palette.line },
  timelineContent: { flex: 1, paddingBottom: 24 }, timelineTime: { color: palette.red, fontSize: 12, fontWeight: '800' }, timelineTitle: { color: palette.ink, fontSize: 16, lineHeight: 22, fontWeight: '800', marginTop: 4 }, timelineMeta: { color: palette.slate, fontSize: 12, lineHeight: 18, marginVertical: 7 },
});
