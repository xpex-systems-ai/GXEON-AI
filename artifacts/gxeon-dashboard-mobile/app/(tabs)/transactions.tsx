import React, { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

type Transaction = {
  id: string;
  transaction_id: string;
  actor_code: string;
  base_amount: number;
  status: string;
  gateway_provider: string;
  created_at: string;
  paid_at?: string;
};

const STATUSES = ["all", "PAID", "PENDING", "FAILED"];

function formatBRL(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n ?? 0);
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

async function fetchTransactions(statusFilter: string): Promise<Transaction[]> {
  if (!supabase) return [];
  // @ts-ignore
  let query = supabase.from("global_transactions").select("*").order("created_at", { ascending: false }).limit(100);
  if (statusFilter !== "all") query = query.eq("status", statusFilter);
  const { data } = await query;
  return (data ?? []) as Transaction[];
}

export default function TransactionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: transactions = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["transactions", statusFilter],
    queryFn: () => fetchTransactions(statusFilter),
    staleTime: 30_000,
  });

  const renderItem = ({ item }: { item: Transaction }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardTop}>
        <Text style={[styles.txId, { color: colors.foreground }]} numberOfLines={1}>
          {item.transaction_id ?? item.id}
        </Text>
        <Text style={[styles.amount, { color: colors.primary }]}>{formatBRL(item.base_amount)}</Text>
      </View>
      <View style={styles.cardBottom}>
        <View style={styles.metaRow}>
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>{item.actor_code}</Text>
          {item.gateway_provider ? (
            <Text style={[styles.meta, { color: colors.mutedForeground }]}>{item.gateway_provider}</Text>
          ) : null}
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>{fmtDate(item.created_at)}</Text>
        </View>
        <StatusBadge status={item.status} />
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPad + 16, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Transactions</Text>
        <Text style={[styles.count, { color: colors.mutedForeground }]}>{transactions.length} results</Text>
        <View style={styles.filterRow}>
          {STATUSES.map((s) => (
            <Pressable
              key={s}
              onPress={() => setStatusFilter(s)}
              style={[
                styles.filterBtn,
                {
                  backgroundColor: statusFilter === s ? colors.primary : colors.muted,
                  borderColor: statusFilter === s ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: statusFilter === s ? colors.primaryForeground : colors.mutedForeground },
                ]}
              >
                {s === "all" ? "All" : s}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      {!isSupabaseConfigured && (
        <View style={[styles.banner, { backgroundColor: `${colors.warning}22` }]}>
          <Text style={[styles.bannerText, { color: colors.warning }]}>Supabase not configured</Text>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: Platform.OS === "web" ? 100 : 100 },
          ]}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No transactions found</Text>
            </View>
          }
          scrollEnabled={transactions.length > 0}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 4 },
  count: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 12 },
  filterRow: { flexDirection: "row", gap: 8 },
  filterBtn: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  filterText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  banner: { margin: 16, borderRadius: 10, padding: 12 },
  bannerText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  list: { padding: 16, gap: 10 },
  card: { borderRadius: 12, borderWidth: 1, padding: 14 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  txId: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1, marginRight: 8 },
  amount: { fontSize: 16, fontFamily: "Inter_700Bold" },
  cardBottom: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  metaRow: { flexDirection: "row", gap: 8, flex: 1 },
  meta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
});
