import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

type StatusBadgeProps = {
  status: string;
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const colors = useColors();

  const s = status?.toUpperCase?.() ?? status;
  let bg = colors.muted;
  let fg = colors.mutedForeground;

  if (s === "PAID" || s === "ACTIVE" || s === "LIVE" || s === "STABLE" || s === "OK" || s === "PASS") {
    bg = `${colors.success}22`;
    fg = colors.success;
  } else if (s === "PENDING" || s === "DEGRADED" || s === "WARN") {
    bg = `${colors.warning}22`;
    fg = colors.warning;
  } else if (s === "FAILED" || s === "ERROR" || s === "CRITICAL" || s === "BLOCKED") {
    bg = `${colors.danger}22`;
    fg = colors.danger;
  }

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: fg }]}>{s}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
});
