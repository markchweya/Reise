import { useCallback, useState } from 'react';
import {
  ActivityIndicator, Alert, FlatList, Pressable, RefreshControl, StyleSheet, Text, View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLibrary } from '../../src/store/library';
import { useBadges } from '../../src/store/badges';
import { useTheme, radius, space, type } from '../../src/theme';
import type { NoteSummary } from '../../src/db/repo';

export default function LibraryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { notes, loading, progress, refresh, importDocument, importPhoto, retry, remove } = useLibrary();
  const refreshBadges = useBadges((s) => s.refresh);
  const [busy, setBusy] = useState(false);

  useFocusEffect(useCallback(() => { void refresh(); void refreshBadges(); }, [refresh, refreshBadges]));

  const runImport = async (fn: () => Promise<void>): Promise<void> => {
    setBusy(true);
    try {
      await fn();
      await refreshBadges();
    } catch (err) {
      Alert.alert('Import failed', err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const renderNote = ({ item }: { item: NoteSummary }) => {
    const prog = progress[item.id];
    const failed = item.status === 'failed';
    const working = item.status === 'indexing' || item.status === 'extracting' || item.status === 'pending';

    return (
      <Pressable
        onPress={() => router.push(`/note/${item.id}`)}
        onLongPress={() =>
          Alert.alert('Remove note?', `"${item.title}" and its index will be deleted.`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => void remove(item.id) },
          ])
        }
        style={({ pressed }) => [
          styles.card,
          { backgroundColor: theme.surface, borderColor: theme.border, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <View style={styles.cardRow}>
          <Ionicons
            name={item.source_type === 'image' ? 'image-outline' : item.source_type === 'document' ? 'document-attach-outline' : 'document-text-outline'}
            size={22}
            color={theme.accent}
          />
          <View style={styles.cardBody}>
            <Text style={[type.title, { color: theme.text }]} numberOfLines={2}>{item.title}</Text>
            {failed ? (
              <Text style={[type.small, { color: theme.danger }]}>{item.error_message ?? 'Indexing failed.'}</Text>
            ) : working ? (
              <Text style={[type.small, { color: theme.textMuted }]}>
                {prog?.message ?? 'Waiting to index…'}
              </Text>
            ) : (
              <Text style={[type.small, { color: theme.textMuted }]}>
                {item.chunk_count} passages · {new Date(item.created_at).toLocaleDateString()}
              </Text>
            )}
          </View>
          {working && <ActivityIndicator color={theme.accent} />}
        </View>

        {working && prog && prog.total > 0 && (
          <View style={[styles.track, { backgroundColor: theme.surfaceAlt }]}>
            <View style={[styles.fill, { backgroundColor: theme.accent, width: `${Math.round((prog.done / prog.total) * 100)}%` }]} />
          </View>
        )}

        {failed && (
          <Pressable onPress={() => void retry(item.id)} style={[styles.retry, { borderColor: theme.border }]}>
            <Ionicons name="refresh" size={15} color={theme.text} />
            <Text style={[type.small, { color: theme.text }]}>Try again</Text>
          </Pressable>
        )}
      </Pressable>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <FlatList
        data={notes}
        keyExtractor={(n) => n.id}
        renderItem={renderNote}
        contentContainerStyle={{ padding: space.lg, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void refresh()} tintColor={theme.textMuted} />}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <Ionicons name="cloud-upload-outline" size={44} color={theme.textMuted} />
              <Text style={[type.title, { color: theme.text, marginTop: space.lg }]}>Nothing here yet</Text>
              <Text style={[type.body, { color: theme.textMuted, textAlign: 'center', marginTop: space.sm }]}>
                Tap Import below to add a .txt, .md, PDF or Word file — or a photo of a page. Soma reads it, indexes it,
                and then you can ask it anything.
              </Text>
            </View>
          )
        }
      />

      <View style={[styles.bar, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Pressable disabled={busy} onPress={() => void runImport(importDocument)} style={[styles.action, { backgroundColor: theme.accent }]}>
          <Ionicons name="add" size={20} color="#fff" />
          <Text style={[type.body, styles.actionText]}>Import file</Text>
        </Pressable>
        <Pressable disabled={busy} onPress={() => void runImport(importPhoto)} style={[styles.action, { backgroundColor: theme.surfaceAlt }]}>
          <Ionicons name="camera-outline" size={20} color={theme.text} />
          <Text style={[type.body, { color: theme.text, fontWeight: '600' }]}>Photo</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  card: { borderWidth: 1, borderRadius: radius.lg, padding: space.lg, marginBottom: space.md, gap: space.md },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  cardBody: { flex: 1, gap: 4 },
  track: { height: 5, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: 5, borderRadius: radius.pill },
  retry: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 6 },
  empty: { alignItems: 'center', paddingTop: 80, paddingHorizontal: space.lg },
  bar: { position: 'absolute', left: space.lg, right: space.lg, bottom: space.lg, flexDirection: 'row', gap: space.sm, padding: space.sm, borderRadius: radius.lg, borderWidth: 1 },
  action: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, flex: 1, paddingVertical: space.md, borderRadius: radius.md },
  actionText: { color: '#fff', fontWeight: '600' },
});
