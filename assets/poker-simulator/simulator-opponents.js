(function () {
  const root = typeof window !== "undefined" ? window : globalThis;
  const NOTE_TAGS = ["fish", "reg", "nit", "station", "aggro"];

  function sanitizeOpponentNoteKey(value) {
    return String(value || "").trim().toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9:_-]/g, "").slice(0, 80);
  }

  function sanitizeOpponentNoteTag(value) {
    const tag = String(value || "").toLowerCase();
    return NOTE_TAGS.includes(tag) ? tag : "";
  }

  function sanitizeOpponentNoteEntry(value, key = "") {
    if (!value || typeof value !== "object") return null;
    const tag = sanitizeOpponentNoteTag(value.tag);
    const text = String(value.text || "").replace(/\r\n/g, "\n").slice(0, 1200);
    const seatName = String(value.seatName || "").slice(0, 40);
    const updatedAt = String(value.updatedAt || "");
    if (!tag && !text.trim()) return null;
    return { key, tag, text, seatName, updatedAt };
  }

  function sanitizeOpponentModelEntry(value, key = "") {
    if (!value || typeof value !== "object") return null;
    const hands = Math.max(0, Number(value.hands || 0));
    const knownHands = Math.max(0, Number(value.knownHands || 0));
    const vpip = Math.max(0, Number(value.vpip || 0));
    const pfr = Math.max(0, Number(value.pfr || 0));
    const threeBetPlus = Math.max(0, Number(value.threeBetPlus || 0));
    const fourBetPlus = Math.max(0, Number(value.fourBetPlus || 0));
    const fiveBetPlus = Math.max(0, Number(value.fiveBetPlus || 0));
    const allInPreflop = Math.max(0, Number(value.allInPreflop || 0));
    return {
      key,
      seatName: String(value.seatName || "").slice(0, 40),
      style: String(value.style || "").slice(0, 24),
      hands,
      knownHands,
      vpip,
      pfr,
      threeBetPlus,
      fourBetPlus,
      fiveBetPlus,
      allInPreflop,
      vpipRate: hands ? Math.min(1, vpip / hands) : 0,
      pfrRate: hands ? Math.min(1, pfr / hands) : 0,
      threeBetPlusRate: hands ? Math.min(1, threeBetPlus / hands) : 0,
      fourBetPlusRate: hands ? Math.min(1, fourBetPlus / hands) : 0,
      fiveBetPlusRate: hands ? Math.min(1, fiveBetPlus / hands) : 0,
      lastSeenAt: String(value.lastSeenAt || "").slice(0, 40)
    };
  }

  function loadOpponentNotes(storage, key) {
    try {
      const parsed = JSON.parse(storage?.getItem?.(key) || "{}");
      if (!parsed || typeof parsed !== "object") return {};
      return Object.entries(parsed).reduce((notes, [rawKey, value]) => {
        const cleanKey = sanitizeOpponentNoteKey(rawKey);
        const note = sanitizeOpponentNoteEntry(value, cleanKey);
        if (cleanKey && note) notes[cleanKey] = note;
        return notes;
      }, {});
    } catch {
      return {};
    }
  }

  function saveOpponentNotes(storage, key, notes, options = {}) {
    try {
      storage?.setItem?.(key, JSON.stringify(notes || {}));
      return true;
    } catch (error) {
      options.onError?.(error);
      return false;
    }
  }

  function loadOpponentModel(storage, key) {
    try {
      const parsed = JSON.parse(storage?.getItem?.(key) || "{}");
      if (!parsed || typeof parsed !== "object") return {};
      return Object.entries(parsed).reduce((model, [rawKey, value]) => {
        const cleanKey = sanitizeOpponentNoteKey(rawKey);
        const entry = sanitizeOpponentModelEntry(value, cleanKey);
        if (cleanKey && entry) model[cleanKey] = entry;
        return model;
      }, {});
    } catch {
      return {};
    }
  }

  function saveOpponentModel(storage, key, model, options = {}) {
    try {
      storage?.setItem?.(key, JSON.stringify(model || {}));
      return true;
    } catch (error) {
      options.onError?.(error);
      return false;
    }
  }

  function opponentLearningKeyFromSeat(seat) {
    if (!seat || seat.isHero) return "";
    const profile = seat.profile || seat.botProfile || {};
    const style = String(profile.style || profile.archetype || "").trim();
    const name = String(seat.name || seat.seatName || seat.position || "").trim();
    return sanitizeOpponentNoteKey(`bot:${name}:${style || "reg"}`);
  }

  function opponentNoteKeyForSeat(seat) {
    if (!seat || seat.isHero) return "";
    const name = String(seat.name || `seat-${seat.id || 0}`).trim().toLowerCase();
    return sanitizeOpponentNoteKey(`bot:${name || seat.id || 0}`);
  }

  function opponentNoteHasContent(note) {
    return Boolean(note && (sanitizeOpponentNoteTag(note.tag) || String(note.text || "").trim()));
  }

  function applyOpponentLearningToTable(table, model) {
    if (!table || !Array.isArray(table.seats)) return table;
    table.seats.forEach((seat) => {
      if (!seat || seat.isHero) return;
      const key = opponentLearningKeyFromSeat(seat);
      const learned = key ? sanitizeOpponentModelEntry(model?.[key], key) : null;
      if (!learned || learned.hands < 8) return;
      seat.botProfile = {
        ...(seat.botProfile || {}),
        learning: {
          key,
          hands: learned.hands,
          threeBetPlusRate: learned.threeBetPlusRate,
          fourBetPlusRate: learned.fourBetPlusRate,
          fiveBetPlusRate: learned.fiveBetPlusRate
        }
      };
    });
    return table;
  }

  function emptyOpponentStats() {
    return {
      vpip: false,
      pfr: false,
      threeBetPlus: false,
      fourBetPlus: false,
      fiveBetPlus: false,
      allInPreflop: false
    };
  }

  function emptyOpponentModelEntry(key = "") {
    return {
      key,
      seatName: "",
      style: "",
      hands: 0,
      knownHands: 0,
      vpip: 0,
      pfr: 0,
      threeBetPlus: 0,
      fourBetPlus: 0,
      fiveBetPlus: 0,
      allInPreflop: 0,
      lastSeenAt: ""
    };
  }

  function recordOpponentLearning(model, entry, options = {}) {
    const hand = entry?.handHistory;
    if (!hand || !Array.isArray(hand.seats)) return model || {};
    const opponents = hand.seats.filter((seat) => seat && !seat.isHero);
    if (!opponents.length) return model || {};

    const perSeat = new Map(opponents.map((seat) => [Number(seat.id), emptyOpponentStats()]));
    let aggressiveCount = 0;
    (Array.isArray(hand.actions) ? hand.actions : [])
      .filter((event) => event?.phase === "action" && event.street === "preflop")
      .forEach((event) => {
        const seatId = Number(event.seatId);
        const bucket = perSeat.get(seatId);
        const label = String(event.label || "").toLowerCase();
        const aggressive = event.tone === "aggressive" || label.includes("raise") || label.includes("all-in");
        const folded = event.tone === "fold" || label.includes("fold");
        // A preflop "Check" is the BB exercising their free option (toCall === 0):
        // no chips were voluntarily committed, so it must NOT count as VPIP. Only
        // a call or raise/all-in is voluntary money in the pot.
        const checked = !aggressive && (event.tone === "passive" && label.includes("check"));
        if (bucket && !folded && !checked) bucket.vpip = true;
        if (bucket && aggressive) {
          bucket.pfr = true;
          if (aggressiveCount >= 1) bucket.threeBetPlus = true;
          if (aggressiveCount >= 2) bucket.fourBetPlus = true;
          if (aggressiveCount >= 3) bucket.fiveBetPlus = true;
          if (label.includes("all-in")) bucket.allInPreflop = true;
        }
        if (aggressive) aggressiveCount += 1;
      });

    const nextModel = { ...(model || {}) };
    opponents.forEach((seat) => {
      const key = opponentLearningKeyFromSeat(seat);
      if (!key) return;
      const previous = sanitizeOpponentModelEntry(nextModel[key], key) || emptyOpponentModelEntry(key);
      const stats = perSeat.get(Number(seat.id)) || {};
      const profile = seat.profile || {};
      const next = sanitizeOpponentModelEntry({
        ...previous,
        seatName: String(seat.name || previous.seatName || "").slice(0, 40),
        style: String(profile.style || profile.archetype || previous.style || "").slice(0, 24),
        hands: previous.hands + 1,
        knownHands: previous.knownHands + (Array.isArray(seat.cards) && seat.cards.length >= 2 ? 1 : 0),
        vpip: previous.vpip + (stats.vpip ? 1 : 0),
        pfr: previous.pfr + (stats.pfr ? 1 : 0),
        threeBetPlus: previous.threeBetPlus + (stats.threeBetPlus ? 1 : 0),
        fourBetPlus: previous.fourBetPlus + (stats.fourBetPlus ? 1 : 0),
        fiveBetPlus: previous.fiveBetPlus + (stats.fiveBetPlus ? 1 : 0),
        allInPreflop: previous.allInPreflop + (stats.allInPreflop ? 1 : 0),
        lastSeenAt: entry.playedAt || options.now?.() || new Date().toISOString()
      }, key);
      if (next) nextModel[key] = next;
    });

    return Object.fromEntries(
      Object.entries(nextModel)
        .sort((a, b) => String(b[1]?.lastSeenAt || "").localeCompare(String(a[1]?.lastSeenAt || "")))
        .slice(0, 80)
    );
  }

  const api = {
    sanitizeOpponentNoteKey,
    sanitizeOpponentNoteTag,
    sanitizeOpponentNoteEntry,
    sanitizeOpponentModelEntry,
    loadOpponentNotes,
    saveOpponentNotes,
    loadOpponentModel,
    saveOpponentModel,
    opponentLearningKeyFromSeat,
    opponentNoteKeyForSeat,
    opponentNoteHasContent,
    applyOpponentLearningToTable,
    recordOpponentLearning
  };

  root.PokerSimulatorOpponents = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
