(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  const actorMap = new Map([
    ["Bot", "Бот"],
    ["Seat", "Место"],
    ["Showdown", "Шоудаун"],
    ["Hero", "Hero"]
  ]);

  function localizeActor(actor) {
    const value = String(actor || "").trim();
    if (!value) return "";
    return actorMap.get(value) || value;
  }

  function cleanAmount(value) {
    return String(value || "").trim().replace(/\s+/g, " ");
  }

  function withAmount(label, amount) {
    const suffix = cleanAmount(amount);
    return suffix ? `${label} ${suffix}` : label;
  }

  function localizeCoreAction(label) {
    const value = String(label || "").trim();
    if (!value) return "";

    let match = value.match(/^raise\s+to\s+(.+)$/i);
    if (match) return withAmount("Рейз до", match[1]);

    match = value.match(/^raise\s+(.+)$/i);
    if (match) return withAmount("Рейз", match[1]);

    match = value.match(/^call\s+all[-\s]?in\s*(.*)$/i);
    if (match) return withAmount("Колл олл-ин", match[1]);

    match = value.match(/^call\s*(.*)$/i);
    if (match) return withAmount("Колл", match[1]);

    match = value.match(/^bet\s+all[-\s]?in\s*(.*)$/i);
    if (match) return withAmount("Олл-ин", match[1]);

    match = value.match(/^bet\s*(.*)$/i);
    if (match) return withAmount("Бет", match[1]);

    match = value.match(/^all[-\s]?in\s+to\s+(.+)$/i);
    if (match) return withAmount("Олл-ин до", match[1]);

    match = value.match(/^all[-\s]?in\s*(.*)$/i);
    if (match) return withAmount("Олл-ин", match[1]);

    if (/^fold$/i.test(value)) return "Фолд";
    if (/^check$/i.test(value)) return "Чек";
    if (/^pot$/i.test(value)) return "Банк";
    if (/^walk$/i.test(value)) return "Walk";

    return value;
  }

  function localizeActionLabel(label) {
    // Strip a trailing bot-reason joined with " - " (space-hyphen-space); the
    // engine appends a strategy codename to a couple of lastAction strings with
    // this delimiter instead of the usual " · ", so it would otherwise leak into
    // the live action status. The amount/action delimiter never uses spaced
    // hyphens (e.g. "all-in" uses a tight hyphen), so this only drops reasons.
    const value = String(label || "").trim().split(" - ")[0].trim();
    if (!value) return "";
    const direct = localizeCoreAction(value);
    if (direct !== value) return direct;

    const actorMatch = value.match(/^(.+?)\s+(fold|check|call\b.*|bet\b.*|raise\s+to\b.*|raise\b.*|all[-\s]?in\b.*|walk)$/i);
    if (actorMatch) {
      return `${localizeActor(actorMatch[1])} ${localizeCoreAction(actorMatch[2])}`.trim();
    }

    return localizeActionText(value);
  }

  function localizeActionText(text) {
    return String(text || "")
      .replace(/\bRaise to\b/g, "Рейз до")
      .replace(/\braise to\b/g, "рейз до")
      .replace(/\bMin raise\b/g, "Мин. рейз")
      .replace(/\bmin raise\b/g, "мин. рейз")
      .replace(/\bAll-in\b/g, "Олл-ин")
      .replace(/\ball-in\b/g, "олл-ин")
      .replace(/\bShowdown\b/g, "Шоудаун")
      .replace(/\bshowdown\b/g, "шоудаун")
      .replace(/\bBoard\b/g, "Борд")
      .replace(/\bboard\b/g, "борд")
      .replace(/\bpreflop\b/g, "префлоп")
      .replace(/\bRandom\b/g, "Рандом")
      .replace(/\bWinner\b/g, "Победитель")
      .replace(/\bWin\b/g, "Выигрыш")
      .replace(/\bwin\b/g, "выигрыш")
      .replace(/\bSplit\b/g, "Сплит")
      .replace(/\bsplit\b/g, "сплит")
      .replace(/\bFold\b/g, "Фолд")
      .replace(/\bfold\b/g, "фолд")
      .replace(/\bCheck\b/g, "Чек")
      .replace(/\bcheck\b/g, "чек")
      .replace(/\bCall\b/g, "Колл")
      .replace(/\bcall\b/g, "колл")
      .replace(/\bBet\b/g, "Бет")
      .replace(/\bbet\b/g, "бет");
  }

  function thinkingLabel(actor) {
    const localized = localizeActor(actor) || "Бот";
    return `${localized} думает`;
  }

  const api = {
    localizeActor,
    localizeActionLabel,
    localizeActionText,
    thinkingLabel
  };

  root.PokerSimulatorActionI18n = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
