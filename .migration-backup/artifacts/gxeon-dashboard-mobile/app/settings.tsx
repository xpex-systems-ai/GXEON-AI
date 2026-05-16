import React from "react";
import { Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useColors } from "@/hooks/useColors";

type InfoRow = { icon: string; label: string; value: string; accent?: boolean };

const ACCESS_INFO: InfoRow[] = [
  { icon: "shield", label: "Access Mode", value: "Read-Only", accent: false },
  { icon: "refresh-cw", label: "Real-time Updates", value: "Enabled", accent: true },
  { icon: "lock", label: "Auth", value: "Supabase RLS", accent: false },
  { icon: "database", label: "Data Source", value: "Supabase Live", accent: true },
];

const APP_INFO: InfoRow[] = [
  { icon: "smartphone", label: "App Version", value: "1.0.0" },
  { icon: "code", label: "Framework", value: "Expo / React Native" },
  { icon: "cloud", label: "Platform", value: "Replit" },
  { icon: "layers", label: "Web Counterpart", value: "GXEON Dashboard 2.0" },
  { icon: "zap", label: "Architecture", value: "pnpm monorepo" },
];

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 20 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title: "Settings", headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.foreground }} />

      {/* Dashboard Access */}
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Dashboard Access</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {ACCESS_INFO.map((row, i) => (
          <View
            key={row.label}
            style={[
              styles.row,
              { borderBottomColor: colors.border, borderBottomWidth: i < ACCESS_INFO.length - 1 ? StyleSheet.hairlineWidth : 0 },
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
              <Feather name={row.icon as any} size={14} color={row.accent ? colors.success : colors.mutedForeground} />
            </View>
            <Text style={[styles.label, { color: colors.foreground }]}>{row.label}</Text>
            <View style={[styles.valueBadge, { backgroundColor: row.accent ? colors.success + "20" : colors.secondary }]}>
              <Text style={[styles.valueText, { color: row.accent ? colors.success : colors.mutedForeground }]}>
                {row.value}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* About */}
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>About</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {APP_INFO.map((row, i) => (
          <View
            key={row.label}
            style={[
              styles.row,
              { borderBottomColor: colors.border, borderBottomWidth: i < APP_INFO.length - 1 ? StyleSheet.hairlineWidth : 0 },
            ]}
          >
            <View style={[styles.iconWrap, { backgroundColor: colors.secondary }]}>
              <Feather name={row.icon as any} size={14} color={colors.mutedForeground} />
            </View>
            <Text style={[styles.label, { color: colors.foreground }]}>{row.label}</Text>
            <Text style={[styles.plainValue, { color: colors.mutedForeground }]}>{row.value}</Text>
          </View>
        ))}
      </View>

      {/* Legal note */}
      <View style={[styles.noteBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
        <Feather name="info" size={13} color={colors.mutedForeground} />
        <Text style={[styles.noteText, { color: colors.mutedForeground }]}>
          This app is a read-only companion to the GXEON web dashboard. All data is served directly from Supabase and the GXEON API server.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  card: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, gap: 12 },
  iconWrap: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  label: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular" },
  valueBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 },
  valueText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  plainValue: { fontSize: 13, fontFamily: "Inter_400Regular" },
  noteBox: { flexDirection: "row", gap: 8, padding: 12, borderRadius: 8, borderWidth: 1 },
  noteText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
