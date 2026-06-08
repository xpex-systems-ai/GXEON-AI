import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const STATE_VERSION = "gxeon-gh-p3-v1";
const DEFAULT_MAX_AGE_MS = 10 * 60 * 1000;

export type GitHubOAuthStatePayload = {
  version: typeof STATE_VERSION;
  nonce: string;
  issuedAt: number;
  returnPath: string;
};

export type GitHubOAuthStateValidation =
  | { valid: true; payload: GitHubOAuthStatePayload }
  | {
      valid: false;
      errorCode:
        | "STATE_MISSING"
        | "STATE_MALFORMED"
        | "STATE_INVALID_SIGNATURE"
        | "STATE_EXPIRED"
        | "STATE_INVALID_RETURN_PATH";
    };

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function fromBase64url(input: string): Buffer {
  const padded = input
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(input.length / 4) * 4, "=");
  return Buffer.from(padded, "base64");
}

function sign(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret)
    .update(encodedPayload)
    .digest("base64url");
}

function safeReturnPath(returnPath: string): boolean {
  return (
    returnPath.startsWith("/") &&
    !returnPath.startsWith("//") &&
    !returnPath.includes("\\")
  );
}

export function createGitHubOAuthState({
  secret,
  returnPath = "/ops/connectors/github",
  now = Date.now(),
}: {
  secret: string;
  returnPath?: string;
  now?: number;
}): { state: string; issuedAt: string } {
  if (!safeReturnPath(returnPath)) {
    throw new Error("Invalid GitHub OAuth return path.");
  }

  const payload: GitHubOAuthStatePayload = {
    version: STATE_VERSION,
    nonce: randomBytes(16).toString("hex"),
    issuedAt: now,
    returnPath,
  };
  const encodedPayload = base64url(JSON.stringify(payload));
  return {
    state: `${encodedPayload}.${sign(encodedPayload, secret)}`,
    issuedAt: new Date(now).toISOString(),
  };
}

export function validateGitHubOAuthState({
  state,
  secret,
  maxAgeMs = DEFAULT_MAX_AGE_MS,
  now = Date.now(),
}: {
  state: string | null | undefined;
  secret: string;
  maxAgeMs?: number;
  now?: number;
}): GitHubOAuthStateValidation {
  if (!state) return { valid: false, errorCode: "STATE_MISSING" };

  const [encodedPayload, signature, extra] = state.split(".");
  if (!encodedPayload || !signature || extra) {
    return { valid: false, errorCode: "STATE_MALFORMED" };
  }

  const expected = sign(encodedPayload, secret);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return { valid: false, errorCode: "STATE_INVALID_SIGNATURE" };
  }

  try {
    const payload = JSON.parse(
      fromBase64url(encodedPayload).toString("utf8"),
    ) as GitHubOAuthStatePayload;
    if (
      payload.version !== STATE_VERSION ||
      !safeReturnPath(payload.returnPath)
    ) {
      return { valid: false, errorCode: "STATE_INVALID_RETURN_PATH" };
    }
    if (
      !Number.isFinite(payload.issuedAt) ||
      now - payload.issuedAt > maxAgeMs ||
      payload.issuedAt > now + 60_000
    ) {
      return { valid: false, errorCode: "STATE_EXPIRED" };
    }
    return { valid: true, payload };
  } catch {
    return { valid: false, errorCode: "STATE_MALFORMED" };
  }
}
