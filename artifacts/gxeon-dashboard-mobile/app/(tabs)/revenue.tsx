import React from "react";
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
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

type RevenueEvent = {
  id: string;
  event_type: string;
  amount: number;
  actor_code: string;
  created_at: string;
};

type ActorStat = { actor_code: string; total: number; count: number };

function formatBRL(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n ?? 0);
}

async function fetchRevenueData() {
  if (!supabase) return { events: [], actorStats: [], totalRevenue: 0, uniqueActors: 0 };
  const { data } = await supabase.from("revenue_events").select("*").order("created_at", { ascending: false }).limit(100);
  const events = (data ?? []) as RevenueEvent[];
  const totalRevenue = events.reduce((s, e) => s + (e.amount ?? 0), 0);
  const uniqueActors = new Set(events.map((e) => e.actor_code)).size;
  const byActor: Record<string, ActorStat> = {};
  events.forEach((e) => {
    if (!byActor[e.actor_code]) byActor[e.actor_code] = { actor_code: e.actor_code, total: 0, count: 0 };
    byActor[e.actor_code].total += e.amount ?? 0;
    byActor[e.actor_code].count += 1;
  });
  const actorStats = Object.values(byActor).sort((a, b) => b.total - a.total).slice(0, 10);
  return { events, actorStats, totalRevenue, uniqueActors };
}

export default function RevenueScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["revenue"],
    queryFn: fetchRevenueData,
    staleTime: 60_000,
  });

  const actorStats = data?.actorStats ?? [];

  const renderActor = ({ item, index }: { item: ActorStat; index: number }) => (
    <View style={[styles.actorRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.rank, { backgroundColor: colors.muted }]}>
        <Text style={[styles.rankText, { color: colors.mutedForeground }]}>{index + 1}</Text>
      </View>
      <View style={styles.actorInfo}>
        <Text style={[styles.actorCode, { color: colors.foreground }]}>{item.actor_code}</Text>
        <Text style={[styles.actorCount, { color: colors.mutedForeground }]}>{item.count} events</Text>
      </View>
      <Text style={[styles.actorTotal, { color: colors.success }]}>{formatBRL(item.total)}</Text>
    </View>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: Platform.OS === "web" ? 100 : 100, paddingHorizontal: 16 }}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>Revenue</Text>

      {!isSupabaseConfigured && (
        <View style={[styles.banner, { backgroundColor: `${colors.warning}22` }]}>
          <Text style={[styles.bannerText, { color: colors.warning }]}>Supabase not configured</Text>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          <View style={styles.metricsRow}>
            <MetricCard
              label="Total Revenue"
              value={formatBRL(data?.totalRevenue ?? 0)}
              accentColor={colors.success}
            />
          </View>
          <View style={[styles.metricsRow, { marginTop: 10 }]}>
            <MetricCard label="Events" value={String(data?.events?.length ?? 0)} />
            <MetricCard label="Actors" value={String(data?.uniqueActors ?? 0)} accentColor={colors.primary} />
          </View>

          {actorStats.length > 0 && (
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Top Actors</Text>
              {actorStats.map((item, index) => (
                <React.Fragment key={item.actor_code}>
                  {renderActor({ item, index })}
                </React.Fragment>
              ))}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 20 },
  banner: { borderRadius: 10, padding: 12, marginBottom: 16 },
  bannerText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  metricsRow: { flexDirection: "row", gap: 10 },
  section: { borderRadius: 12, borderWidth: 1, marginTop: 20, overflow: "hidden" },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", padding: 14, paddingBottom: 10 },
  actorRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, gap: 12 },
  rank: { width: 28, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  rankText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  actorInfo: { flex: 1 },
  actorCode: { fontSize: 14, fontFamily: "Inter_500Medium" },
  actorCount: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  actorTotal: { fontSize: 15, fontFamily: "Inter_700Bold" },
});
