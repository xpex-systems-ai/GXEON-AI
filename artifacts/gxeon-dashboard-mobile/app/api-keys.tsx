import React from "react";
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
import { useQuery } from "@tanstack/react-query";

import { useColors } from "@/hooks/useColors";
import { StatusBadge } from "@/components/StatusBadge";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

type ApiKey = {
  id: string;
  key_value: string;
  tier: string;
  status: string;
  actor_code?: string;
  rate_limit: number;
  created_at: string;
  last_used_at?: string;
};

function maskKey(key: string): string {
  if (!key) return "***";
  return key.length > 12 ? `${key.slice(0, 8)}...${key.slice(-4)}` : "***";
}

async function fetchApiKeys(): Promise<ApiKey[]> {
  if (!supabase) return [];
  const { data } = await supabase.from("api_keys").select("*").order("created_at", { ascending: false });
  return (data ?? []) as ApiKey[];
}

export default function ApiKeysScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const { data: apiKeys = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["api-keys"],
    queryFn: fetchApiKeys,
    staleTime: 60_000,
  });

  const activeCount = apiKeys.filter((k) => k.status === "active").length;

  const renderItem = ({ item }: { item: ApiKey }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardTop}>
        <View style={styles.keyInfo}>
          <Text style={[styles.keyValue, { color: colors.primary }]}>{maskKey(item.key_value)}</Text>
          {item.actor_code ? (
            <Text style={[styles.actor, { color: colors.mutedForeground }]}>{item.actor_code}</Text>
          ) : null}
        </View>
        <View style={styles.badges}>
          <StatusBadge status={item.status} />
          {item.tier ? <StatusBadge status={item.tier} /> : null}
        </View>
      </View>
      <View style={styles.cardBottom}>
        <Text style={[styles.meta, { color: colors.mutedForeground }]}>
          Rate limit: {item.rate_limit ?? "—"}/min
        </Text>
        {item.last_used_at ? (
          <Text style={[styles.meta, { color: colors.mutedForeground }]}>
            Last used: {new Date(item.last_used_at).toLocaleDateString("pt-BR")}
          </Text>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {!isSupabaseConfigured && (
        <View style={[styles.banner, { backgroundColor: `${colors.warning}22`, margin: 16 }]}>
          <Text style={[styles.bannerText, { color: colors.warning }]}>Supabase not configured</Text>
        </View>
      )}
      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={apiKeys}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={
            <Text style={[styles.count, { color: colors.mutedForeground }]}>
              {activeCount} active / {apiKeys.length} total
            </Text>
          }
          contentContainerStyle={{ padding: 16, paddingBottom: Platform.OS === "web" ? 100 : insets.bottom + 32, gap: 10 }}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No API keys found</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  count: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 10 },
  card: { borderRadius: 12, borderWidth: 1, padding: 14 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 },
  keyInfo: { flex: 1 },
  keyValue: { fontSize: 14, fontFamily: "Inter_600SemiBold", fontVariant: ["tabular-nums"] },
  actor: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  badges: { flexDirection: "row", gap: 6 },
  cardBottom: { flexDirection: "row", gap: 16 },
  meta: { fontSize: 11, fontFamily: "Inter_400Regular" },
  banner: { borderRadius: 10, padding: 12 },
  bannerText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
});
