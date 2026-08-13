import { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";
import { fonts, palette } from "../theme";

export type ChatHistoryItem = {
  id: string;
  title: string;
  preview: string;
};

type ChatSidebarProps = {
  visible: boolean;
  chats: ChatHistoryItem[];
  activeChatId: string;
  onClose(): void;
  onNewChat(): void;
  onSelectChat(id: string): void;
};

export function ChatSidebar({
  visible,
  chats,
  activeChatId,
  onClose,
  onNewChat,
  onSelectChat,
}: ChatSidebarProps) {
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      progress.setValue(0);
      Animated.timing(progress, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [progress, visible]);

  const close = (afterClose?: () => void) => {
    Animated.timing(progress, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      onClose();
      afterClose?.();
    });
  };

  return (
    <Modal
      animationType="none"
      onRequestClose={() => close()}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.modal}>
        <Animated.View style={[styles.backdrop, { opacity: progress }]}>
          <Pressable
            accessibilityLabel="Close chat history"
            accessibilityRole="button"
            onPress={() => close()}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.panel,
            {
              transform: [
                {
                  translateX: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-360, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
            <View style={styles.brandRow}>
              <View style={styles.brandMark}>
                <Text style={styles.brandMarkText}>R</Text>
              </View>
              <Text style={styles.brand}>Reise AI</Text>
              <Pressable
                accessibilityLabel="Close chat history"
                accessibilityRole="button"
                hitSlop={10}
                onPress={() => close()}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={22} color={palette.ink} />
              </Pressable>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => close(onNewChat)}
              style={({ pressed }) => [
                styles.newChat,
                pressed && styles.pressed,
              ]}
            >
              <Ionicons name="create-outline" size={19} color={palette.paper} />
              <Text style={styles.newChatText}>New chat</Text>
            </Pressable>

            <Text style={styles.sectionLabel}>Chats</Text>
            <ScrollView
              bounces={false}
              contentContainerStyle={styles.history}
              showsVerticalScrollIndicator={false}
            >
              {chats.map((chat) => {
                const isActive = chat.id === activeChatId;
                return (
                  <Pressable
                    accessibilityRole="button"
                    key={chat.id}
                    onPress={() => close(() => onSelectChat(chat.id))}
                    style={({ pressed }) => [
                      styles.historyItem,
                      isActive && styles.historyItemActive,
                      pressed && styles.pressed,
                    ]}
                  >
                    <Ionicons
                      name="chatbubble-outline"
                      size={17}
                      color={isActive ? palette.red : palette.slate}
                    />
                    <View style={styles.historyCopy}>
                      <Text numberOfLines={1} style={styles.historyTitle}>
                        {chat.title}
                      </Text>
                      <Text numberOfLines={1} style={styles.historyPreview}>
                        {chat.preview}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </SafeAreaView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.32)",
  },
  panel: {
    width: "86%",
    maxWidth: 360,
    height: "100%",
    backgroundColor: palette.paper,
    shadowColor: "#000000",
    shadowOffset: { width: 8, height: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    elevation: 16,
  },
  safeArea: { flex: 1, paddingHorizontal: 18 },
  brandRow: {
    height: 76,
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  brandMark: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.red,
  },
  brandMarkText: {
    color: palette.paper,
    fontFamily: fonts.extraBold,
    fontSize: 16,
  },
  brand: {
    flex: 1,
    color: palette.ink,
    fontFamily: fonts.extraBold,
    fontSize: 21,
    letterSpacing: -0.5,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.mist,
  },
  newChat: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 20,
    borderRadius: 15,
    backgroundColor: palette.red,
  },
  newChatText: {
    color: palette.paper,
    fontFamily: fonts.bold,
    fontSize: 14,
  },
  sectionLabel: {
    color: palette.slate,
    fontFamily: fonts.bold,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 28,
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  history: { gap: 6, paddingBottom: 24 },
  historyItem: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  historyItemActive: { backgroundColor: "#FFF0F0" },
  historyCopy: { flex: 1 },
  historyTitle: {
    color: palette.ink,
    fontFamily: fonts.semiBold,
    fontSize: 14,
  },
  historyPreview: {
    color: palette.slate,
    fontFamily: fonts.regular,
    fontSize: 11,
    marginTop: 4,
  },
  pressed: { opacity: 0.72 },
});
