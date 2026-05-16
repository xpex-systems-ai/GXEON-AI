import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back", headerStyle: { backgroundColor: "#060d1e" }, headerTintColor: "#e2eaf4", headerTitleStyle: { fontFamily: "Inter_600SemiBold" } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="commissions" options={{ title: "Commissions" }} />
      <Stack.Screen name="actors" options={{ title: "Actors" }} />
      <Stack.Screen name="api-keys" options={{ title: "API Keys" }} />
      <Stack.Screen name="datasets" options={{ title: "Datasets" }} />
      <Stack.Screen name="health" options={{ title: "System Health" }} />
      <Stack.Screen name="revenue-streams" options={{ title: "Revenue Streams" }} />
      <Stack.Screen name="system-logs" options={{ title: "System Logs" }} />
      <Stack.Screen name="governance" options={{ title: "Governance" }} />
      <Stack.Screen name="conversion" options={{ title: "Conversion" }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView>
            <KeyboardProvider>
              <RootLayoutNav />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
