import React, { useCallback, useEffect, useState } from "react";
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
import * as Haptics from "expo-haptics";
import { Feather } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { getSupabase, isConfigured } from "@/lib/supabase";

type Actor = {
  id: string;
  code?: string;
  name?: string;
  status?: string;
  created_at?: string;
  type?: string;
};

export default function ActorsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [actors, setActors] = useState<Actor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!isConfigured()) {
      setError("Supabase not configured.");
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const { data, error: err } = await getSupabase()
        .from("actors")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (err) throw err;
      setActors(data ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load actors");
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

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: "Actors", headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.foreground }} />

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
        <FlatList
          data={actors}
          keyExtractor={(item) => item.id}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
          renderItem={({ item, index }) => (
            <View
              style={[
                styles.row,
                {
                  backgroundColor: colors.card,
                  borderBottomColor: colors.border,
                },
              ]}
            >
              <View style={[styles.avatar, { backgroundColor: colors.primary + "20" }]}>
                <Text style={[styles.avatarText, { color: colors.primary }]}>
                  {(item.code ?? item.name ?? "?").substring(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={styles.info}>
                <Text style={[styles.code, { color: colors.foreground }]}>
                  {item.code ?? item.name ?? item.id.substring(0, 12)}
                </Text>
                {item.type ? (
                  <Text style={[styles.type, { color: colors.mutedForeground }]}>{item.type}</Text>
                ) : null}
              </View>
              {item.status ? (
                <View style={[styles.statusBadge, {
                  backgroundColor: item.status === "active" ? colors.success + "20" : colors.secondary,
                }]}>
                  <Text style={[styles.statusText, {
                    color: item.status === "active" ? colors.success : colors.mutedForeground,
                  }]}>
                    {item.status}
                  </Text>
                </View>
              ) : null}
            </View>
          )}
          contentContainerStyle={{
            paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 20,
            flexGrow: 1,
          }}
          ListEmptyComponent={() => (
            <View style={styles.empty}>
              <Feather name="users" size={40} color={colors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: colors.foreground }]}>No actors found</Text>
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>Actor records will appear here</Text>
            </View>
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorBox: { flexDirection: "row", gap: 8, padding: 12, margin: 16, borderRadius: 8, borderWidth: 1 },
  errorText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  avatarText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  info: { flex: 1 },
  code: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  type: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 },
  statusText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, paddingTop: 80 },
  emptyTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold" },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
