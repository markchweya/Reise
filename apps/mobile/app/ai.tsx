import { useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LocalMemoryAssistant } from "@reise/ai";
import type { Journey } from "@reise/shared";
import { testNetwork } from "@reise/transit-providers";
import { JourneyCard } from "../src/components/JourneyCard";
import { ScreenHeader } from "../src/components/ui";
import { useReiseStore } from "../src/store";
import { palette, shadow } from "../src/theme";

type ChatMessage = {
  id: string;
  role: "reise" | "user";
  text: string;
  journeys?: Journey[];
};

export default function AiScreen() {
  const assistant = useMemo(() => new LocalMemoryAssistant(), []);
  const scrollView = useRef<ScrollView>(null);
  const { priority, travelcard, setJourney, userName } = useReiseStore();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "reise",
      text: `Hi ${userName}, how can I help you?`,
    },
  ]);
  const [busy, setBusy] = useState(false);

  const ask = async () => {
    const message = input.trim();
    if (!message || busy) return;

    const requestId = Date.now().toString();
    setMessages((current) => [
      ...current,
      { id: `user-${requestId}`, role: "user", text: message },
    ]);
    setInput("");
    setBusy(true);

    try {
      const response = await assistant.respond(
        message,
        { priority, travelcard, departureMinutes: 7 * 60 + 35 },
        testNetwork,
      );
      setMessages((current) => [
        ...current,
        {
          id: `reise-${requestId}`,
          role: "reise",
          text: response.message,
          journeys: response.journeys,
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: `reise-error-${requestId}`,
          role: "reise",
          text: "I could not answer that just now. Please try again.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        ref={scrollView}
        style={styles.messages}
        contentContainerStyle={styles.content}
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() =>
          scrollView.current?.scrollToEnd({ animated: true })
        }
      >
        <ScreenHeader eyebrow="Private chat" title="Reise AI" />

        <View style={styles.conversation}>
          {messages.map((message) => {
            const isUser = message.role === "user";
            return (
              <View key={message.id}>
                <View
                  style={[
                    styles.messageRow,
                    isUser ? styles.userRow : styles.reiseRow,
                  ]}
                >
                  {!isUser ? (
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>R</Text>
                    </View>
                  ) : null}
                  <View
                    style={[
                      styles.bubble,
                      isUser ? styles.userBubble : styles.reiseBubble,
                    ]}
                  >
                    <Text
                      style={[
                        styles.sender,
                        isUser ? styles.userSender : styles.reiseSender,
                      ]}
                    >
                      {isUser ? "You" : "Reise"}
                    </Text>
                    <Text
                      style={[
                        styles.messageText,
                        isUser && styles.userMessageText,
                      ]}
                    >
                      {message.text}
                    </Text>
                  </View>
                </View>

                {message.journeys?.length ? (
                  <View style={styles.journeys}>
                    {message.journeys.map((journey) => (
                      <JourneyCard
                        key={journey.id}
                        journey={journey}
                        onSelect={() => setJourney(journey)}
                      />
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.composerArea}>
        <View style={styles.composer}>
          <TextInput
            accessibilityLabel="Message Reise AI"
            value={input}
            onChangeText={setInput}
            multiline
            style={styles.input}
            placeholder="Message Reise AI"
            placeholderTextColor="#777777"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send message"
            accessibilityState={{ disabled: busy || !input.trim() }}
            disabled={busy || !input.trim()}
            onPress={() => void ask()}
            style={({ pressed }) => [
              styles.sendButton,
              (busy || !input.trim()) && styles.sendButtonDisabled,
              pressed && styles.sendButtonPressed,
            ]}
          >
            <Ionicons name="send" size={20} color={palette.paper} />
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F7F7" },
  messages: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 66,
    paddingBottom: 18,
  },
  conversation: { flex: 1, gap: 18 },
  messageRow: {
    maxWidth: "88%",
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 9,
  },
  reiseRow: { alignSelf: "flex-start" },
  userRow: { alignSelf: "flex-end" },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: palette.red,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  avatarText: { color: palette.paper, fontSize: 13, fontWeight: "900" },
  bubble: { paddingHorizontal: 16, paddingVertical: 13 },
  reiseBubble: {
    backgroundColor: palette.paper,
    borderWidth: 1,
    borderColor: palette.line,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 20,
  },
  userBubble: {
    backgroundColor: palette.red,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 20,
  },
  sender: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginBottom: 5,
    textTransform: "uppercase",
  },
  reiseSender: { color: palette.red },
  userSender: { color: "#FFD5D5" },
  messageText: {
    color: palette.ink,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 23,
  },
  userMessageText: { color: palette.paper },
  journeys: { marginTop: 14 },
  composerArea: {
    backgroundColor: "#F7F7F7",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  composer: {
    minHeight: 58,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    backgroundColor: palette.paper,
    borderWidth: 1,
    borderColor: "#D7D7D7",
    borderRadius: 29,
    paddingLeft: 17,
    paddingRight: 7,
    paddingVertical: 6,
    ...shadow,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 112,
    paddingTop: 11,
    paddingBottom: 10,
    color: palette.ink,
    fontSize: 16,
    lineHeight: 22,
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: palette.red,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: { backgroundColor: "#B8B8B8" },
  sendButtonPressed: { transform: [{ scale: 0.96 }] },
});
