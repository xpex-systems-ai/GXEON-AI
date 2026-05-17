import { Feather } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
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
import { getApiBase } from "@/lib/supabase";

type StreamMetrics = {
  mrr: number;
  revenuePerEndpoint: { endpoint: string; revenue: number }[];
  topPayingActors: { actor_code: string; revenue: number }[];
};

function formatBRL(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n ?? 0);
}

const STREAMS = [
  { name: "API Usage", icon: "globe", color: "#4d8ef0", description: "Per-request billing", mrr: 10000 },
  { name: "Apify Actors", icon: "cpu", color: "#a855f7", description: "Data marketplace", mrr: 15000 },
  { name: "Zapier Automation", icon: "zap", color: "#eab308", description: "Webhook automation", mrr: 8000 },
  { name: "Signal Subscriptions", icon: "activity", color: "#22c55e", description: "Trading bot signals", mrr: 5000 },
  { name: "Dataset Sales", icon: "credit-card", color: "#ec4899", description: "High-ticket datasets", mrr: 20000 },
  { name: "Auto Sales Engine", icon: "trending-up", color: "#f97316", description: "Zero-touch API sales", mrr: 12000 },
];

async function fetchStreamMetrics(): Promise<StreamMetrics | null> {
  try {
    const base = getApiBase();
    const res = await fetch(`${base}/api/v1/observability/metrics`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.metrics : null;
  } catch {
    return null;
  }
}

export default function RevenueStreamsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const { data: metrics, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["revenue-streams"],
    queryFn: fetchStreamMetrics,
    staleTime: 30_000,
  });

  const totalMRR = STREAMS.reduce((s, st) => s + st.mrr, 0);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ padding: 16, paddingBottom: Platform.OS === "web" ? 100 : insets.bottom + 32 }}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
    >
      <View style={styles.metrics}>
        <MetricCard label="MRR" value={formatBRL(totalMRR)} accentColor={colors.success} />
        {metrics?.mrr ? (
          <MetricCard label="Live MRR" value={formatBRL(metrics.mrr)} accentColor={colors.primary} />
        ) : null}
      </View>

      <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Revenue Streams</Text>

      {STREAMS.map((stream) => (
        <View key={stream.name} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.cardLeft}>
            <View style={[styles.iconWrap, { backgroundColor: `${stream.color}22` }]}>
              <Feather name={stream.icon as any} size={18} color={stream.color} />
            </View>
            <View>
              <Text style={[styles.streamName, { color: colors.foreground }]}>{stream.name}</Text>
              <Text style={[styles.streamDesc, { color: colors.mutedForeground }]}>{stream.description}</Text>
            </View>
          </View>
          <View style={styles.cardRight}>
            <Text style={[styles.mrr, { color: colors.success }]}>{formatBRL(stream.mrr)}</Text>
            <View style={[styles.activeBadge, { backgroundColor: `${colors.success}22` }]}>
              <Text style={[styles.activeText, { color: colors.success }]}>ACTIVE</Text>
            </View>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  metrics: { flexDirection: "row", gap: 10, marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginBottom: 12 },
  card: { borderRadius: 12, borderWidth: 1, padding: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  cardLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  streamName: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  streamDesc: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  cardRight: { alignItems: "flex-end", gap: 6 },
  mrr: { fontSize: 15, fontFamily: "Inter_700Bold" },
  activeBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  activeText: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.5 },
});
