import React, { useCallback, useEffect, useState } from "react";
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
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { MetricCard } from "@/components/MetricCard";
import { getSupabase, isConfigured } from "@/lib/supabase";
import { formatCurrency } from "@/lib/format";

type ActorWallet = {
  id: string;
  actor_id: string;
  actor_code?: string;
  total_earned: number;
  balance: number;
  updated_at?: string;
};

export default function CommissionsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [wallets, setWallets] = useState<ActorWallet[]>([]);
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
      const { data, error: err } = await getSupabase()
        .from("actor_wallets")
        .select("*")
        .order("total_earned", { ascending: false })
        .limit(100);
      if (err) throw err;
      setWallets(data ?? []);
      setError(null);
    } catch (e) {
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

  const totalEarned = wallets.reduce((s, w) => s + (w.total_earned ?? 0), 0);
  const totalBalance = wallets.reduce((s, w) => s + (w.balance ?? 0), 0);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const renderItem = ({ item, index }: { item: ActorWallet; index: number }) => {
    const pct = totalEarned > 0 ? ((item.total_earned ?? 0) / totalEarned) * 100 : 0;
    const isTop = index < 3;
    const medalColor = index === 0 ? "#fbbf24" : index === 1 ? "#94a3b8" : "#b45309";

    return (
      <View
        style={[
          styles.walletRow,
          {
            borderBottomColor: colors.border,
            backgroundColor: colors.card,
          },
        ]}
      >
        <View style={styles.rank}>
          {isTop ? (
            <Feather name="award" size={16} color={medalColor} />
          ) : (
            <Text style={[styles.rankNum, { color: colors.mutedForeground }]}>
              {index + 1}
            </Text>
          )}
        </View>
        <View style={styles.walletInfo}>
          <View style={[styles.actorBadge, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.actorCode, { color: colors.foreground }]}>
              {item.actor_code ?? item.actor_id?.substring(0, 8) ?? "—"}
            </Text>
          </View>
          <View style={[styles.barTrack, { backgroundColor: colors.secondary }]}>
            <View
              style={[
                styles.barFill,
                {
                  backgroundColor: isTop ? colors.primary : colors.mutedForeground,
                  width: `${Math.min(pct, 100)}%` as any,
                },
              ]}
            />
          </View>
        </View>
        <View style={styles.walletAmounts}>
          <Text style={[styles.earnedAmount, { color: colors.foreground }]}>
            {formatCurrency(item.total_earned ?? 0)}
          </Text>
          <Text style={[styles.balanceAmount, { color: colors.mutedForeground }]}>
            bal {formatCurrency(item.balance ?? 0)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
        <Text style={[styles.title, { color: colors.foreground }]}>Commissions</Text>
      </View>

      {error ? (
        <View style={[styles.errorBox, { backgroundColor: colors.destructive + "20", borderColor: colors.destructive + "40" }]}>
          <Feather name="alert-circle" size={14} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={wallets}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          ListHeaderComponent={() => (
            <View style={styles.kpiRow}>
              <MetricCard
                label="Total Earned"
                value={formatCurrency(totalEarned)}
                accent="success"
              />
              <MetricCard
                label="Total Balance"
                value={formatCurrency(totalBalance)}
                sub={`${wallets.length} actors`}
                accent="primary"
              />
            </View>
          )}
          contentContainerStyle={{
            paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 90,
            flexGrow: 1,
          }}
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Feather name="award" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                No wallets found
              </Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                Actor wallet data will appear here
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
  errorBox: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  errorText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  kpiRow: { flexDirection: "row", gap: 10, padding: 16 },
  walletRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rank: { width: 24, alignItems: "center" },
  rankNum: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  walletInfo: { flex: 1, gap: 6 },
  actorBadge: { alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 },
  actorCode: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  barTrack: { height: 4, borderRadius: 2, overflow: "hidden" },
  barFill: { height: 4, borderRadius: 2, minWidth: 2 },
  walletAmounts: { alignItems: "flex-end", gap: 2 },
  earnedAmount: { fontSize: 14, fontFamily: "Inter_700Bold", fontVariant: ["tabular-nums"] },
  balanceAmount: { fontSize: 11, fontFamily: "Inter_400Regular", fontVariant: ["tabular-nums"] },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingTop: 80 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
