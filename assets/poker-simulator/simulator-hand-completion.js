(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  function model(options = {}) {
    const windowRef = options.windowRef || root;
    const getState = typeof options.getState === "function" ? options.getState : () => ({});
    const engine = options.engine || {};
    const handLogKit = options.handLogKit || {};
    const bootSessionId = String(options.bootSessionId || "session");
    const limits = options.limits || {};
    const sessionHistoryLimit = Math.max(1, Number(limits.sessionHistory || 80));
    const handLogLimit = Math.max(1, Number(limits.handLog || 500));
    const heroBusted = typeof options.heroBusted === "function" ? options.heroBusted : () => false;
    const saveSessionData = typeof options.saveSessionData === "function" ? options.saveSessionData : () => {};
    const saveHandLogData = typeof options.saveHandLogData === "function" ? options.saveHandLogData : () => {};
    const refreshCurrentLeaderboardEntry = typeof options.refreshCurrentLeaderboardEntry === "function"
      ? options.refreshCurrentLeaderboardEntry
      : () => {};
    const leaderboardDialogOpen = typeof options.leaderboardDialogOpen === "function" ? options.leaderboardDialogOpen : () => false;
    const renderLeaderboardBody = typeof options.renderLeaderboardBody === "function" ? options.renderLeaderboardBody : () => {};
    const recordOpponentLearning = typeof options.recordOpponentLearning === "function" ? options.recordOpponentLearning : () => {};
    const simulatorProgressResult = typeof options.simulatorProgressResult === "function"
      ? options.simulatorProgressResult
      : () => ({});
    const sendSimulatorSessionTelemetry = typeof options.sendSimulatorSessionTelemetry === "function"
      ? options.sendSimulatorSessionTelemetry
      : () => null;
    const activeSimulatorProfile = typeof options.activeSimulatorProfile === "function" ? options.activeSimulatorProfile : () => ({});
    const configuredHandLogEndpoint = String(options.handLogEndpoint || "").trim();
    const nowIso = typeof options.nowIso === "function" ? options.nowIso : () => new Date().toISOString();
    const handSyncOutboxKey = String(options.handSyncOutboxKey || "ff.poker.table-simulator.hand-sync-outbox.v1");
    const handSyncOutboxLimit = Math.max(20, Number(options.handSyncOutboxLimit || 1200));
    const handSyncFlushBatchSize = Math.max(1, Number(options.handSyncFlushBatchSize || 12));
    const handSyncRetryDelayMs = Math.max(1000, Number(options.handSyncRetryDelayMs || 8000));
    let handSyncMemoryOutbox = [];
    let handSyncUseMemoryOnly = false;
    let handSyncFlushPromise = null;
    let handSyncFlushTimer = 0;

    function state() {
      return getState() || {};
    }

    function sanitizeHandHistory(hand, sanitizeOptions = {}) {
      return typeof handLogKit.sanitizeHandHistory === "function" ? handLogKit.sanitizeHandHistory(hand, sanitizeOptions) : hand;
    }

    function sanitizeHandLogEntry(entry) {
      const settings = state().settings || {};
      return typeof handLogKit.sanitizeHandLogEntry === "function"
        ? handLogKit.sanitizeHandLogEntry(entry, {
          sessionId: bootSessionId,
          settings,
          revealOpponentCardsOnFinish: settings.revealOpponentCardsOnFinish
        })
        : entry;
    }

    function renderHandLogText(entry, handHistory) {
      return typeof handLogKit.renderHandLogText === "function" ? handLogKit.renderHandLogText(entry, handHistory) : "";
    }

    function extractHandStats(hand) {
      return typeof handLogKit.extractHandStats === "function" ? handLogKit.extractHandStats(hand) : {};
    }

    function aggregatePokerStats(entries) {
      return typeof handLogKit.aggregatePokerStats === "function" ? handLogKit.aggregatePokerStats(entries) : {};
    }

    function deferWork(callback) {
      if (typeof callback !== "function") return;
      const run = () => {
        try {
          callback();
        } catch (error) {
          if (windowRef.console && typeof windowRef.console.warn === "function") {
            windowRef.console.warn("Deferred simulator completion task failed.", error);
          }
        }
      };
      const scheduleRun = () => {
        if (typeof windowRef.requestIdleCallback === "function") {
          windowRef.requestIdleCallback(run, { timeout: 900 });
        } else if (typeof windowRef.setTimeout === "function") {
          windowRef.setTimeout(run, 0);
        } else {
          run();
        }
      };
      if (typeof windowRef.requestAnimationFrame === "function") {
        // Hidden tabs freeze rAF entirely (background/agent browsers): back it
        // with a macrotask so a hand completed right before backgrounding
        // still persists and its hand-sync POST still queues — otherwise the
        // deferred work waits for the tab to become visible again and a
        // closed-in-background tab loses the hand for the cross-device graph.
        let scheduled = false;
        const scheduleOnce = () => {
          if (scheduled) return;
          scheduled = true;
          scheduleRun();
        };
        windowRef.requestAnimationFrame(scheduleOnce);
        if (typeof windowRef.setTimeout === "function") windowRef.setTimeout(scheduleOnce, 400);
      } else {
        scheduleRun();
      }
    }

    function emptyRateStat() {
      return typeof handLogKit.emptyRateStat === "function" ? handLogKit.emptyRateStat() : { made: 0, opportunities: 0, rate: 0 };
    }

    function finiteNumber(value, fallback = 0) {
      const number = Number(value);
      return Number.isFinite(number) ? number : fallback;
    }

    function roundBbMetric(value) {
      return Math.round(finiteNumber(value, 0) * 10) / 10;
    }

    function settingsLogSnapshot(settings = state().settings) {
      return {
        pack: String(settings?.pack || ""),
        playerCount: Math.max(0, Number(settings?.playerCount || 0)),
        difficulty: String(settings?.difficulty || ""),
        botLineup: String(settings?.botLineup || ""),
        tableCount: Math.max(0, Number(settings?.tableCount || 0)),
        revealOpponentCardsOnFinish: settings?.revealOpponentCardsOnFinish !== false
      };
    }

    function recordHandLogEntry(table, historyEntry, handHistory, options = {}) {
      const current = state();
      const entry = buildHandLogEntry(table, historyEntry, handHistory);
      if (!entry) return null;
      current.handLog = [
        entry,
        ...(Array.isArray(current.handLog) ? current.handLog : []).filter((item) => item.id !== entry.id)
      ].slice(0, handLogLimit);
      if (!current.sessionStatsCache || typeof current.sessionStatsCache !== "object") current.sessionStatsCache = {};
      current.sessionStatsCache.handKey = "";
      if (options.persist !== false) {
        saveHandLogData();
        if (!current.settings?.demoMode) recordOpponentLearning(entry);
        trySendHandLogToBackend(entry);
      }
      return entry;
    }

    function buildHandLogEntry(table, historyEntry, handHistory) {
      const current = state();
      const sanitizedHistory = sanitizeHandHistory(handHistory, {
        revealOpponentCardsOnFinish: current.settings?.revealOpponentCardsOnFinish
      });
      if (!table && !historyEntry && !sanitizedHistory) return null;
      const heroSeatSnapshot = sanitizedHistory?.seats?.find((seat) => seat?.isHero) || null;
      const handNo = sanitizedHistory?.handNo || historyEntry?.no || table?.handNo || 0;
      const tableId = sanitizedHistory?.tableId || historyEntry?.tableId || table?.id || 0;
      const foldAnyDecision = (Array.isArray(current.decisions) ? current.decisions : []).find((item) =>
        Number(item.no) === Number(handNo)
        && Number(item.tableId) === Number(tableId)
        && item.source === "fold-any"
      );
      const startStack = finiteNumber(sanitizedHistory?.stackDepth ?? table?.stackDepth, 0);
      const finalStack = finiteNumber(heroSeatSnapshot?.stack, startStack);
      const result = {
        text: String(historyEntry?.result || sanitizedHistory?.result || table?.result || ""),
        outcome: String(historyEntry?.outcome || (table?.status === "won" ? "win" : "loss")),
        won: Boolean(historyEntry?.outcome === "win" || table?.status === "won"),
        folded: Boolean(historyEntry?.fold || table?.status === "folded"),
        showdown: Boolean(historyEntry?.showdown || table?.street === "showdown" || table?.status === "showdown"),
        pot: roundBbMetric(historyEntry?.pot ?? sanitizedHistory?.pot ?? table?.pot),
        netBb: roundBbMetric(finalStack - startStack),
        busted: Boolean(historyEntry?.busted || sanitizedHistory?.heroBusted || table?.heroBusted),
        bustedReason: String(historyEntry?.bustedReason || sanitizedHistory?.bustedReason || table?.bustedReason || "").slice(0, 160)
      };
      const entry = {
        schema: "poker-simulator-hand-v1",
        id: `${current.sessionId}:${handNo}:${tableId}`,
        sessionId: current.sessionId,
        playedAt: nowIso(),
        tableId,
        handNo,
        settings: settingsLogSnapshot(),
        hero: {
          position: sanitizedHistory?.spot?.heroPosition || heroSeatSnapshot?.position || table?.heroPosition || "",
          hand: Array.isArray(sanitizedHistory?.heroHand) ? sanitizedHistory.heroHand.slice(0, 2) : [],
          combo: sanitizedHistory?.combo || historyEntry?.combo || table?.combo || ""
        },
        result,
        foldAny: foldAnyDecision?.foldAny || null,
        stats: extractHandStats(sanitizedHistory),
        handHistory: sanitizedHistory
      };
      entry.text = renderHandLogText(entry, sanitizedHistory);
      return sanitizeHandLogEntry(entry);
    }

    function compactObject(input) {
      const output = {};
      Object.entries(input || {}).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") return;
        if (Array.isArray(value) && !value.length) return;
        if (typeof value === "object" && !Array.isArray(value) && !Object.keys(value).length) return;
        output[key] = value;
      });
      return output;
    }

    function cleanOneLine(value, limit = 120) {
      return String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);
    }

    function clampInt(value, min, max, fallback = 0) {
      const number = Math.round(Number(value));
      return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
    }

    function compactCards(value, max = 5) {
      return Array.isArray(value) ? value.slice(0, max).map((card) => cleanOneLine(card, 12)).filter(Boolean) : [];
    }

    function compactHandAction(event = {}) {
      return compactObject({
        street: cleanOneLine(event.street || event.phase, 24),
        seatId: Number.isFinite(Number(event.seatId)) ? clampInt(event.seatId, 0, 24, 0) : undefined,
        actor: cleanOneLine(event.actor || event.player || event.name || event.seatName, 80),
        action: cleanOneLine(event.action || event.type, 40),
        label: cleanOneLine(event.label || event.text, 80),
        amount: Number.isFinite(Number(event.amount ?? event.bet ?? event.to)) ? roundBbMetric(event.amount ?? event.bet ?? event.to) : undefined,
        pot: Number.isFinite(Number(event.pot)) ? roundBbMetric(event.pot) : undefined,
        toCall: Number.isFinite(Number(event.toCall)) ? roundBbMetric(event.toCall) : undefined,
        stack: Number.isFinite(Number(event.stack)) ? roundBbMetric(event.stack) : undefined,
        at: cleanOneLine(event.at || event.ts || event.time, 80)
      });
    }

    function compactHandHistoryForSync(hand = {}) {
      if (!hand || typeof hand !== "object") return null;
      const actions = Array.isArray(hand.actions) ? hand.actions : [];
      const spot = hand.spot && typeof hand.spot === "object"
        ? compactObject({
          title: cleanOneLine(hand.spot.title, 160),
          heroPosition: cleanOneLine(hand.spot.heroPosition, 12),
          villainPosition: cleanOneLine(hand.spot.villainPosition, 12),
          street: cleanOneLine(hand.spot.street, 24)
        })
        : null;
      return compactObject({
        handNo: clampInt(hand.handNo, 0, 1_000_000, 0),
        tableId: clampInt(hand.tableId, 0, 1_000, 0),
        sessionId: cleanOneLine(hand.sessionId, 80),
        status: cleanOneLine(hand.status, 40),
        street: cleanOneLine(hand.street, 24),
        result: cleanOneLine(hand.result, 200),
        resultKind: cleanOneLine(hand.resultKind, 40),
        stackDepth: Number.isFinite(Number(hand.stackDepth)) ? roundBbMetric(hand.stackDepth) : undefined,
        pot: Number.isFinite(Number(hand.pot)) ? roundBbMetric(hand.pot) : undefined,
        combo: cleanOneLine(hand.combo, 40),
        spot,
        heroHand: compactCards(hand.heroHand, 2),
        board: compactCards(hand.board, 5),
        winningCards: compactCards(hand.winningCards, 5),
        seats: Array.isArray(hand.seats) ? hand.seats.slice(0, 12).map((seat = {}) => compactObject({
          id: Number.isFinite(Number(seat.id)) ? clampInt(seat.id, 0, 24, 0) : undefined,
          name: cleanOneLine(seat.name || seat.label, 80),
          position: cleanOneLine(seat.position, 12),
          isHero: seat.isHero === true ? true : undefined,
          folded: seat.folded === true ? true : undefined,
          allIn: seat.allIn === true ? true : undefined,
          stack: Number.isFinite(Number(seat.stack)) ? roundBbMetric(seat.stack) : undefined,
          contribution: Number.isFinite(Number(seat.contribution)) ? roundBbMetric(seat.contribution) : undefined,
          cards: compactCards(seat.cards, 4)
        })).filter((seat) => Object.keys(seat).length) : [],
        actions: actions.slice(0, 120).map(compactHandAction).filter((event) => Object.keys(event).length),
        actionCount: actions.length || undefined,
        actionsTruncated: actions.length > 120 ? true : undefined,
        showdown: hand.showdown && typeof hand.showdown === "object" ? hand.showdown : undefined,
        allInRunout: hand.allInRunout && typeof hand.allInRunout === "object" ? hand.allInRunout : undefined
      });
    }

    function compactHandLogEntryForSync(entry = {}) {
      const rawHistory = entry.handHistory && typeof entry.handHistory === "object" ? entry.handHistory : {};
      const handHistory = compactHandHistoryForSync(rawHistory);
      const sessionId = cleanOneLine(entry.sessionId || handHistory?.sessionId || rawHistory.sessionId, 80);
      const handNo = clampInt(entry.handNo ?? entry.no ?? handHistory?.handNo ?? rawHistory.handNo, 0, 1_000_000, 0);
      const tableId = clampInt(entry.tableId ?? handHistory?.tableId ?? rawHistory.tableId, 0, 1_000, 0);
      if (!sessionId || !handNo) return null;
      const result = entry.result && typeof entry.result === "object" ? entry.result : {};
      const hero = entry.hero && typeof entry.hero === "object" ? entry.hero : {};
      return compactObject({
        schema: "poker-simulator-hand-v1",
        id: cleanOneLine(entry.id || `${sessionId}:${handNo}:${tableId}`, 180),
        sessionId,
        playedAt: cleanOneLine(entry.playedAt || rawHistory.playedAt, 80),
        tableId,
        handNo,
        settings: compactObject({
          pack: cleanOneLine(entry.settings?.pack, 40),
          playerCount: clampInt(entry.settings?.playerCount, 0, 12, 0),
          difficulty: cleanOneLine(entry.settings?.difficulty, 24),
          botLineup: cleanOneLine(entry.settings?.botLineup, 80),
          tableCount: clampInt(entry.settings?.tableCount, 0, 16, 0),
          revealOpponentCardsOnFinish: entry.settings?.revealOpponentCardsOnFinish === false ? false : undefined
        }),
        hero: compactObject({
          position: cleanOneLine(hero.position || handHistory?.spot?.heroPosition, 12),
          hand: compactCards(hero.hand || handHistory?.heroHand, 2),
          combo: cleanOneLine(hero.combo || handHistory?.combo, 40)
        }),
        result: compactObject({
          text: cleanOneLine(typeof entry.result === "string" ? entry.result : result.text || handHistory?.result, 200),
          outcome: cleanOneLine(result.outcome, 24),
          won: result.won === true ? true : undefined,
          folded: result.folded === true ? true : undefined,
          showdown: result.showdown === true ? true : undefined,
          busted: result.busted === true ? true : undefined,
          pot: Number.isFinite(Number(result.pot ?? handHistory?.pot)) ? roundBbMetric(result.pot ?? handHistory?.pot) : undefined,
          netBb: Number.isFinite(Number(result.netBb)) ? roundBbMetric(result.netBb) : undefined,
          // EV-adjusted result is computed HERE, at publish time: the all-in
          // runout equities do not survive the server's storage compaction, so
          // the cross-device graph (view=graph) needs the number pre-baked.
          evNetBb: handSyncEvNetBb(entry),
          bustedReason: cleanOneLine(result.bustedReason, 160)
        }),
        foldAny: entry.foldAny && typeof entry.foldAny === "object" ? entry.foldAny : undefined,
        stats: entry.stats && typeof entry.stats === "object" ? entry.stats : undefined,
        handHistory,
        text: cleanOneLine(entry.text, 2000)
      });
    }

    function handSyncEvNetBb(entry) {
      const graphKit = root.PokerSimulatorSessionGraph;
      if (typeof graphKit?.handEvResultForAggregate !== "function") return undefined;
      try {
        const evNetBb = Number(graphKit.handEvResultForAggregate(entry)?.netBb);
        return Number.isFinite(evNetBb) ? roundBbMetric(evNetBb) : undefined;
      } catch {
        return undefined;
      }
    }

    function handLogBackendEndpoint() {
      return configuredHandLogEndpoint || (typeof windowRef.PokerSimulatorHandLogEndpoint === "string"
        ? windowRef.PokerSimulatorHandLogEndpoint.trim()
        : "");
    }

    function handSyncPayload(entry) {
      const profile = activeSimulatorProfile();
      if (!profile?.loggedIn || !profile?.id || profile.id === "guest") return null;
      const hand = compactHandLogEntryForSync(entry);
      if (!hand) return null;
      return {
        schema: "poker-simulator-hand-sync-v1",
        source: "ff-start-poker-hub",
        profile,
        hand
      };
    }

    function handSyncStorage() {
      if (handSyncUseMemoryOnly) return null;
      try {
        return windowRef.localStorage || null;
      } catch {
        return null;
      }
    }

    function handSyncItemId(payload) {
      const hand = payload?.hand || {};
      return String(payload?.id || hand.id || `${hand.sessionId || "session"}:${hand.handNo || 0}:${hand.tableId || 0}`);
    }

    function readHandSyncOutbox() {
      const storage = handSyncStorage();
      if (!storage) return handSyncMemoryOutbox.slice();
      try {
        const parsed = JSON.parse(storage.getItem(handSyncOutboxKey) || "[]");
        return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item === "object") : [];
      } catch {
        return [];
      }
    }

    function writeHandSyncOutbox(items) {
      const clean = (Array.isArray(items) ? items : []).filter((item) => item && typeof item === "object").slice(-handSyncOutboxLimit);
      handSyncMemoryOutbox = clean;
      const storage = handSyncStorage();
      if (!storage) return true;
      try {
        if (clean.length) storage.setItem(handSyncOutboxKey, JSON.stringify(clean));
        else storage.removeItem(handSyncOutboxKey);
        return true;
      } catch (error) {
        handSyncUseMemoryOnly = true;
        if (windowRef.console && typeof windowRef.console.warn === "function") {
          windowRef.console.warn("Hand log outbox save failed.", error);
        }
        return true;
      }
    }

    function queueHandSyncPayload(payload) {
      const id = handSyncItemId(payload);
      if (!id) return false;
      const queuedAt = nowIso();
      const next = [
        ...readHandSyncOutbox().filter((item) => String(item.id || "") !== id),
        {
          id,
          queuedAt,
          lastAttemptAt: "",
          attempts: 0,
          status: "pending",
          payload
        }
      ];
      return writeHandSyncOutbox(next);
    }

    function updateHandSyncOutboxItem(id, patch) {
      const next = readHandSyncOutbox().map((item) => (
        String(item.id || "") === String(id || "") ? { ...item, ...patch } : item
      ));
      writeHandSyncOutbox(next);
    }

    function removeHandSyncOutboxItem(id) {
      writeHandSyncOutbox(readHandSyncOutbox().filter((item) => String(item.id || "") !== String(id || "")));
    }

    function scheduleHandSyncFlush(delayMs = handSyncRetryDelayMs) {
      if (handSyncFlushTimer || typeof windowRef.setTimeout !== "function") return;
      handSyncFlushTimer = windowRef.setTimeout(() => {
        handSyncFlushTimer = 0;
        flushHandSyncOutbox();
      }, delayMs);
    }

    async function postHandSyncBody(endpoint, payload) {
      const body = JSON.stringify(payload);
      const response = await windowRef.fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body,
        keepalive: body.length < 60000
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || result?.stored === false) {
        const error = new Error(result?.error || `HTTP ${response.status || 0}`);
        error.statusCode = response.status || 0;
        throw error;
      }
      return result;
    }

    async function sendHandSyncPayload(endpoint, item) {
      return postHandSyncBody(endpoint, item.payload);
    }

    // A fast multitabler completes hands quicker than one-POST-per-hand can
    // drain (the endpoint's write rate limit is shared per IP): a flush sends
    // one profile's queued hands as a single batch request instead.
    async function sendHandSyncBatch(endpoint, items) {
      if (items.length === 1) return sendHandSyncPayload(endpoint, items[0]);
      const first = items[0].payload || {};
      return postHandSyncBody(endpoint, {
        schema: "poker-simulator-hand-sync-batch-v1",
        source: first.source || "ff-start-poker-hub",
        profile: first.profile,
        hands: items.map((item) => item.payload.hand)
      });
    }

    function flushHandSyncOutbox() {
      if (state().settings?.demoMode) return Promise.resolve({ ok: true, sent: 0, pending: 0, suppressed: true });
      if (handSyncFlushPromise) return handSyncFlushPromise;
      const endpoint = handLogBackendEndpoint();
      if (!endpoint || typeof windowRef.fetch !== "function") return Promise.resolve({ ok: false, sent: 0, pending: readHandSyncOutbox().length });
      handSyncFlushPromise = (async () => {
        let sent = 0;
        const queue = [];
        for (const item of readHandSyncOutbox().slice(0, handSyncFlushBatchSize)) {
          const id = String(item.id || "");
          if (!id || !item.payload) {
            removeHandSyncOutboxItem(id);
            continue;
          }
          queue.push(item);
        }
        while (queue.length) {
          // One batch per profile: consecutive items of the same profile fold
          // into a single request (in practice the whole queue is one profile).
          const profileId = String(queue[0]?.payload?.profile?.id || "");
          const group = [];
          while (queue.length && String(queue[0]?.payload?.profile?.id || "") === profileId) {
            group.push(queue.shift());
          }
          try {
            group.forEach((item) => updateHandSyncOutboxItem(String(item.id), {
              attempts: Number(item.attempts || 0) + 1,
              lastAttemptAt: nowIso(),
              status: "sending",
              lastError: ""
            }));
            await sendHandSyncBatch(endpoint, group);
            group.forEach((item) => removeHandSyncOutboxItem(String(item.id)));
            sent += group.length;
          } catch (error) {
            group.forEach((item) => updateHandSyncOutboxItem(String(item.id), {
              attempts: Number(item.attempts || 0) + 1,
              lastAttemptAt: nowIso(),
              status: "pending",
              statusCode: Number(error?.statusCode || 0),
              lastError: String(error?.message || "hand_sync_failed").slice(0, 160)
            }));
            break;
          }
        }
        const pending = readHandSyncOutbox().length;
        if (pending) scheduleHandSyncFlush();
        return { ok: pending === 0, sent, pending };
      })().catch((error) => {
        if (windowRef.console && typeof windowRef.console.warn === "function") {
          windowRef.console.warn("Hand log backend sync failed.", error);
        }
        return { ok: false, sent: 0, pending: readHandSyncOutbox().length, error: String(error?.message || error || "hand_sync_failed") };
      }).finally(() => {
        handSyncFlushPromise = null;
      });
      return handSyncFlushPromise;
    }

    function trySendHandLogToBackend(entry) {
      if (state().settings?.demoMode) return false;
      const payload = handSyncPayload(entry);
      if (!payload) return false;
      if (!queueHandSyncPayload(payload)) return false;
      flushHandSyncOutbox();
      return true;
    }

    function outcomeForCompletedTable(table, result = "") {
      // Authoritative side-pot split check runs FIRST: a pot paid to both Hero and
      // another seat is a split even when the engine's hand-strength resultKind
      // says "won"/"lost" (Hero wins the main pot while a deeper villain takes a
      // side pot, or vice versa). The engine always sets a concrete resultKind, so
      // without this the potWinners block below was dead code and the hand was
      // mis-recorded as a clean win/loss in session stats + replay (R2-SIDEPOTUI).
      const potWinners = Array.isArray(table?.showdown?.potWinners) ? table.showdown.potWinners : [];
      const heroAwarded = potWinners.some((winner) =>
        (winner?.isHero || Number(winner?.seatId) === 0) && Number(winner?.amount || 0) > 0);
      const otherAwarded = potWinners.some((winner) =>
        !(winner?.isHero || Number(winner?.seatId) === 0) && Number(winner?.amount || 0) > 0);
      if (heroAwarded && otherAwarded) return "split";

      const resultKind = String(table?.resultKind || "").toLowerCase();
      if (resultKind === "split" || resultKind === "chop") return "split";
      if (resultKind === "won" || resultKind === "win" || resultKind === "tournament-won") return "win";
      if (resultKind === "lost" || resultKind === "loss") return "loss";

      if (potWinners.length) {
        if (heroAwarded) return "win";
        return "loss";
      }

      const showdownWinners = Array.isArray(table?.showdown?.winners) ? table.showdown.winners : [];
      const heroInWinners = showdownWinners.some((winner) => Boolean(winner.isHero) || Number(winner.seatId) === 0);
      if (showdownWinners.length > 1 && heroInWinners) return "split";
      if (table?.status === "won" || heroInWinners || (showdownWinners.length === 0 && String(result).startsWith("Hero win"))) return "win";
      return "loss";
    }

    function maybeRecordHand(table, options = {}) {
      const current = state();
      if (!table || table.status === "playing" || table.recorded) return false;
      const result = table.result || table.lastAction || table.status;
      const busted = heroBusted(table);
      const displayResult = busted ? "Ты вылетел" : result;
      const folded = table.status === "folded" || result === "Hero fold";
      const outcome = outcomeForCompletedTable(table, result);

      table.recorded = true;
      const handHistory = typeof engine.snapshotHandHistory === "function"
        ? sanitizeHandHistory(engine.snapshotHandHistory(table))
        : null;
      const historyEntry = {
        no: table.handNo,
        tableId: table.id,
        pack: current.settings?.pack,
        spot: table.spot.title,
        combo: table.combo,
        result: displayResult,
        busted,
        bustedReason: table.bustedReason || result,
        outcome,
        fold: folded,
        showdown: table.street === "showdown" || table.status === "showdown",
        pot: table.pot,
        board: [...table.board],
        handHistory
      };
      current.history.unshift(historyEntry);
      current.history = current.history.slice(0, sessionHistoryLimit);
      const handLogEntry = recordHandLogEntry(table, historyEntry, handHistory, { persist: options.deferPersistence !== true });
      // Capture the session this hand belongs to. Deferred work can run after
      // resetCurrentSession() swaps in a fresh session id; without this guard the
      // deferred persist would re-POST a stale hand against the new session.
      const completionSessionId = String(current.sessionId || "");
      const persistCompletion = () => {
        if (String(state().sessionId || "") !== completionSessionId) return;
        const demoMode = Boolean(state().settings?.demoMode);
        if (options.deferPersistence === true) {
          saveHandLogData();
          if (handLogEntry && !demoMode) {
            recordOpponentLearning(handLogEntry);
            trySendHandLogToBackend(handLogEntry);
          }
        }
        saveSessionData();
        if (demoMode) return;
        refreshCurrentLeaderboardEntry();
        if (leaderboardDialogOpen()) renderLeaderboardBody();
        const progressResult = simulatorProgressResult();
        if (windowRef.FFPlayerProgress?.setResult) {
          windowRef.FFPlayerProgress.setResult("simulator", progressResult);
        }
        sendSimulatorSessionTelemetry(historyEntry, progressResult);
      };
      if (options.deferPersistence === true) deferWork(persistCompletion);
      else persistCompletion();
      return true;
    }

    if (typeof windowRef.addEventListener === "function") {
      windowRef.addEventListener("online", () => flushHandSyncOutbox());
      windowRef.addEventListener("pagehide", () => flushHandSyncOutbox());
      windowRef.addEventListener("visibilitychange", () => {
        if (!windowRef.document || windowRef.document.visibilityState === "hidden") flushHandSyncOutbox();
      });
    }
    if (readHandSyncOutbox().length) deferWork(() => flushHandSyncOutbox());

    return {
      settingsLogSnapshot,
      recordHandLogEntry,
      buildHandLogEntry,
      trySendHandLogToBackend,
      flushHandSyncOutbox,
      renderHandLogText,
      extractHandStats,
      aggregatePokerStats,
      emptyRateStat,
      finiteNumber,
      roundBbMetric,
      outcomeForCompletedTable,
      maybeRecordHand
    };
  }

  root.PokerSimulatorHandCompletion = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = { model };
})();
