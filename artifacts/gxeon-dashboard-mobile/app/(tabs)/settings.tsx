import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { isSupabaseConfigured, getApiBase } from "@/lib/supabase";

type SettingRowProps = {
  label: string;
  value: string;
  icon: string;
  ok?: boolean;
};

function SettingRow({ label, value, icon, ok }: SettingRowProps) {
  const colors = useColors();
  const statusColor = ok === undefined ? colors.mutedForeground : ok ? colors.success : colors.warning;

  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.muted }]}>
        <Feather name={icon as any} size={16} color={colors.primary} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
        <Text style={[styles.value, { color: statusColor }]} numberOfLines={1}>{value}</Text>
      </View>
      {ok !== undefined && (
        <Feather
          name={ok ? "check-circle" : "alert-circle"}
          size={18}
          color={ok ? colors.success : colors.warning}
        />
      )}
    </View>
  );
}

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const supabaseOk = isSupabaseConfigured;
  const apiBase = getApiBase();
  const apiOk = !!apiBase;

  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const domain = process.env.EXPO_PUBLIC_DOMAIN;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: Platform.OS === "web" ? 100 : 100, paddingHorizontal: 16 }}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>Settings</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Connection & configuration</Text>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>CONNECTIONS</Text>
        <SettingRow
          label="Supabase"
          value={supabaseOk ? (supabaseUrl ?? "Configured") : "Not configured"}
          icon="database"
          ok={supabaseOk}
        />
        <SettingRow
          label="API Server"
          value={apiOk ? (domain ?? "Configured") : "EXPO_PUBLIC_DOMAIN not set"}
          icon="server"
          ok={apiOk}
        />
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>ENVIRONMENT</Text>
        <SettingRow
          label="Supabase URL"
          value={supabaseUrl ? "Set" : "Not set"}
          icon="link"
          ok={!!supabaseUrl}
        />
        <SettingRow
          label="Supabase Anon Key"
          value={process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ? "Set" : "Not set"}
          icon="key"
          ok={!!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}
        />
        <SettingRow
          label="Domain"
          value={domain ?? "Not set"}
          icon="globe"
          ok={!!domain}
        />
      </View>

      <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>APP INFO</Text>
        <SettingRow label="App" value="GXEON Mobile" icon="smartphone" />
        <SettingRow label="Version" value="1.0.0" icon="tag" />
        <SettingRow label="Stack" value="Expo + Supabase" icon="layers" />
      </View>

      <View style={[styles.infoBox, { backgroundColor: `${colors.primary}11`, borderColor: `${colors.primary}33` }]}>
        <Feather name="info" size={14} color={colors.primary} style={{ marginTop: 1 }} />
        <Text style={[styles.infoText, { color: colors.mutedForeground }]}>
          Add EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, and EXPO_PUBLIC_DOMAIN to your Replit Secrets to enable live data.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 4 },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginBottom: 24 },
  section: { borderRadius: 12, borderWidth: 1, marginBottom: 16, overflow: "hidden" },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase", paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: 1, gap: 12 },
  iconWrap: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  info: { flex: 1 },
  label: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 2 },
  value: { fontSize: 14, fontFamily: "Inter_500Medium" },
  infoBox: { flexDirection: "row", gap: 10, borderRadius: 10, borderWidth: 1, padding: 14 },
  infoText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
