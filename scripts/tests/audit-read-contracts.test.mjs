import assert from "node:assert/strict";
import { test } from "node:test";
import {
  parseAuditRows,
  parseAuditCaseRows,
} from "../../artifacts/api-server/src/services/auditReadContracts.ts";

test("returns a safe empty collection when API returns []", () => {
  assert.deepEqual(parseAuditRows([]), []);
  assert.deepEqual(parseAuditCaseRows([]), []);
});
test("retains documented rows without inventing values", () => {
  const rows = [{ id: "case-1", status: "DRAFT", scoreCount: 0 }];
  assert.deepEqual(parseAuditCaseRows(rows), rows);
});
test("rejects malformed Supabase REST list payload, not silent empty", () => {
  assert.throws(() => parseAuditRows({ message: "Unauthorized" }), /AUDIT_REST_ROWS_INVALID/);
  assert.throws(() => parseAuditRows("not json rows"), /AUDIT_REST_ROWS_INVALID/);
  assert.throws(() => parseAuditRows([null]), /AUDIT_REST_ROWS_INVALID/);
  assert.throws(() => parseAuditRows([[1, 2]]), /AUDIT_REST_ROWS_INVALID/);
});
test("case rows require explicit source identifiers", () => {
  assert.throws(() => parseAuditCaseRows([{}]), /AUDIT_REST_CASE_ID_INVALID/);
  assert.throws(() => parseAuditCaseRows([{ id: " " }]), /AUDIT_REST_CASE_ID_INVALID/);
  assert.throws(() => parseAuditCaseRows([{ id: 123 }]), /AUDIT_REST_CASE_ID_INVALID/);
});
test("pure validation leaves original read-only evidence unchanged", () => {
  const rows = Object.freeze([Object.freeze({ id: "record-1", metadata: { noWrite: true } })]);
  assert.equal(parseAuditRows(rows), rows);
});
