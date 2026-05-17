import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { MetricCard } from "@/components/MetricCard";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase, isSupabaseConfigured, getApiBase } from "@/lib/supabase";

type Transaction = {
  id: string;
  transaction_id: string;
  actor_code: string;
  base_amount: number;
  status: string;
  created_at: string;
};

type DashboardMetrics = {
  totalRevenue: number;
  totalTransactions: number;
  totalActors: number;
  activeApiKeys: number;
  pendingTransactions: number;
};

type RuntimeSync = {
  runtime?: string;
  github_sync?: string;
  synchronized?: boolean;
};

async function fetchDashboardData(): Promise<{ metrics: DashboardMetrics; transactions: Transaction[]; runtime: RuntimeSync | null }> {
  let metrics: DashboardMetrics = { totalRevenue: 0, totalTransactions: 0, totalActors: 0, activeApiKeys: 0, pendingTransactions: 0 };
  let transactions: Transaction[] = [];
  let runtime: RuntimeSync | null = null;

  if (supabase) {
    const [txCount, paid, recent, actors, keys, pending] = await Promise.all([
      supabase.from("global_transactions").select("*", { count: "exact", head: true }),
      supabase.from("global_transactions").select("base_amount").eq("status", "PAID"),
      supabase.from("global_transactions").select("*").order("created_at", { ascending: false }).limit(8),
      supabase.from("actors").select("*", { count: "exact", head: true }),
      supabase.from("api_keys").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("global_transactions").select("*", { count: "exact", head: true }).eq("status", "PENDING"),
    ]);
    metrics = {
      totalRevenue: (paid.data ?? []).reduce((s: number, r: { base_amount: number }) => s + (r.base_amount ?? 0), 0),
      totalTransactions: txCount.count ?? 0,
      totalActors: actors.count ?? 0,
      activeApiKeys: keys.count ?? 0,
      pendingTransactions: pending.count ?? 0,
    };
    transactions = (recent.data ?? []) as Transaction[];
  }

  try {
    const base = getApiBase();
    const res = await fetch(`${base}/api/v1/runtime/sync`);
    if (res.ok) runtime = await res.json();
  } catch {}

  return { metrics, transactions, runtime };
}

function formatBRL(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function DashboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : 0;

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboardData,
    staleTime: 30_000,
  });

  const renderTx = useCallback(({ item }: { item: Transaction }) => (
    <View style={[styles.txRow, { borderBottomColor: colors.border }]}>
      <View style={styles.txLeft}>
        <Text style={[styles.txId, { color: colors.foreground }]} numberOfLines={1}>
          {item.transaction_id ?? item.id}
        </Text>
        <Text style={[styles.txMeta, { color: colors.mutedForeground }]}>
          {item.actor_code} · {fmtDate(item.created_at)}
        </Text>
      </View>
      <View style={styles.txRight}>
        <Text style={[styles.txAmount, { color: colors.primary }]}>
          {formatBRL(item.base_amount ?? 0)}
        </Text>
        <StatusBadge status={item.status} />
      </View>
    </View>
  ), [colors]);

  const metrics = data?.metrics;
  const transactions = data?.transactions ?? [];
  const runtime = data?.runtime;

  const notConfigured = !isSupabaseConfigured;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: botPad + 100, paddingHorizontal: 16 }}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
    >
      <View style={styles.header}>
        <Text style={[styles.greeting, { color: colors.mutedForeground }]}>GXEON</Text>
        <Text style={[styles.title, { color: colors.foreground }]}>Overview</Text>
      </View>

      {notConfigured && (
        <View style={[styles.banner, { backgroundColor: `${colors.warning}22`, borderColor: `${colors.warning}44` }]}>
          <Text style={[styles.bannerText, { color: colors.warning }]}>
            Supabase not configured — add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to show live data.
          </Text>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : error ? (
        <Text style={[styles.errorText, { color: colors.destructive }]}>Failed to load data</Text>
      ) : (
        <>
          <View style={styles.metricsRow}>
            <MetricCard
              label="Revenue"
              value={metrics ? formatBRL(metrics.totalRevenue) : "—"}
              accentColor={colors.success}
            />
            <MetricCard label="Transactions" value={String(metrics?.totalTransactions ?? 0)} />
          </View>
          <View style={[styles.metricsRow, { marginTop: 10 }]}>
            <MetricCard label="Actors" value={String(metrics?.totalActors ?? 0)} />
            <MetricCard label="API Keys" value={String(metrics?.activeApiKeys ?? 0)} accentColor={colors.primary} />
          </View>

          {runtime && (
            <View style={[styles.runtimeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Runtime</Text>
              <View style={styles.runtimeRow}>
                <Text style={[styles.runtimeLabel, { color: colors.mutedForeground }]}>Status</Text>
                <StatusBadge status={runtime.runtime ?? "UNKNOWN"} />
              </View>
              <View style={styles.runtimeRow}>
                <Text style={[styles.runtimeLabel, { color: colors.mutedForeground }]}>GitHub Sync</Text>
                <StatusBadge status={runtime.github_sync ?? "UNKNOWN"} />
              </View>
              <View style={styles.runtimeRow}>
                <Text style={[styles.runtimeLabel, { color: colors.mutedForeground }]}>Synchronized</Text>
                <StatusBadge status={runtime.synchronized ? "OK" : "DEGRADED"} />
              </View>
            </View>
          )}

          {transactions.length > 0 && (
            <View style={styles.txSection}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Transactions</Text>
              <View style={[styles.txCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {transactions.map((item) => (
                  <React.Fragment key={item.id}>
                    {renderTx({ item })}
                  </React.Fragment>
                ))}
              </View>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { marginBottom: 20 },
  greeting: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 2, textTransform: "uppercase" },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", marginTop: 2 },
  banner: { borderRadius: 10, borderWidth: 1, padding: 12, marginBottom: 16 },
  bannerText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  metricsRow: { flexDirection: "row", gap: 10 },
  runtimeCard: { borderRadius: 12, borderWidth: 1, padding: 14, marginTop: 16 },
  runtimeRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  runtimeLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  txSection: { marginTop: 20 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginBottom: 10 },
  txCard: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  txRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, borderBottomWidth: 1 },
  txLeft: { flex: 1, marginRight: 8 },
  txId: { fontSize: 13, fontFamily: "Inter_500Medium" },
  txMeta: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  txRight: { alignItems: "flex-end", gap: 4 },
  txAmount: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  errorText: { textAlign: "center", marginTop: 40, fontSize: 14, fontFamily: "Inter_400Regular" },
});
