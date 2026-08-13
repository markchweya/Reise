import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Journey } from '@reise/shared';
import { formatMinutes } from '@reise/shared';
import { palette } from '../theme';
import { Card, SourceLabel } from './ui';

export function JourneyCard({ journey, onSelect }: { journey: Journey; onSelect?: () => void }) {
  const lines = journey.legs.filter((leg) => leg.kind === 'transit').map((leg) => leg.lineCode).join(' · ');
  return <Pressable accessibilityRole="button" accessibilityLabel={`Journey departing ${formatMinutes(journey.departureMinutes)}`} onPress={onSelect}><Card style={styles.card}>
    <View style={styles.top}><View><Text style={styles.time}>{formatMinutes(journey.departureMinutes)} <Text style={styles.arrow}>→</Text> {formatMinutes(journey.arrivalMinutes)}</Text><Text style={styles.route}>{lines} · {journey.reason}</Text></View><Text style={styles.duration}>{journey.durationMinutes} min</Text></View>
    <View style={styles.rule} />
    <View style={styles.bottom}><View><Text style={styles.meta}>{journey.transfers === 0 ? 'Direct' : `${journey.transfers} transfer`} · {journey.walkingMetres} m walk</Text><Text style={styles.fare}>CHF {journey.fare.adjusted.toFixed(2)} <Text style={styles.prototype}>prototype</Text></Text></View><SourceLabel tone={journey.warnings.length ? 'warning' : 'success'}>{journey.warnings.length ? 'Disruption' : 'Best match'}</SourceLabel></View>
    {journey.warnings.map((warning) => <View key={warning} style={styles.warning}><Text style={styles.warningText}>{warning}</Text></View>)}
  </Card></Pressable>;
}

const styles = StyleSheet.create({
  card: { marginBottom: 14 }, top: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  time: { color: palette.ink, fontSize: 22, fontWeight: '800', letterSpacing: -0.5 }, arrow: { color: palette.red },
  route: { color: palette.slate, marginTop: 6, fontSize: 13, maxWidth: 240 }, duration: { color: palette.ink, fontWeight: '800', fontSize: 14 },
  rule: { height: 1, backgroundColor: palette.line, marginVertical: 15 }, bottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  meta: { color: palette.slate, fontSize: 12 }, fare: { color: palette.ink, fontSize: 15, fontWeight: '800', marginTop: 5 }, prototype: { color: palette.slate, fontSize: 10, fontWeight: '500' },
  warning: { backgroundColor: palette.warningSoft, borderRadius: 10, padding: 11, marginTop: 14 }, warningText: { color: palette.warning, fontSize: 12, lineHeight: 17, fontWeight: '600' },
});
