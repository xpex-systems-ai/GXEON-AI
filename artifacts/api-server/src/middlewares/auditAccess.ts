import { timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";

function equal(a: string, b: string) {
  const left = Buffer.from(a),
    right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
export function auditAccess(
  role: "operator" | "reviewer" | "read",
): RequestHandler {
  return (req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    const header = req.get("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token) {
      res.status(401).json({
        ok: false,
        code: "AUTH_REQUIRED",
        message: "Bearer authorization is required.",
      });
      return;
    }
    const operator = process.env.GXEON_AUDIT_OPERATOR_TOKEN ?? "";
    const reviewer = process.env.GXEON_AUDIT_REVIEWER_TOKEN ?? "";
    const independent = reviewer && operator && !equal(reviewer, operator);
    const valid =
      role === "operator"
        ? operator && equal(token, operator)
        : role === "reviewer"
          ? independent && equal(token, reviewer)
          : (operator && equal(token, operator)) ||
            (independent && equal(token, reviewer));
    if (!valid) {
      res.status(403).json({
        ok: false,
        code: "ACCESS_DENIED",
        message: "Credential does not grant the required audit role.",
      });
      return;
    }
    next();
  };
}
