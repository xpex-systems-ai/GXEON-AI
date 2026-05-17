import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

const envThreshold = Number(process.env.EXPO_PUBLIC_HIGH_VALUE_THRESHOLD_BRL);
export const HIGH_VALUE_THRESHOLD_BRL: number =
  Number.isFinite(envThreshold) && envThreshold > 0 ? envThreshold : 1000;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === "granted") return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === "granted";
}

export async function scheduleHighValueNotification(tx: {
  id: string;
  transaction_id?: string;
  actor_code?: string;
  base_amount: number;
}): Promise<void> {
  if (Platform.OS === "web") return;
  const amountFormatted = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(tx.base_amount);
  const actor = tx.actor_code ?? "Unknown";
  const txId = tx.transaction_id ?? tx.id;

  await Notifications.scheduleNotificationAsync({
    content: {
      title: `High-Value Transaction: ${amountFormatted}`,
      body: `Actor: ${actor} · ID: ${txId}`,
      data: { screen: "transactions", transactionId: tx.id },
    },
    trigger: null,
  });
}
