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

type ProductionService = { status: string; uptime?: string };
type Production = {
  mode: string;
  runtimeHealth: string;
  services: Record<string, ProductionService>;
};
type Health = {
  status: string;
  score: number;
  grade: string;
  uptime: string;
  unresolvedAlerts: number;
  alerts: { id: string; level: string; title: string; message: string; timestamp: string }[];
};
type Telemetry = {
  activeSessions: number;
  webSessions: number;
  mobileSessions: number;
  ctaClicks: number;
  conversionRate: number;
};
type MobileTelemetry = {
  totalEvents: number;
  screenViews: number;
  ctaTaps: number;
  activeMobileSessions: number;
  topScreens: { screen: string; views: number }[];
};
type ActivationItem = { item: string; status: string };
type Activation = { overallGrade: string; passCount: number; checklist: ActivationItem[] };

export default function LiveRuntimeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [production, setProduction] = useState<Production | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [telemetry, setTelemetry] = useState<Telemetry | null>(null);
  const [mobileTelemetry, setMobileTelemetry] = useState<MobileTelemetry | null>(null);
  const [activation, setActivation] = useState<Activation | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      if (!domain) throw new Error("EXPO_PUBLIC_DOMAIN not configured");
      const base = `https://${domain}/api`;

      const [p, h, t, mt, ac] = await Promise.all([
        fetch(`${base}/v1/runtime/production`).then((r) => r.json()),
        fetch(`${base}/v1/runtime/health`).then((r) => r.json()),
        fetch(`${base}/v1/telemetry/live`).then((r) => r.json()),
        fetch(`${base}/v1/mobile/telemetry`).then((r) => r.json()),
        fetch(`${base}/v1/runtime/activation`).then((r) => r.json()),
      ]);

      setProduction(p);
      setHealth(h);
      setTelemetry(t);
      setMobileTelemetry(mt);
      setActivation(ac);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load runtime data");
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

  const serviceColor = (s: string) =>
    s === "LIVE" || s === "ACTIVE" || s === "STABLE" || s === "PRESERVED"
      ? colors.success
      : s === "DEGRADED"
        ? colors.warning
        : colors.destructive;

  const alertColor = (l: string) =>
    l === "critical" ? colors.destructive : l === "warning" ? colors.warning : colors.primary;

  const checkColor = (s: string) =>
    s === "PASS" ? colors.success : s === "DEGRADED" ? colors.warning : colors.mutedForeground;

  const healthColor = health?.status === "GREEN" ? colors.success : health?.status === "YELLOW" ? colors.warning : colors.destructive;

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
          title: "Live Runtime",
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
          {/* Mode banner */}
          {production ? (
            <View style={[styles.banner, { backgroundColor: colors.success + "15", borderColor: colors.success + "40" }]}>
              <View style={[styles.liveDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.modeText, { color: colors.success }]}>{production.mode}</Text>
              <View style={[styles.healthBadge, { backgroundColor: healthColor + "20" }]}>
                <Text style={[styles.healthBadgeText, { color: healthColor }]}>
                  {production.runtimeHealth}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Health score */}
          {health ? (
            <View style={[styles.healthCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.scoreCircle, { borderColor: healthColor }]}>
                <Text style={[styles.scoreNum, { color: healthColor }]}>{health.score}</Text>
                <Text style={[styles.scoreGrade, { color: healthColor }]}>{health.grade}</Text>
              </View>
              <View style={styles.healthInfo}>
                <Text style={[styles.healthTitle, { color: colors.foreground }]}>Runtime Health</Text>
                <Text style={[styles.healthSub, { color: colors.mutedForeground }]}>Uptime: {health.uptime}</Text>
                {health.unresolvedAlerts > 0 ? (
                  <View style={[styles.alertBadge, { backgroundColor: colors.warning + "20" }]}>
                    <Text style={[styles.alertBadgeText, { color: colors.warning }]}>
                      {health.unresolvedAlerts} alert{health.unresolvedAlerts > 1 ? "s" : ""}
                    </Text>
                  </View>
                ) : (
                  <View style={[styles.alertBadge, { backgroundColor: colors.success + "20" }]}>
                    <Text style={[styles.alertBadgeText, { color: colors.success }]}>All clear</Text>
                  </View>
                )}
              </View>
            </View>
          ) : null}

          {/* Telemetry KPIs */}
          {telemetry ? (
            <>
              <View style={styles.grid}>
                <MetricCard label="Active Sessions" value={String(telemetry.activeSessions)} accent="primary" />
                <MetricCard label="Mobile Sessions" value={String(telemetry.mobileSessions)} accent="primary" />
              </View>
              <View style={styles.grid}>
                <MetricCard label="CTA Clicks" value={String(telemetry.ctaClicks)} accent="warning" />
                <MetricCard label="Conv. Rate" value={`${telemetry.conversionRate}%`} accent="success" />
              </View>
            </>
          ) : null}

          {/* Services grid */}
          {production ? (
            <>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Service Status</Text>
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {Object.entries(production.services).map(([name, svc], i, arr) => (
                  <View
                    key={name}
                    style={[
                      styles.serviceRow,
                      { borderBottomColor: colors.border, borderBottomWidth: i < arr.length - 1 ? StyleSheet.hairlineWidth : 0 },
                    ]}
                  >
                    <View style={[styles.serviceDot, { backgroundColor: serviceColor(svc.status) }]} />
                    <Text style={[styles.serviceName, { color: colors.foreground }]}>
                      {name.replace(/_/g, " ")}
                    </Text>
                    <Text style={[styles.serviceStatus, { color: serviceColor(svc.status) }]}>
                      {svc.status}
                    </Text>
                    {svc.uptime ? (
                      <Text style={[styles.serviceUptime, { color: colors.mutedForeground }]}>{svc.uptime}</Text>
                    ) : null}
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {/* Mobile telemetry */}
          {mobileTelemetry ? (
            <>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Mobile Telemetry</Text>
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {[
                  { label: "Total Events", value: mobileTelemetry.totalEvents },
                  { label: "Screen Views", value: mobileTelemetry.screenViews },
                  { label: "CTA Taps", value: mobileTelemetry.ctaTaps },
                  { label: "Active Sessions", value: mobileTelemetry.activeMobileSessions },
                ].map((row, i, arr) => (
                  <View
                    key={row.label}
                    style={[
                      styles.metaRow,
                      { borderBottomColor: colors.border, borderBottomWidth: i < arr.length - 1 ? StyleSheet.hairlineWidth : 0 },
                    ]}
                  >
                    <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>{row.label}</Text>
                    <Text style={[styles.metaValue, { color: colors.foreground }]}>{row.value}</Text>
                  </View>
                ))}
                <View style={[styles.metaRow, { borderBottomWidth: 0 }]}>
                  <Text style={[styles.metaLabel, { color: colors.mutedForeground }]}>Top Screen</Text>
                  <Text style={[styles.metaValue, { color: colors.primary }]}>
                    {mobileTelemetry.topScreens[0]?.screen ?? "—"}
                  </Text>
                </View>
              </View>
            </>
          ) : null}

          {/* Active alerts */}
          {health && health.alerts.length > 0 ? (
            <>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Active Alerts</Text>
              <View style={styles.alertsList}>
                {health.alerts.map((alert) => (
                  <View
                    key={alert.id}
                    style={[
                      styles.alertItem,
                      {
                        backgroundColor: alertColor(alert.level) + "15",
                        borderColor: alertColor(alert.level) + "40",
                      },
                    ]}
                  >
                    <Feather name="alert-triangle" size={13} color={alertColor(alert.level)} />
                    <View style={styles.alertContent}>
                      <Text style={[styles.alertTitle, { color: alertColor(alert.level) }]}>{alert.title}</Text>
                      <Text style={[styles.alertMsg, { color: colors.mutedForeground }]} numberOfLines={2}>
                        {alert.message}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          {/* Activation checklist */}
          {activation ? (
            <>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>
                Activation Checklist
                <Text style={{ color: colors.success }}> {activation.overallGrade}</Text>
              </Text>
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {activation.checklist.map((item, i, arr) => (
                  <View
                    key={item.item}
                    style={[
                      styles.checkRow,
                      { borderBottomColor: colors.border, borderBottomWidth: i < arr.length - 1 ? StyleSheet.hairlineWidth : 0 },
                    ]}
                  >
                    <Feather
                      name={item.status === "PASS" ? "check-circle" : "clock"}
                      size={14}
                      color={checkColor(item.status)}
                    />
                    <Text style={[styles.checkItem, { color: colors.foreground }]}>{item.item}</Text>
                    <Text style={[styles.checkStatus, { color: checkColor(item.status) }]}>{item.status}</Text>
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
  liveDot: { width: 7, height: 7, borderRadius: 4 },
  modeText: { flex: 1, fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.6 },
  healthBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 4 },
  healthBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  healthCard: { flexDirection: "row", alignItems: "center", gap: 14, padding: 16, borderRadius: 12, borderWidth: 1 },
  scoreCircle: { width: 64, height: 64, borderRadius: 32, borderWidth: 3, alignItems: "center", justifyContent: "center" },
  scoreNum: { fontSize: 22, fontFamily: "Inter_700Bold", lineHeight: 26 },
  scoreGrade: { fontSize: 12, fontFamily: "Inter_700Bold" },
  healthInfo: { flex: 1, gap: 4 },
  healthTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  healthSub: { fontSize: 12, fontFamily: "Inter_400Regular" },
  alertBadge: { alignSelf: "flex-start", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 },
  alertBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  grid: { flexDirection: "row", gap: 10 },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  card: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  serviceRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 11, gap: 8 },
  serviceDot: { width: 7, height: 7, borderRadius: 4 },
  serviceName: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", textTransform: "capitalize" },
  serviceStatus: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  serviceUptime: { fontSize: 10, fontFamily: "Inter_400Regular", marginLeft: 4 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 11 },
  metaLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  metaValue: { fontSize: 13, fontFamily: "Inter_600SemiBold", fontVariant: ["tabular-nums"] },
  alertsList: { gap: 8 },
  alertItem: { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 8, borderWidth: 1 },
  alertContent: { flex: 1 },
  alertTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  alertMsg: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },
  checkRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, gap: 8 },
  checkItem: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular" },
  checkStatus: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
});
