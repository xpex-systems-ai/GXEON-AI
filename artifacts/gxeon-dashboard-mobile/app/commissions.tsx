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
import { MetricCard } from "@/components/MetricCard";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

type ActorWallet = {
  id: string;
  actor_code: string;
  balance: number;
  total_earned: number;
  commission_rate: number;
  updated_at: string;
};

function formatBRL(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n ?? 0);
}

async function fetchWallets(): Promise<ActorWallet[]> {
  if (!supabase) return [];
  const { data } = await supabase.from("actor_wallets").select("*").order("total_earned", { ascending: false });
  return (data ?? []) as ActorWallet[];
}

export default function CommissionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const { data: wallets = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["commissions"],
    queryFn: fetchWallets,
    staleTime: 60_000,
  });

  const totalBalance = wallets.reduce((s, w) => s + (w.balance ?? 0), 0);
  const totalEarned = wallets.reduce((s, w) => s + (w.total_earned ?? 0), 0);

  const renderItem = ({ item }: { item: ActorWallet }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.actorCode, { color: colors.foreground }]}>{item.actor_code}</Text>
        <Text style={[styles.rate, { color: colors.primary }]}>
          {((item.commission_rate ?? 0) * 100).toFixed(1)}% rate
        </Text>
      </View>
      <View style={styles.cardRow}>
        <View>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Balance</Text>
          <Text style={[styles.amount, { color: colors.success }]}>{formatBRL(item.balance)}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>Total Earned</Text>
          <Text style={[styles.amount, { color: colors.foreground }]}>{formatBRL(item.total_earned)}</Text>
        </View>
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
          data={wallets}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={
            <View style={styles.metrics}>
              <MetricCard label="Total Balance" value={formatBRL(totalBalance)} accentColor={colors.success} />
              <MetricCard label="Total Earned" value={formatBRL(totalEarned)} />
            </View>
          }
          contentContainerStyle={{ padding: 16, paddingBottom: Platform.OS === "web" ? 100 : insets.bottom + 32, gap: 10 }}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No commission data found</Text>
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
  cardHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  actorCode: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  rate: { fontSize: 13, fontFamily: "Inter_500Medium" },
  cardRow: { flexDirection: "row", justifyContent: "space-between" },
  label: { fontSize: 11, fontFamily: "Inter_400Regular", marginBottom: 2 },
  amount: { fontSize: 16, fontFamily: "Inter_700Bold" },
  banner: { borderRadius: 10, padding: 12 },
  bannerText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
});
