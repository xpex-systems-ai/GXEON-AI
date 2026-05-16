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
import { StatusBadge } from "@/components/StatusBadge";
import { getApiBase } from "@/lib/supabase";

type RuntimeSync = {
  runtime?: string;
  github_sync?: string;
  replit_runtime?: string;
  last_commit?: string;
  last_sync?: string;
  branch?: string;
  synchronized?: boolean;
};

type ProductionRuntime = {
  production_runtime?: string;
  deployment_sync?: string;
  heartbeat?: string;
  recovery?: string;
  supabase_validation?: string;
  governance?: string;
};

type RailwayRuntime = {
  railway_runtime?: string;
  deployment?: string;
  memory?: string;
  sync?: string;
  providers?: string;
  telemetry?: string;
};

type RuntimeData = {
  sync: RuntimeSync | null;
  production: ProductionRuntime | null;
  railway: RailwayRuntime | null;
};

async function fetchRuntime(): Promise<RuntimeData> {
  const base = getApiBase();
  const fetchJson = async (path: string) => {
    try {
      const res = await fetch(`${base}${path}`);
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  };
  const [sync, production, railway] = await Promise.all([
    fetchJson("/api/v1/runtime/sync"),
    fetchJson("/api/v1/runtime/production"),
    fetchJson("/api/v1/runtime/railway"),
  ]);
  return { sync, production, railway };
}

function SectionCard({ title, rows }: { title: string; rows: [string, string | undefined | null][] }) {
  const colors = useColors();
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.cardTitle, { color: colors.foreground }]}>{title}</Text>
      {rows.map(([label, value]) => (
        <View key={label} style={[styles.row, { borderBottomColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
          {value ? <StatusBadge status={value} /> : <Text style={[styles.dash, { color: colors.mutedForeground }]}>—</Text>}
        </View>
      ))}
    </View>
  );
}

export default function RuntimeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ["runtime"],
    queryFn: fetchRuntime,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  const hasApiBase = !!getApiBase();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ paddingTop: topPad + 16, paddingBottom: Platform.OS === "web" ? 100 : 100, paddingHorizontal: 16 }}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
    >
      <Text style={[styles.title, { color: colors.foreground }]}>Live Runtime</Text>
      <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Auto-refreshes every 30s</Text>

      {!hasApiBase && (
        <View style={[styles.banner, { backgroundColor: `${colors.warning}22` }]}>
          <Text style={[styles.bannerText, { color: colors.warning }]}>
            EXPO_PUBLIC_DOMAIN not configured — API calls will not work.
          </Text>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : error ? (
        <View style={[styles.errorCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.errorText, { color: colors.destructive }]}>Failed to connect to API server</Text>
        </View>
      ) : (
        <>
          {data?.sync && (
            <SectionCard
              title="Runtime Sync"
              rows={[
                ["Runtime", data.sync.runtime],
                ["GitHub Sync", data.sync.github_sync],
                ["Replit Runtime", data.sync.replit_runtime],
                ["Branch", data.sync.branch],
                ["Synchronized", data.sync.synchronized != null ? (data.sync.synchronized ? "OK" : "DEGRADED") : null],
              ]}
            />
          )}

          {data?.production && (
            <SectionCard
              title="Production"
              rows={[
                ["Status", data.production.production_runtime],
                ["Deployment Sync", data.production.deployment_sync],
                ["Heartbeat", data.production.heartbeat],
                ["Recovery", data.production.recovery],
                ["Supabase", data.production.supabase_validation],
                ["Governance", data.production.governance],
              ]}
            />
          )}

          {data?.railway && (
            <SectionCard
              title="Railway"
              rows={[
                ["Runtime", data.railway.railway_runtime],
                ["Deployment", data.railway.deployment],
                ["Memory", data.railway.memory],
                ["Sync", data.railway.sync],
                ["Providers", data.railway.providers],
                ["Telemetry", data.railway.telemetry],
              ]}
            />
          )}

          {!data?.sync && !data?.production && !data?.railway && (
            <View style={[styles.errorCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
                No runtime data available. Check that the API server is running.
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
  title: { fontSize: 28, fontFamily: "Inter_700Bold", marginBottom: 4 },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 20 },
  banner: { borderRadius: 10, padding: 12, marginBottom: 16 },
  bannerText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  card: { borderRadius: 12, borderWidth: 1, marginBottom: 16, overflow: "hidden" },
  cardTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", padding: 14, paddingBottom: 8 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1 },
  label: { fontSize: 13, fontFamily: "Inter_400Regular" },
  dash: { fontSize: 13, fontFamily: "Inter_400Regular" },
  errorCard: { borderRadius: 12, borderWidth: 1, padding: 20, alignItems: "center", marginTop: 20 },
  errorText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
});
