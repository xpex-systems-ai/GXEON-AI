import assert from "node:assert/strict";
import { selectR100DatabaseMirrorActivationStage } from "./r100DatabaseMirrorOperatorSummary";

assert.equal(selectR100DatabaseMirrorActivationStage({ databaseConfigured: false, schemaReady: false, schemaApplyEnabled: false, mirrorEnabled: false, snapshotCount: 0 }), "DB_NOT_CONFIGURED");
assert.equal(selectR100DatabaseMirrorActivationStage({ databaseConfigured: true, schemaReady: false, schemaApplyEnabled: true, mirrorEnabled: false, snapshotCount: 0 }), "SCHEMA_MISSING");
assert.equal(selectR100DatabaseMirrorActivationStage({ databaseConfigured: true, schemaReady: false, schemaApplyEnabled: false, mirrorEnabled: false, snapshotCount: 0 }), "SCHEMA_APPLY_FLAG_REQUIRED");
assert.equal(selectR100DatabaseMirrorActivationStage({ databaseConfigured: true, schemaReady: true, schemaApplyEnabled: false, mirrorEnabled: false, snapshotCount: 0 }), "SCHEMA_READY_MIRROR_DISABLED");
assert.equal(selectR100DatabaseMirrorActivationStage({ databaseConfigured: true, schemaReady: true, schemaApplyEnabled: false, mirrorEnabled: true, snapshotCount: 0 }), "MIRROR_READY_NO_SNAPSHOT");
assert.equal(selectR100DatabaseMirrorActivationStage({ databaseConfigured: true, schemaReady: true, schemaApplyEnabled: false, mirrorEnabled: true, snapshotCount: 1 }), "SNAPSHOT_EXPORTED");
assert.equal(selectR100DatabaseMirrorActivationStage({ databaseConfigured: true, schemaReady: true, schemaApplyEnabled: false, mirrorEnabled: true, snapshotCount: 0, metadataHealthy: false }), "UNHEALTHY_SAFE_FALLBACK");
