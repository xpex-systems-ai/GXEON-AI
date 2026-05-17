import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { StatusBadge } from "@/components/StatusBadge";
import { MetricCard } from "@/components/MetricCard";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

type Dataset = {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  status: string;
  created_at: string;
  sales_count: number;
  revenue: number;
};

type Purchase = { dataset_id: string; status: string; amount: number };

function formatBRL(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n ?? 0);
}

async function fetchDatasets(): Promise<Dataset[]> {
  if (!supabase) return [];
  const [dsRes, pRes] = await Promise.all([
    supabase.from("marketplace_datasets").select("*").order("created_at", { ascending: false }),
    supabase.from("dataset_purchases").select("dataset_id, status, amount"),
  ]);
  const purchases = ((pRes.data ?? []) as Purchase[]).filter((p) => p.status === "paid");
  return ((dsRes.data ?? []) as Omit<Dataset, "sales_count" | "revenue">[]).map((ds) => {
    const dsPurchases = purchases.filter((p) => p.dataset_id === ds.id);
    return {
      ...ds,
      sales_count: dsPurchases.length,
      revenue: dsPurchases.reduce((s, p) => s + (p.amount ?? 0), 0),
    };
  });
}

export default function DatasetsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const { data: datasets = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["datasets"],
    queryFn: fetchDatasets,
    staleTime: 60_000,
  });

  const totalRevenue = datasets.reduce((s, d) => s + d.revenue, 0);
  const totalSales = datasets.reduce((s, d) => s + d.sales_count, 0);

  const renderItem = ({ item }: { item: Dataset }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardTop}>
        <View style={styles.nameWrap}>
          <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>{item.name}</Text>
          <Text style={[styles.category, { color: colors.mutedForeground }]}>{item.category}</Text>
        </View>
        <StatusBadge status={item.status} />
      </View>
      <View style={styles.cardBottom}>
        <Text style={[styles.price, { color: colors.primary }]}>{formatBRL(item.price)}</Text>
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>{item.sales_count} sales</Text>
        <Text style={[styles.revenue, { color: colors.success }]}>{formatBRL(item.revenue)}</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {!isSupabaseConfigured && (
        <View style={[styles.banner, { backgroundColor: `${colors.warning}22`, margin: 16 }]}>
          <Text style={[styles.bannerText, { color: colors.warning }]}>Supabase not configured</Text>
        </View>
      )}
      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={datasets}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={
            <View style={styles.metrics}>
              <MetricCard label="Revenue" value={formatBRL(totalRevenue)} accentColor={colors.success} />
              <MetricCard label="Sales" value={String(totalSales)} />
            </View>
          }
          contentContainerStyle={{ padding: 16, paddingBottom: Platform.OS === "web" ? 100 : insets.bottom + 32, gap: 10 }}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No datasets found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  metrics: { flexDirection: "row", gap: 10, marginBottom: 10 },
  card: { borderRadius: 12, borderWidth: 1, padding: 14 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  nameWrap: { flex: 1, marginRight: 8 },
  name: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  category: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  cardBottom: { flexDirection: "row", gap: 12, alignItems: "center" },
  price: { fontSize: 15, fontFamily: "Inter_700Bold" },
  meta: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1 },
  revenue: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  banner: { borderRadius: 10, padding: 12 },
  bannerText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
});
