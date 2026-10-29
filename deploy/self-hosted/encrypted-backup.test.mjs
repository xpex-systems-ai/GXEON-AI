import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { after, test } from "node:test";
import { backupCipher, createSyntheticBackupRecipient, encryptBackup, decryptBackup } from "./encrypted-backup.mjs";

const openssl = process.env.GXEON_OPENSSL_BIN ?? "openssl";
const directory = fs.mkdtempSync(path.join(os.tmpdir(), "gxeon-encrypted-backup-"));
fs.chmodSync(directory, 0o700);
after(() => {
  const resolved = fs.realpathSync(directory), temporaryRoot = fs.realpathSync(os.tmpdir());
  assert.equal(path.dirname(resolved), temporaryRoot);
  assert.ok(path.basename(resolved).startsWith("gxeon-encrypted-backup-"));
  fs.rmSync(resolved, { recursive: true });
});
function profile(name) {
  const dir = path.join(directory, name); fs.mkdirSync(dir, { mode: 0o700 });
  return { dir, ...createSyntheticBackupRecipient(dir, { openssl }) };
}
const owner = profile("owner"), other = profile("other");
const inputFile = path.join(owner.dir, "synthetic.sql");
const data = Buffer.from("-- TEST DATA only\r\nSELECT 'synthetic íntegro';\n\0binary fidelity\n");
fs.writeFileSync(inputFile, data, { flag: "wx", mode: 0o600 });

test("OpenSSL authenticated CMS AES-256-GCM roundtrip uses exclusive outputs and publishes only digest/size/cipher", () => {
  const outputFile = path.join(owner.dir, "roundtrip.cms");
  const encrypted = encryptBackup({ inputFile, outputFile, certificate: owner.certificate, openssl });
  assert.equal(encrypted.cipher, backupCipher);
  assert.equal(encrypted.plaintextBytes, data.length);
  assert.ok(encrypted.encryptedBytes > data.length);
  assert.equal(fs.readFileSync(outputFile).includes(data), false);
  assert.deepEqual(Object.keys(encrypted).sort(), ["cipher", "encryptedBytes", "encryptedSha256", "plaintextBytes", "plaintextSha256"]);
  const restored = path.join(owner.dir, "authenticated.sql");
  const decrypted = decryptBackup({ inputFile: outputFile, outputFile: restored, certificate: owner.certificate, privateKey: owner.privateKey, openssl });
  assert.deepEqual(decrypted, encrypted);
  assert.deepEqual(fs.readFileSync(restored), data);
  assert.deepEqual(fs.readFileSync(inputFile), data);
  const previous = fs.readFileSync(outputFile);
  assert.throws(() => encryptBackup({ inputFile, outputFile, certificate: owner.certificate, openssl }), /NO_OVERWRITE/);
  assert.deepEqual(fs.readFileSync(outputFile), previous);
  assert.throws(() => decryptBackup({ inputFile: outputFile, outputFile: restored, ...owner, openssl }), /NO_OVERWRITE/);
  assert.deepEqual(fs.readFileSync(restored), data);
  assert.throws(() => createSyntheticBackupRecipient(owner.dir, { openssl }), /RECIPIENT_EXISTS/);
  if (process.platform !== "win32") for (const filename of [outputFile, restored, owner.privateKey]) assert.equal(fs.statSync(filename).mode & 0o777, 0o600);
});

test("tamper, wrong recipient/key and unauthenticated CMS substitution leave no plaintext file", () => {
  const encryptedFile = path.join(owner.dir, "security.cms");
  encryptBackup({ inputFile, outputFile: encryptedFile, certificate: owner.certificate, openssl });
  const damaged = fs.readFileSync(encryptedFile); damaged[damaged.length - 1] ^= 1;
  const tamperedFile = path.join(owner.dir, "tampered.cms"); fs.writeFileSync(tamperedFile, damaged, { flag: "wx", mode: 0o600 });
  const cbcFile = path.join(owner.dir, "unauthenticated.cms");
  const cbc = execFileSync(openssl, ["cms", "-encrypt", "-binary", "-outform", "DER", "-aes-256-cbc", owner.certificate],
    { input: data, timeout: 30000, maxBuffer: 64 * 1024, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
  fs.writeFileSync(cbcFile, cbc, { flag: "wx", mode: 0o600 });
  for (const [name, file, recipient, key] of [
    ["tampered", tamperedFile, owner.certificate, owner.privateKey],
    ["wrong-recipient", encryptedFile, other.certificate, other.privateKey],
    ["wrong-key", encryptedFile, owner.certificate, other.privateKey],
    ["unauthenticated", cbcFile, owner.certificate, owner.privateKey],
  ]) {
    const outputFile = path.join(owner.dir, name + ".sql");
    assert.throws(() => decryptBackup({ inputFile: file, outputFile, certificate: recipient, privateKey: key, openssl }),
      /BACKUP_(OPENSSL_OPERATION_FAILED|AUTHENTICATED_AES256_GCM_REQUIRED)/);
    assert.equal(fs.existsSync(outputFile), false, name + " must not publish unauthenticated plaintext");
  }
  assert.deepEqual(fs.readFileSync(inputFile), data);
});

test("backup bounds and command failures refuse output without leaking plaintext, keys or private paths", () => {
  const absent = path.join(owner.dir, "limit.cms");
  assert.throws(() => encryptBackup({ inputFile, outputFile: absent, certificate: owner.certificate, maximumBytes: data.length - 1, openssl }), /BOUNDED_REGULAR_FILE/);
  assert.equal(fs.existsSync(absent), false);
  assert.throws(() => encryptBackup({ inputFile, outputFile: absent, certificate: owner.certificate, maximumBytes: 17 * 1024 * 1024, openssl }), /LIMIT_INVALID/);
  const script = fileURLToPath(new URL("./encrypted-backup.mjs", import.meta.url));
  const encryptedFile = path.join(owner.dir, "security.cms");
  const failed = spawnSync(process.execPath, [script, "decrypt", encryptedFile, owner.certificate, other.privateKey, path.join(owner.dir, "cli-failed.sql")],
    { env: { ...process.env, GXEON_OPENSSL_BIN: openssl }, encoding: "utf8", timeout: 30000, windowsHide: true });
  assert.equal(failed.status, 1);
  assert.equal(failed.stdout, "");
  assert.deepEqual(JSON.parse(failed.stderr), { event: "BACKUP_FAILED", code: "BACKUP_OPENSSL_OPERATION_FAILED" });
  assert.equal(fs.existsSync(path.join(owner.dir, "cli-failed.sql")), false);
  assert.equal(failed.stderr.includes(directory), false);
  assert.equal(failed.stderr.includes("PRIVATE KEY"), false);
  assert.equal(failed.stderr.includes(data.toString("utf8")), false);
});
