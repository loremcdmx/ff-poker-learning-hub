import { readFileSync } from "node:fs";
import { join } from "node:path";

export const simulatorEngineScriptPaths = Object.freeze([
  "assets/poker-kit/simulator/bot-pack-profile.js",
  "assets/poker-kit/simulator/bot-range-realizer.js",
  "assets/poker-kit/simulator/bot-stat-pool.js",
  "assets/poker-kit/simulator/engine-core.js",
  "assets/poker-kit/simulator/engine-preflop-policy.js",
  "assets/poker-kit/simulator/engine-runout.js",
  "assets/poker-kit/simulator/engine-tournament-lobby.js",
  "assets/poker-kit/simulator/engine-showdown.js",
  "assets/poker-kit/simulator/engine-postflop-policy.js",
  "assets/poker-kit/simulator/simulator-engine.js"
]);

export function runSimulatorEngineScripts({ root, context, Script }) {
  simulatorEngineScriptPaths.forEach((relativePath) => {
    const code = readFileSync(join(root, relativePath), "utf8");
    new Script(code, { filename: relativePath }).runInContext(context);
  });
}
