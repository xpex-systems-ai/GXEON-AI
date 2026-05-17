import { Feather } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

type LogEntry = {
  id: string;
  timestamp: string;
  level: "info" | "warning" | "error";
  source: string;
  message: string;
};

const INITIAL_LOGS: LogEntry[] = [
  { id: "1", timestamp: new Date(Date.now() - 3600000).toISOString(), level: "info", source: "server", message: "GXEON Dashboard started" },
  { id: "2", timestamp: new Date(Date.now() - 3500000).toISOString(), level: "info", source: "database", message: "Supabase connection established" },
  { id: "3", timestamp: new Date(Date.now() - 3400000).toISOString(), level: "info", source: "webhook", message: "PIX webhook listener activated" },
  { id: "4", timestamp: new Date(Date.now() - 1800000).toISOString(), level: "info", source: "payment", message: "Transaction GX1777 created - R$ 49.90" },
  { id: "5", timestamp: new Date(Date.now() - 1700000).toISOString(), level: "info", source: "webhook", message: "PIX payment confirmed via webhook" },
  { id: "6", timestamp: new Date(Date.now() - 1600000).toISOString(), level: "info", source: "payment", message: "Transaction status updated: PENDING → PAID" },
  { id: "7", timestamp: new Date(Date.now() - 1500000).toISOString(), level: "info", source: "commission", message: "Commission applied: R$ 4.99 to actor wallet" },
  { id: "8", timestamp: new Date(Date.now() - 900000).toISOString(), level: "warning", source: "api", message: "Rate limit warning for API key GX_PRO_001" },
  { id: "9", timestamp: new Date(Date.now() - 600000).toISOString(), level: "info", source: "system", message: "Auto-refresh cycle completed" },
  { id: "10", timestamp: new Date(Date.now() - 300000).toISOString(), level: "info", source: "database", message: "Dashboard metrics synced successfully" },
];

const LEVELS = ["all", "info", "warning", "error"];

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function SystemLogsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [levelFilter, setLevelFilter] = useState("all");
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS);

  const filtered = logs.filter((l) => levelFilter === "all" || l.level === levelFilter);

  function addLog() {
    const sources = ["server", "database", "webhook", "payment", "api"];
    const msgs = ["Heartbeat check passed", "Metrics updated", "Connection pool healthy", "Cache refreshed", "Background job completed"];
    const newLog: LogEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      level: "info",
      source: sources[Math.floor(Math.random() * sources.length)],
      message: msgs[Math.floor(Math.random() * msgs.length)],
    };
    setLogs((prev) => [newLog, ...prev]);
  }

  const levelColor = (level: string) => {
    if (level === "error") return colors.danger;
    if (level === "warning") return colors.warning;
    return colors.success;
  };

  const renderItem = ({ item }: { item: LogEntry }) => (
    <View style={[styles.logRow, { borderBottomColor: colors.border }]}>
      <View style={[styles.levelDot, { backgroundColor: levelColor(item.level) }]} />
      <View style={styles.logContent}>
        <View style={styles.logHeader}>
          <Text style={[styles.source, { color: colors.primary }]}>[{item.source}]</Text>
          <Text style={[styles.time, { color: colors.mutedForeground }]}>{fmtTime(item.timestamp)}</Text>
        </View>
        <Text style={[styles.message, { color: colors.foreground }]}>{item.message}</Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.toolbar, { borderBottomColor: colors.border }]}>
        <View style={styles.filterRow}>
          {LEVELS.map((l) => (
            <Pressable
              key={l}
              onPress={() => setLevelFilter(l)}
              style={[
                styles.filterBtn,
                {
                  backgroundColor: levelFilter === l ? colors.primary : colors.muted,
                  borderColor: levelFilter === l ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[styles.filterText, { color: levelFilter === l ? colors.primaryForeground : colors.mutedForeground }]}>
                {l === "all" ? "All" : l.toUpperCase().slice(0, 4)}
              </Text>
            </Pressable>
          ))}
        </View>
        <Pressable onPress={addLog} style={[styles.addBtn, { backgroundColor: colors.muted }]}>
          <Feather name="plus" size={16} color={colors.primary} />
        </Pressable>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 100 : insets.bottom + 32 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No logs for this filter</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  toolbar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  filterRow: { flexDirection: "row", gap: 6 },
  filterBtn: { borderRadius: 6, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 5 },
  filterText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  addBtn: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  logRow: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, gap: 10 },
  levelDot: { width: 6, height: 6, borderRadius: 3, marginTop: 6 },
  logContent: { flex: 1 },
  logHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  source: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  time: { fontSize: 11, fontFamily: "Inter_400Regular" },
  message: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyText: { fontSize: 15, fontFamily: "Inter_400Regular" },
});
