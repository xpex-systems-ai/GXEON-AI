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
import { StatusBadge } from "@/components/StatusBadge";
import { getApiBase } from "@/lib/supabase";

type Telemetry = {
  totalLeads: number;
  convertedLeads: number;
  hotLeads: number;
  conversionRate: number;
  totalPipelineRevenue: number;
  avgOrderValue: number;
};

type Lead = { id: string; source: string; score: number; intent: string; status: string; value: number };

type ConversionData = {
  telemetry: Telemetry | null;
  leads: Lead[];
};

function formatBRL(n: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n ?? 0);
}

async function fetchConversionData(): Promise<ConversionData> {
  const base = getApiBase();
  async function g<T>(path: string): Promise<T | null> {
    try {
      const res = await fetch(`${base}${path}`);
      if (!res.ok) return null;
      return res.json();
    } catch { return null; }
  }

  const [telemetry, leadsRes] = await Promise.all([
    g<{ telemetry: Telemetry }>("/api/v1/conversion/telemetry"),
    g<{ leads: Lead[] }>("/api/v1/conversion/leads"),
  ]);

  return {
    telemetry: telemetry?.telemetry ?? null,
    leads: leadsRes?.leads?.slice(0, 10) ?? [],
  };
}

export default function ConversionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["conversion"],
    queryFn: fetchConversionData,
    staleTime: 30_000,
  });

  const t = data?.telemetry;
  const leads = data?.leads ?? [];
  const apiBase = getApiBase();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ padding: 16, paddingBottom: Platform.OS === "web" ? 100 : insets.bottom + 32 }}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
    >
      {!apiBase && (
        <View style={[styles.banner, { backgroundColor: `${colors.warning}22` }]}>
          <Text style={[styles.bannerText, { color: colors.warning }]}>EXPO_PUBLIC_DOMAIN not configured</Text>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          <View style={styles.metricsGrid}>
            <MetricCard
              label="Total Leads"
              value={String(t?.totalLeads ?? 0)}
              accentColor={colors.primary}
            />
            <MetricCard
              label="Converted"
              value={String(t?.convertedLeads ?? 0)}
              accentColor={colors.success}
            />
          </View>
          <View style={[styles.metricsGrid, { marginTop: 10 }]}>
            <MetricCard
              label="Hot Leads"
              value={String(t?.hotLeads ?? 0)}
              accentColor={colors.warning}
            />
            <MetricCard
              label="Conv. Rate"
              value={t ? `${(t.conversionRate * 100).toFixed(1)}%` : "—"}
              accentColor={colors.primary}
            />
          </View>

          {t?.totalPipelineRevenue != null && (
            <View style={[styles.pipelineCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.pipelineLabel, { color: colors.mutedForeground }]}>Pipeline Revenue</Text>
              <Text style={[styles.pipelineValue, { color: colors.success }]}>{formatBRL(t.totalPipelineRevenue)}</Text>
              {t.avgOrderValue ? (
                <Text style={[styles.pipelineSub, { color: colors.mutedForeground }]}>
                  Avg order: {formatBRL(t.avgOrderValue)}
                </Text>
              ) : null}
            </View>
          )}

          {leads.length > 0 && (
            <View style={styles.leadsSection}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Recent Leads</Text>
              <View style={[styles.leadsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {leads.map((lead) => (
                  <View key={lead.id} style={[styles.leadRow, { borderBottomColor: colors.border }]}>
                    <View style={styles.leadLeft}>
                      <Text style={[styles.leadSource, { color: colors.foreground }]}>{lead.source}</Text>
                      <Text style={[styles.leadIntent, { color: colors.mutedForeground }]}>{lead.intent}</Text>
                    </View>
                    <View style={styles.leadRight}>
                      <Text style={[styles.leadValue, { color: colors.primary }]}>{formatBRL(lead.value ?? 0)}</Text>
                      <StatusBadge status={lead.status} />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {!t && leads.length === 0 && (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                No conversion data available. Check that the API server is running.
              </Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  banner: { borderRadius: 10, padding: 12, marginBottom: 16 },
  bannerText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  metricsGrid: { flexDirection: "row", gap: 10 },
  pipelineCard: { borderRadius: 12, borderWidth: 1, padding: 16, marginTop: 16, alignItems: "center" },
  pipelineLabel: { fontSize: 12, fontFamily: "Inter_500Medium", letterSpacing: 0.5, textTransform: "uppercase" },
  pipelineValue: { fontSize: 32, fontFamily: "Inter_700Bold", marginTop: 4 },
  pipelineSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 4 },
  leadsSection: { marginTop: 20 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginBottom: 10 },
  leadsCard: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  leadRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, borderBottomWidth: 1 },
  leadLeft: { flex: 1 },
  leadSource: { fontSize: 13, fontFamily: "Inter_500Medium" },
  leadIntent: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  leadRight: { alignItems: "flex-end", gap: 4 },
  leadValue: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  emptyCard: { borderRadius: 12, borderWidth: 1, padding: 20, alignItems: "center", marginTop: 20 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
});
