import type { R100DatabaseMirrorActivationPlan, R100DatabaseMirrorReadiness } from "./r100DatabaseMirrorTypes";

export function buildR100DatabaseMirrorActivationPlan(readiness: R100DatabaseMirrorReadiness): R100DatabaseMirrorActivationPlan {
  return {
    status: "R100_DB_MIRROR_ACTIVATION_PLAN_P2",
    mode: "MANUAL_FIRST",
    currentReadiness: readiness,
    checklist: [
      "Verify DATABASE_URL exists in the API server environment only; do not paste it into the frontend.",
      "If schemaReady is false, run the database migration/push that creates r100_state_snapshots and r100_state_audit_events.",
      "Run GET /api/r100-db/readiness and confirm schemaReady=true.",
      "Set GXEON_R100_DB_MIRROR_ENABLED=true in the backend only after schema readiness passes.",
      "Redeploy the API server so the backend reads the updated environment flag.",
      "Run the safe DB probe with action CREATE_SAFE_R100_DB_MIRROR_PROBE.",
      "Export the safe redacted snapshot with action EXPORT_SAFE_R100_SNAPSHOT_TO_DB_MIRROR.",
      "Verify the dashboard latest snapshot and snapshot count in /ops/r100-db-mirror.",
    ],
    rollback: ["Remove GXEON_R100_DB_MIRROR_ENABLED or set it to false in the backend environment.", "Redeploy the API server and confirm safeToWrite=false."],
    warnings: ["This is not payment settlement.", "No provider revenue is verified by this mirror.", "providerVerifiedRevenueBrl remains 0 and realRevenueClaimedAutomatically remains false."],
    safety: readiness.safety,
  };
}
