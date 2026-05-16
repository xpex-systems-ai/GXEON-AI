import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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
import { TransactionRow } from "@/components/TransactionRow";
import { getSupabase, isConfigured } from "@/lib/supabase";
import { formatCurrency } from "@/lib/format";

type Transaction = {
  id: string;
  transaction_id?: string;
  actor_code?: string;
  base_amount: number;
  status: string;
  created_at: string;
};

type Metrics = {
  totalRevenue: number;
  revenueToday: number;
  totalTransactions: number;
  totalActors: number;
  activeApiKeys: number;
  conversionRate: number;
  pendingTransactions: number;
};

export default function OverviewScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [latestTx, setLatestTx] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!isConfigured()) {
      setError("Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in Replit Secrets.");
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const today = new Date().toISOString().split("T")[0];
      const db = getSupabase();
      const [paid, todayPaid, allCount, latest, actors, keys, pending] =
        await Promise.all([
          db.from("global_transactions").select("base_amount").eq("status", "PAID"),
          db.from("global_transactions").select("base_amount").eq("status", "PAID").gte("paid_at", today),
          db.from("global_transactions").select("*", { count: "exact", head: true }),
          db.from("global_transactions").select("*").order("created_at", { ascending: false }).limit(8),
          db.from("actors").select("*", { count: "exact", head: true }),
          db.from("api_keys").select("*", { count: "exact", head: true }).eq("status", "active"),
          db.from("global_transactions").select("*", { count: "exact", head: true }).eq("status", "PENDING"),
        ]);

      const totalRevenue = paid.data?.reduce((s, t) => s + (t.base_amount ?? 0), 0) ?? 0;
      const revenueToday = todayPaid.data?.reduce((s, t) => s + (t.base_amount ?? 0), 0) ?? 0;
      const total = allCount.count ?? 0;
      const paidCount = paid.data?.length ?? 0;

      setMetrics({
        totalRevenue,
        revenueToday,
        totalTransactions: total,
        totalActors: actors.count ?? 0,
        activeApiKeys: keys.count ?? 0,
        conversionRate: total > 0 ? (paidCount / total) * 100 : 0,
        pendingTransactions: pending.count ?? 0,
      });
      setLatestTx(latest.data ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
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
      .channel("overview-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "global_transactions" }, () => {
        fetchData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "actors" }, () => {
        fetchData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "api_keys" }, () => {
        fetchData();
      })
      .subscribe();
    return () => { db.removeChannel(channel); };
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // @ts-ignore
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fetchData();
  }, [fetchData]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background, paddingTop: topPad }]}>
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
          paddingTop: topPad + 8,
          paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 90,
        },
      ]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.foreground }]}>GXEON</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Command Center
          </Text>
        </View>
        <TouchableOpacity
          onPress={onRefresh}
          style={[styles.refreshBtn, { backgroundColor: colors.secondary }]}
          testID="refresh-btn"
        >
          <Feather name="refresh-cw" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: colors.destructive + "20", borderColor: colors.destructive + "40" }]}>
          <Feather name="alert-circle" size={14} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        </View>
      ) : null}

      {metrics ? (
        <>
          {/* Revenue Hero */}
          <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.heroLabel, { color: colors.mutedForeground }]}>TOTAL REVENUE</Text>
            <Text style={[styles.heroValue, { color: colors.foreground }]}>
              {formatCurrency(metrics.totalRevenue)}
            </Text>
            <Text style={[styles.heroSub, { color: colors.primary }]}>
              +{formatCurrency(metrics.revenueToday)} today
            </Text>
          </View>

          {/* Metric Grid */}
          <View style={styles.grid}>
            <MetricCard
              label="Transactions"
              value={String(metrics.totalTransactions)}
              sub={`${metrics.pendingTransactions} pending`}
              accent="primary"
            />
            <MetricCard
              label="Conversion"
              value={`${metrics.conversionRate.toFixed(1)}%`}
              accent="success"
            />
          </View>
          <View style={styles.grid}>
            <MetricCard
              label="API Keys"
              value={String(metrics.activeApiKeys)}
              sub="active"
              accent="primary"
            />
            <MetricCard
              label="Actors"
              value={String(metrics.totalActors)}
              accent="primary"
            />
          </View>

          {/* Latest Transactions */}
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
            Recent Activity
          </Text>
          <View style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {latestTx.length === 0 ? (
              <View style={styles.empty}>
                <Feather name="inbox" size={32} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  No transactions yet
                </Text>
              </View>
            ) : (
              latestTx.map((tx) => <TransactionRow key={tx.id} tx={tx} />)
            )}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  container: { paddingHorizontal: 16, gap: 12 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", letterSpacing: -1 },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  errorText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  heroCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  heroLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.2,
  },
  heroValue: {
    fontSize: 38,
    fontFamily: "Inter_700Bold",
    letterSpacing: -1.5,
  },
  heroSub: { fontSize: 14, fontFamily: "Inter_500Medium" },
  grid: { flexDirection: "row", gap: 10 },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    marginTop: 4,
  },
  listCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  empty: { padding: 32, alignItems: "center", gap: 8 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
