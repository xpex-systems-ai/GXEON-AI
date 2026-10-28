import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export const backupCipher = "OpenSSL CMS AuthEnvelopedData / AES-256-GCM";
const maximumDumpBytes = 16 * 1024 * 1024;
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const environment = () => Object.fromEntries(["PATH", "Path", "SystemRoot", "WINDIR", "COMSPEC", "PATHEXT", "HOME", "USERPROFILE", "TEMP", "TMP"]
  .filter(key => process.env[key]).map(key => [key, process.env[key]]));

function run(args, input, maximum, openssl) {
  try {
    return execFileSync(openssl ?? process.env.GXEON_OPENSSL_BIN ?? "openssl", args, {
      input, env: environment(), timeout: 30000, maxBuffer: maximum,
      stdio: ["pipe", "pipe", "pipe"], windowsHide: true,
    });
  } catch (error) {
    // OpenSSL may stream unauthenticated plaintext before rejecting a GCM tag.
    // Never expose that output or write it to the requested destination.
    if (Buffer.isBuffer(error.stdout)) error.stdout.fill(0);
    throw new Error("BACKUP_OPENSSL_OPERATION_FAILED");
  }
}

function boundedFile(filename, maximum) {
  let descriptor;
  try {
    if (!fs.lstatSync(filename).isFile()) throw new Error();
    descriptor = fs.openSync(filename, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
    const info = fs.fstatSync(descriptor);
    if (!info.isFile() || info.size < 1 || info.size > maximum) throw new Error();
    const bytes = Buffer.allocUnsafe(info.size + 1); let used = 0;
    while (used < bytes.length) {
      const count = fs.readSync(descriptor, bytes, used, bytes.length - used, null);
      if (!count) break;
      used += count;
    }
    if (used !== info.size || fs.fstatSync(descriptor).size !== info.size) { bytes.fill(0); throw new Error(); }
    return bytes.subarray(0, used);
  } catch { throw new Error("BACKUP_BOUNDED_REGULAR_FILE_REQUIRED"); }
  finally { if (descriptor !== undefined) fs.closeSync(descriptor); }
}

function exclusiveTarget(filename) {
  if (fs.existsSync(filename)) throw new Error("BACKUP_DESTINATION_EXISTS_NO_OVERWRITE");
  if (!fs.lstatSync(path.dirname(path.resolve(filename))).isDirectory()) throw new Error("BACKUP_PRIVATE_DIRECTORY_REQUIRED");
}
function writeExclusive(filename, bytes) {
  try { fs.writeFileSync(filename, bytes, { flag: "wx", mode: 0o600 }); }
  catch { throw new Error("BACKUP_EXCLUSIVE_WRITE_FAILED"); }
}
function boundedMaximum(value = maximumDumpBytes) {
  if (!Number.isSafeInteger(value) || value < 1 || value > maximumDumpBytes) throw new Error("BACKUP_LIMIT_INVALID");
  return value;
}

// This synthetic recipient is deliberately separate from web/database TLS keys.
// It is never installed in a trust store or mounted in the API container.
export function createSyntheticBackupRecipient(privateDirectory, { openssl } = {}) {
  const dir = path.join(privateDirectory, "backup-recipient");
  try { fs.mkdirSync(dir, { mode: 0o700 }); }
  catch { throw new Error("BACKUP_RECIPIENT_EXISTS_OR_DIRECTORY_UNAVAILABLE"); }
  const privateKey = path.join(dir, "recipient.key"), certificate = path.join(dir, "recipient.crt");
  const key = run(["genpkey", "-algorithm", "RSA", "-pkeyopt", "rsa_keygen_bits:2048"], undefined, 64 * 1024, openssl);
  try { writeExclusive(privateKey, key); } finally { key.fill(0); }
  const cert = run(["req", "-new", "-x509", "-key", privateKey, "-sha256", "-days", "14",
    "-subj", "/CN=OMNIX synthetic backup recipient", "-addext", "basicConstraints=critical,CA:FALSE",
    "-addext", "keyUsage=critical,keyEncipherment"], undefined, 64 * 1024, openssl);
  writeExclusive(certificate, cert);
  return { certificate, privateKey };
}

export function encryptBackup({ inputFile, outputFile, certificate, maximumBytes, openssl }) {
  const maximum = boundedMaximum(maximumBytes);
  exclusiveTarget(outputFile);
  const plaintext = boundedFile(inputFile, maximum);
  boundedFile(certificate, 64 * 1024);
  let ciphertext;
  try {
    ciphertext = run(["cms", "-encrypt", "-binary", "-outform", "DER", "-aes-256-gcm", "-recip", certificate,
      "-keyopt", "rsa_padding_mode:oaep", "-keyopt", "rsa_oaep_md:sha256"], plaintext, maximum + 64 * 1024, openssl);
    writeExclusive(outputFile, ciphertext);
    return { cipher: backupCipher, plaintextBytes: plaintext.length, plaintextSha256: sha256(plaintext),
      encryptedBytes: ciphertext.length, encryptedSha256: sha256(ciphertext) };
  } finally { plaintext.fill(0); }
}

export function decryptBackup({ inputFile, outputFile, certificate, privateKey, maximumBytes, openssl }) {
  const maximum = boundedMaximum(maximumBytes);
  exclusiveTarget(outputFile);
  const ciphertext = boundedFile(inputFile, maximum + 64 * 1024);
  boundedFile(certificate, 64 * 1024);
  const key = boundedFile(privateKey, 64 * 1024); key.fill(0);
  // Refuse unauthenticated CMS/CBC substitutions. This is OpenSSL's parser,
  // not an implementation of ASN.1, encryption, or tag verification in JS.
  const description = run(["cms", "-cmsout", "-print", "-inform", "DER"], ciphertext,
    8 * (maximum + 64 * 1024), openssl).toString("utf8");
  if (!/^\s*contentType: id-smime-ct-authEnvelopedData \(1\.2\.840\.113549\.1\.9\.16\.1\.23\)$/m.test(description) ||
      !/^\s*algorithm: aes-256-gcm \(2\.16\.840\.1\.101\.3\.4\.1\.46\)$/m.test(description)) {
    throw new Error("BACKUP_AUTHENTICATED_AES256_GCM_REQUIRED");
  }
  const plaintext = run(["cms", "-decrypt", "-binary", "-inform", "DER", "-recip", certificate,
    "-inkey", privateKey], ciphertext, maximum, openssl);
  try {
    if (!plaintext.length || plaintext.length > maximum) throw new Error("BACKUP_PLAINTEXT_LIMIT_EXCEEDED");
    writeExclusive(outputFile, plaintext);
    return { cipher: backupCipher, plaintextBytes: plaintext.length, plaintextSha256: sha256(plaintext),
      encryptedBytes: ciphertext.length, encryptedSha256: sha256(ciphertext) };
  } finally { plaintext.fill(0); }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [operation, inputFile, certificate, third, fourth, extra] = process.argv.slice(2);
    if (operation === "encrypt" && third && !fourth) console.log(JSON.stringify(encryptBackup({ inputFile, certificate, outputFile: third })));
    else if (operation === "decrypt" && third && fourth && !extra) console.log(JSON.stringify(decryptBackup({ inputFile, certificate, privateKey: third, outputFile: fourth })));
    else throw new Error("BACKUP_COMMAND_ARGUMENTS_REQUIRED");
  } catch (error) {
    console.error(JSON.stringify({ event: "BACKUP_FAILED", code: /^[A-Z0-9_]+$/.test(error.message) ? error.message : "BACKUP_OPERATION_FAILED" }));
    process.exitCode = 1;
  }
}
