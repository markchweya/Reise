import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LocalMemoryAssistant, type AssistantResult } from "@reise/ai";
import { testNetwork } from "@reise/transit-providers";
import { JourneyCard } from "../src/components/JourneyCard";
import { Button, Card, ScreenHeader, SourceLabel } from "../src/components/ui";
import { useReiseStore } from "../src/store";
import { palette } from "../src/theme";

const prompts = [
  "Can I reach St. Jakob without changing?",
  "What is the cheapest ticket?",
  "Find a route with as few changes as possible.",
];

export default function AiScreen() {
  const assistant = useMemo(() => new LocalMemoryAssistant(), []);
  const { priority, travelcard, setJourney } = useReiseStore();
  const [input, setInput] = useState(
    "How do I get from Redingstrasse to Stallenstrasse?",
  );
  const [result, setResult] = useState<AssistantResult>();
  const [busy, setBusy] = useState(false);
  const ask = async (message = input) => {
    setBusy(true);
    const response = await assistant.respond(
      message,
      { priority, travelcard, departureMinutes: 7 * 60 + 35 },
      testNetwork,
    );
    setResult(response);
    setBusy(false);
  };
  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <ScreenHeader
          eyebrow="Private by default"
          title="Ask Reise"
          action={<SourceLabel tone="success">On-device memory</SourceLabel>}
        />
        <Text style={styles.intro}>
          Journey help runs locally on this phone for the test. No message
          leaves the device.
        </Text>
        <View style={styles.promptList}>
          {prompts.map((prompt) => (
            <Text
              key={prompt}
              onPress={() => {
                setInput(prompt);
                void ask(prompt);
              }}
              style={styles.prompt}
            >
              {prompt}
            </Text>
          ))}
        </View>
        {result ? (
          <Card style={styles.response}>
            <Text style={styles.responseLabel}>Reise</Text>
            <Text style={styles.responseText}>{result.message}</Text>
            <View style={styles.grounding}>
              <Text style={styles.groundingText}>
                Calculated from structured test-network data
              </Text>
            </View>
          </Card>
        ) : null}
        {result?.journeys.map((journey) => (
          <JourneyCard
            key={journey.id}
            journey={journey}
            onSelect={() => setJourney(journey)}
          />
        ))}
      </ScrollView>
      <View style={styles.composer}>
        <TextInput
          accessibilityLabel="Ask Reise"
          value={input}
          onChangeText={setInput}
          multiline
          style={styles.input}
          placeholder="Ask about a journey…"
          placeholderTextColor="#777"
        />
        <Button
          label={busy ? "Thinking locally…" : "Ask"}
          onPress={() => void ask()}
          disabled={busy || !input.trim()}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F7F7" },
  content: { padding: 20, paddingTop: 66, paddingBottom: 150 },
  intro: {
    color: palette.slate,
    fontSize: 15,
    lineHeight: 22,
    marginTop: -8,
    marginBottom: 20,
    maxWidth: 340,
  },
  promptList: { gap: 8, marginBottom: 22 },
  prompt: {
    color: palette.ink,
    backgroundColor: palette.paper,
    borderWidth: 1,
    borderColor: palette.line,
    padding: 13,
    borderRadius: 12,
    overflow: "hidden",
    fontWeight: "600",
  },
  response: {
    borderLeftWidth: 4,
    borderLeftColor: palette.red,
    marginBottom: 14,
  },
  responseLabel: {
    color: palette.red,
    fontWeight: "900",
    fontSize: 12,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  responseText: {
    color: palette.ink,
    fontSize: 17,
    lineHeight: 25,
    fontWeight: "600",
    marginTop: 10,
  },
  grounding: {
    borderTopWidth: 1,
    borderTopColor: palette.line,
    marginTop: 16,
    paddingTop: 12,
  },
  groundingText: { color: palette.slate, fontSize: 11 },
  composer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: palette.paper,
    borderTopWidth: 1,
    borderTopColor: palette.line,
    padding: 12,
    paddingBottom: 24,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-end",
  },
  input: {
    flex: 1,
    minHeight: 52,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    color: palette.ink,
    fontSize: 15,
  },
});
