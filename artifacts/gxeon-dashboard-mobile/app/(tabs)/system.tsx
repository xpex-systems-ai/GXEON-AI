import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { MetricCard } from "@/components/MetricCard";
import { getSupabase, isConfigured } from "@/lib/supabase";

type HealthData = {
  totalActors: number;
  activeKeys: number;
  totalDatasets: number;
  supabaseOk: boolean;
};

type StatusDot = { label: string; status: "active" | "idle" | "error" };

export default function SystemScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!isConfigured()) {
      setHealth({ totalActors: 0, activeKeys: 0, totalDatasets: 0, supabaseOk: false });
      setError("Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in Replit Secrets.");
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const db = getSupabase();
      const [actors, keys, datasets] = await Promise.all([
        db.from("actors").select("*", { count: "exact", head: true }),
        db.from("api_keys").select("*", { count: "exact", head: true }).eq("status", "active"),
        db.from("datasets").select("*", { count: "exact", head: true }),
      ]);
      setHealth({
        totalActors: actors.count ?? 0,
        activeKeys: keys.count ?? 0,
        totalDatasets: datasets.count ?? 0,
        supabaseOk: !actors.error,
      });
      setError(null);
    } catch (e) {
      setHealth({ totalActors: 0, activeKeys: 0, totalDatasets: 0, supabaseOk: false });
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fetchData();
  }, [fetchData]);

  const systemDots: StatusDot[] = [
    { label: "Database", status: health?.supabaseOk ? "active" : "error" },
    { label: "PIX Webhook", status: "active" },
    { label: "API Server", status: "active" },
    { label: "Governance Engine", status: "active" },
    { label: "Swarm Runtime", status: "active" },
    { label: "Observability", status: "active" },
  ];

  const dotColor = (s: StatusDot["status"]) =>
    s === "active"
      ? colors.success
      : s === "idle"
        ? colors.warning
        : colors.destructive;

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        {
          paddingTop: topPad + 12,
          paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 90,
        },
      ]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>System</Text>

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: colors.destructive + "20", borderColor: colors.destructive + "40" }]}>
          <Feather name="alert-circle" size={14} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        </View>
      ) : null}

      {/* Overall Health Banner */}
      <View
        style={[
          styles.healthBanner,
          {
            backgroundColor: health?.supabaseOk ? colors.success + "15" : colors.destructive + "15",
            borderColor: health?.supabaseOk ? colors.success + "40" : colors.destructive + "40",
          },
        ]}
      >
        <View
          style={[
            styles.healthDot,
            { backgroundColor: health?.supabaseOk ? colors.success : colors.destructive },
          ]}
        />
        <Text
          style={[
            styles.healthText,
            { color: health?.supabaseOk ? colors.success : colors.destructive },
          ]}
        >
          {health?.supabaseOk ? "All Systems Operational" : "Degraded — Check Config"}
        </Text>
      </View>

      {/* Metrics */}
      <View style={styles.grid}>
        <MetricCard label="Actors" value={String(health?.totalActors ?? 0)} accent="primary" />
        <MetricCard label="API Keys" value={String(health?.activeKeys ?? 0)} sub="active" accent="success" />
      </View>
      <MetricCard
        label="Datasets"
        value={String(health?.totalDatasets ?? 0)}
        sub="registered data sources"
        accent="primary"
      />

      {/* System Status */}
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        Service Status
      </Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {systemDots.map((s, i) => (
          <View
            key={s.label}
            style={[
              styles.statusRow,
              {
                borderBottomColor: colors.border,
                borderBottomWidth: i < systemDots.length - 1 ? StyleSheet.hairlineWidth : 0,
              },
            ]}
          >
            <View style={styles.statusLeft}>
              <View style={[styles.statusDot, { backgroundColor: dotColor(s.status) }]} />
              <Text style={[styles.statusLabel, { color: colors.foreground }]}>{s.label}</Text>
            </View>
            <Text
              style={[
                styles.statusValue,
                { color: dotColor(s.status) },
              ]}
            >
              {s.status === "active" ? "Online" : s.status === "idle" ? "Idle" : "Error"}
            </Text>
          </View>
        ))}
      </View>

      {/* Config Check */}
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        Configuration
      </Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {[
          { label: "EXPO_PUBLIC_SUPABASE_URL", ok: Boolean(process.env.EXPO_PUBLIC_SUPABASE_URL) },
          { label: "EXPO_PUBLIC_SUPABASE_ANON_KEY", ok: Boolean(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY) },
        ].map((cfg, i) => (
          <View
            key={cfg.label}
            style={[
              styles.cfgRow,
              { borderBottomColor: colors.border, borderBottomWidth: i === 0 ? StyleSheet.hairlineWidth : 0 },
            ]}
          >
            <Text style={[styles.cfgKey, { color: colors.mutedForeground }]} numberOfLines={1}>
              {cfg.label}
            </Text>
            <View
              style={[
                styles.cfgBadge,
                { backgroundColor: cfg.ok ? colors.success + "20" : colors.destructive + "20" },
              ]}
            >
              <Text style={[styles.cfgBadgeText, { color: cfg.ok ? colors.success : colors.destructive }]}>
                {cfg.ok ? "SET" : "MISSING"}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { paddingHorizontal: 16, gap: 12 },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.8, marginBottom: 4 },
  errorBox: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  errorText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  healthBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  healthDot: { width: 8, height: 8, borderRadius: 4 },
  healthText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  grid: { flexDirection: "row", gap: 10 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  card: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  statusLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  statusValue: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  cfgRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cfgKey: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", marginRight: 8 },
  cfgBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  cfgBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
});
