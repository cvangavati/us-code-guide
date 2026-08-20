import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const markerPatterns = [
  ["AWS-style access key", /AKIA[0-9A-Z]{16}/],
  ["private key block", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["GitHub personal token", /(?:ghp_|github_pat_)[A-Za-z0-9_]{20,}/],
  ["OpenAI-style secret", /\bsk-[A-Za-z0-9]{20,}/],
  ["Slack token", /xox[baprs]-[A-Za-z0-9-]{20,}/],
  ["literal credential assignment", /\b(?:API_KEY|SECRET|TOKEN|PASSWORD)\b\s*[:=]\s*["'][^"'\s]{8,}/i],
];

function listPublicBuildFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? listPublicBuildFiles(path) : [path];
  });
}

function trackedFiles() {
  try {
    return execFileSync("git", ["ls-files"], { cwd: root, encoding: "utf8" })
      .split("\n")
      .filter(Boolean)
      .map(path => join(root, path));
  } catch {
    return [];
  }
}

function repositoryRevisions() {
  try {
    return execFileSync("git", ["rev-list", "--all"], { cwd: root, encoding: "utf8" }).split("\n").filter(Boolean);
  } catch {
    return [];
  }
}

function historicalMatches(revision, pattern) {
  try {
    return execFileSync("git", ["grep", "-IlE", pattern.source, revision, "--"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
}

const candidateFiles = [...new Set([...trackedFiles(), ...listPublicBuildFiles(join(root, "dist"))])]
  .filter(path => existsSync(path) && statSync(path).isFile());
const findings = [];

for (const path of candidateFiles) {
  const filename = relative(root, path);
  if (/(^|\/)(?:\.env(?:\.|$)|[^/]+\.(?:pem|key|p12|pfx))$/i.test(filename)) {
    findings.push({ filename, marker: "disallowed private configuration filename" });
    continue;
  }
  const content = readFileSync(path, "utf8");
  for (const [marker, pattern] of markerPatterns) {
    if (pattern.test(content)) findings.push({ filename, marker });
  }
  if (/^client\/(?:src|index\.html)/.test(filename) && /VITE_[A-Z0-9_]*(?:API_KEY|SECRET|TOKEN|PASSWORD)/.test(content)) {
    findings.push({ filename, marker: "secret-like public environment identifier" });
  }
}

for (const revision of repositoryRevisions()) {
  for (const [marker, pattern] of markerPatterns) {
    historicalMatches(revision, pattern).forEach(filename => findings.push({ filename: `${revision.slice(0, 12)}:${filename}`, marker: `${marker} in repository history` }));
  }
}

if (findings.length > 0) {
  console.error("Security scan failed. Findings are reported without secret values:");
  findings.forEach(finding => console.error(`- ${finding.filename}: ${finding.marker}`));
  process.exitCode = 1;
} else {
  console.log(`Security scan passed: ${candidateFiles.length} tracked or public-build files checked without disclosing file contents.`);
}
