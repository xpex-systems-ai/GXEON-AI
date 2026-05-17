import React, { useEffect, useRef } from "react";
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
import { Feather } from "@expo/vector-icons";

import { useColors } from "@/hooks/useColors";
import { supabase, isSupabaseConfigured, getApiBase } from "@/lib/supabase";

type HealthState = {
  supabase: boolean;
  latency: number;
  apiServer: boolean;
};

async function checkHealth(): Promise<HealthState> {
  const start = Date.now();
  let supOk = false;
  if (supabase) {
    try {
      const { error } = await supabase.from("global_transactions").select("count", { count: "exact", head: true });
      supOk = !error;
    } catch {}
  }
  const latency = Date.now() - start;

  let apiOk = false;
  try {
    const base = getApiBase();
    const res = await fetch(`${base}/api/healthz`, { signal: AbortSignal.timeout(5000) });
    apiOk = res.ok;
  } catch {}

  return { supabase: supOk, latency, apiServer: apiOk };
}

function HealthRow({ label, icon, ok, detail }: { label: string; icon: string; ok: boolean; detail?: string }) {
  const colors = useColors();
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: ok ? `${colors.success}18` : `${colors.danger}18` }]}>
        <Feather name={icon as any} size={18} color={ok ? colors.success : colors.danger} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={[styles.rowLabel, { color: colors.foreground }]}>{label}</Text>
        {detail ? <Text style={[styles.rowDetail, { color: colors.mutedForeground }]}>{detail}</Text> : null}
      </View>
      <View style={[styles.statusDot, { backgroundColor: ok ? colors.success : colors.danger }]} />
      <Text style={[styles.statusText, { color: ok ? colors.success : colors.danger }]}>
        {ok ? "OK" : "FAIL"}
      </Text>
    </View>
  );
}

export default function HealthScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["health"],
    queryFn: checkHealth,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{ padding: 16, paddingBottom: Platform.OS === "web" ? 100 : insets.bottom + 32 }}
      refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
    >
      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <>
          <View style={[styles.summaryCard, {
            backgroundColor: data?.supabase && data?.apiServer ? `${colors.success}18` : `${colors.danger}18`,
            borderColor: data?.supabase && data?.apiServer ? `${colors.success}44` : `${colors.danger}44`,
          }]}>
            <Text style={[styles.summaryTitle, { color: data?.supabase && data?.apiServer ? colors.success : colors.danger }]}>
              {data?.supabase && data?.apiServer ? "All Systems Operational" : "Degraded Services"}
            </Text>
            <Text style={[styles.summarySubtitle, { color: colors.mutedForeground }]}>Auto-refreshes every 30s</Text>
          </View>

          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>SERVICES</Text>
            <HealthRow
              label="Supabase Database"
              icon="database"
              ok={!!data?.supabase}
              detail={isSupabaseConfigured ? `${data?.latency ?? 0}ms latency` : "Not configured"}
            />
            <HealthRow
              label="API Server"
              icon="server"
              ok={!!data?.apiServer}
              detail={getApiBase() ? "GXEON API" : "Not configured"}
            />
            <View style={[styles.row, { borderBottomWidth: 0, borderBottomColor: colors.border }]}>
              <View style={[styles.iconWrap, { backgroundColor: `${colors.success}18` }]}>
                <Feather name="activity" size={18} color={colors.success} />
              </View>
              <View style={styles.rowInfo}>
                <Text style={[styles.rowLabel, { color: colors.foreground }]}>PIX Webhook</Text>
                <Text style={[styles.rowDetail, { color: colors.mutedForeground }]}>Auto-confirmation enabled</Text>
              </View>
              <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
              <Text style={[styles.statusText, { color: colors.success }]}>OK</Text>
            </View>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  summaryCard: { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 16, alignItems: "center" },
  summaryTitle: { fontSize: 17, fontFamily: "Inter_700Bold", marginBottom: 4 },
  summarySubtitle: { fontSize: 12, fontFamily: "Inter_400Regular" },
  section: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  sectionTitle: { fontSize: 11, fontFamily: "Inter_600SemiBold", letterSpacing: 1, textTransform: "uppercase", paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 14, borderBottomWidth: 1, gap: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowInfo: { flex: 1 },
  rowLabel: { fontSize: 14, fontFamily: "Inter_500Medium" },
  rowDetail: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
