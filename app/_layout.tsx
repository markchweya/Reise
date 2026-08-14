import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { useLibrary } from '../src/store/library';
import { useBadges } from '../src/store/badges';
import { BadgeToast } from '../src/components/BadgeToast';
import { useTheme } from '../src/theme';

export default function RootLayout() {
  const theme = useTheme();
  const scheme = useColorScheme();
  const bootstrap = useLibrary((s) => s.bootstrap);
  const refreshBadges = useBadges((s) => s.refresh);

  useEffect(() => {
    void (async () => {
      await bootstrap();
      await refreshBadges();
    })();
  }, [bootstrap, refreshBadges]);

  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.bg },
          headerTintColor: theme.text,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="note/[id]" options={{ title: 'Note' }} />
      </Stack>
      <BadgeToast />
    </>
  );
}
