import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Text, type ColorValue } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { palette } from "../src/theme";

const client = new QueryClient();
const icon = (label: string, color: ColorValue) => (
  <Text style={{ color, fontSize: 18, fontWeight: "800" }}>{label}</Text>
);

export default function RootLayout() {
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
            tabBarLabelStyle: { fontSize: 10, fontWeight: "700" },
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
