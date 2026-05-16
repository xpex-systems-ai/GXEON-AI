import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { TransactionRow } from "@/components/TransactionRow";
import { getSupabase, isConfigured } from "@/lib/supabase";

type Transaction = {
  id: string;
  transaction_id?: string;
  actor_code?: string;
  base_amount: number;
  status: string;
  created_at: string;
  gateway_provider?: string;
};

const STATUSES = ["ALL", "PAID", "PENDING", "FAILED"] as const;

export default function TransactionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PAID" | "PENDING" | "FAILED">("ALL");

  const fetchData = useCallback(async (status = statusFilter) => {
    if (!isConfigured()) {
      setError("Supabase not configured.");
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const db = getSupabase();
      // @ts-ignore
      let query = db
        .from("global_transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (status !== "ALL") {
        // @ts-ignore
        query = query.eq("status", status);
      }
      const { data, error: err } = await query;
      if (err) throw err;
      setTransactions(data ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    fetchData();
  }, [fetchData]);

  const selectStatus = (s: typeof statusFilter) => {
    setStatusFilter(s);
    setLoading(true);
    fetchData(s);
  };

  const statusColor = (s: string) =>
    s === "PAID"
      ? colors.success
      : s === "PENDING"
        ? colors.warning
        : s === "FAILED"
          ? colors.destructive
          : colors.primary;

  const counts = {
    ALL: transactions.length,
    PAID: transactions.filter((t) => t.status === "PAID").length,
    PENDING: transactions.filter((t) => t.status === "PENDING").length,
    FAILED: transactions.filter((t) => t.status === "FAILED").length,
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            paddingTop: topPad + 12,
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.title, { color: colors.foreground }]}>Transactions</Text>
      </View>

      {/* Filter Chips */}
      <View style={[styles.filterRow, { borderBottomColor: colors.border }]}>
        {STATUSES.map((s) => {
          const active = statusFilter === s;
          return (
            <TouchableOpacity
              key={s}
              onPress={() => selectStatus(s)}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.primary + "20" : colors.secondary,
                  borderColor: active ? colors.primary : "transparent",
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: active ? colors.primary : colors.mutedForeground },
                ]}
              >
                {s === "ALL" ? `All ${counts.ALL}` : `${s} ${counts[s]}`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: colors.destructive + "20" }]}>
          <Feather name="alert-circle" size={14} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TransactionRow tx={item} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
            />
          }
          contentContainerStyle={{
            paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 90,
            flexGrow: 1,
          }}
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Feather name="credit-card" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                No transactions
              </Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                {statusFilter !== "ALL" ? `No ${statusFilter} transactions found` : "No transactions yet"}
              </Text>
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.8 },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  errorBox: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    margin: 16,
    borderRadius: 8,
  },
  errorText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingTop: 80 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
