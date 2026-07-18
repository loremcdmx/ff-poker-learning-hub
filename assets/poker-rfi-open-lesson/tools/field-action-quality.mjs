const RANKS = "AKQJT98765432";

export function normalizeHandClass(input) {
  const compact = String(input || "").trim();
  const value = compact.slice(0, 2).toUpperCase() + compact.slice(2).toLowerCase();
  const match = value.match(/^([AKQJT98765432])([AKQJT98765432])([so])?$/);
  if (!match) throw new Error(`Invalid hand class: ${JSON.stringify(input)}`);
  const [, left, right, rawSuffix] = match;
  const suffix = rawSuffix ? rawSuffix.toLowerCase() : "";
  if (left === right) {
    if (suffix) throw new Error(`Pair must not have a suitedness suffix: ${value}`);
    return left + right;
  }
  if (!suffix) throw new Error(`Non-pair must have a suitedness suffix: ${value}`);
  const highFirst = RANKS.indexOf(left) < RANKS.indexOf(right);
  return (highFirst ? left + right : right + left) + suffix;
}

export function handShape(hand) {
  return hand.endsWith("s") ? "suited" : hand.endsWith("o") ? "offsuit" : "pair";
}

export function comboCount(hand) {
  return handShape(hand) === "pair" ? 6 : handShape(hand) === "suited" ? 4 : 12;
}
