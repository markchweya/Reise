import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useBadges } from '../../src/store/badges';
import { radius, space, type, useTheme } from '../../src/theme';

const TIER_LABEL = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold' } as const;

export default function BadgesScreen() {
  const theme = useTheme();
  const { states, stats, refresh } = useBadges();
  useFocusEffect(useCallback(() => { void refresh(); }, [refresh]));

  const earned = states.filter((s) => s.unlocked).length;

  return (
    <ScrollView contentContainerStyle={{ padding: space.lg, gap: space.md, paddingBottom: 60 }} style={{ backgroundColor: theme.bg }}>
      <View style={[styles.header, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[type.display, { color: theme.text }]}>{earned}<Text style={[type.title, { color: theme.textMuted }]}> / {states.length}</Text></Text>
        <Text style={[type.small, { color: theme.textMuted }]}>
          {stats.notesReady} notes · {stats.chunksIndexed} passages · {stats.questionsAsked} questions · {stats.longestDayStreak}-day best streak
        </Text>
      </View>

      {states.map(({ badge, unlocked, progress, ratio }) => (
        <View
          key={badge.id}
          style={[styles.card, { backgroundColor: theme.surface, borderColor: unlocked ? theme.accent : theme.border }]}
        >
          <View style={[styles.icon, { backgroundColor: unlocked ? theme.accentSoft : theme.surfaceAlt }]}>
            <Ionicons
              name={(unlocked ? badge.icon : 'lock-closed') as 'trophy'}
              size={22}
              color={unlocked ? theme.accent : theme.textMuted}
            />
          </View>
          <View style={styles.body}>
            <View style={styles.titleRow}>
              <Text style={[type.title, { color: unlocked ? theme.text : theme.textMuted }]}>{badge.name}</Text>
              <Text style={[type.tiny, { color: theme.textMuted }]}>{TIER_LABEL[badge.tier]}</Text>
            </View>
            <Text style={[type.small, { color: theme.textMuted }]}>{unlocked ? badge.description : badge.hint}</Text>
            {!unlocked && (
              <>
                <View style={[styles.track, { backgroundColor: theme.surfaceAlt }]}>
                  <View style={[styles.fill, { backgroundColor: theme.accent, width: `${Math.round(ratio * 100)}%` }]} />
                </View>
                <Text style={[type.tiny, { color: theme.textMuted }]}>
                  {progress.toLocaleString()} / {badge.target.toLocaleString()}
                </Text>
              </>
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { borderWidth: 1, borderRadius: radius.lg, padding: space.lg, gap: space.xs },
  card: { flexDirection: 'row', gap: space.md, borderWidth: 1, borderRadius: radius.lg, padding: space.lg },
  icon: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  body: { flex: 1, gap: 5 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  track: { height: 5, borderRadius: radius.pill, overflow: 'hidden', marginTop: 4 },
  fill: { height: 5, borderRadius: radius.pill },
});
