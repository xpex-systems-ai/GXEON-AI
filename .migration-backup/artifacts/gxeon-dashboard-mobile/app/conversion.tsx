import React, { useCallback, useEffect, useState } from "react";
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
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { MetricCard } from "@/components/MetricCard";
import { formatCurrency } from "@/lib/format";

type FunnelStage = { id: string; name: string; count: number; conversionRate: number };
type Telemetry = {
  totalLeads: number;
  convertedLeads: number;
  hotLeads: number;
  conversionRate: number;
  totalPipelineRevenue: number;
  avgLeadScore: number;
};
type Opportunity = {
  leadId: string;
  source: string;
  score: number;
  estimatedValue: number;
  urgency: string;
  recommendation: string;
};
type Runtime = { status: string; engines: Record<string, string>; uptime: string };
type Projection = { period: string; projected: number };

export default function ConversionScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
  const [funnels, setFunnels] = useState<{ stages: FunnelStage[]; overallConversionRate: number } | null>(null);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [runtime, setRuntime] = useState<Runtime | null>(null);
  const [forecast, setForecast] = useState<Projection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      if (!domain) throw new Error("EXPO_PUBLIC_DOMAIN not configured");
      const base = `https://${domain}/api`;

      const [t, f, o, rt, fc] = await Promise.all([
        fetch(`${base}/v1/conversion/telemetry`).then((r) => r.json()),
        fetch(`${base}/v1/conversion/funnels`).then((r) => r.json()),
        fetch(`${base}/v1/conversion/opportunities`).then((r) => r.json()),
        fetch(`${base}/v1/conversion/runtime`).then((r) => r.json()),
        fetch(`${base}/v1/conversion/forecast`).then((r) => r.json()),
      ]);

      setTelemetry(t);
      setFunnels(f);
      setOpportunities(o.opportunities ?? []);
      setRuntime(rt);
      setForecast(fc.projections?.slice(0, 4) ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load conversion data");
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

  const urgencyColor = (u: string) =>
    u === "critical" ? colors.destructive : u === "high" ? colors.warning : colors.primary;

  const engineColor = (s: string) =>
    s === "ONLINE" || s === "ADAPTIVE" ? colors.success : colors.warning;

  const maxFunnelCount = funnels?.stages[0]?.count ?? 1;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 20 },
      ]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen
        options={{
          title: "Conversion Center",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
        }}
      />

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
        <>
          {/* Runtime banner */}
          {runtime ? (
            <View style={[styles.banner, { backgroundColor: colors.success + "15", borderColor: colors.success + "40" }]}>
              <View style={[styles.bannerDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.bannerText, { color: colors.success }]}>AUTONOMOUS REVENUE OPERATING SYSTEM</Text>
              <Text style={[styles.bannerUptime, { color: colors.mutedForeground }]}>{runtime.uptime}</Text>
            </View>
          ) : null}

          {/* KPI Cards */}
          {telemetry ? (
            <>
              <View style={styles.grid}>
                <MetricCard
                  label="Pipeline Revenue"
                  value={formatCurrency(telemetry.totalPipelineRevenue)}
                  accent="success"
                />
                <MetricCard
                  label="Conversion Rate"
                  value={`${telemetry.conversionRate}%`}
                  accent="primary"
                />
              </View>
              <View style={styles.grid}>
                <MetricCard label="Hot Leads" value={String(telemetry.hotLeads)} accent="warning" />
                <MetricCard label="Avg Score" value={String(telemetry.avgLeadScore)} accent="primary" />
              </View>
            </>
          ) : null}

          {/* Funnel */}
          {funnels ? (
            <>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Live Funnel{" "}
                <Text style={{ color: colors.success }}>{funnels.overallConversionRate}% end-to-end</Text>
              </Text>
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {funnels.stages.map((stage, i) => {
                  const barPct = stage.count / maxFunnelCount;
                  return (
                    <View
                      key={stage.id}
                      style={[
                        styles.funnelRow,
                        { borderBottomColor: colors.border, borderBottomWidth: i < funnels.stages.length - 1 ? StyleSheet.hairlineWidth : 0 },
                      ]}
                    >
                      <Text style={[styles.funnelName, { color: colors.mutedForeground }]} numberOfLines={1}>
                        {stage.name}
                      </Text>
                      <View style={[styles.funnelBarWrap, { backgroundColor: colors.secondary }]}>
                        <View
                          style={[
                            styles.funnelBar,
                            { width: `${Math.max(barPct * 100, 4)}%` as any, backgroundColor: colors.primary },
                          ]}
                        />
                      </View>
                      <Text style={[styles.funnelCount, { color: colors.foreground }]}>{stage.count}</Text>
                      {i > 0 ? (
                        <Text style={[styles.funnelRate, { color: colors.success }]}>
                          {stage.conversionRate.toFixed(0)}%
                        </Text>
                      ) : (
                        <Text style={[styles.funnelRate, { color: colors.mutedForeground }]}>—</Text>
                      )}
                    </View>
                  );
                })}
              </View>
            </>
          ) : null}

          {/* Opportunities */}
          {opportunities.length > 0 ? (
            <>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Top Opportunities</Text>
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {opportunities.slice(0, 5).map((opp, i) => (
                  <View
                    key={opp.leadId}
                    style={[
                      styles.oppRow,
                      { borderBottomColor: colors.border, borderBottomWidth: i < Math.min(opportunities.length, 5) - 1 ? StyleSheet.hairlineWidth : 0 },
                    ]}
                  >
                    <View style={[styles.scoreCircle, { borderColor: urgencyColor(opp.urgency) + "60" }]}>
                      <Text style={[styles.scoreText, { color: urgencyColor(opp.urgency) }]}>{opp.score}</Text>
                    </View>
                    <View style={styles.oppInfo}>
                      <View style={styles.oppHeader}>
                        <View style={[styles.urgencyBadge, { backgroundColor: urgencyColor(opp.urgency) + "20" }]}>
                          <Text style={[styles.urgencyText, { color: urgencyColor(opp.urgency) }]}>{opp.urgency}</Text>
                        </View>
                        <Text style={[styles.oppSource, { color: colors.mutedForeground }]}>{opp.source}</Text>
                      </View>
                      <Text style={[styles.oppRec, { color: colors.foreground }]} numberOfLines={2}>
                        {opp.recommendation}
                      </Text>
                    </View>
                    <Text style={[styles.oppValue, { color: colors.success }]}>
                      {formatCurrency(opp.estimatedValue)}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {/* Revenue Forecast */}
          {forecast.length > 0 ? (
            <>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Revenue Forecast</Text>
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {forecast.map((p, i) => (
                  <View
                    key={p.period}
                    style={[
                      styles.forecastRow,
                      { borderBottomColor: colors.border, borderBottomWidth: i < forecast.length - 1 ? StyleSheet.hairlineWidth : 0 },
                    ]}
                  >
                    <Text style={[styles.forecastPeriod, { color: colors.foreground }]}>{p.period}</Text>
                    <Text style={[styles.forecastValue, { color: colors.primary }]}>{formatCurrency(p.projected)}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {/* Engine Status */}
          {runtime ? (
            <>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Runtime Engines</Text>
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {Object.entries(runtime.engines).map(([name, status], i, arr) => (
                  <View
                    key={name}
                    style={[
                      styles.engineRow,
                      { borderBottomColor: colors.border, borderBottomWidth: i < arr.length - 1 ? StyleSheet.hairlineWidth : 0 },
                    ]}
                  >
                    <View style={[styles.engineDot, { backgroundColor: engineColor(status) }]} />
                    <Text style={[styles.engineName, { color: colors.foreground }]}>
                      {name.replace(/([A-Z])/g, " $1").trim()}
                    </Text>
                    <Text style={[styles.engineStatus, { color: engineColor(status) }]}>{status}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  center: { paddingTop: 80, alignItems: "center" },
  errorBox: { flexDirection: "row", gap: 8, padding: 12, borderRadius: 8, borderWidth: 1 },
  errorText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  banner: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 10, borderWidth: 1 },
  bannerDot: { width: 7, height: 7, borderRadius: 4 },
  bannerText: { flex: 1, fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  bannerUptime: { fontSize: 11, fontFamily: "Inter_400Regular" },
  grid: { flexDirection: "row", gap: 10 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  card: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  funnelRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  funnelName: { width: 80, fontSize: 11, fontFamily: "Inter_400Regular" },
  funnelBarWrap: { flex: 1, height: 8, borderRadius: 4, overflow: "hidden" },
  funnelBar: { height: 8, borderRadius: 4 },
  funnelCount: { width: 36, textAlign: "right", fontSize: 12, fontFamily: "Inter_600SemiBold", fontVariant: ["tabular-nums"] },
  funnelRate: { width: 30, textAlign: "right", fontSize: 11, fontFamily: "Inter_600SemiBold" },
  oppRow: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  scoreCircle: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  scoreText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  oppInfo: { flex: 1, gap: 4 },
  oppHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  urgencyBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  urgencyText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  oppSource: { fontSize: 11, fontFamily: "Inter_400Regular" },
  oppRec: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  oppValue: { fontSize: 12, fontFamily: "Inter_700Bold", alignSelf: "center" },
  forecastRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  forecastPeriod: { fontSize: 13, fontFamily: "Inter_500Medium" },
  forecastValue: { fontSize: 14, fontFamily: "Inter_700Bold", fontVariant: ["tabular-nums"] },
  engineRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 10 },
  engineDot: { width: 8, height: 8, borderRadius: 4 },
  engineName: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  engineStatus: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
