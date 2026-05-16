import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useColors } from "@/hooks/useColors";

type LogLevel = "info" | "warning" | "error";
type LogEntry = {
  id: string;
  timestamp: string;
  level: LogLevel;
  source: string;
  message: string;
};

const SOURCES = ["server", "database", "webhook", "payment", "api", "commission"];
const INFO_MSGS = [
  "Transaction validated successfully",
  "Actor wallet balance updated",
  "API key authenticated",
  "Revenue event recorded",
  "Dataset query executed in 42ms",
  "Webhook received from gateway",
  "Supabase realtime sync OK",
  "Governance health check passed",
  "Swarm runtime tick complete",
  "Commission calculation finalized",
];
const WARN_MSGS = [
  "High latency detected on /api/v1/transactions",
  "Actor wallet balance below threshold",
  "API key approaching rate limit",
  "Retry attempt 2/3 for webhook delivery",
  "Revenue event processed with delay",
];
const ERROR_MSGS = [
  "Failed to process PIX webhook",
  "Database connection timeout",
  "API key validation failed",
  "Commission calculation error for actor",
];

function generateLogs(count: number): LogEntry[] {
  const logs: LogEntry[] = [];
  const now = Date.now();
  for (let i = 0; i < count; i++) {
    const r = Math.random();
    const level: LogLevel = r < 0.7 ? "info" : r < 0.9 ? "warning" : "error";
    const msgs = level === "info" ? INFO_MSGS : level === "warning" ? WARN_MSGS : ERROR_MSGS;
    const ts = new Date(now - i * 3200 - Math.random() * 2000);
    logs.push({
      id: `${now}-${i}`,
      timestamp: ts.toTimeString().substring(0, 8),
      level,
      source: SOURCES[Math.floor(Math.random() * SOURCES.length)],
      message: msgs[Math.floor(Math.random() * msgs.length)],
    });
  }
  return logs;
}

const LEVEL_FILTERS = ["all", "info", "warning", "error"] as const;

export default function SystemLogsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [logs] = useState<LogEntry[]>(() => generateLogs(60));
  const [filter, setFilter] = useState<typeof LEVEL_FILTERS[number]>("all");
  const [search, setSearch] = useState("");
  const listRef = useRef<FlatList>(null);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const filtered = useMemo(() => {
    return logs.filter((l) => {
      if (filter !== "all" && l.level !== filter) return false;
      if (search && !l.message.toLowerCase().includes(search.toLowerCase()) && !l.source.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [logs, filter, search]);

  const levelColor = (l: LogLevel) =>
    l === "info" ? colors.primary : l === "warning" ? colors.warning : colors.destructive;

  const levelBg = (l: LogLevel) =>
    l === "info" ? colors.primary + "20" : l === "warning" ? colors.warning + "20" : colors.destructive + "20";

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: "System Logs", headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.foreground }} />

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
        <Feather name="search" size={14} color={colors.mutedForeground} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Filter logs..."
          placeholderTextColor={colors.mutedForeground}
          style={[styles.searchInput, { color: colors.foreground }]}
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Feather name="x" size={14} color={colors.mutedForeground} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Level Filters */}
      <View style={[styles.filterRow, { borderBottomColor: colors.border }]}>
        {LEVEL_FILTERS.map((f) => {
          const active = filter === f;
          const fColor = f === "all" ? colors.primary : f === "info" ? colors.primary : f === "warning" ? colors.warning : colors.destructive;
          return (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[
                styles.filterChip,
                { backgroundColor: active ? fColor + "20" : colors.secondary, borderColor: active ? fColor : "transparent" },
              ]}
            >
              <Text style={[styles.filterText, { color: active ? fColor : colors.mutedForeground }]}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Log List */}
      <FlatList
        ref={listRef}
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 20, flexGrow: 1 }}
        renderItem={({ item }) => (
          <View style={[styles.logRow, { borderBottomColor: colors.border }]}>
            <Text style={[styles.timestamp, { color: colors.mutedForeground }]}>{item.timestamp}</Text>
            <View style={[styles.levelBadge, { backgroundColor: levelBg(item.level) }]}>
              <Text style={[styles.levelText, { color: levelColor(item.level) }]}>{item.level.substring(0, 4)}</Text>
            </View>
            <View style={styles.logContent}>
              <Text style={[styles.source, { color: colors.primary }]}>[{item.source}]</Text>
              <Text style={[styles.message, { color: colors.foreground }]} numberOfLines={2}>{item.message}</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Feather name="terminal" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No logs matching filter</Text>
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchBar: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, marginVertical: 10, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", padding: 0 },
  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  filterChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 16, borderWidth: 1 },
  filterText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  logRow: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 12, paddingVertical: 8, gap: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  timestamp: { fontSize: 10, fontFamily: "Inter_400Regular", fontVariant: ["tabular-nums"], paddingTop: 2 },
  levelBadge: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 3 },
  levelText: { fontSize: 9, fontFamily: "Inter_700Bold" },
  logContent: { flex: 1, gap: 2 },
  source: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  message: { fontSize: 12, fontFamily: "Inter_400Regular" },
  empty: { paddingTop: 60, alignItems: "center", gap: 8 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular" },
});
