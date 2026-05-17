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

type Actor = {
  id: string;
  actor_code: string;
  name?: string;
  status?: string;
  tier?: string;
  created_at: string;
};

async function fetchActors(): Promise<Actor[]> {
  if (!supabase) return [];
  const { data } = await supabase.from("actors").select("*").order("created_at", { ascending: false });
  return (data ?? []) as Actor[];
}

export default function ActorsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  const { data: actors = [], isLoading, isFetching, refetch } = useQuery({
    queryKey: ["actors"],
    queryFn: fetchActors,
    staleTime: 60_000,
  });

  const renderItem = ({ item }: { item: Actor }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardTop}>
        <View>
          <Text style={[styles.actorCode, { color: colors.foreground }]}>{item.actor_code}</Text>
          {item.name ? <Text style={[styles.name, { color: colors.mutedForeground }]}>{item.name}</Text> : null}
        </View>
        <View style={styles.badges}>
          {item.tier ? <StatusBadge status={item.tier} /> : null}
          {item.status ? <StatusBadge status={item.status} /> : null}
        </View>
      </View>
      <Text style={[styles.date, { color: colors.mutedForeground }]}>
        Joined {new Date(item.created_at).toLocaleDateString("pt-BR")}
      </Text>
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
          data={actors}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={
            <Text style={[styles.count, { color: colors.mutedForeground }]}>{actors.length} actors</Text>
          }
          contentContainerStyle={{ padding: 16, paddingBottom: Platform.OS === "web" ? 100 : insets.bottom + 32, gap: 10 }}
          refreshControl={<RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No actors found</Text>
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
  actorCode: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  name: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  badges: { flexDirection: "row", gap: 6 },
  date: { fontSize: 11, fontFamily: "Inter_400Regular" },
  banner: { borderRadius: 10, padding: 12 },
  bannerText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
});
