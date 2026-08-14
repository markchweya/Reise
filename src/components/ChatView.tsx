import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { askSoma } from '../chat/engine';
import type { Intent } from '../chat/router';
import { addMessage, ensureThread, listMessages, logEvent, updateMessage, type MessageRow } from '../db/repo';
import { useBadges } from '../store/badges';
import { radius, space, type, useTheme } from '../theme';

interface Props {
  noteId?: string;
  noteTitle?: string;
  initialIntent?: Intent;
  initialMessage?: string;
}

interface Source {
  id: string;
  noteId: string;
  noteTitle: string;
}

export function ChatView({ noteId, noteTitle, initialIntent, initialMessage }: Props) {
  const theme = useTheme();
  const router = useRouter();
  const refreshBadges = useBadges((s) => s.refresh);

  const [threadId, setThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [draft, setDraft] = useState('');
  const [streaming, setStreaming] = useState('');
  const [sources, setSources] = useState<Source[]>([]);
  const [thinking, setThinking] = useState(false);
  const listRef = useRef<FlatList<MessageRow>>(null);
  const fired = useRef(false);

  useEffect(() => {
    void (async () => {
      const id = await ensureThread(noteId ?? null, noteTitle ?? 'Free chat');
      setThreadId(id);
      setMessages(await listMessages(id));
    })();
  }, [noteId, noteTitle]);

  const send = useCallback(
    async (text: string, forceIntent?: Intent) => {
      const body = text.trim();
      if (!body || !threadId || thinking) return;
      setDraft('');
      setThinking(true);
      setSources([]);
      setStreaming('');

      const userRow = await addMessage({ threadId, role: 'user', content: body });
      setMessages((prev) => [...prev, userRow]);

      const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }));
      let answer = '';
      let cited: Source[] = [];
      let intent: Intent = forceIntent ?? 'note_question';

      try {
        for await (const event of askSoma({ message: body, history, noteId, forceIntent })) {
          if (event.type === 'intent' && event.intent) intent = event.intent;
          if (event.type === 'sources' && event.sources) {
            cited = event.sources.map((s) => ({ id: s.id, noteId: s.noteId, noteTitle: s.noteTitle }));
            setSources(cited);
          }
          if (event.type === 'text' && event.text) {
            answer += event.text;
            setStreaming(answer);
          }
        }
      } catch (err) {
        answer = answer || `I could not finish that. ${err instanceof Error ? err.message : 'Unknown error.'}`;
      }

      const assistantRow = await addMessage({
        threadId,
        role: 'assistant',
        content: answer,
        citedChunkIds: cited.map((c) => c.id),
        intent,
      });
      await logEvent(intent === 'note_question' ? 'ask' : intent);
      setMessages((prev) => [...prev, assistantRow]);
      setStreaming('');
      setThinking(false);
      void updateMessage(assistantRow.id, answer, cited.map((c) => c.id));
      void refreshBadges();
    },
    [threadId, thinking, messages, noteId, refreshBadges],
  );

  useEffect(() => {
    if (threadId && initialMessage && !fired.current) {
      fired.current = true;
      void send(initialMessage, initialIntent);
    }
  }, [threadId, initialMessage, initialIntent, send]);

  const openSource = async (source: Source): Promise<void> => {
    await logEvent('citation_opened');
    void refreshBadges();
    router.push(`/note/${source.noteId}`);
  };

  const bubble = (row: MessageRow) => {
    const mine = row.role === 'user';
    const cites: string[] = JSON.parse(row.cited_chunk_ids || '[]') as string[];
    return (
      <View style={[styles.row, { justifyContent: mine ? 'flex-end' : 'flex-start' }]}>
        <View
          style={[
            styles.bubble,
            mine
              ? { backgroundColor: theme.bubbleUser, borderTopRightRadius: 4 }
              : { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, borderTopLeftRadius: 4 },
          ]}
        >
          <Text style={[type.reading, { color: mine ? theme.bubbleUserText : theme.text }]}>{row.content}</Text>
          {!mine && cites.length > 0 && (
            <Text style={[type.tiny, { color: theme.textMuted, marginTop: space.sm }]}>
              {cites.length} passage{cites.length === 1 ? '' : 's'} used
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { backgroundColor: theme.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => bubble(item)}
        contentContainerStyle={{ padding: space.lg, gap: space.md }}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[type.title, { color: theme.text }]}>
              {noteTitle ? `Ask about "${noteTitle}"` : 'Ask Soma anything'}
            </Text>
            <Text style={[type.body, { color: theme.textMuted, textAlign: 'center', marginTop: space.sm }]}>
              Questions are answered from your own notes, with the passages used shown underneath. Say hello if you just
              want to chat.
            </Text>
          </View>
        }
        ListFooterComponent={
          <View>
            {sources.length > 0 && (
              <View style={styles.chips}>
                {sources.map((s) => (
                  <Pressable
                    key={s.id}
                    onPress={() => void openSource(s)}
                    style={[styles.chip, { backgroundColor: theme.accentSoft, borderColor: theme.border }]}
                  >
                    <Ionicons name="bookmark-outline" size={12} color={theme.accent} />
                    <Text style={[type.tiny, { color: theme.accent }]} numberOfLines={1}>from: {s.noteTitle}</Text>
                  </Pressable>
                ))}
              </View>
            )}
            {(streaming.length > 0 || thinking) && (
              <View style={[styles.row, { justifyContent: 'flex-start' }]}>
                <View style={[styles.bubble, { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1 }]}>
                  {streaming.length > 0 ? (
                    <Text style={[type.reading, { color: theme.text }]}>
                      {streaming}
                      <Text style={{ color: theme.accent }}>▍</Text>
                    </Text>
                  ) : (
                    <ActivityIndicator color={theme.textMuted} />
                  )}
                </View>
              </View>
            )}
          </View>
        }
      />

      <View style={[styles.composer, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder={noteTitle ? 'Ask about this note…' : 'Ask about your notes…'}
          placeholderTextColor={theme.textMuted}
          multiline
          style={[type.body, styles.input, { color: theme.text }]}
          onSubmitEditing={() => void send(draft)}
        />
        <Pressable
          onPress={() => void send(draft)}
          disabled={thinking || draft.trim().length === 0}
          style={[styles.send, { backgroundColor: draft.trim() && !thinking ? theme.accent : theme.surfaceAlt }]}
        >
          <Ionicons name="arrow-up" size={20} color={draft.trim() && !thinking ? '#fff' : theme.textMuted} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  row: { flexDirection: 'row' },
  bubble: { maxWidth: '88%', borderRadius: radius.lg, paddingHorizontal: space.lg, paddingVertical: space.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.md },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, maxWidth: 200, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: space.md, paddingVertical: 5 },
  empty: { alignItems: 'center', paddingTop: 90, paddingHorizontal: space.lg },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, margin: space.md, padding: space.sm, borderWidth: 1, borderRadius: radius.lg },
  input: { flex: 1, maxHeight: 140, paddingHorizontal: space.sm, paddingTop: 8, paddingBottom: 8 },
  send: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
});
