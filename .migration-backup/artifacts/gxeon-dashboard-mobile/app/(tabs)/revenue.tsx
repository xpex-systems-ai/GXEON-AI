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
import { useColors } from "@/hooks/useColors";
import { MetricCard } from "@/components/MetricCard";
import { getSupabase, isConfigured } from "@/lib/supabase";
import { formatCurrency, formatDateShort } from "@/lib/format";

type RevenueEvent = {
  id: string;
  event_type: string;
  amount: number;
  actor_code: string;
  created_at: string;
};

type ActorStat = { actor_code: string; total: number; count: number };

export default function RevenueScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<RevenueEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!isConfigured()) {
      setError("Supabase not configured.");
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const { data, error: err } = await getSupabase()
        .from("revenue_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (err) throw err;
      setEvents(data ?? []);
      setError(null);
    } catch (e) {
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
      .channel("revenue-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "revenue_events" }, () => {
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

  const totalRevenue = events.reduce((s, e) => s + (e.amount ?? 0), 0);
  const uniqueActors = new Set(events.map((e) => e.actor_code)).size;

  const actorMap: Record<string, ActorStat> = {};
  events.forEach((e) => {
    if (!actorMap[e.actor_code])
      actorMap[e.actor_code] = { actor_code: e.actor_code, total: 0, count: 0 };
    actorMap[e.actor_code].total += e.amount ?? 0;
    actorMap[e.actor_code].count += 1;
  });
  const topActors = Object.values(actorMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

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
      <Text style={[styles.title, { color: colors.foreground }]}>Revenue</Text>

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: colors.destructive + "20", borderColor: colors.destructive + "40" }]}>
          <Feather name="alert-circle" size={14} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        </View>
      ) : null}

      {/* KPIs */}
      <View style={styles.grid}>
        <MetricCard
          label="Total"
          value={formatCurrency(totalRevenue)}
          accent="success"
        />
        <MetricCard
          label="Events"
          value={String(events.length)}
          accent="primary"
        />
      </View>
      <MetricCard
        label="Active Actors"
        value={String(uniqueActors)}
        sub="across all revenue events"
        accent="primary"
      />

      {/* Top Actors */}
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        Top Actors
      </Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {topActors.length === 0 ? (
          <View style={styles.empty}>
            <Feather name="bar-chart-2" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No data</Text>
          </View>
        ) : (
          topActors.map((a, i) => {
            const pct = totalRevenue > 0 ? (a.total / totalRevenue) * 100 : 0;
            return (
              <View
                key={a.actor_code}
                style={[styles.actorRow, { borderBottomColor: colors.border, borderBottomWidth: i < topActors.length - 1 ? StyleSheet.hairlineWidth : 0 }]}
              >
                <View style={styles.actorLeft}>
                  <View style={[styles.actorBadge, { backgroundColor: colors.secondary }]}>
                    <Text style={[styles.actorCode, { color: colors.foreground }]}>{a.actor_code}</Text>
                  </View>
                  <Text style={[styles.actorCount, { color: colors.mutedForeground }]}>
                    {a.count} events
                  </Text>
                </View>
                <View style={styles.actorRight}>
                  <Text style={[styles.actorAmount, { color: colors.foreground }]}>
                    {formatCurrency(a.total)}
                  </Text>
                  <Text style={[styles.actorPct, { color: colors.primary }]}>
                    {pct.toFixed(1)}%
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* Recent Events */}
      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
        Recent Events
      </Text>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {events.length === 0 ? (
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No events</Text>
          </View>
        ) : (
          events.slice(0, 15).map((e, i) => (
            <View
              key={e.id}
              style={[
                styles.eventRow,
                {
                  borderBottomColor: colors.border,
                  borderBottomWidth: i < Math.min(events.length, 15) - 1 ? StyleSheet.hairlineWidth : 0,
                },
              ]}
            >
              <View style={styles.eventLeft}>
                <View style={[styles.typeBadge, { backgroundColor: colors.primary + "20" }]}>
                  <Text style={[styles.typeText, { color: colors.primary }]}>{e.event_type}</Text>
                </View>
                <View style={[styles.actorBadge, { backgroundColor: colors.secondary }]}>
                  <Text style={[styles.actorCode, { color: colors.mutedForeground }]}>{e.actor_code}</Text>
                </View>
                <Text style={[styles.eventDate, { color: colors.mutedForeground }]}>
                  {formatDateShort(e.created_at)}
                </Text>
              </View>
              <Text style={[styles.eventAmount, { color: colors.success }]}>
                +{formatCurrency(e.amount)}
              </Text>
            </View>
          ))
        )}
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
  grid: { flexDirection: "row", gap: 10 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  actorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  actorLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  actorRight: { alignItems: "flex-end", gap: 2 },
  actorBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 },
  actorCode: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  actorCount: { fontSize: 11, fontFamily: "Inter_400Regular" },
  actorAmount: { fontSize: 14, fontFamily: "Inter_600SemiBold", fontVariant: ["tabular-nums"] },
  actorPct: { fontSize: 11, fontFamily: "Inter_500Medium" },
  eventRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  eventLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" },
  typeBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 },
  typeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  eventDate: { fontSize: 11, fontFamily: "Inter_400Regular" },
  eventAmount: { fontSize: 13, fontFamily: "Inter_600SemiBold", fontVariant: ["tabular-nums"] },
  empty: { padding: 32, alignItems: "center", gap: 8 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
