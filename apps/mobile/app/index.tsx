import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { planJourneys } from '@reise/routing';
import type { JourneyPriority } from '@reise/shared';
import { testNetwork } from '@reise/transit-providers';
import { JourneyCard } from '../src/components/JourneyCard';
import { Button, Card, ScreenHeader, SourceLabel } from '../src/components/ui';
import { useReiseStore } from '../src/store';
import { palette } from '../src/theme';

const priorities: { id: JourneyPriority; label: string }[] = [
  { id: 'fastest', label: 'Fastest' }, { id: 'fewest_transfers', label: 'Fewest changes' },
  { id: 'least_walking', label: 'Least walking' }, { id: 'cheapest', label: 'Cheapest' },
  { id: 'accessible', label: 'Accessible' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { priority, setPriority, travelcard, setJourney } = useReiseStore();
  const [origin, setOrigin] = useState('Redingstrasse');
  const [destination, setDestination] = useState('Stallenstrasse');
  const [searched, setSearched] = useState(false);
  const journeys = useMemo(() => searched ? planJourneys({ origin, destination, departureMinutes: 7 * 60 + 35, priority, maxTransfers: 2, maxWalkingMetres: 1200, accessibilityRequired: priority === 'accessible', travelcard }, testNetwork) : [], [searched, origin, destination, priority, travelcard]);
  const swap = () => { setOrigin(destination); setDestination(origin); };
  return <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <ScreenHeader eyebrow="Basel · Test network" title="Where to next?" action={<SourceLabel>Simulated data</SourceLabel>} />
    <Card>
      <Text style={styles.label}>From</Text><TextInput accessibilityLabel="Origin" value={origin} onChangeText={setOrigin} style={styles.input} placeholder="Current location or stop" placeholderTextColor="#8A8A8A" />
      <View style={styles.swapRow}><View style={styles.connector} /><Text onPress={swap} accessibilityRole="button" style={styles.swap}>⇅ Swap</Text></View>
      <Text style={styles.label}>To</Text><TextInput accessibilityLabel="Destination" value={destination} onChangeText={setDestination} style={styles.input} placeholder="Destination" placeholderTextColor="#8A8A8A" />
      <View style={styles.departure}><Text style={styles.departureLabel}>Departure</Text><Text style={styles.departureValue}>Now · Thu 13 Aug</Text></View>
      <Text style={styles.sectionLabel}>Make this journey</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>{priorities.map((item) => <Text key={item.id} onPress={() => { setPriority(item.id); setSearched(false); }} style={[styles.chip, priority === item.id && styles.chipActive]}>{item.label}</Text>)}</ScrollView>
      <Button label="Find journeys" onPress={() => setSearched(true)} />
    </Card>
    {searched ? <View style={styles.results}><View style={styles.resultsHeader}><Text style={styles.resultsTitle}>{journeys.length} options</Text><Text style={styles.resultsMeta}>Updated from test timetable</Text></View>{journeys.map((journey) => <JourneyCard key={journey.id} journey={journey} onSelect={() => { setJourney(journey); router.push('/journey'); }} />)}{journeys.length === 0 ? <Card><Text style={styles.emptyTitle}>No valid journey</Text><Text style={styles.emptyBody}>Try a later departure or another priority. Reise will not invent a route.</Text></Card> : null}</View> : <View style={styles.suggestions}><Text style={styles.sectionTitle}>Around Basel</Text><View style={styles.placeGrid}>{['St. Jakob', 'Basel SBB', 'Aeschenplatz', 'Bottmingen'].map((place, index) => <Card key={place} style={styles.placeCard}><Text style={styles.placeIndex}>0{index + 1}</Text><Text style={styles.placeName}>{place}</Text><Text style={styles.placeMeta}>{index === 0 ? 'Events & stadium' : 'Saved suggestion'}</Text></Card>)}</View></View>}
  </ScrollView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F7F7F7' }, content: { padding: 20, paddingTop: 66, paddingBottom: 30 },
  label: { color: palette.slate, fontSize: 12, fontWeight: '700', marginBottom: 7 }, input: { minHeight: 52, borderWidth: 1, borderColor: palette.line, borderRadius: 12, paddingHorizontal: 15, color: palette.ink, fontSize: 17, fontWeight: '600', backgroundColor: '#FBFBFB' },
  swapRow: { height: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, connector: { width: 2, height: 22, backgroundColor: palette.red, marginLeft: 24 }, swap: { color: palette.red, fontSize: 12, fontWeight: '800' },
  departure: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 18, paddingVertical: 13, borderTopWidth: 1, borderBottomWidth: 1, borderColor: palette.line }, departureLabel: { color: palette.slate, fontWeight: '600' }, departureValue: { color: palette.ink, fontWeight: '800' },
  sectionLabel: { color: palette.ink, fontSize: 13, fontWeight: '800', marginBottom: 10 }, chips: { gap: 8, paddingBottom: 18 }, chip: { color: palette.ink, backgroundColor: palette.mist, overflow: 'hidden', borderRadius: 20, paddingVertical: 9, paddingHorizontal: 13, fontSize: 12, fontWeight: '700' }, chipActive: { backgroundColor: palette.ink, color: palette.paper },
  results: { marginTop: 26 }, resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }, resultsTitle: { color: palette.ink, fontSize: 20, fontWeight: '800' }, resultsMeta: { color: palette.slate, fontSize: 11 },
  emptyTitle: { color: palette.ink, fontSize: 18, fontWeight: '800' }, emptyBody: { color: palette.slate, lineHeight: 20, marginTop: 7 }, suggestions: { marginTop: 28 }, sectionTitle: { color: palette.ink, fontSize: 20, fontWeight: '800', marginBottom: 13 }, placeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, placeCard: { width: '48%', minHeight: 132 }, placeIndex: { color: palette.red, fontSize: 11, fontWeight: '900' }, placeName: { color: palette.ink, fontSize: 17, lineHeight: 21, fontWeight: '800', marginTop: 20 }, placeMeta: { color: palette.slate, fontSize: 11, marginTop: 6 },
});
