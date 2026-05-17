import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import React from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

type MenuItem = {
  label: string;
  icon: string;
  route: string;
  description: string;
};

const MENU_ITEMS: MenuItem[] = [
  { label: "Commissions", icon: "briefcase", route: "/commissions", description: "Actor wallets & commission rates" },
  { label: "Actors", icon: "users", route: "/actors", description: "Actor management" },
  { label: "API Keys", icon: "key", route: "/api-keys", description: "Manage API access keys" },
  { label: "Datasets", icon: "database", route: "/datasets", description: "Marketplace datasets & sales" },
  { label: "System Health", icon: "activity", route: "/health", description: "Connection & uptime status" },
  { label: "Revenue Streams", icon: "trending-up", route: "/revenue-streams", description: "Monetization engine overview" },
  { label: "System Logs", icon: "terminal", route: "/system-logs", description: "Application log entries" },
  { label: "Governance", icon: "shield", route: "/governance", description: "Branch, merge & deployment status" },
  { label: "Conversion", icon: "target", route: "/conversion", description: "Funnel & lead tracking" },
  { label: "Settings", icon: "settings", route: "/settings", description: "Configuration & connections" },
];

export default function MoreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: Platform.OS === "web" ? 100 : 100 }}
    >
      <Text style={[styles.title, { color: colors.foreground, paddingHorizontal: 16 }]}>More</Text>
      <View style={[styles.list, { marginTop: 20, borderColor: colors.border, backgroundColor: colors.card }]}>
        {MENU_ITEMS.map((item, index) => (
          <Pressable
            key={item.route}
            onPress={() => router.push(item.route as any)}
            style={({ pressed }) => [
              styles.row,
              { borderBottomColor: colors.border, opacity: pressed ? 0.6 : 1 },
              index === MENU_ITEMS.length - 1 && { borderBottomWidth: 0 },
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}18` }]}>
              <Feather name={item.icon as any} size={18} color={colors.primary} />
            </View>
            <View style={styles.rowInfo}>
              <Text style={[styles.rowLabel, { color: colors.foreground }]}>{item.label}</Text>
              <Text style={[styles.rowDesc, { color: colors.mutedForeground }]}>{item.description}</Text>
            </View>
            <Feather name="chevron-right" size={16} color={colors.mutedForeground} />
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold" },
  list: { borderTopWidth: 1, borderBottomWidth: 1, marginHorizontal: 0 },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, gap: 14 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowInfo: { flex: 1 },
  rowLabel: { fontSize: 15, fontFamily: "Inter_500Medium" },
  rowDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
});
