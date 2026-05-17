import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import { getSupabase, isConfigured } from "@/lib/supabase";
import { formatCurrency, formatDate } from "@/lib/format";

type Transaction = {
  id: string;
  transaction_id?: string | null;
  actor_code?: string | null;
  base_amount: number;
  status: string;
  created_at: string;
  gateway_provider?: string | null;
  updated_at?: string | null;
  currency?: string | null;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  [key: string]: unknown;
};

type Actor = {
  id: string;
  code?: string | null;
  name?: string | null;
  type?: string | null;
  status?: string | null;
  created_at?: string | null;
};

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [actor, setActor] = useState<Actor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!isConfigured()) {
      setError("Supabase not configured.");
      setLoading(false);
      return;
    }
    try {
      const db = getSupabase();
      const { data: txData, error: txErr } = await db
        .from("global_transactions")
        .select("*")
        .eq("id", id)
        .single();
      if (txErr) throw txErr;
      setTransaction(txData as Transaction);

      if (txData?.actor_code) {
        const { data: actorData } = await db
          .from("actors")
          .select("*")
          .eq("code", txData.actor_code)
          .maybeSingle();
        setActor(actorData as Actor | null);
      }
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load transaction");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const statusColor =
    transaction?.status === "PAID"
      ? colors.success
      : transaction?.status === "PENDING"
        ? colors.warning
        : colors.destructive;

  const statusBg =
    transaction?.status === "PAID"
      ? colors.success + "20"
      : transaction?.status === "PENDING"
        ? colors.warning + "20"
        : colors.destructive + "20";

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom + 24;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: "Transaction Detail",
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
          headerTitleStyle: { fontFamily: "Inter_600SemiBold" },
        }}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : error ? (
        <View style={[styles.errorBox, { backgroundColor: colors.destructive + "20" }]}>
          <Feather name="alert-circle" size={14} color={colors.destructive} />
          <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
        </View>
      ) : transaction ? (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPad }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Status + Amount Hero */}
          <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {transaction.status}
              </Text>
            </View>
            <Text style={[styles.heroAmount, { color: colors.foreground }]}>
              {formatCurrency(transaction.base_amount)}
            </Text>
            {transaction.currency && transaction.currency !== "BRL" ? (
              <Text style={[styles.currency, { color: colors.mutedForeground }]}>
                {transaction.currency}
              </Text>
            ) : null}
          </View>

          {/* Transaction Info */}
          <SectionHeader title="Transaction" colors={colors} />
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <DetailRow
              label="Full ID"
              value={transaction.id}
              colors={colors}
              mono
            />
            {transaction.transaction_id ? (
              <DetailRow
                label="Transaction ID"
                value={transaction.transaction_id}
                colors={colors}
                mono
                divider
              />
            ) : null}
            {transaction.gateway_provider ? (
              <DetailRow
                label="Gateway"
                value={transaction.gateway_provider}
                colors={colors}
                divider
              />
            ) : null}
            {transaction.description ? (
              <DetailRow
                label="Description"
                value={transaction.description}
                colors={colors}
                divider
              />
            ) : null}
            <DetailRow
              label="Created"
              value={formatDate(transaction.created_at)}
              colors={colors}
              divider
            />
            {transaction.updated_at && transaction.updated_at !== transaction.created_at ? (
              <DetailRow
                label="Updated"
                value={formatDate(transaction.updated_at as string)}
                colors={colors}
                divider
              />
            ) : null}
          </View>

          {/* Actor Info */}
          {(transaction.actor_code || actor) ? (
            <>
              <SectionHeader title="Actor" colors={colors} />
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {transaction.actor_code ? (
                  <DetailRow
                    label="Code"
                    value={transaction.actor_code}
                    colors={colors}
                    mono
                  />
                ) : null}
                {actor?.name ? (
                  <DetailRow
                    label="Name"
                    value={actor.name}
                    colors={colors}
                    divider
                  />
                ) : null}
                {actor?.type ? (
                  <DetailRow
                    label="Type"
                    value={actor.type}
                    colors={colors}
                    divider
                  />
                ) : null}
                {actor?.status ? (
                  <DetailRow
                    label="Status"
                    value={actor.status}
                    colors={colors}
                    divider
                  />
                ) : null}
                {actor?.created_at ? (
                  <DetailRow
                    label="Member since"
                    value={formatDate(actor.created_at)}
                    colors={colors}
                    divider
                  />
                ) : null}
              </View>
            </>
          ) : null}

          {/* Status history — rendered if present as a top-level field */}
          {Array.isArray(transaction.status_history) && (transaction.status_history as unknown[]).length > 0 ? (
            <>
              <SectionHeader title="Status History" colors={colors} />
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {(transaction.status_history as Record<string, unknown>[]).map((entry, i) => {
                  const entryStatus = String(entry.status ?? entry.state ?? "");
                  const entryTime = entry.created_at ?? entry.timestamp ?? entry.at ?? entry.time;
                  const entryNote = entry.note ?? entry.reason ?? entry.message;
                  const histStatusColor =
                    entryStatus === "PAID"
                      ? colors.success
                      : entryStatus === "PENDING"
                        ? colors.warning
                        : entryStatus === "FAILED"
                          ? colors.destructive
                          : colors.mutedForeground;
                  const histStatusBg = histStatusColor + "20";
                  return (
                    <View key={i}>
                      {i > 0 ? <View style={[styles.divider, { backgroundColor: colors.border }]} /> : null}
                      <View style={styles.historyRow}>
                        <View style={[styles.historyDot, { backgroundColor: histStatusColor }]} />
                        <View style={styles.historyContent}>
                          <View style={styles.historyTop}>
                            <View style={[styles.statusBadge, { backgroundColor: histStatusBg }]}>
                              <Text style={[styles.statusText, { color: histStatusColor }]}>
                                {entryStatus || "UNKNOWN"}
                              </Text>
                            </View>
                            {entryTime ? (
                              <Text style={[styles.historyTime, { color: colors.mutedForeground }]}>
                                {formatDate(String(entryTime))}
                              </Text>
                            ) : null}
                          </View>
                          {entryNote ? (
                            <Text style={[styles.historyNote, { color: colors.mutedForeground }]}>
                              {String(entryNote)}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          ) : null}

          {/* Metadata object rendered as key/value pairs */}
          {transaction.metadata &&
          typeof transaction.metadata === "object" &&
          Object.keys(transaction.metadata).length > 0 ? (
            <>
              <SectionHeader title="Metadata" colors={colors} />
              <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                {Object.entries(transaction.metadata).map(([key, val], i) => (
                  <DetailRow
                    key={key}
                    label={key}
                    value={typeof val === "object" ? JSON.stringify(val, null, 2) : String(val ?? "")}
                    colors={colors}
                    divider={i > 0}
                  />
                ))}
              </View>
            </>
          ) : null}

          {/* All remaining fields not shown in curated sections */}
          {(() => {
            const CURATED = new Set([
              "id", "transaction_id", "actor_code", "base_amount", "status",
              "created_at", "updated_at", "gateway_provider", "currency",
              "description", "metadata", "status_history",
            ]);
            const extra = Object.entries(transaction).filter(
              ([key, val]) => !CURATED.has(key) && val !== null && val !== undefined && val !== ""
            );
            if (extra.length === 0) return null;
            return (
              <>
                <SectionHeader title="Additional Fields" colors={colors} />
                <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  {extra.map(([key, val], i) => (
                    <DetailRow
                      key={key}
                      label={key}
                      value={typeof val === "object" ? JSON.stringify(val, null, 2) : String(val)}
                      colors={colors}
                      divider={i > 0}
                    />
                  ))}
                </View>
              </>
            );
          })()}
        </ScrollView>
      ) : null}
    </View>
  );
}

function SectionHeader({
  title,
  colors,
}: {
  title: string;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
}) {
  return (
    <Text style={[styles.sectionHeader, { color: colors.mutedForeground }]}>
      {title.toUpperCase()}
    </Text>
  );
}

function DetailRow({
  label,
  value,
  colors,
  mono = false,
  divider = false,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof import("@/hooks/useColors").useColors>;
  mono?: boolean;
  divider?: boolean;
}) {
  return (
    <>
      {divider ? (
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
      ) : null}
      <View style={styles.detailRow}>
        <Text style={[styles.detailLabel, { color: colors.mutedForeground }]}>
          {label}
        </Text>
        <Text
          style={[
            styles.detailValue,
            { color: colors.foreground },
            mono && styles.mono,
          ]}
          selectable
          numberOfLines={0}
        >
          {value}
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  errorBox: {
    flexDirection: "row",
    gap: 8,
    padding: 12,
    margin: 16,
    borderRadius: 8,
  },
  errorText: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
  scrollContent: { padding: 16, gap: 0 },
  heroCard: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 24,
    gap: 10,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  heroAmount: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    letterSpacing: -1,
    fontVariant: ["tabular-nums"],
  },
  currency: { fontSize: 13, fontFamily: "Inter_400Regular" },
  sectionHeader: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    marginBottom: 6,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  card: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 20,
    overflow: "hidden",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingVertical: 11,
    paddingHorizontal: 14,
    gap: 12,
  },
  detailLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    flexShrink: 0,
    width: 110,
  },
  detailValue: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flex: 1,
    textAlign: "right",
  },
  mono: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 14 },
  historyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  historyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
    flexShrink: 0,
  },
  historyContent: { flex: 1, gap: 4 },
  historyTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  historyTime: { fontSize: 11, fontFamily: "Inter_400Regular" },
  historyNote: { fontSize: 12, fontFamily: "Inter_400Regular" },
});
