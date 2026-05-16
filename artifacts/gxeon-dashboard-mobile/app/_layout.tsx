import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { RealtimePostgresInsertPayload } from "@supabase/supabase-js";
import * as Notifications from "expo-notifications";
import { router, Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import {
  HIGH_VALUE_THRESHOLD_BRL,
  requestNotificationPermissions,
  scheduleHighValueNotification,
} from "@/lib/notifications";
import { getSupabase, isConfigured } from "@/lib/supabase";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

type GlobalTransactionRow = {
  id: string;
  transaction_id: string | null;
  actor_code: string | null;
  base_amount: number;
  status: string;
  created_at: string;
  gateway_provider: string | null;
};

function NotificationManager() {
  const responseListenerRef = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    if (Platform.OS === "web") return;

    if (Platform.OS === "android") {
      Notifications.setNotificationChannelAsync("high-value-transactions", {
        name: "High-Value Transactions",
        importance: Notifications.AndroidImportance.HIGH,
        sound: "default",
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    requestNotificationPermissions();

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        router.push("/(tabs)/transactions");
      }
    });

    responseListenerRef.current = Notifications.addNotificationResponseReceivedListener(() => {
      router.push("/(tabs)/transactions");
    });

    return () => {
      responseListenerRef.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (!isConfigured() || Platform.OS === "web") return;

    const supabase = getSupabase();
    const channel = supabase
      .channel("high-value-transactions")
      .on<GlobalTransactionRow>(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "global_transactions",
          filter: "status=eq.PAID",
        },
        async (payload: RealtimePostgresInsertPayload<GlobalTransactionRow>) => {
          const tx = payload.new;
          const amountBRL = tx.base_amount ?? 0;
          if (amountBRL >= HIGH_VALUE_THRESHOLD_BRL) {
            const granted = await requestNotificationPermissions();
            if (!granted) return;
            await scheduleHighValueNotification({
              id: tx.id,
              transaction_id: tx.transaction_id ?? undefined,
              actor_code: tx.actor_code ?? undefined,
              base_amount: tx.base_amount,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return null;
}

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
              <NotificationManager />
              <RootLayoutNav />
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
