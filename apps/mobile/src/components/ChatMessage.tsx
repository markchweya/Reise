import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { fonts, palette } from "../theme";

export type ChatRole = "reise" | "user";

export function ChatMessage({ role, text }: { role: ChatRole; text: string }) {
  const entrance = useRef(new Animated.Value(0)).current;
  const isUser = role === "user";

  useEffect(() => {
    Animated.spring(entrance, {
      toValue: 1,
      damping: 18,
      stiffness: 180,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  }, [entrance]);

  return (
    <Animated.View
      style={[
        styles.messageRow,
        isUser ? styles.userRow : styles.reiseRow,
        {
          opacity: entrance,
          transform: [
            {
              translateY: entrance.interpolate({
                inputRange: [0, 1],
                outputRange: [10, 0],
              }),
            },
          ],
        },
      ]}
    >
      {!isUser ? (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>R</Text>
        </View>
      ) : null}
      <View
        style={[styles.bubble, isUser ? styles.userBubble : styles.reiseBubble]}
      >
        <Text
          style={[
            styles.sender,
            isUser ? styles.userSender : styles.reiseSender,
          ]}
        >
          {isUser ? "You" : "Reise"}
        </Text>
        <Text style={[styles.messageText, isUser && styles.userMessageText]}>
          {text}
        </Text>
      </View>
    </Animated.View>
  );
}

export function ThinkingMessage() {
  const pulse = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 600,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  return (
    <View style={[styles.messageRow, styles.reiseRow]}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>R</Text>
      </View>
      <Animated.View style={[styles.thinkingBubble, { opacity: pulse }]}>
        <Ionicons name="sparkles-outline" size={15} color={palette.red} />
        <Text style={styles.thinkingText}>Thinking</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  avatarText: {
    color: palette.paper,
    fontFamily: fonts.extraBold,
    fontSize: 13,
  },
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
    fontFamily: fonts.extraBold,
    fontSize: 10,
    letterSpacing: 0.8,
    marginBottom: 5,
    textTransform: "uppercase",
  },
  reiseSender: { color: palette.red },
  userSender: { color: "#FFD5D5" },
  messageText: {
    color: palette.ink,
    fontFamily: fonts.medium,
    fontSize: 16,
    lineHeight: 24,
  },
  userMessageText: { color: palette.paper },
  thinkingBubble: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: palette.paper,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 18,
    borderTopLeftRadius: 6,
    paddingHorizontal: 14,
  },
  thinkingText: {
    color: palette.slate,
    fontFamily: fonts.medium,
    fontSize: 13,
  },
});
