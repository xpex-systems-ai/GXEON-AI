import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { MetricCard } from "@/components/MetricCard";
import { getSupabase, isConfigured } from "@/lib/supabase";
import { formatDate } from "@/lib/format";

type ApiKey = {
  id: string;
  key_prefix?: string;
  status: string;
  usage_count?: number;
  created_at?: string;
};

type Dataset = {
  id: string;
  name: string;
  price?: number;
  downloads?: number;
  status?: string;
};

type HealthData = {
  totalActors: number;
  activeKeys: number;
  revokedKeys: number;
  totalDatasets: number;
  supabaseOk: boolean;
  apiKeys: ApiKey[];
  datasets: Dataset[];
};

export default function SystemScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!isConfigured()) {
      setHealth({ totalActors: 0, activeKeys: 0, revokedKeys: 0, totalDatasets: 0, supabaseOk: false, apiKeys: [], datasets: [] });
      setError("Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in Replit Secrets.");
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const db = getSupabase();
      const [actors, allKeys, datasets] = await Promise.all([
        db.from("actors").select("*", { count: "exact", head: true }),
        db.from("api_keys").select("id, key_prefix, status, usage_count, created_at").order("created_at", { ascending: false }).limit(50),
        db.from("marketplace_datasets").select("id, name, price, downloads, status").order("downloads", { ascending: false }).limit(20),
      ]);

      const keyData = allKeys.data ?? [];
      const activeKeys = keyData.filter((k) => k.status === "active").length;
      const revokedKeys = keyData.filter((k) => k.status === "revoked").length;

      setHealth({
        totalActors: actors.count ?? 0,
        activeKeys,
        revokedKeys,
        totalDatasets: datasets.data?.length ?? 0,
        supabaseOk: !actors.error,
        apiKeys: keyData,
        datasets: datasets.data ?? [],
      });
      setError(null);
    } catch (e) {
      setHealth({ totalActors: 0, activeKeys: 0, revokedKeys: 0, totalDatasets: 0, supabaseOk: false, apiKeys: [], datasets: [] });
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    if (!isConfigured()) return;
    const db = getSupabase();
    const channel = db
      .channel("system-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "api_keys" }, () => {
        fetchData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "actors" }, () => {
        fetchData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "marketplace_datasets" }, () => {
        fetchData();
      })
      .subscribe();
    return () => { db.removeChannel(channel); };
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fetchData();
  }, [fetchData]);

  const systemServices = [
    { label: "Database", status: health?.supabaseOk ? "active" : "error" },
    { label: "PIX Webhook", status: "active" },
    { label: "API Server", status: "active" },
    { label: "Governance Engine", status: "active" },
    { label: "Swarm Runtime", status: "active" },
    { label: "Observability", status: "active" },
  ] as const;

  const dotColor = (s: "active" | "idle" | "error") =>
    s === "active" ? colors.success : s === "idle" ? colors.warning : colors.destructive;

  const keyStatusColor = (s: string) =>
    s === "active" ? colors.success : colors.destructive;

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

      {/* Quick Links — sub-screens */}
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>More Screens</Text>
      <View style={styles.quickGrid}>
        {[
          { label: "Live Runtime", icon: "radio", route: "/live-runtime" },
          { label: "Conversion Center", icon: "zap", route: "/conversion" },
          { label: "Actors", icon: "users", route: "/actors" },
          { label: "Revenue Streams", icon: "trending-up", route: "/revenue-streams" },
          { label: "System Logs", icon: "terminal", route: "/system-logs" },
          { label: "Governance", icon: "git-merge", route: "/governance-status" },
          { label: "Settings", icon: "settings", route: "/settings" },
          { label: "Diagnostics", icon: "activity", route: "/diagnostics" },
        ].map((item) => (
          <TouchableOpacity
            key={item.route}
            style={[styles.quickTile, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(item.route as any);
            }}
            activeOpacity={0.7}
          >
            <View style={[styles.quickIcon, { backgroundColor: colors.primary + "20" }]}>
              <Feather name={item.icon as any} size={18} color={colors.primary} />
            </View>
            <Text style={[styles.quickLabel, { color: colors.foreground }]}>{item.label}</Text>
            <Feather name="chevron-right" size={14} color={colors.mutedForeground} />
          </TouchableOpacity>
        ))}
      </View>

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: colors.destructive + "20", borderColor: colors.destructive + "40" }]}>
          <Feather name="alert-circle" size={14} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        </View>
      ) : null}

      {/* Health Banner */}
      <View
        style={[
          styles.healthBanner,
          {
            backgroundColor: health?.supabaseOk ? colors.success + "15" : colors.destructive + "15",
            borderColor: health?.supabaseOk ? colors.success + "40" : colors.destructive + "40",
          },
        ]}
      >
        <View style={[styles.healthDot, { backgroundColor: health?.supabaseOk ? colors.success : colors.destructive }]} />
        <Text style={[styles.healthText, { color: health?.supabaseOk ? colors.success : colors.destructive }]}>
          {health?.supabaseOk ? "All Systems Operational" : "Degraded — Check Config"}
        </Text>
      </View>

      {/* KPI row */}
      <View style={styles.grid}>
        <MetricCard label="Actors" value={String(health?.totalActors ?? 0)} accent="primary" />
        <MetricCard label="API Keys" value={String(health?.activeKeys ?? 0)} sub="active" accent="success" />
      </View>
      <View style={styles.grid}>
        <MetricCard label="Datasets" value={String(health?.totalDatasets ?? 0)} accent="primary" />
        <MetricCard label="Revoked Keys" value={String(health?.revokedKeys ?? 0)} accent="destructive" />
      </View>

      {/* API Keys */}
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>API Keys</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {health?.apiKeys.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="key" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No API keys</Text>
          </View>
        ) : (
          health?.apiKeys.map((k, i) => (
            <View
              key={k.id}
              style={[
                styles.keyRow,
                {
                  borderBottomColor: colors.border,
                  borderBottomWidth: i < (health.apiKeys.length - 1) ? StyleSheet.hairlineWidth : 0,
                },
              ]}
            >
              <View style={styles.keyLeft}>
                <View style={[styles.keyPrefixBadge, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.keyPrefix, { color: colors.foreground }]}>
                    {k.key_prefix ?? k.id.substring(0, 8)}…
                  </Text>
                </View>
                <Text style={[styles.keyMeta, { color: colors.mutedForeground }]}>
                  {k.usage_count ?? 0} calls
                  {k.created_at ? `  ·  ${formatDate(k.created_at)}` : ""}
                </Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: keyStatusColor(k.status) + "20" }]}>
                <Text style={[styles.statusText, { color: keyStatusColor(k.status) }]}>
                  {k.status}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>

      {/* Datasets */}
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Datasets</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {health?.datasets.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="database" size={28} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No datasets</Text>
          </View>
        ) : (
          health?.datasets.map((d, i) => (
            <View
              key={d.id}
              style={[
                styles.datasetRow,
                {
                  borderBottomColor: colors.border,
                  borderBottomWidth: i < (health.datasets.length - 1) ? StyleSheet.hairlineWidth : 0,
                },
              ]}
            >
              <View style={styles.datasetLeft}>
                <Text style={[styles.datasetName, { color: colors.foreground }]} numberOfLines={1}>
                  {d.name}
                </Text>
                <Text style={[styles.datasetMeta, { color: colors.mutedForeground }]}>
                  {d.downloads ?? 0} downloads
                </Text>
              </View>
              <View style={styles.datasetRight}>
                {d.price != null ? (
                  <Text style={[styles.datasetPrice, { color: colors.primary }]}>
                    R$ {Number(d.price).toFixed(2)}
                  </Text>
                ) : null}
                {d.status ? (
                  <View style={[styles.statusBadge, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.statusText, { color: colors.mutedForeground }]}>{d.status}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          ))
        )}
      </View>

      {/* Service Status */}
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Service Status</Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {systemServices.map((s, i) => (
          <View
            key={s.label}
            style={[
              styles.statusRow,
              {
                borderBottomColor: colors.border,
                borderBottomWidth: i < systemServices.length - 1 ? StyleSheet.hairlineWidth : 0,
              },
            ]}
          >
            <View style={styles.statusLeft}>
              <View style={[styles.statusDot, { backgroundColor: dotColor(s.status) }]} />
              <Text style={[styles.statusLabel, { color: colors.foreground }]}>{s.label}</Text>
            </View>
            <Text style={[styles.statusValue, { color: dotColor(s.status) }]}>
              {s.status === "active" ? "Online" : s.status === "idle" ? "Idle" : "Error"}
            </Text>
          </View>
        ))}
      </View>

      {/* Config */}
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Configuration</Text>
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
            <View style={[styles.cfgBadge, { backgroundColor: cfg.ok ? colors.success + "20" : colors.destructive + "20" }]}>
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
  errorBox: { flexDirection: "row", gap: 8, padding: 12, borderRadius: 8, borderWidth: 1 },
  errorText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  healthBanner: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 10, borderWidth: 1 },
  healthDot: { width: 8, height: 8, borderRadius: 4 },
  healthText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  grid: { flexDirection: "row", gap: 10 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  card: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  keyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  keyLeft: { flex: 1, gap: 4 },
  keyPrefixBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 },
  keyPrefix: { fontSize: 12, fontFamily: "Inter_600SemiBold", fontVariant: ["tabular-nums"] },
  keyMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  datasetRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  datasetLeft: { flex: 1, gap: 3, marginRight: 8 },
  datasetRight: { alignItems: "flex-end", gap: 4 },
  datasetName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  datasetMeta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  datasetPrice: { fontSize: 13, fontFamily: "Inter_700Bold" },
  statusBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 },
  statusText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  statusRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13 },
  statusLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  statusValue: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  cfgRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  cfgKey: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", marginRight: 8 },
  cfgBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  cfgBadgeText: { fontSize: 11, fontFamily: "Inter_700Bold" },
  empty: { padding: 24, alignItems: "center", gap: 6 },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  quickGrid: { gap: 8 },
  quickTile: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 12, borderWidth: 1 },
  quickIcon: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  quickLabel: { flex: 1, fontSize: 14, fontFamily: "Inter_500Medium" },
});
