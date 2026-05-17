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

type BranchSummary = { total: number; stale: number; active: number };
type MergeSummary = { totalPRs: number; readyToMerge: number; blocked: number; stale: number };
type MergeQueueEntry = { branch: string; status: string; createdAt: string };
type HealthScore = { score: number; grade: string };

type GovernanceData = {
  branchSummary: BranchSummary | null;
  mergeSummary: MergeSummary | null;
  mergeQueue: MergeQueueEntry[];
  repoHealth: HealthScore | null;
};

async function fetchGovernance(): Promise<GovernanceData> {
  const base = getApiBase();

  async function g<T>(path: string): Promise<T | null> {
    try {
      const res = await fetch(`${base}/api/v1/governance/${path}`);
      if (!res.ok) return null;
      return res.json();
    } catch { return null; }
  }

  const [branches, merge] = await Promise.all([g<any>("branches"), g<any>("merge")]);

  return {
    branchSummary: branches?.summary ?? null,
    mergeSummary: merge?.summary ?? null,
    mergeQueue: merge?.mergeQueue?.slice(0, 8) ?? [],
    repoHealth: merge?.repositoryHealth ?? null,
  };
}

function StatRow({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  const colors = useColors();
  return (
    <View style={[styles.statRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
      <Text style={[styles.statValue, { color: accent ?? colors.foreground }]}>{value}</Text>
    </View>
  );
}

export default function GovernanceScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ["governance"],
    queryFn: fetchGovernance,
    staleTime: 60_000,
  });

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
      ) : error || (!data?.branchSummary && !data?.mergeSummary) ? (
        <View style={[styles.errorCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
            Governance API not reachable. Check the API server and GOVERNANCE_TOKEN.
          </Text>
        </View>
      ) : (
        <>
          {data?.repoHealth && (
            <View style={[styles.healthCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.healthScore, { color: colors.primary }]}>{data.repoHealth.score}</Text>
              <Text style={[styles.healthGrade, { color: colors.foreground }]}>Grade: {data.repoHealth.grade}</Text>
              <Text style={[styles.healthLabel, { color: colors.mutedForeground }]}>Repository Health Score</Text>
            </View>
          )}

          {data?.branchSummary && (
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Branches</Text>
              <StatRow label="Total" value={data.branchSummary.total} />
              <StatRow label="Active" value={data.branchSummary.active} accent={colors.success} />
              <StatRow label="Stale" value={data.branchSummary.stale} accent={data.branchSummary.stale > 0 ? colors.warning : undefined} />
            </View>
          )}

          {data?.mergeSummary && (
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Merge Queue</Text>
              <StatRow label="Total PRs" value={data.mergeSummary.totalPRs} />
              <StatRow label="Ready" value={data.mergeSummary.readyToMerge} accent={colors.success} />
              <StatRow label="Blocked" value={data.mergeSummary.blocked} accent={data.mergeSummary.blocked > 0 ? colors.danger : undefined} />
              <StatRow label="Stale" value={data.mergeSummary.stale} accent={data.mergeSummary.stale > 0 ? colors.warning : undefined} />
            </View>
          )}

          {data?.mergeQueue?.length > 0 && (
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Queue Entries</Text>
              {data.mergeQueue.map((entry) => (
                <View key={entry.branch} style={[styles.queueRow, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.queueBranch, { color: colors.foreground }]} numberOfLines={1}>{entry.branch}</Text>
                  <StatusBadge status={entry.status} />
                </View>
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
  banner: { borderRadius: 10, padding: 12, marginBottom: 16 },
  bannerText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  healthCard: { borderRadius: 12, borderWidth: 1, padding: 16, alignItems: "center", marginBottom: 16 },
  healthScore: { fontSize: 48, fontFamily: "Inter_700Bold" },
  healthGrade: { fontSize: 18, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  healthLabel: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 4 },
  section: { borderRadius: 12, borderWidth: 1, marginBottom: 16, overflow: "hidden" },
  sectionTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", padding: 14, paddingBottom: 8 },
  statRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1 },
  statLabel: { fontSize: 13, fontFamily: "Inter_400Regular" },
  statValue: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  queueRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1 },
  queueBranch: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, marginRight: 8 },
  errorCard: { borderRadius: 12, borderWidth: 1, padding: 20, alignItems: "center", marginTop: 20 },
  errorText: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
});
