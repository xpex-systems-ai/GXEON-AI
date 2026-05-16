import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";
import { formatCurrency, formatDate } from "@/lib/format";

type Transaction = {
  id: string;
  transaction_id?: string;
  actor_code?: string;
  base_amount: number;
  status: string;
  created_at: string;
  gateway_provider?: string;
};

type TransactionRowProps = {
  tx: Transaction;
};

export function TransactionRow({ tx }: TransactionRowProps) {
  const colors = useColors();

  const statusColor =
    tx.status === "PAID"
      ? colors.success
      : tx.status === "PENDING"
        ? colors.warning
        : colors.destructive;

  const statusBg =
    tx.status === "PAID"
      ? colors.success + "20"
      : tx.status === "PENDING"
        ? colors.warning + "20"
        : colors.destructive + "20";

  return (
    <View
      style={[
        styles.row,
        { borderBottomColor: colors.border },
      ]}
    >
      <View style={styles.left}>
        <Text style={[styles.txId, { color: colors.foreground }]}>
          {tx.transaction_id?.substring(0, 12) ?? tx.id.substring(0, 8)}
        </Text>
        <View style={styles.meta}>
          {tx.actor_code ? (
            <View
              style={[
                styles.badge,
                { backgroundColor: colors.secondary },
              ]}
            >
              <Text style={[styles.badgeText, { color: colors.mutedForeground }]}>
                {tx.actor_code}
              </Text>
            </View>
          ) : null}
          <Text style={[styles.date, { color: colors.mutedForeground }]}>
            {formatDate(tx.created_at)}
          </Text>
        </View>
      </View>
      <View style={styles.right}>
        <Text style={[styles.amount, { color: colors.foreground }]}>
          {formatCurrency(tx.base_amount)}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {tx.status}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  left: { flex: 1, gap: 4 },
  right: { alignItems: "flex-end", gap: 4 },
  txId: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    fontVariant: ["tabular-nums"],
  },
  meta: { flexDirection: "row", alignItems: "center", gap: 6 },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  date: { fontSize: 11, fontFamily: "Inter_400Regular" },
  amount: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    fontVariant: ["tabular-nums"],
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
});
