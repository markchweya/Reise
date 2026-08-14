import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getNote, type NoteRow } from '../../src/db/repo';
import { ChatView } from '../../src/components/ChatView';
import type { Intent } from '../../src/chat/router';
import { radius, space, type, useTheme } from '../../src/theme';

const MODES: { intent: Intent; label: string; icon: string; message: string }[] = [
  { intent: 'note_question', label: 'Ask', icon: 'help-circle-outline', message: '' },
  { intent: 'summarize', label: 'Summarize', icon: 'list-outline', message: 'Summarize this note.' },
  { intent: 'explain', label: 'Explain', icon: 'bulb-outline', message: 'Explain the hardest idea in this note in simpler language, with an example.' },
  { intent: 'rewrite', label: 'Rewrite', icon: 'create-outline', message: 'Rewrite this note into clean, organised form. Keep every fact.' },
];

export default function NoteScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [note, setNote] = useState<NoteRow | null>(null);
  const [tab, setTab] = useState<'read' | 'chat'>('read');
  const [launch, setLaunch] = useState<{ intent: Intent; message: string } | null>(null);

  useEffect(() => {
    void (async () => setNote(await getNote(String(id))))();
  }, [id]);

  if (!note) {
    return (
      <View style={[styles.center, { backgroundColor: theme.bg }]}>
        <Text style={[type.body, { color: theme.textMuted }]}>Loading note…</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <Stack.Screen options={{ title: note.title }} />

      <View style={[styles.modes, { borderColor: theme.border }]}>
        {MODES.map((mode) => (
          <Pressable
            key={mode.label}
            onPress={() => {
              setTab('chat');
              setLaunch(mode.message ? { intent: mode.intent, message: mode.message } : null);
            }}
            style={[styles.mode, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <Ionicons name={mode.icon as 'help-circle-outline'} size={17} color={theme.accent} />
            <Text style={[type.small, { color: theme.text, fontWeight: '600' }]}>{mode.label}</Text>
          </Pressable>
        ))}
        <Pressable
          onPress={() => setTab(tab === 'read' ? 'chat' : 'read')}
          style={[styles.mode, { backgroundColor: theme.surfaceAlt, borderColor: theme.border }]}
        >
          <Ionicons name={tab === 'read' ? 'chatbubbles-outline' : 'book-outline'} size={17} color={theme.text} />
          <Text style={[type.small, { color: theme.text, fontWeight: '600' }]}>{tab === 'read' ? 'Chat' : 'Read'}</Text>
        </Pressable>
      </View>

      {tab === 'read' ? (
        <ScrollView contentContainerStyle={{ padding: space.lg, paddingBottom: 60 }}>
          {note.status === 'failed' && (
            <View style={[styles.banner, { backgroundColor: theme.surfaceAlt, borderColor: theme.danger }]}>
              <Text style={[type.small, { color: theme.danger }]}>{note.error_message ?? 'This note failed to index.'}</Text>
            </View>
          )}
          <Text style={[type.reading, { color: theme.text }]}>
            {note.text.trim().length > 0 ? note.text : 'No text has been extracted from this file yet.'}
          </Text>
        </ScrollView>
      ) : (
        <ChatView
          key={launch?.message ?? 'plain'}
          noteId={note.id}
          noteTitle={note.title}
          initialIntent={launch?.intent}
          initialMessage={launch?.message}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  modes: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, padding: space.md, borderBottomWidth: 1 },
  mode: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 7 },
  banner: { borderWidth: 1, borderRadius: radius.md, padding: space.md, marginBottom: space.lg },
});
