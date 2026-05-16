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

type Branch = { name: string; status: string; behind?: number };
type GovernanceData = {
  healthScore: string;
  branchCount: number;
  mergeQueueLength: number;
  conflictCount: number;
  runtimeStatus: string;
  branches: Branch[];
  error?: string;
};

export default function GovernanceStatusScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<GovernanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const domain = process.env.EXPO_PUBLIC_DOMAIN;
      if (!domain) throw new Error("EXPO_PUBLIC_DOMAIN not set");
      const [branches, merge, conflicts, runtime] = await Promise.all([
        fetch(`https://${domain}/api/v1/governance/branches`).then((r) => r.json()),
        fetch(`https://${domain}/api/v1/governance/merge`).then((r) => r.json()),
        fetch(`https://${domain}/api/v1/governance/conflicts`).then((r) => r.json()),
        fetch(`https://${domain}/api/v1/governance/runtime-sync`).then((r) => r.json()),
      ]);
      const branchList: Branch[] = (branches.branches ?? []).slice(0, 10).map((b: any) => ({
        name: typeof b === "string" ? b : b.name ?? "unknown",
        status: b.status ?? "active",
        behind: b.behind,
      }));
      const conflictFiles: string[] = conflicts.conflictFiles ?? [];
      setData({
        healthScore: conflicts.error || runtime.error ? "C" : conflictFiles.length === 0 ? "A" : "B",
        branchCount: branches.branches?.length ?? 0,
        mergeQueueLength: merge.queue?.length ?? 0,
        conflictCount: conflictFiles.length,
        runtimeStatus: runtime.status ?? "stable",
        branches: branchList,
      });
    } catch (e) {
      setData({
        healthScore: "?",
        branchCount: 0,
        mergeQueueLength: 0,
        conflictCount: 0,
        runtimeStatus: "unknown",
        branches: [],
        error: e instanceof Error ? e.message : "Unable to reach governance API",
      });
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

  const scoreColor = (s: string) =>
    s === "A" ? colors.success : s === "B" ? colors.warning : s === "C" ? colors.destructive : colors.mutedForeground;

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
      <Stack.Screen options={{ title: "Git Governance", headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.foreground }} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <>
          {data?.error ? (
            <View style={[styles.errorBox, { backgroundColor: colors.destructive + "20", borderColor: colors.destructive + "40" }]}>
              <Feather name="alert-circle" size={14} color={colors.destructive} />
              <Text style={[styles.errorText, { color: colors.destructive }]}>{data.error}</Text>
            </View>
          ) : null}

          {/* Health Score */}
          <View style={[styles.scoreCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.scoreCircle, { borderColor: scoreColor(data?.healthScore ?? "?") }]}>
              <Text style={[styles.scoreText, { color: scoreColor(data?.healthScore ?? "?") }]}>
                {data?.healthScore ?? "?"}
              </Text>
            </View>
            <View style={styles.scoreInfo}>
              <Text style={[styles.scoreLabel, { color: colors.foreground }]}>Governance Health</Text>
              <Text style={[styles.scoreDesc, { color: colors.mutedForeground }]}>
                {data?.healthScore === "A" ? "No conflicts, clean merge queue" : data?.healthScore === "B" ? "Minor issues detected" : "Attention required"}
              </Text>
            </View>
          </View>

          {/* KPIs */}
          <View style={styles.grid}>
            <MetricCard label="Branches" value={String(data?.branchCount ?? 0)} accent="primary" />
            <MetricCard label="Merge Queue" value={String(data?.mergeQueueLength ?? 0)} accent={data?.mergeQueueLength ? "warning" : "success"} />
          </View>
          <View style={styles.grid}>
            <MetricCard label="Conflicts" value={String(data?.conflictCount ?? 0)} accent={data?.conflictCount ? "destructive" : "success"} />
            <MetricCard label="Runtime" value={data?.runtimeStatus ?? "—"} accent="primary" />
          </View>

          {/* Branches */}
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Branches</Text>
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {data?.branches.length === 0 ? (
              <View style={styles.empty}>
                <Feather name="git-branch" size={28} color={colors.mutedForeground} />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No branch data</Text>
              </View>
            ) : (
              data?.branches.map((b, i) => (
                <View
                  key={b.name + i}
                  style={[styles.branchRow, { borderBottomColor: colors.border, borderBottomWidth: i < (data.branches.length - 1) ? StyleSheet.hairlineWidth : 0 }]}
                >
                  <Feather name="git-branch" size={14} color={colors.mutedForeground} style={{ marginTop: 1 }} />
                  <Text style={[styles.branchName, { color: colors.foreground }]} numberOfLines={1}>{b.name}</Text>
                  <View style={[styles.branchBadge, { backgroundColor: b.status === "ahead" ? colors.success + "20" : colors.secondary }]}>
                    <Text style={[styles.branchStatus, { color: b.status === "ahead" ? colors.success : colors.mutedForeground }]}>
                      {b.status ?? "active"}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
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
  scoreCard: { flexDirection: "row", alignItems: "center", gap: 16, padding: 16, borderRadius: 12, borderWidth: 1 },
  scoreCircle: { width: 60, height: 60, borderRadius: 30, borderWidth: 3, alignItems: "center", justifyContent: "center" },
  scoreText: { fontSize: 28, fontFamily: "Inter_700Bold" },
  scoreInfo: { flex: 1 },
  scoreLabel: { fontSize: 16, fontFamily: "Inter_600SemiBold" },
  scoreDesc: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  grid: { flexDirection: "row", gap: 10 },
  sectionTitle: { fontSize: 16, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  card: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  branchRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 11, gap: 8 },
  branchName: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  branchBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 4 },
  branchStatus: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  empty: { padding: 24, alignItems: "center", gap: 6 },
  emptyText: { fontSize: 13, fontFamily: "Inter_400Regular" },
});
