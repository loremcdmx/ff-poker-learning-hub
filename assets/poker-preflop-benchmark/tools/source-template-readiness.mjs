import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function sha256(source) {
  return createHash("sha256").update(source).digest("hex");
}

function expectedTemplate(repoRoot, relativePath) {
  return {
    file: relativePath.replace(/^assets\/poker-preflop-benchmark\//, ""),
    sha256: sha256(readFileSync(resolve(repoRoot, "assets/poker-preflop-benchmark", relativePath.replace(/^assets\/poker-preflop-benchmark\//, "")))),
  };
}

export function validateCurrentBenchmarkTemplates(repoRoot, field, ev) {
  const rank = expectedTemplate(repoRoot, "tools/msp-preflop-rank-bridge.sql");
  const action = expectedTemplate(repoRoot, "tools/msp-preflop-action-cube.sql");
  const outcome = expectedTemplate(repoRoot, "tools/msp-sb-vs-btn-ev.sql");
  const checks = [
    ["field rank bridge", field?.source?.provenance?.rankBridge?.queryTemplate, rank],
    ["EV rank bridge", ev?.source?.provenance?.rankBridge?.queryTemplate, rank],
    ["field action query", field?.source?.provenance?.queryTemplate, action],
    ["EV outcome query", ev?.source?.provenance?.queryTemplate, outcome],
  ];
  const reasons = checks.flatMap(([label, actual, expected]) => (
    actual?.file === expected.file && actual?.sha256 === expected.sha256
      ? []
      : [`${label}: provenance template differs from the checked-in SQL`]
  ));
  return { ready: reasons.length === 0, reasons };
}
