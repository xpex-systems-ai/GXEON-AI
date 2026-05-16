import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Stack } from "expo-router";
import { useColors } from "@/hooks/useColors";
import { getSupabase, isConfigured } from "@/lib/supabase";

type CheckResult = {
  key: string;
  label: string;
  status: "pass" | "fail" | "checking";
  value?: string;
};

export default function DiagnosticsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [checks, setChecks] = useState<CheckResult[]>([]);
  const [running, setRunning] = useState(false);

  const runChecks = useCallback(async () => {
    setRunning(true);
    const results: CheckResult[] = [];

    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    const domain = process.env.EXPO_PUBLIC_DOMAIN;
    const replId = process.env.EXPO_PUBLIC_REPL_ID;

    results.push({ key: "supabase_url", label: "EXPO_PUBLIC_SUPABASE_URL", status: supabaseUrl ? "pass" : "fail", value: supabaseUrl ? "SET" : "MISSING" });
    results.push({ key: "supabase_key", label: "EXPO_PUBLIC_SUPABASE_ANON_KEY", status: supabaseKey ? "pass" : "fail", value: supabaseKey ? "SET" : "MISSING" });
    results.push({ key: "domain", label: "EXPO_PUBLIC_DOMAIN", status: domain ? "pass" : "fail", value: domain ? domain.substring(0, 30) + "…" : "MISSING" });
    results.push({ key: "repl_id", label: "EXPO_PUBLIC_REPL_ID", status: replId ? "pass" : "fail", value: replId ? replId.substring(0, 12) + "…" : "MISSING" });
    setChecks([...results]);

    if (isConfigured()) {
      try {
        const { count, error } = await getSupabase()
          .from("global_transactions")
          .select("*", { count: "exact", head: true });
        results.push({ key: "db_ping", label: "Supabase DB Ping", status: error ? "fail" : "pass", value: error ? error.message : `${count ?? 0} rows in global_transactions` });
      } catch (e) {
        results.push({ key: "db_ping", label: "Supabase DB Ping", status: "fail", value: e instanceof Error ? e.message : "Connection failed" });
      }
    } else {
      results.push({ key: "db_ping", label: "Supabase DB Ping", status: "fail", value: "Skipped — credentials not set" });
    }

    if (domain) {
      try {
        const res = await fetch(`https://${domain}/api/healthz`);
        const json = await res.json();
        results.push({ key: "api_health", label: "API Server /healthz", status: res.ok ? "pass" : "fail", value: res.ok ? json.status ?? "ok" : `HTTP ${res.status}` });
      } catch (e) {
        results.push({ key: "api_health", label: "API Server /healthz", status: "fail", value: "Unreachable" });
      }
    } else {
      results.push({ key: "api_health", label: "API Server /healthz", status: "fail", value: "Skipped — domain not set" });
    }

    setChecks([...results]);
    setRunning(false);
  }, []);

  useEffect(() => { runChecks(); }, [runChecks]);

  const passCount = checks.filter((c) => c.status === "pass").length;
  const failCount = checks.filter((c) => c.status === "fail").length;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.container,
        { paddingBottom: Platform.OS === "web" ? 34 : insets.bottom + 20 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title: "Diagnostics", headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.foreground }} />

      {/* Summary banner */}
      <View style={[
        styles.banner,
        { backgroundColor: failCount === 0 ? colors.success + "15" : colors.destructive + "15", borderColor: failCount === 0 ? colors.success + "40" : colors.destructive + "40" },
      ]}>
        <View style={[styles.bannerDot, { backgroundColor: failCount === 0 ? colors.success : colors.destructive }]} />
        <Text style={[styles.bannerText, { color: failCount === 0 ? colors.success : colors.destructive }]}>
          {running ? "Running checks…" : failCount === 0 ? `All ${passCount} checks passed` : `${failCount} check${failCount > 1 ? "s" : ""} failed`}
        </Text>
        {running ? <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 4 }} /> : null}
      </View>

      {/* Check list */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {checks.map((check, i) => (
          <View
            key={check.key}
            style={[
              styles.checkRow,
              { borderBottomColor: colors.border, borderBottomWidth: i < checks.length - 1 ? StyleSheet.hairlineWidth : 0 },
            ]}
          >
            <View style={styles.checkLeft}>
              <Text style={[styles.checkLabel, { color: colors.foreground }]}>{check.label}</Text>
              <Text style={[styles.checkValue, { color: colors.mutedForeground }]} numberOfLines={1}>{check.value}</Text>
            </View>
            {check.status === "checking" ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <View style={[styles.statusBadge, { backgroundColor: check.status === "pass" ? colors.success + "20" : colors.destructive + "20" }]}>
                <Feather name={check.status === "pass" ? "check" : "x"} size={11} color={check.status === "pass" ? colors.success : colors.destructive} />
                <Text style={[styles.statusText, { color: check.status === "pass" ? colors.success : colors.destructive }]}>
                  {check.status === "pass" ? "PASS" : "FAIL"}
                </Text>
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Re-run button */}
      <TouchableOpacity
        onPress={runChecks}
        disabled={running}
        style={[styles.rerunBtn, { backgroundColor: colors.primary, opacity: running ? 0.6 : 1 }]}
      >
        <Feather name="refresh-cw" size={16} color="#fff" />
        <Text style={styles.rerunText}>Re-run Diagnostics</Text>
      </TouchableOpacity>

      {/* Troubleshooting tips */}
      <View style={[styles.tipsBox, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
        <Text style={[styles.tipsTitle, { color: colors.foreground }]}>Troubleshooting</Text>
        {[
          "Go to Replit Secrets and add EXPO_PUBLIC_SUPABASE_URL",
          "Add EXPO_PUBLIC_SUPABASE_ANON_KEY from your Supabase project",
          "Both values match the VITE_ vars used in the web dashboard",
          "EXPO_PUBLIC_DOMAIN is set automatically by the workflow",
        ].map((tip, i) => (
          <View key={i} style={styles.tip}>
            <Text style={[styles.tipNum, { color: colors.primary }]}>{i + 1}.</Text>
            <Text style={[styles.tipText, { color: colors.mutedForeground }]}>{tip}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 12 },
  banner: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: 10, borderWidth: 1 },
  bannerDot: { width: 8, height: 8, borderRadius: 4 },
  bannerText: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
  card: { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  checkRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12, gap: 12 },
  checkLeft: { flex: 1 },
  checkLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  checkValue: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 },
  statusText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  rerunBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 10 },
  rerunText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: "#fff" },
  tipsBox: { padding: 14, borderRadius: 10, borderWidth: 1, gap: 8 },
  tipsTitle: { fontSize: 13, fontFamily: "Inter_600SemiBold", marginBottom: 2 },
  tip: { flexDirection: "row", gap: 6 },
  tipNum: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  tipText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
