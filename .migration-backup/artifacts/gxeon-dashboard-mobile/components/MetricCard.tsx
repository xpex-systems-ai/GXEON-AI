import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

type MetricCardProps = {
  label: string;
  value: string;
  sub?: string;
  accent?: "primary" | "success" | "warning" | "destructive";
};

export function MetricCard({ label, value, sub, accent }: MetricCardProps) {
  const colors = useColors();

  const accentColor =
    accent === "success"
      ? colors.success
      : accent === "warning"
        ? colors.warning
        : accent === "destructive"
          ? colors.destructive
          : colors.primary;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderLeftColor: accentColor,
        },
      ]}
    >
      <Text style={[styles.label, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <Text style={[styles.value, { color: colors.foreground }]}>{value}</Text>
      {sub ? (
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          {sub}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderLeftWidth: 3,
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  value: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  sub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
