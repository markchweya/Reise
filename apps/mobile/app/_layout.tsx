import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";
import { Inter_800ExtraBold } from "@expo-google-fonts/inter/800ExtraBold";
import { useFonts } from "expo-font";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Text, type ColorValue } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { fonts, palette } from "../src/theme";

const client = new QueryClient();
const icon = (label: string, color: ColorValue) => (
  <Text style={{ color, fontFamily: fonts.extraBold, fontSize: 18 }}>
    {label}
  </Text>
);

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
  });

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={client}>
        <StatusBar style="dark" />
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarActiveTintColor: palette.red,
            tabBarInactiveTintColor: "#6B6B6B",
            tabBarStyle: {
              height: 82,
              paddingTop: 9,
              paddingBottom: 15,
              borderTopColor: "#E5E5E5",
              backgroundColor: "#FFFFFF",
            },
            tabBarLabelStyle: { fontFamily: fonts.bold, fontSize: 10 },
            tabBarHideOnKeyboard: true,
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: "Home",
              tabBarIcon: ({ color }) => icon("⌂", color),
            }}
          />
          <Tabs.Screen
            name="ai"
            options={{
              title: "Reise AI",
              tabBarIcon: ({ color }) => icon("R", color),
            }}
          />
          <Tabs.Screen
            name="journey"
            options={{
              title: "Journey",
              tabBarIcon: ({ color }) => icon("↗", color),
            }}
          />
          <Tabs.Screen
            name="tickets"
            options={{
              title: "Tickets",
              tabBarIcon: ({ color }) => icon("▰", color),
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              title: "Profile",
              tabBarIcon: ({ color }) => icon("○", color),
            }}
          />
        </Tabs>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
