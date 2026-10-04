#!/usr/bin/env node
// Fails when a committed file looks like it carries a real credential.
//
// The repository is public, so a leaked bot token or provider key is not a
// cleanup task but a rotation. The patterns below are deliberately narrow:
// they match the shapes this project actually uses (Telegram bot tokens,
// Reasonix serve tokens, provider keys, bearer headers) and ignore the
// placeholders that live in .env.example and the docs.
//
// Run directly, or through `npm run lint`, or from .githooks/pre-push.

import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";

const SECRET_PATTERNS = [
  // Telegram bot token: 123456789:AA... (35 chars, base64url).
  { name: "telegram-bot-token", regex: /\b\d{8,12}:[A-Za-z0-9_-]{30,}\b/ },
  // Telegram bot token assigned to a variable, even if the value looks short in a test.
  { name: "telegram-bot-token-assignment", regex: /TELEGRAM_BOT_TOKEN\s*[=:]\s*["']?[0-9]{8,}:/ },
  // Reasonix serve token: 32 random bytes, hex.
  { name: "reasonix-serve-token", regex: /\b[0-9a-f]{64}\b/ },
  { name: "serve-token-assignment", regex: /REASONIX_SERVE_TOKEN\s*[=:]\s*["'][0-9a-f]{32,}/i },
  // Provider keys: DeepSeek/OpenAI-style and Google-style.
  { name: "provider-api-key", regex: /\bsk-[A-Za-z0-9_-]{20,}\b/ },
  { name: "google-api-key", regex: /\bAIza[0-9A-Za-z_-]{30,}\b/ },
  // Basic/Bearer auth headers with a literal value.
  { name: "literal-bearer-token", regex: /Authorization["'`\s:=]+Bearer\s+[A-Za-z0-9._-]{16,}/ },
  { name: "literal-basic-credentials", regex: /Basic\s+[A-Za-z0-9+/]{16,}=/ },
];

// Files that legitimately contain example configuration.
const ALLOWED_FILES = new Set([
  ".env.example",
  "LICENSE",
  "AGENTS.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "NOTICE",
]);

// Directories never worth scanning.
const SKIP_DIRS = new Set(["node_modules", ".git", "dist", "coverage", "logs", "run", "e2e/output"]);
const SKIP_PATH_SEGMENTS = ["package-lock.json"];

/** Every tracked file, so the scan matches exactly what Git would publish. */
function listTrackedFiles() {
  const output = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return output.split("\0").filter(Boolean);
}

function shouldSkip(filePath) {
  if (ALLOWED_FILES.has(filePath)) {
    return true;
  }
  if (SKIP_PATH_SEGMENTS.some((segment) => filePath.endsWith(segment))) {
    return true;
  }
  return filePath.split(path.sep).some((segment) => SKIP_DIRS.has(segment));
}

/** Findings in one file, or an empty array. */
export function scanText(filePath, text) {
  const findings = [];
  for (const { name, regex } of SECRET_PATTERNS) {
    const match = regex.exec(text);
    if (!match) {
      continue;
    }
    const line = text.slice(0, match.index).split("\n").length;
    // Never echo the matched secret itself: the point is to report, not to reprint.
    findings.push({ filePath, line, name });
  }
  return findings;
}

function scanFile(filePath) {
  let stats;
  try {
    stats = statSync(filePath);
  } catch {
    return [];
  }
  if (!stats.isFile() || stats.size > 2 * 1024 * 1024) {
    return [];
  }
  return scanText(filePath, readFileSync(filePath, "utf8"));
}

function main() {
  const files = listTrackedFiles().filter((filePath) => !shouldSkip(filePath));
  const findings = files.flatMap(scanFile);

  if (findings.length === 0) {
    console.log(`check-secrets: ${files.length} tracked files scanned, no credentials found.`);
    return;
  }

  console.error("check-secrets: possible credentials in tracked files:");
  for (const finding of findings) {
    console.error(`  ${finding.filePath}:${finding.line}  ${finding.name}`);
  }
  console.error("\nIf a value is a real credential, rotate it before continuing.");
  process.exitCode = 1;
}

if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  main();
}