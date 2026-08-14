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
import Ionicons from "@expo/vector-icons/Ionicons";
import { LocalMemoryAssistant } from "@reise/ai";
import type { Journey } from "@reise/shared";
import { testNetwork } from "@reise/transit-providers";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChatMessage, ThinkingMessage } from "../src/components/ChatMessage";
import {
  ChatSidebar,
  type ChatHistoryItem,
} from "../src/components/ChatSidebar";
import { JourneyCard } from "../src/components/JourneyCard";
import { useReiseStore } from "../src/store";
import { fonts, palette, shadow } from "../src/theme";

type Message = {
  id: string;
  role: "reise" | "user";
  text: string;
  journeys?: Journey[];
};

type Conversation = {
  id: string;
  title: string;
  messages: Message[];
  journeyContext: {
    origin?: string;
    destination?: string;
  };
};

const titleFromMessage = (message: string) => {
  const words = message.trim().split(/\s+/).slice(0, 6).join(" ");
  return words.length > 34 ? `${words.slice(0, 34)}…` : words;
};

const createConversation = (userName: string, id = `chat-${Date.now()}`) => ({
  id,
  title: "New chat",
  journeyContext: {},
  messages: [
    {
      id: `${id}-welcome`,
      role: "reise" as const,
      text: `Hi ${userName}, how can I help you?`,
    },
  ],
});

const waitForThinkingCue = () =>
  new Promise<void>((resolve) => setTimeout(resolve, 450));

export default function AiScreen() {
  const assistant = useMemo(() => new LocalMemoryAssistant(), []);
  const scrollView = useRef<ScrollView>(null);
  const { priority, travelcard, setJourney, userName } = useReiseStore();
  const initialConversation = useMemo(
    () => createConversation(userName, "chat-initial"),
    [userName],
  );
  const [conversations, setConversations] = useState<Conversation[]>([
    initialConversation,
  ]);
  const [activeChatId, setActiveChatId] = useState(initialConversation.id);
  const [pendingChatIds, setPendingChatIds] = useState<string[]>([]);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [input, setInput] = useState("");

  const activeConversation =
    conversations.find((chat) => chat.id === activeChatId) ?? conversations[0]!;
  const isThinking = pendingChatIds.includes(activeConversation.id);

  const appendMessage = (
    chatId: string,
    message: Message,
    journeyContext?: Conversation["journeyContext"],
  ) => {
    setConversations((current) =>
      current.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              journeyContext: journeyContext ?? chat.journeyContext,
              messages: [...chat.messages, message],
            }
          : chat,
      ),
    );
  };

  const createNewChat = () => {
    const conversation = createConversation(userName);
    setConversations((current) => [conversation, ...current]);
    setActiveChatId(conversation.id);
    setInput("");
  };

  const ask = async () => {
    const message = input.trim();
    if (!message || isThinking) return;

    const chatId = activeConversation.id;
    const requestId = Date.now().toString();
    const isFirstUserMessage = !activeConversation.messages.some(
      (item) => item.role === "user",
    );

    setConversations((current) =>
      current.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              title: isFirstUserMessage
                ? titleFromMessage(message)
                : chat.title,
              messages: [
                ...chat.messages,
                { id: `user-${requestId}`, role: "user", text: message },
              ],
            }
          : chat,
      ),
    );
    setInput("");
    setPendingChatIds((current) => [...current, chatId]);

    try {
      const [response] = await Promise.all([
        assistant.respond(
          message,
          {
            ...activeConversation.journeyContext,
            priority,
            travelcard,
            departureMinutes: 7 * 60 + 35,
          },
          testNetwork,
        ),
        waitForThinkingCue(),
      ]);
      appendMessage(
        chatId,
        {
          id: `reise-${requestId}`,
          role: "reise",
          text: response.message,
          journeys: response.journeys,
        },
        response.resolvedJourney,
      );
    } catch {
      appendMessage(chatId, {
        id: `reise-error-${requestId}`,
        role: "reise",
        text: "I could not answer that just now. Please try again.",
      });
    } finally {
      setPendingChatIds((current) => current.filter((id) => id !== chatId));
    }
  };

  const history: ChatHistoryItem[] = conversations.map((chat) => ({
    id: chat.id,
    title: chat.title,
    preview: chat.messages.at(-1)?.text ?? "Start a conversation",
  }));

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <SafeAreaView edges={["top"]} style={styles.topSafeArea}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityLabel="Open chat history"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setSidebarVisible(true)}
            style={({ pressed }) => [
              styles.topBarButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="menu" size={23} color={palette.ink} />
          </Pressable>
          <Text numberOfLines={1} style={styles.conversationTitle}>
            {activeConversation.title}
          </Text>
          <Pressable
            accessibilityLabel="Start a new chat"
            accessibilityRole="button"
            hitSlop={8}
            onPress={createNewChat}
            style={({ pressed }) => [
              styles.topBarButton,
              pressed && styles.pressed,
            ]}
          >
            <Ionicons name="create-outline" size={21} color={palette.ink} />
          </Pressable>
        </View>
      </SafeAreaView>

      <ScrollView
        key={activeConversation.id}
        ref={scrollView}
        bounces={false}
        overScrollMode="never"
        style={styles.messages}
        contentContainerStyle={styles.content}
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() =>
          scrollView.current?.scrollToEnd({ animated: true })
        }
      >
        <View style={styles.conversation}>
          {activeConversation.messages.map((message) => (
            <View key={message.id}>
              <ChatMessage role={message.role} text={message.text} />
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
          ))}
          {isThinking ? <ThinkingMessage /> : null}
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
            accessibilityState={{ disabled: isThinking || !input.trim() }}
            disabled={isThinking || !input.trim()}
            onPress={() => void ask()}
            style={({ pressed }) => [
              styles.sendButton,
              (isThinking || !input.trim()) && styles.sendButtonDisabled,
              pressed && styles.sendButtonPressed,
            ]}
          >
            <Ionicons name="send" size={20} color={palette.paper} />
          </Pressable>
        </View>
      </View>

      <ChatSidebar
        activeChatId={activeConversation.id}
        chats={history}
        onClose={() => setSidebarVisible(false)}
        onNewChat={createNewChat}
        onSelectChat={setActiveChatId}
        visible={sidebarVisible}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7F7F7" },
  topSafeArea: {
    backgroundColor: "#F7F7F7",
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
  },
  topBar: {
    height: 58,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  topBarButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.paper,
    borderWidth: 1,
    borderColor: "#E5E5E5",
  },
  conversationTitle: {
    flex: 1,
    color: palette.ink,
    fontFamily: fonts.semiBold,
    fontSize: 15,
    letterSpacing: -0.2,
    textAlign: "center",
    paddingHorizontal: 12,
  },
  messages: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 18,
  },
  conversation: { flex: 1, gap: 18 },
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
    fontFamily: fonts.regular,
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
  pressed: { opacity: 0.65 },
});
