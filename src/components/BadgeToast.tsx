import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useBadges } from '../store/badges';
import { radius, space, type, useTheme } from '../theme';

export function BadgeToast() {
  const theme = useTheme();
  const { toast, dismissToast } = useBadges();
  const slide = useRef(new Animated.Value(-120)).current;

  useEffect(() => {
    if (!toast) return;
    Animated.spring(slide, { toValue: 0, useNativeDriver: true, friction: 8 }).start();
    const timer = setTimeout(() => {
      Animated.timing(slide, { toValue: -120, duration: 220, useNativeDriver: true }).start(dismissToast);
    }, 3400);
    return () => clearTimeout(timer);
  }, [toast, slide, dismissToast]);

  if (!toast) return null;

  return (
    <Animated.View style={[styles.wrap, { transform: [{ translateY: slide }] }]} pointerEvents="box-none">
      <Pressable
        onPress={dismissToast}
        style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.accent }]}
      >
        <View style={[styles.medal, { backgroundColor: theme.accentSoft }]}>
          <Ionicons name={toast.icon as 'trophy'} size={22} color={theme.accent} />
        </View>
        <View style={styles.body}>
          <Text style={[type.tiny, { color: theme.accent, letterSpacing: 1 }]}>BADGE UNLOCKED</Text>
          <Text style={[type.title, { color: theme.text }]}>{toast.name}</Text>
          <Text style={[type.small, { color: theme.textMuted }]}>{toast.description}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', top: 60, left: 0, right: 0, alignItems: 'center', paddingHorizontal: space.lg },
  card: { flexDirection: 'row', alignItems: 'center', gap: space.md, width: '100%', borderWidth: 1.5, borderRadius: radius.lg, padding: space.lg },
  medal: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  body: { flex: 1, gap: 2 },
});
