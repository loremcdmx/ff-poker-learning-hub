// Server-driven mode for the real simulator app.
//
// Activated only when poker-simulator.html is opened with ?room=ID or
// ?rooms=ID1,ID2. The
// launch hook (simulator-app-launch.js) hands this controller the runtime
// primitives it already holds (getState / flushRender / markAllTablesDirty /
// clear-timer helpers). The controller then:
//   1. flips the app into the "started" table view (no local start screen),
//   2. joins the room and tails its realtime stream,
//   3. maps each authoritative server hand -> engine `Table` via the adapter
//      and feeds it into state.tables + flushRender (the renderer draws it),
//   4. installs state.serverActionHandler so the shared hero-action runtime
//      routes exact bet-sized table actions to the server instead of the local
//      engine (so no local bots / auto-deal run),
//   5. suppresses the local action clock / bot / auto-deal timers each frame.
//
// Inert unless ?room is present, so it never affects normal single-player play.

(function (root) {
  function start(primitives = {}) {
    const win = primitives.windowRef || root;
    const params = (() => {
      try { return new URLSearchParams(win.location?.search || ""); } catch { return new URLSearchParams(); }
    })();
    function splitRoomIds(value) {
      return String(value || "")
        .split(/[,\s]+/)
        .map((item) => item.trim())
        .filter(Boolean);
    }

    function collectRoomIds(searchParams) {
      const ids = [];
      const seen = new Set();
      const push = (value) => {
        for (const id of splitRoomIds(value)) {
          const key = id.toLowerCase();
          if (!key || seen.has(key)) continue;
          seen.add(key);
          ids.push(id);
        }
      };
      try { searchParams.getAll("room").forEach(push); } catch {}
      push(searchParams.get("rooms") || "");
      return ids.slice(0, 4);
    }

    const requestedRoomIds = collectRoomIds(params);
    const roomId = requestedRoomIds[0] || "";
    if (!roomId) return; // inert in normal single-player mode
    const initialRoomIds = requestedRoomIds.length ? requestedRoomIds : [roomId];
    const secondaryInitialRoomIds = roomId === "new" ? [] : initialRoomIds.slice(1).filter((id) => id && id !== "new");

    const mpKit = win.FFSimulatorMultiplayer;
    const adapterKit = win.PokerSimulatorMultiplayerAdapter;
    if (!mpKit?.createMultiplayerClient || !adapterKit?.serverHandToTable) {
      win.console?.warn?.("[mp] multiplayer client/adapter not loaded; server mode aborted");
      return;
    }

    const getState = typeof primitives.getState === "function" ? primitives.getState : () => ({ settings: {} });
    const flushRender = typeof primitives.flushRender === "function" ? primitives.flushRender : () => {};
    const markAllTablesDirty = typeof primitives.markAllTablesDirty === "function" ? primitives.markAllTablesDirty : () => {};
    const setActiveTable = typeof primitives.setActiveTable === "function"
      ? primitives.setActiveTable
      : (tableId) => {
          const state = getState() || {};
          const nextId = Number(tableId);
          if (!Number.isFinite(nextId) || nextId <= 0) return state.activeTableId;
          state.activeTableId = nextId;
          markAllTablesDirty();
          return nextId;
        };
    const clearTimers = () => {
      try { primitives.clearAllActionClocks?.(); } catch {}
      try { primitives.clearAllBotResponseTimers?.(); } catch {}
      try { primitives.clearAllAutoDealQueues?.(); } catch {}
    };
    const showReplay = typeof primitives.showReplay === "function" ? primitives.showReplay : null;

    // Animation primers (each guarded — a missing one degrades to a snap, never
    // throws). They arm the simulator's existing visual timers for a
    // server-provided table so deal / action / board / showdown animate.
    const prime = {
      deal: typeof primitives.primeDealReveal === "function" ? primitives.primeDealReveal : null,
      action: typeof primitives.primeActionReveal === "function" ? primitives.primeActionReveal : null,
      showdown: typeof primitives.primeShowdownAnimation === "function" ? primitives.primeShowdownAnimation : null,
      annotate: typeof primitives.annotateActionAnimationMotion === "function" ? primitives.annotateActionAnimationMotion : null
    };

    const client = mpKit.createMultiplayerClient({ baseUrl: "/api" });
    const displayName = (params.get("name") || "").trim();
    let activeRoomId = roomId; // ?room=new is a retired player-create path; boot() shows a lobby recovery error.
    let primaryTable = null;
    let latest = null;          // last room view payload
    let prevHandView = null;    // previous hand view (for animation diff)
    let prevBoardLen = 0;
    let sub = null;
    let stopHeartbeat = null;
    let autoStartTimer = null;
    let viewerId = "";
    let streamToken = "";
    let leaving = false;        // suppress refresh/reconnect once we deliberately leave
    let streamErrorCount = 0;   // consecutive SSE errors before we flag "reconnecting"
    let lastAppliedSeq = -1;    // monotonic guard: never apply a view older than the last
    let refreshing = false;     // single in-flight refresh
    let refreshAgain = false;   // coalesce a burst of SSE events into one trailing refresh
    let sitBusy = false;        // guard the server-mode sit-out/sit-in toggle
    let seatClaimBusy = false;  // guard the spectator -> seated transition
    let preActionBusy = false;  // guard the server-owned check/fold intent toggle
    const actionBusyRooms = new Set(); // room ids with an in-flight action-bar POST
    const quickActionBusyRooms = new Set(); // room ids with an in-flight popup quick action
    const heartbeatLostSeatRooms = new Set(); // room ids whose heartbeat learned we are no longer seated
    const sideRooms = new Map(); // roomId -> secondary server-table context
    const MANUAL_TABLE_FOCUS_GRACE_MS = 8000;
    let manualTableFocusUntil = 0;

    // Event-paced playback (kills the multi-action "jump"): the per-event SSE
    // channel is buffered and replayed one beat at a time toward the newest
    // authoritative snapshot. Display-only — see the mp-step-playback block.
    const stepInterp = win.PokerSimulatorMpStepInterp || null;
    let latestView = null;      // newest authoritative view (the replay target)
    let handEventBuffer = [];   // ordered public SSE events ({seq,type,...}) for replay
    let stepTimer = null;       // visual-only setTimeout handle for the beat pacer
    let playing = false;        // a paced replay is currently draining
    const MAX_PACED_STEPS = 12; // catch-up cap: longer bursts snap to the latest state
    const HERO_TURN_REPLAY_CAP_MS = 2500; // cap total replay when the burst ends on the hero's turn

    const doc = win.document;
    const LOBBY_URL = "poker-simulator.html"; // back to the start screen (no ?room)
    const ACCESS_CODE_STORAGE_PREFIX = "ff-simulator-room-code:";
    const PENDING_ACCESS_CODE_STORAGE_PREFIX = "ff-simulator-room-code-pending:";

    function cleanAccessCode(value) {
      return String(value || "").replace(/\s+/g, " ").trim().slice(0, 24);
    }

    function accessCodeStorageKey(id) {
      return ACCESS_CODE_STORAGE_PREFIX + String(id || "");
    }

    function pendingAccessCodeStorageKey(id) {
      return PENDING_ACCESS_CODE_STORAGE_PREFIX + String(id || "");
    }

    function readStoredAccessCode(id) {
      try { return cleanAccessCode(win.sessionStorage?.getItem(accessCodeStorageKey(id)) || ""); } catch { return ""; }
    }

    function consumePendingAccessCode(id) {
      if (!id) return "";
      const key = pendingAccessCodeStorageKey(id);
      try {
        const code = cleanAccessCode(win.sessionStorage?.getItem(key) || "");
        win.sessionStorage?.removeItem(key);
        return code;
      } catch { return ""; }
    }

    function storeAccessCode(id, code) {
      const cleaned = cleanAccessCode(code);
      if (!cleaned) return "";
      try { win.sessionStorage?.setItem(accessCodeStorageKey(id), cleaned); } catch {}
      return cleaned;
    }

    function clearStoredAccessCode(id) {
      try { win.sessionStorage?.removeItem(accessCodeStorageKey(id)); } catch {}
    }

    function bootAccessCodeForRoom(id, urlAccessCode = "") {
      return cleanAccessCode(urlAccessCode) || consumePendingAccessCode(id) || readStoredAccessCode(id);
    }

    function stripAccessCodeFromUrl() {
      try {
        const url = new URL(win.location.href);
        const before = url.search;
        ["accessCode", "code", "roomCode"].forEach((key) => url.searchParams.delete(key));
        if (url.search !== before) {
          win.history?.replaceState?.(win.history.state, "", url.pathname + url.search + url.hash);
        }
      } catch {}
    }

    function streamAccessCodeForRoom(id, token) {
      return token ? "" : readStoredAccessCode(id);
    }

    function isAccessCodeError(err) {
      return /access_code_required|access_code_invalid/i.test(String(err?.message || err || ""));
    }

    function escapeHtml(value) {
      return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    function roundBb(value) {
      const n = Number(value);
      return Number.isFinite(n) ? Math.round(n * 10) / 10 : 0;
    }

    function formatWalletChips(value) {
      const n = Number(value);
      return Math.max(0, Math.round(Number.isFinite(n) ? Math.abs(n) : 0)).toLocaleString("ru-RU");
    }

    function walletReasonLabel(reason) {
      const key = String(reason || "").toLowerCase();
      if (key === "cash_buy_in") return "buy-in кэш";
      if (key === "cash_rebuy") return "ребай";
      if (key === "cash_out") return "cash-out";
      if (key === "tournament_entry") return "вход в турнир";
      if (key === "tournament_payout") return "приз турнира";
      if (key === "tournament_refund" || key === "admin_tournament_refund") return "возврат турнира";
      if (key === "admin_cash_close_out") return "закрытие стола";
      if (key === "admin_wallet_credit") return "пополнение";
      if (key === "admin_wallet_debit") return "списание";
      if (key === "admin_wallet_set") return "коррекция";
      return key ? key.replace(/_/g, " ") : "операция";
    }

    function latestWalletActivity(wallet) {
      const activity = Array.isArray(wallet?.activity) ? wallet.activity : [];
      return activity.find((entry) => entry && Number.isFinite(Number(entry.delta))) || null;
    }

    function renderWalletActivity(target, wallet) {
      if (!target) return;
      const entry = latestWalletActivity(wallet);
      const delta = Number(entry?.delta);
      if (!entry || !Number.isFinite(delta)) {
        target.hidden = true;
        target.textContent = "";
        target.title = "";
        target.classList.remove("is-positive", "is-negative", "is-neutral");
        return;
      }
      const label = walletReasonLabel(entry.reason);
      const sign = delta > 0 ? "+" : delta < 0 ? "-" : "";
      const roomName = String(entry.roomName || "").trim();
      const balanceAfter = Number(entry.balanceAfter);
      const balanceText = Number.isFinite(balanceAfter) ? ` · баланс ${formatWalletChips(balanceAfter)}` : "";
      target.hidden = false;
      target.textContent = `${sign}${formatWalletChips(delta)} · ${label}`;
      target.title = [label, roomName, `${sign}${formatWalletChips(delta)}`, balanceText.replace(/^ · /, "")]
        .filter(Boolean)
        .join(" · ");
      target.classList.toggle("is-positive", delta > 0);
      target.classList.toggle("is-negative", delta < 0);
      target.classList.toggle("is-neutral", delta === 0);
    }

    function cleanCards(value, max = 5) {
      return Array.isArray(value) ? value.filter(Boolean).slice(0, max).map((card) => String(card)) : [];
    }

    function serverReplaySeatPosition(hand, seat) {
      const index = Number(seat?.seatIndex);
      if (!Number.isFinite(index)) return "";
      const button = Number(hand?.buttonSeatIndex);
      const smallBlind = Number(hand?.smallBlindSeatIndex);
      const bigBlind = Number(hand?.bigBlindSeatIndex);
      if (index === button && index === smallBlind) return "BTN/SB";
      if (index === button) return "BTN";
      if (index === smallBlind) return "SB";
      if (index === bigBlind) return "BB";
      return `Seat ${index + 1}`;
    }

    function serverReplaySeatFromHand(hand, seat, initial = false) {
      const id = Number(seat?.seatIndex);
      const startStack = Number.isFinite(Number(seat?.startStack))
        ? Number(seat.startStack)
        : Number(seat?.stack || 0) + Number(seat?.committedTotal || 0);
      return {
        id,
        roomSeatIndex: id,
        name: String(seat?.playerName || `Seat ${Number.isFinite(id) ? id + 1 : ""}`).trim(),
        position: serverReplaySeatPosition(hand, seat),
        stack: roundBb(initial ? startStack : seat?.stack),
        cards: cleanCards(seat?.hole, 2),
        folded: initial ? false : Boolean(seat?.folded),
        allIn: initial ? false : Boolean(seat?.allIn),
        bet: initial ? 0 : 0,
        contribution: initial ? 0 : roundBb(seat?.committedStreet),
        isHero: Boolean(seat?.isYou),
        isBot: Boolean(seat?.isBot),
        botProfile: seat?.botProfile && typeof seat.botProfile === "object" ? seat.botProfile : null
      };
    }

    function cloneReplaySeats(seats) {
      return (Array.isArray(seats) ? seats : []).map((seat) => ({
        ...seat,
        cards: cleanCards(seat?.cards, 2)
      }));
    }

    function serverReplaySnapshotSeats(hand, snapshot, fallbackSeats) {
      const source = Array.isArray(snapshot?.seats) ? snapshot.seats : [];
      if (!source.length) return cloneReplaySeats(fallbackSeats);
      const handSeats = new Map((Array.isArray(hand?.seats) ? hand.seats : []).map((seat) => [Number(seat?.seatIndex), seat]));
      const previous = new Map((Array.isArray(fallbackSeats) ? fallbackSeats : []).map((seat) => [Number(seat?.id), seat]));
      return source.map((seat) => {
        const id = Number(seat?.seatIndex);
        const base = handSeats.has(id) ? serverReplaySeatFromHand(hand, handSeats.get(id), false) : (previous.get(id) || {});
        return {
          ...base,
          id,
          roomSeatIndex: id,
          name: String(seat?.playerName || base.name || `Seat ${Number.isFinite(id) ? id + 1 : ""}`).trim(),
          stack: roundBb(seat?.stack),
          folded: Boolean(seat?.folded),
          allIn: Boolean(seat?.allIn),
          sittingOut: Boolean(seat?.sittingOut),
          bet: roundBb(seat?.committedStreet),
          contribution: roundBb(seat?.committedStreet),
          cards: cleanCards(base.cards, 2),
          isHero: Boolean(base.isHero)
        };
      });
    }

    function serverReplayState({ seats, board, pot, street, currentBet }) {
      return {
        street: street || "",
        pot: roundBb(pot),
        currentBet: roundBb(currentBet),
        board: cleanCards(board, 5),
        seats: cloneReplaySeats(seats)
      };
    }

    function serverReplayActionTone(action) {
      const type = String(action || "").toLowerCase();
      if (type === "fold") return "fold";
      if (/all.?in/.test(type)) return "allin";
      if (/raise|bet|open/.test(type)) return "aggressive";
      return "passive";
    }

    function serverReplayActionText(action) {
      const type = String(action || "").toLowerCase();
      if (type === "fold") return "фолд";
      if (type === "check") return "чек";
      if (type === "call") return "колл";
      if (type === "raise") return "рейз";
      if (type === "bet") return "бет";
      if (/all.?in/.test(type)) return "олл-ин";
      return type || "ход";
    }

    function serverReplayStreetText(street) {
      const value = String(street || "").toLowerCase();
      if (value === "flop") return "Флоп";
      if (value === "turn") return "Тёрн";
      if (value === "river") return "Ривер";
      if (value === "showdown") return "Шоудаун";
      if (value === "preflop") return "Префлоп";
      return street || "Улица";
    }

    function serverReplayActorName(seat, seatIndex) {
      return seat?.isHero ? "Hero" : seat?.position || seat?.name || `Seat ${Number(seatIndex) + 1}`;
    }

    function serverReplayActionLabel(event, seat) {
      const action = serverReplayActionText(event?.action);
      const amount = Number(event?.amount);
      const to = Number(event?.to);
      const suffix = Number.isFinite(to) && to > 0 && /raise|bet|open/i.test(String(event?.action || ""))
        ? ` до ${roundBb(to)} BB`
        : Number.isFinite(amount) && amount > 0
        ? ` ${roundBb(amount)} BB`
        : "";
      return `${serverReplayActorName(seat, event?.seatIndex)} ${action}${suffix}`;
    }

    function serverReplayPotAwardLedger(results, seatMap) {
      return (Array.isArray(results?.potAwards) ? results.potAwards : []).map((pot, index) => {
        const winners = (Array.isArray(pot?.winners) ? pot.winners : [])
          .map((winner) => {
            const seatId = Number(winner?.seatIndex);
            if (!Number.isFinite(seatId)) return null;
            const seat = seatMap.get(seatId);
            return {
              seatId,
              name: seat?.name || `Seat ${seatId + 1}`,
              position: seat?.position || "",
              isHero: Boolean(seat?.isHero),
              amount: roundBb(winner?.amount)
            };
          })
          .filter((winner) => winner && winner.amount > 0);
        return {
          potIndex: Number(pot?.potIndex ?? index),
          kind: String(pot?.kind || (index === 0 ? "main" : "side")),
          amount: roundBb(pot?.amount),
          eligible: Array.isArray(pot?.eligible) ? pot.eligible.map(Number).filter(Number.isFinite) : [],
          winners
        };
      }).filter((pot) => pot.amount > 0 && pot.winners.length);
    }

    function serverReplayAggregatePotWinners(potAwardLedger, fallbackWinners) {
      if (!Array.isArray(potAwardLedger) || !potAwardLedger.length) return fallbackWinners;
      const bySeat = new Map();
      for (const pot of potAwardLedger) {
        for (const winner of pot.winners || []) {
          const prev = bySeat.get(Number(winner.seatId));
          if (prev) prev.amount = roundBb(prev.amount + Number(winner.amount || 0));
          else bySeat.set(Number(winner.seatId), { ...winner, amount: roundBb(winner.amount) });
        }
      }
      return [...bySeat.values()]
        .filter((winner) => winner.amount > 0)
        .sort((left, right) => Number(right.amount || 0) - Number(left.amount || 0));
    }

    function serverReplayShowdown(hand, entry, seatMap) {
      const results = hand?.results || {};
      const reveal = Array.isArray(results.reveal) ? results.reveal : [];
      const participants = reveal
        .map((item) => {
          const seatId = Number(item?.seatIndex);
          if (!Number.isFinite(seatId)) return null;
          const seat = seatMap.get(seatId);
          return {
            seatId,
            name: item?.playerName || seat?.name || `Seat ${seatId + 1}`,
            position: seat?.position || "",
            isHero: Boolean(seat?.isHero),
            cards: cleanCards(item?.hole, 2),
            handName: String(item?.handName || ""),
            score: Array.isArray(item?.score) ? item.score.slice(0, 8).map(Number).filter(Number.isFinite) : [],
            bestCards: cleanCards(item?.bestCards, 5)
          };
        })
        .filter(Boolean);
      const potAwardLedger = serverReplayPotAwardLedger(results, seatMap);
      const payoutEntries = results.payouts && typeof results.payouts === "object"
        ? Object.entries(results.payouts).map(([seatIndex, amount]) => ({ seatIndex: Number(seatIndex), amount: Number(amount) }))
        : [];
      const winnerSource = payoutEntries.length
        ? payoutEntries.filter((winner) => Number(winner.amount) > 0)
        : Array.isArray(entry?.winners)
        ? entry.winners
        : [];
      const potWinners = winnerSource
        .map((winner) => {
          const seatId = Number(winner?.seatIndex);
          if (!Number.isFinite(seatId)) return null;
          const seat = seatMap.get(seatId);
          return {
            seatId,
            name: winner?.playerName || seat?.name || `Seat ${seatId + 1}`,
            position: seat?.position || "",
            isHero: Boolean(seat?.isHero),
            amount: roundBb(winner?.amount)
          };
        })
        .filter(Boolean)
        .sort((left, right) => Number(right.amount || 0) - Number(left.amount || 0));
      const aggregateWinners = serverReplayAggregatePotWinners(potAwardLedger, potWinners);
      const primaryWinner = aggregateWinners[0] || null;
      const best = primaryWinner
        ? participants.find((item) => Number(item.seatId) === Number(primaryWinner.seatId))
        : participants.find((item) => item.handName) || null;
      return {
        pot: roundBb(entry?.pot ?? hand?.pot),
        participants,
        winners: aggregateWinners,
        potWinners: aggregateWinners,
        potAwards: aggregateWinners.map((winner) => ({ seatId: winner.seatId, amount: roundBb(winner.amount) })),
        potAwardLedger,
        winningHandName: best?.handName || "",
        winningCards: cleanCards(best?.bestCards, 5)
      };
    }

    function serverReplayActions(hand, entry) {
      const trail = Array.isArray(hand?.actionTrail) ? hand.actionTrail : [];
      const initialSeats = (Array.isArray(hand?.seats) ? hand.seats : []).map((seat) => serverReplaySeatFromHand(hand, seat, true));
      const finalSeats = (Array.isArray(hand?.seats) ? hand.seats : []).map((seat) => serverReplaySeatFromHand(hand, seat, false));
      let seats = cloneReplaySeats(initialSeats.length ? initialSeats : finalSeats);
      let board = [];
      let street = "preflop";
      let pot = roundBb(Number(hand?.smallBlind || 0) + Number(hand?.bigBlind || 0));
      let currentBet = roundBb(hand?.bigBlind);
      const startState = trail.find((event) => event?.type === "hand-started" && event?.state && Array.isArray(event.state.seats))?.state || null;
      if (startState) {
        seats = serverReplaySnapshotSeats(hand, startState, seats);
        board = cleanCards(startState.board, 5);
        street = String(startState.street || street);
        pot = roundBb(startState.pot ?? pot);
        currentBet = roundBb(startState.currentBet ?? currentBet);
      }
      const events = [];
      const push = (event) => events.push({ seq: events.length + 1, ...event });
      push({
        phase: "street",
        street,
        board,
        pot,
        label: `Раздача #${Number(entry?.handNo || hand?.handNo || 0)} началась`,
        state: serverReplayState({ seats, board, pot, street, currentBet })
      });
      for (const raw of trail) {
        const type = String(raw?.type || "");
        if (type === "hand-started") continue;
        if (type === "street") {
          if (raw.state && Array.isArray(raw.state.seats)) {
            seats = serverReplaySnapshotSeats(hand, raw.state, seats);
            street = String(raw.state.street || raw.street || street || "");
            board = cleanCards(raw.state.board?.length ? raw.state.board : raw.board, 5);
            currentBet = roundBb(raw.state.currentBet ?? 0);
            pot = roundBb(raw.state.pot ?? raw.pot ?? pot);
          } else {
            street = String(raw.street || street || "");
            board = cleanCards(raw.board, 5);
            currentBet = 0;
            seats = seats.map((seat) => ({ ...seat, bet: 0, contribution: 0 }));
            if (raw.pot != null) pot = roundBb(raw.pot);
          }
          push({
            phase: "street",
            street,
            board,
            pot,
            label: `${serverReplayStreetText(street)} · борд`,
            state: serverReplayState({ seats, board, pot, street, currentBet })
          });
          continue;
        }
        if (type === "hand-action") {
          const seatId = Number(raw.seatIndex);
          const amount = roundBb(raw.amount);
          const to = roundBb(raw.to);
          const action = String(raw.action || "");
          const tone = serverReplayActionTone(action);
          const hasServerSnapshot = Boolean(raw.state && Array.isArray(raw.state.seats));
          if (hasServerSnapshot) {
            seats = serverReplaySnapshotSeats(hand, raw.state, seats);
            street = String(raw.state.street || raw.street || street);
            board = cleanCards(raw.state.board?.length ? raw.state.board : raw.board, 5);
            pot = roundBb(raw.state.pot ?? raw.pot ?? pot);
            currentBet = roundBb(raw.state.currentBet ?? currentBet);
          }
          const actor = seats.find((seat) => Number(seat.id) === seatId) || null;
          if (actor && !hasServerSnapshot) {
            if (amount > 0) {
              actor.stack = roundBb(Math.max(0, Number(actor.stack || 0) - amount));
              actor.bet = roundBb(to > 0 ? to : Number(actor.bet || 0) + amount);
              actor.contribution = actor.bet;
            }
            if (tone === "fold") actor.folded = true;
            if (tone === "allin") {
              actor.stack = 0;
              actor.allIn = true;
            }
          }
          if (!hasServerSnapshot) {
            if (raw.street) street = String(raw.street);
            if (raw.board) board = cleanCards(raw.board, 5);
            if (raw.pot != null) pot = roundBb(raw.pot);
            else if (amount > 0) pot = roundBb(pot + amount);
            if (to > 0) currentBet = Math.max(currentBet, to);
          }
          const state = serverReplayState({ seats, board, pot, street, currentBet });
          if (amount > 0) {
            push({
              phase: "chips",
              street,
              seatId,
              amount,
              contribution: actor?.contribution || to || amount,
              pot,
              board,
              label: `${serverReplayActorName(actor, seatId)} вносит ${amount} BB`,
              state
            });
          }
          push({
            phase: "action",
            street,
            seatId,
            action,
            tone,
            amount,
            to,
            pot,
            board,
            label: serverReplayActionLabel(raw, actor),
            state
          });
          continue;
        }
        if (type === "showdown") {
          street = "showdown";
          if (raw.state && Array.isArray(raw.state.seats)) {
            seats = serverReplaySnapshotSeats(hand, raw.state, finalSeats);
            board = cleanCards(raw.state.board?.length ? raw.state.board : raw.board?.length ? raw.board : hand?.board || entry?.board, 5);
            pot = roundBb(raw.state.pot ?? raw.pot ?? pot);
            currentBet = roundBb(raw.state.currentBet ?? currentBet);
          } else {
            board = cleanCards(raw.board?.length ? raw.board : hand?.board || entry?.board, 5);
            if (raw.pot != null) pot = roundBb(raw.pot);
            seats = cloneReplaySeats(finalSeats);
          }
          push({
            phase: "result",
            street,
            board,
            pot,
            label: entry?.result || "Шоудаун",
            state: serverReplayState({ seats, board, pot, street, currentBet })
          });
        }
      }
      const finalBoard = cleanCards(hand?.results?.board?.length ? hand.results.board : hand?.board || entry?.board, 5);
      const finalState = serverReplayState({
        seats: finalSeats.length ? finalSeats : seats,
        board: finalBoard,
        pot: entry?.pot ?? hand?.pot ?? pot,
        street: "showdown",
        currentBet
      });
      const hasFinal = events.some((event) => event.phase === "result");
      if (!hasFinal) {
        push({
          phase: "result",
          street: "showdown",
          board: finalBoard,
          pot: finalState.pot,
          label: entry?.result || "Раздача завершена",
          state: finalState
        });
      }
      return events;
    }

    function serverReplayEntry(entry, room, tableId = 1, replayRoomId = activeRoomId) {
      const hand = entry?.hand && typeof entry.hand === "object" ? entry.hand : null;
      if (!hand) return null;
      const safeTableId = Number.isFinite(Number(tableId)) && Number(tableId) > 0 ? Number(tableId) : 1;
      const handNo = Number(entry?.handNo || hand.handNo || 0);
      const finalSeats = (Array.isArray(hand.seats) ? hand.seats : []).map((seat) => serverReplaySeatFromHand(hand, seat, false));
      const seatMap = new Map(finalSeats.map((seat) => [Number(seat.id), seat]));
      const heroSeat = finalSeats.find((seat) => seat.isHero) || null;
      const heroHand = cleanCards(heroSeat?.cards, 2);
      const showdown = serverReplayShowdown(hand, entry, seatMap);
      const heroWon = heroSeat ? showdown.potWinners.some((winner) => Number(winner.seatId) === Number(heroSeat.id)) : false;
      const resultKind = heroSeat ? (heroWon ? "won" : "lost") : (showdown.potWinners.length > 1 ? "split" : "lost");
      const handHistory = {
        schema: "poker-simulator-hand-v1",
        source: "server-room-history",
        sessionId: `room:${replayRoomId || room?.id || activeRoomId}`,
        tableId: safeTableId,
        handNo,
        status: "showdown",
        street: "showdown",
        spot: { title: room?.name || latest?.room?.name || "Онлайн-стол" },
        combo: heroHand.join(" "),
        result: String(entry?.result || "Раздача завершена"),
        resultKind,
        pot: roundBb(entry?.pot ?? hand.pot),
        board: cleanCards(hand?.results?.board?.length ? hand.results.board : hand?.board || entry?.board, 5),
        heroHand,
        seats: finalSeats,
        actions: serverReplayActions(hand, entry),
        showdown
      };
      return {
        no: handNo,
        tableId: safeTableId,
        combo: handHistory.combo,
        result: handHistory.result,
        outcome: resultKind === "won" ? "win" : resultKind === "split" ? "split" : "loss",
        handHistory,
        source: "serverRoomHistory"
      };
    }

    function buildServerReplayEntries(room, tableId = 1, replayRoomId = activeRoomId) {
      return (Array.isArray(room?.handHistory) ? room.handHistory : [])
        .map((entry) => serverReplayEntry(entry, room, tableId, replayRoomId))
        .filter(Boolean);
    }

    function syncServerReplayEntries(view, currentState = getState() || {}, tableId = tableIdForRoom(view?.room?.id), replayRoomId = view?.room?.id) {
      currentState.serverReplayEntries = buildServerReplayEntries(view?.room, tableId, replayRoomId || view?.room?.id || activeRoomId);
      return currentState.serverReplayEntries;
    }

    const initialAccessCode = cleanAccessCode(params.get("accessCode") || params.get("code") || params.get("roomCode") || "");
    if (initialAccessCode) stripAccessCodeFromUrl();

    function setServerModeShell(active) {
      if (!doc) return;
      try {
        const html = doc.documentElement;
        if (html?.dataset) {
          if (active) html.dataset.simulatorServerMode = "true";
          else delete html.dataset.simulatorServerMode;
        }
        const app = doc.querySelector?.(".app");
        if (app?.dataset) {
          if (active) app.dataset.simulatorServerMode = "true";
          else delete app.dataset.simulatorServerMode;
        }
      } catch {}
    }
    setServerModeShell(true);

    // Localized copy for the user-facing chrome.
    function authReturnTo() {
      return (win.location?.pathname || "/poker-simulator.html")
        + (win.location?.search || "")
        + (win.location?.hash || "");
    }

    function startGoogleLogin(returnTo = authReturnTo()) {
      win.location.href = "/api/auth/google/start?returnTo=" + encodeURIComponent(returnTo);
    }

    function joinErrorText(err) {
      const code = String(err?.message || err || "");
      if (/room_not_found|room_closed|not_found/i.test(code)) return "Стол не найден или уже закрыт.";
      if (/access_code_required/i.test(code)) return "Для входа нужен код доступа к столу.";
      if (/access_code_invalid/i.test(code)) return "Код доступа не подошёл.";
      if (/login_required/i.test(code)) return "Нужно войти в аккаунт, чтобы играть на фантики.";
      if (/insufficient_play_chips|402/i.test(code)) {
        const data = err?.data || {};
        const balance = Number(data.balanceChips ?? data.wallet?.balanceChips);
        const needed = Number(data.neededChips);
        if (Number.isFinite(balance) && Number.isFinite(needed) && needed > 0) {
          return `На балансе ${formatWalletChips(balance)}, байин ${formatWalletChips(needed)} фантиков.`;
        }
        return "На балансе не хватает фантиков для байина.";
      }
      if (/registration_closed/i.test(code)) return "Регистрация в турнир закрыта.";
      if (/room_full|full/i.test(code)) return "Стол заполнен.";
      if (/rate_limited|429|too_many/i.test(code)) return "Слишком много запросов — попробуйте через минуту.";
      if (/bad_origin|403/i.test(code)) return "Доступ к столу отклонён.";
      return "Не удалось подключиться к столу. Проверьте ссылку и соединение.";
    }
    function actionErrorText(err) {
      const code = String(err?.message || err || "");
      if (/not_your_turn/i.test(code)) return "Сейчас не ваш ход.";
      if (/no_active_hand/i.test(code)) return "Рука уже завершена.";
      if (/below|min|raise|invalid/i.test(code)) return "Ставка ниже минимума.";
      if (/not_seated/i.test(code)) return "Вы не за столом — место занято.";
      if (/rate_limited|429|too_many/i.test(code)) return "Слишком часто — секунду.";
      return "Ход отклонён сервером.";
    }
    function leaveErrorText(err) {
      const code = String(err?.message || err || "");
      if (/wallet_update_failed|wallet_settlement_failed/i.test(code)) return "Не удалось закрыть баланс за столом. Попробуйте ещё раз.";
      if (/room_not_found|room_closed|not_seated/i.test(code)) return "Стол уже закрыт или место освобождено.";
      if (/rate_limited|429|too_many/i.test(code)) return "Слишком часто — попробуйте выйти через минуту.";
      if (/bad_origin|403/i.test(code)) return "Сервер отклонил выход. Обновите страницу и попробуйте снова.";
      if (/network|fetch|failed to fetch/i.test(code)) return "Сеть не подтвердила выход. Проверьте соединение и попробуйте ещё раз.";
      return "Не удалось подтвердить выход со стола. Попробуйте ещё раз.";
    }
    function isBenignLeaveError(err) {
      return /room_not_found|room_closed|not_seated/i.test(String(err?.message || err || ""));
    }
    function leaveRoomSettled(roomId) {
      const id = String(roomId || "");
      if (!id) return Promise.resolve({ ok: true, roomId: id, ignored: true });
      return Promise.resolve(client.leave(id))
        .then((data) => ({ ok: true, roomId: id, data }))
        .catch((err) => isBenignLeaveError(err)
          ? { ok: true, roomId: id, ignored: true, error: err }
          : { ok: false, roomId: id, error: err });
    }

    function checkFoldPreAction(view) {
      return view?.room?.preAction?.type === "check-fold" ? view.room.preAction : null;
    }

    function callCurrentPreAction(view) {
      return view?.room?.preAction?.type === "call-current" ? view.room.preAction : null;
    }

    function raiseMinPreAction(view) {
      return view?.room?.preAction?.type === "raise-min" ? view.room.preAction : null;
    }

    function raiseThreeXPreAction(view) {
      return view?.room?.preAction?.type === "raise-3x" ? view.room.preAction : null;
    }

    function raisePotPreAction(view) {
      return view?.room?.preAction?.type === "raise-pot" ? view.room.preAction : null;
    }

    function raiseAllInPreAction(view) {
      return view?.room?.preAction?.type === "raise-all-in" ? view.room.preAction : null;
    }

    function viewerCurrentToCall(view) {
      const hand = view?.hand || null;
      const seat = (hand?.seats || []).find((candidate) => candidate?.isYou) || null;
      if (!hand || !seat) return 0;
      return Math.max(0, Math.round((Number(hand.currentBet || 0) - Number(seat.committedStreet || 0)) * 100) / 100);
    }

    function viewerMinRaiseTo(view) {
      const hand = view?.hand || null;
      const seat = (hand?.seats || []).find((candidate) => candidate?.isYou) || null;
      if (!hand || !seat) return 0;
      const legalMin = Number(hand.legal?.minRaiseTo);
      if (Number.isFinite(legalMin) && legalMin > 0) return Math.round(legalMin * 100) / 100;
      const currentBet = Number(hand.currentBet || 0);
      const minRaise = Number(hand.minRaise || hand.bigBlind || 0);
      const maxRaiseTo = Number(seat.committedStreet || 0) + Number(seat.stack || 0);
      const minRaiseTo = Math.min(maxRaiseTo, currentBet + minRaise);
      return Number.isFinite(minRaiseTo) ? Math.max(0, Math.round(minRaiseTo * 100) / 100) : 0;
    }

    function viewerMaxRaiseTo(view) {
      const hand = view?.hand || null;
      const seat = (hand?.seats || []).find((candidate) => candidate?.isYou) || null;
      if (!hand || !seat) return 0;
      const legalMax = Number(hand.legal?.maxRaiseTo);
      if (Number.isFinite(legalMax) && legalMax > 0) return Math.round(legalMax * 100) / 100;
      const maxRaiseTo = Number(seat.committedStreet || 0) + Number(seat.stack || 0);
      return Number.isFinite(maxRaiseTo) ? Math.max(0, Math.round(maxRaiseTo * 100) / 100) : 0;
    }

    function viewerPotRaiseTo(view) {
      const hand = view?.hand || null;
      if (!hand) return 0;
      const maxRaiseTo = viewerMaxRaiseTo(view);
      const target = Number(hand.currentBet || 0) + Number(hand.pot || 0) + viewerCurrentToCall(view);
      return Number.isFinite(target) ? Math.max(0, Math.round(Math.min(maxRaiseTo || target, target) * 100) / 100) : 0;
    }

    function viewerThreeXRaiseTo(view) {
      const hand = view?.hand || null;
      if (!hand) return 0;
      const maxRaiseTo = viewerMaxRaiseTo(view);
      const target = Number(hand.currentBet || 0) * 3;
      return Number.isFinite(target) ? Math.max(0, Math.round(Math.min(maxRaiseTo || target, target) * 100) / 100) : 0;
    }

    function viewerAllInRaiseTo(view) {
      return viewerMaxRaiseTo(view);
    }

    function formatPreActionAmount(value) {
      const amount = Math.max(0, Number(value || 0));
      if (!Number.isFinite(amount) || amount <= 0) return "";
      return amount % 1 === 0 ? String(amount) : amount.toFixed(1).replace(/\.0$/, "");
    }

    function serverPreActionAvailable(view) {
      const hand = view?.hand || null;
      if (!hand || hand.status !== "betting" || hand.youToAct) return false;
      const roomSeat = (view?.room?.seats || []).find((seat) => seat?.isYou) || null;
      const handSeat = (hand.seats || []).find((seat) => seat?.isYou) || null;
      return Boolean(roomSeat && roomSeat.state !== "sitting-out" && handSeat?.hasCards && !handSeat.folded && !handSeat.allIn);
    }

    function serverCallPreActionAvailable(view) {
      return serverPreActionAvailable(view) && viewerCurrentToCall(view) > 0;
    }

    function serverRaiseMinPreActionAvailable(view) {
      if (!serverCallPreActionAvailable(view)) return false;
      const hand = view?.hand || null;
      const seat = (hand?.seats || []).find((candidate) => candidate?.isYou) || null;
      if (!hand || !seat) return false;
      const toCall = viewerCurrentToCall(view);
      const minRaiseTo = viewerMinRaiseTo(view);
      const maxRaiseTo = Number(seat.committedStreet || 0) + Number(seat.stack || 0);
      return Number(seat.stack || 0) > toCall + 1e-9
        && minRaiseTo > Number(hand.currentBet || 0) + 1e-9
        && minRaiseTo <= maxRaiseTo + 1e-9;
    }

    function serverRaisePotPreActionAvailable(view) {
      if (!serverCallPreActionAvailable(view)) return false;
      const hand = view?.hand || null;
      if (!hand) return false;
      const minRaiseTo = viewerMinRaiseTo(view);
      const maxRaiseTo = viewerMaxRaiseTo(view);
      const potRaiseTo = viewerPotRaiseTo(view);
      return potRaiseTo > Number(hand.currentBet || 0) + 1e-9
        && potRaiseTo <= maxRaiseTo + 1e-9
        && (potRaiseTo >= minRaiseTo - 1e-9 || potRaiseTo >= maxRaiseTo - 1e-9);
    }

    function serverRaiseThreeXPreActionAvailable(view) {
      if (!serverCallPreActionAvailable(view)) return false;
      const hand = view?.hand || null;
      if (!hand) return false;
      const minRaiseTo = viewerMinRaiseTo(view);
      const maxRaiseTo = viewerMaxRaiseTo(view);
      const threeXRaiseTo = viewerThreeXRaiseTo(view);
      return threeXRaiseTo > Number(hand.currentBet || 0) + 1e-9
        && threeXRaiseTo <= maxRaiseTo + 1e-9
        && (threeXRaiseTo >= minRaiseTo - 1e-9 || threeXRaiseTo >= maxRaiseTo - 1e-9);
    }

    function serverRaiseAllInPreActionAvailable(view) {
      if (!serverCallPreActionAvailable(view)) return false;
      const hand = view?.hand || null;
      if (!hand) return false;
      return viewerAllInRaiseTo(view) > Number(hand.currentBet || 0) + 1e-9;
    }

    // --- Server-mode chrome: corner pills + blocking overlay + toast ---------
    // Appended to <body>, independent of the felt renderer (a fixed overlay layer
    // that never mutates engine state). Styles live in simulator-online-lobby.css.
    const chrome = (() => {
      if (!doc || !doc.body) {
        const noop = () => {};
        return {
          mounted: false,
          update: noop,
          setConn: noop,
          connectionState: () => "",
          actionsLocked: () => false,
          showLoading: noop,
          showError: noop,
          hideOverlay: noop,
          toast: noop,
          dispose: noop
        };
      }
      const root = doc.createElement("div");
      root.className = "mp-chrome";
      root.dataset.conn = "connecting";
      root.innerHTML =
        '<div class="mp-chrome-room">' +
          '<span class="mp-chrome-dot" aria-hidden="true"></span>' +
          '<span class="mp-chrome-table" hidden></span>' +
          '<b class="mp-chrome-name">Стол</b>' +
          '<span class="mp-chrome-seats"></span>' +
          '<span class="mp-chrome-host" hidden>хост</span>' +
          '<span class="mp-chrome-wallet" data-mp-wallet hidden></span>' +
          '<span class="mp-chrome-wallet-activity" data-mp-wallet-activity hidden></span>' +
          '<span class="mp-chrome-room-badge mp-chrome-private" data-mp-room-private hidden>приватный</span>' +
          '<span class="mp-chrome-room-badge mp-chrome-lock" data-mp-room-lock hidden>код</span>' +
          '<span class="mp-chrome-viewer" hidden>наблюдение</span>' +
          '<span class="mp-chrome-phase" hidden></span>' +
          '<span class="mp-chrome-turn" role="timer" hidden></span>' +
          '<span class="mp-chrome-conn" hidden></span>' +
        '</div>' +
        '<div class="mp-table-queue" role="group" aria-label="Столы онлайн" hidden></div>' +
        '<div class="mp-action-stack-wrap" data-mp-action-stack-wrap hidden>' +
          '<button type="button" class="mp-action-stack" data-mp-action-stack aria-live="polite" aria-expanded="false" aria-controls="mp-action-list">' +
            '<span class="mp-action-stack-kicker">Очередь</span>' +
            '<b class="mp-action-stack-title">Ваш ход</b>' +
            '<span class="mp-action-stack-meta">Перейти к столу</span>' +
          '</button>' +
          '<div class="mp-action-list" id="mp-action-list" role="menu" aria-label="Срочные столы" hidden></div>' +
        '</div>' +
        '<div class="mp-chrome-actions">' +
          '<button type="button" class="mp-chrome-btn primary" data-mp="take-seat" hidden>Сесть</button>' +
          '<button type="button" class="mp-chrome-btn primary" data-mp="deal" hidden>Раздать</button>' +
          '<button type="button" class="mp-chrome-btn mp-pre-action" data-mp="pre-action" hidden>Чек/пас</button>' +
          '<button type="button" class="mp-chrome-btn mp-pre-action" data-mp="pre-action-call" hidden>Колл</button>' +
          '<button type="button" class="mp-chrome-btn mp-pre-action" data-mp="pre-action-raise-min" hidden>Мин рейз</button>' +
          '<button type="button" class="mp-chrome-btn mp-pre-action" data-mp="pre-action-raise-3x" hidden>3x</button>' +
          '<button type="button" class="mp-chrome-btn mp-pre-action" data-mp="pre-action-raise-pot" hidden>Пот</button>' +
          '<button type="button" class="mp-chrome-btn mp-pre-action" data-mp="pre-action-raise-all-in" hidden>Олл-ин</button>' +
          '<button type="button" class="mp-chrome-btn" data-mp="sit" hidden>Перерыв</button>' +
          '<button type="button" class="mp-chrome-btn" data-mp="history" hidden>История</button>' +
          '<button type="button" class="mp-chrome-btn" data-mp="invite">Пригласить</button>' +
          '<button type="button" class="mp-chrome-btn danger" data-mp="leave">Выйти</button>' +
        '</div>';

      const overlay = doc.createElement("div");
      overlay.className = "mp-overlay";
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-live", "polite");
      overlay.innerHTML =
        '<div class="mp-overlay-card">' +
          '<div class="mp-spinner" aria-hidden="true"></div>' +
          '<div class="mp-overlay-eyebrow">Онлайн-стол</div>' +
          '<div class="mp-overlay-title"></div>' +
          '<div class="mp-overlay-msg"></div>' +
          '<input class="mp-overlay-input" type="text" maxlength="24" autocomplete="nickname" autocapitalize="off" spellcheck="false" placeholder="Например, FunFarmShark" aria-label="Имя за столом">' +
          '<div class="mp-overlay-actions"></div>' +
        '</div>';

      const toastEl = doc.createElement("div");
      toastEl.className = "mp-toast";
      toastEl.setAttribute("role", "status");
      toastEl.setAttribute("aria-live", "polite");

      const nameEl = root.querySelector(".mp-chrome-name");
      const tableEl = root.querySelector(".mp-chrome-table");
      const seatsEl = root.querySelector(".mp-chrome-seats");
      const hostEl = root.querySelector(".mp-chrome-host");
      const walletEl = root.querySelector("[data-mp-wallet]");
      const walletActivityEl = root.querySelector("[data-mp-wallet-activity]");
      const privateEl = root.querySelector("[data-mp-room-private]");
      const lockEl = root.querySelector("[data-mp-room-lock]");
      const viewerEl = root.querySelector(".mp-chrome-viewer");
      const phaseEl = root.querySelector(".mp-chrome-phase");
      const turnEl = root.querySelector(".mp-chrome-turn");
      const connEl = root.querySelector(".mp-chrome-conn");
      const tableQueueEl = root.querySelector(".mp-table-queue");
      const actionStackWrapEl = root.querySelector("[data-mp-action-stack-wrap]");
      const actionStackEl = root.querySelector("[data-mp-action-stack]");
      const actionListEl = root.querySelector(".mp-action-list");
      const actionStackKickerEl = root.querySelector(".mp-action-stack-kicker");
      const actionStackTitleEl = root.querySelector(".mp-action-stack-title");
      const actionStackMetaEl = root.querySelector(".mp-action-stack-meta");
      const takeSeatEl = root.querySelector('[data-mp="take-seat"]');
      const dealEl = root.querySelector('[data-mp="deal"]');
      const preActionEl = root.querySelector('[data-mp="pre-action"]');
      const callPreActionEl = root.querySelector('[data-mp="pre-action-call"]');
      const raiseMinPreActionEl = root.querySelector('[data-mp="pre-action-raise-min"]');
      const raiseThreeXPreActionEl = root.querySelector('[data-mp="pre-action-raise-3x"]');
      const raisePotPreActionEl = root.querySelector('[data-mp="pre-action-raise-pot"]');
      const raiseAllInPreActionEl = root.querySelector('[data-mp="pre-action-raise-all-in"]');
      const sitEl = root.querySelector('[data-mp="sit"]');
      const historyEl = root.querySelector('[data-mp="history"]');
      const inviteEl = root.querySelector('[data-mp="invite"]');
      const leaveEl = root.querySelector('[data-mp="leave"]');
      const titleEl = overlay.querySelector(".mp-overlay-title");
      const msgEl = overlay.querySelector(".mp-overlay-msg");
      const inputEl = overlay.querySelector(".mp-overlay-input");
      const actionsEl = overlay.querySelector(".mp-overlay-actions");

      doc.body.append(root, overlay, toastEl);
      inviteEl.addEventListener("click", onInvite);
      leaveEl.addEventListener("click", onLeave);
      root.addEventListener("click", onChromeRootClick);
      tableQueueEl.addEventListener("click", onTableQueueClick);
      actionListEl.addEventListener("click", onActionListClick);
      actionListEl.addEventListener("input", onActionListInput);
      actionListEl.addEventListener("submit", onActionListSubmit);
      takeSeatEl.addEventListener("click", onTakeSeat);
      dealEl.addEventListener("click", onDeal);
      preActionEl.addEventListener("click", onCheckPreAction);
      callPreActionEl.addEventListener("click", onCallPreAction);
      raiseMinPreActionEl.addEventListener("click", onRaiseMinPreAction);
      raiseThreeXPreActionEl.addEventListener("click", onRaiseThreeXPreAction);
      raisePotPreActionEl.addEventListener("click", onRaisePotPreAction);
      raiseAllInPreActionEl.addEventListener("click", onRaiseAllInPreAction);
      sitEl.addEventListener("click", onSitToggle);
      historyEl.addEventListener("click", onHistory);

      let toastTimer = null;
      function toast(message, kind) {
        toastEl.textContent = message;
        toastEl.classList.toggle("warn", kind === "warn");
        toastEl.classList.add("is-show");
        if (toastTimer) win.clearTimeout(toastTimer);
        toastTimer = win.setTimeout(() => toastEl.classList.remove("is-show"), 3200);
      }
      function actionButton(label, cls, onClick) {
        const b = doc.createElement("button");
        b.type = "button";
        b.className = "mp-chrome-btn" + (cls ? " " + cls : "");
        b.textContent = label;
        b.addEventListener("click", onClick);
        return b;
      }
      const lobbyButton = (label) => actionButton(label || "Вернуться в лобби", "primary", () => { leaving = true; win.location.href = LOBBY_URL; });
      const retryButton = () => actionButton("Повторить", "", () => { try { win.location.reload(); } catch {} });

      // Turn clock — surface the SERVER's authoritative action deadline as a live
      // countdown next to the table phase. DISPLAY ONLY: the server owns the
      // action clock and its timeout fold, so this ticker only edits text and
      // NEVER POSTs an action (re-introducing a local autofold is exactly what
      // server mode forbids). The 250ms interval touches no engine timer map.
      let turn = null; // { remainingMs, anchorMs, label } | null
      let queueClock = null; // { metas, activeId, anchorMs } | null
      let actionListOpen = false;
      let lastRenderedView = null;
      function connectionActionLocked() {
        const state = String(root.dataset.conn || "");
        return state === "reconnecting" || state === "offline";
      }
      function renderConnectionState() {
        const state = String(root.dataset.conn || "connecting");
        const locked = connectionActionLocked();
        root.dataset.actionLocked = locked ? "true" : "false";
        root.classList.toggle("is-connection-locked", locked);
        root.setAttribute("aria-busy", locked ? "true" : "false");
        if (state === "reconnecting") {
          connEl.hidden = false;
          connEl.textContent = "переподключение";
        } else if (state === "offline") {
          connEl.hidden = false;
          connEl.textContent = "офлайн";
        } else {
          connEl.hidden = true;
          connEl.textContent = "";
        }
      }
      function renderTurn() {
        if (!turn) { return; }
        // Skew-proof countdown: remainingMs came from the SERVER; we only ever
        // subtract a LOCAL elapsed delta, so a client/server clock offset cancels
        // (rendering deadline - Date.now() directly corrupts under skew).
        const remain = Math.max(0, turn.remainingMs - (Date.now() - turn.anchorMs));
        turnEl.textContent = `${turn.label} · ${Math.ceil(remain / 1000)}с`;
        turnEl.classList.toggle("is-low", remain <= 5000);
      }
      const turnTimer = win.setInterval(() => {
        try { renderTurn(); } catch {}
        try { renderQueueClock(); } catch {}
      }, 250);

      function actionSecondsLabel(remainingMs) {
        return Number(remainingMs) > 0 ? `${Math.ceil(Number(remainingMs) / 1000)}с` : "Ваш ход";
      }

      function actionToneForRemaining(remainingMs) {
        return remainingMs != null && Number(remainingMs) <= 5000 ? "critical" : "action";
      }

      function liveQueueMeta(meta, elapsedMs = 0) {
        if (!meta?.isAction) return meta;
        const remainingMs = Math.max(0, Number(meta.remainingMs || 0) - Math.max(0, Number(elapsedMs || 0)));
        const status = actionSecondsLabel(remainingMs);
        const tone = actionToneForRemaining(remainingMs);
        return {
          ...meta,
          remainingMs,
          status,
          tone,
          title: `T${meta.tableId} · ${meta.roomName} · Ваш ход${remainingMs > 0 ? ` · ${Math.ceil(remainingMs / 1000)}с` : ""}`
        };
      }

      function actionCountLabel(count) {
        const n = Math.max(0, Number(count || 0));
        if (n === 1) return "1 ход";
        if (n >= 2 && n <= 4) return `${n} хода`;
        return `${n} ходов`;
      }

      function serverStreetLabel(street) {
        const key = String(street || "").toLowerCase();
        if (key === "preflop") return "Префлоп";
        if (key === "flop") return "Флоп";
        if (key === "turn") return "Тёрн";
        if (key === "river") return "Ривер";
        if (key === "showdown") return "Шоудаун";
        return key ? key : "Стол";
      }

      function tableActionSummary(hand, action, status) {
        if (!hand || hand.status !== "betting") return status || "Ждём";
        const parts = [serverStreetLabel(hand.street)];
        const pot = formatPreActionAmount(hand.pot);
        if (pot) parts.push(`Банк ${pot}`);
        if (action) {
          const toCall = formatPreActionAmount(hand.legal?.toCall);
          if (toCall) parts.push(`Колл ${toCall}`);
          else if (hand.legal?.canCheck) parts.push("Чек");
        } else {
          const currentBet = formatPreActionAmount(hand.currentBet);
          if (currentBet) parts.push(`Ставка ${currentBet}`);
        }
        return parts.join(" · ");
      }

      function roundedPopupAmount(value) {
        const amount = Number(value);
        return Number.isFinite(amount) ? Math.max(0, Math.round(amount * 10) / 10) : 0;
      }

      function popupSizingActions(hand) {
        if (!hand || hand.status !== "betting") return [];
        const legal = hand.legal || {};
        const currentBet = roundedPopupAmount(hand.currentBet);
        const pot = roundedPopupAmount(hand.pot);
        const toCall = roundedPopupAmount(legal.toCall);
        const minRaiseTo = roundedPopupAmount(legal.minRaiseTo);
        const maxRaiseTo = roundedPopupAmount(legal.maxRaiseTo);
        const canRaise = legal.canRaise === true;
        if (maxRaiseTo <= currentBet + 1e-9) return [];
        const actions = [];
        const seen = new Set();
        const addRaise = (label, rawAmount) => {
          const amount = roundedPopupAmount(rawAmount);
          if (!canRaise || amount <= currentBet + 1e-9 || amount < minRaiseTo - 1e-9 || amount > maxRaiseTo + 1e-9) return;
          if (amount >= maxRaiseTo - 1e-9) return;
          const key = String(Math.round(amount * 10));
          if (seen.has(key)) return;
          seen.add(key);
          const formatted = formatPreActionAmount(amount);
          actions.push({ type: "raise", amount, label: formatted ? `${label} ${formatted}` : label, tone: "raise" });
        };
        if (currentBet > 1e-9) {
          addRaise("2.5x", currentBet * 2.5);
          addRaise("3.5x", currentBet * 3.5);
        } else {
          addRaise("1/2", pot * 0.5);
          addRaise("3/4", pot * 0.75);
        }
        addRaise("Пот", currentBet + pot + toCall);
        if (!actions.length) addRaise("Мин", minRaiseTo);
        const allInLabel = formatPreActionAmount(maxRaiseTo);
        actions.push({ type: "allin", amount: maxRaiseTo, label: allInLabel ? `Олл-ин ${allInLabel}` : "Олл-ин", tone: "allin" });
        return actions.slice(0, 4);
      }

      function popupCustomRaise(hand) {
        if (!hand || hand.status !== "betting") return null;
        const legal = hand.legal || {};
        const currentBet = roundedPopupAmount(hand.currentBet);
        const minRaiseTo = roundedPopupAmount(legal.minRaiseTo);
        const maxRaiseTo = roundedPopupAmount(legal.maxRaiseTo);
        if (legal.canRaise !== true) return null;
        if (minRaiseTo <= currentBet + 1e-9 || maxRaiseTo < minRaiseTo - 1e-9) return null;
        return {
          min: minRaiseTo,
          max: maxRaiseTo,
          value: minRaiseTo,
          step: 0.1,
          label: currentBet > 1e-9 ? "Рейз" : "Ставка"
        };
      }

      function tableQuickActions(hand, action) {
        if (!action || !hand || hand.status !== "betting") return [];
        const legal = hand.legal || {};
        const toCall = Math.max(0, Number(legal.toCall || 0));
        const actions = [];
        if (toCall > 1e-9) {
          actions.push({ type: "fold", label: "Пас", tone: "fold" });
          const amount = formatPreActionAmount(toCall);
          actions.push({ type: "call", label: amount ? `Колл ${amount}` : "Колл", tone: "main" });
        } else {
          actions.push({ type: "check", label: "Чек", tone: "main" });
        }
        actions.push(...popupSizingActions(hand));
        return actions.slice(0, 6);
      }

      function setActionListOpen(open) {
        actionListOpen = Boolean(open);
        if (actionListEl) actionListEl.hidden = !actionListOpen;
        if (actionStackEl) actionStackEl.setAttribute("aria-expanded", actionListOpen ? "true" : "false");
        if (actionStackWrapEl) actionStackWrapEl.classList.toggle("is-open", actionListOpen);
      }

      function tableQueueMeta(ctx) {
        const tableId = Number(ctx?.tableId || 1);
        const view = ctx?.view || {};
        const room = view.room || {};
        const hand = view.hand || null;
        const seats = Array.isArray(room.seats) ? room.seats : [];
        const yourSeat = seats.find((seat) => seat?.isYou) || null;
        const occupied = seats.filter((seat) => seat?.occupied).length;
        const botFill = room.settings?.botFill !== false;
        const hasEmptySeat = seats.some((seat) => !seat?.occupied);
        const canStart = occupied >= 2 || (botFill && occupied >= 1 && hasEmptySeat);
        const handLive = hand?.status === "betting";
        const action = Boolean(hand?.youToAct || ctx?.table?.heroTurn);
        const preAction = checkFoldPreAction(view) || callCurrentPreAction(view) || raiseMinPreAction(view) || raiseThreeXPreAction(view) || raisePotPreAction(view) || raiseAllInPreAction(view);
        const remainingMs = action
          ? (Number.isFinite(Number(hand?.actionRemainingMs))
              ? Math.max(0, Number(hand.actionRemainingMs))
              : Math.max(0, Number(hand?.actionDeadline || 0) - Date.now()))
          : null;
        let status = "Ждём";
        let tone = "waiting";
        if (action) {
          status = actionSecondsLabel(remainingMs);
          tone = actionToneForRemaining(remainingMs);
        } else if (preAction?.type === "call-current") {
          const amount = formatPreActionAmount(preAction.maxToCall);
          status = amount ? `Колл ${amount}` : "Колл";
          tone = "preaction";
        } else if (preAction?.type === "raise-min") {
          const amount = formatPreActionAmount(preAction.minRaiseTo);
          status = amount ? `Мин рейз ${amount}` : "Мин рейз";
          tone = "preaction";
        } else if (preAction?.type === "raise-3x") {
          const amount = formatPreActionAmount(preAction.raiseTo);
          status = amount ? `3x ${amount}` : "3x";
          tone = "preaction";
        } else if (preAction?.type === "raise-pot") {
          const amount = formatPreActionAmount(preAction.raiseTo);
          status = amount ? `Пот ${amount}` : "Пот";
          tone = "preaction";
        } else if (preAction?.type === "raise-all-in") {
          const amount = formatPreActionAmount(preAction.raiseTo);
          status = amount ? `Олл-ин ${amount}` : "Олл-ин";
          tone = "preaction";
        } else if (preAction) {
          status = "Чек/пас";
          tone = "preaction";
        } else if (!yourSeat) {
          status = "Зритель";
          tone = "viewer";
        } else if (yourSeat.state === "sitting-out") {
          status = "Пауза";
          tone = "paused";
        } else if (handLive) {
          status = "Игра";
          tone = "playing";
        } else if (canStart) {
          status = "Готов";
          tone = "ready";
        }
        const roomName = String(room.name || `Стол ${tableId}`).trim();
        return {
          tableId,
          label: `T${tableId}`,
          status,
          tone,
          isAction: action,
          remainingMs,
          roomName,
          street: handLive ? String(hand?.street || "") : "",
          pot: handLive ? Math.max(0, Number(hand?.pot || 0)) : 0,
          toCall: action ? Math.max(0, Number(hand?.legal?.toCall || 0)) : 0,
          currentBet: handLive ? Math.max(0, Number(hand?.currentBet || 0)) : 0,
          summary: tableActionSummary(hand, action, status),
          quickActions: tableQuickActions(hand, action),
          customRaise: action ? popupCustomRaise(hand) : null,
          title: `T${tableId} · ${roomName} · ${action ? "Ваш ход" : status}${action && remainingMs > 0 ? ` · ${Math.ceil(remainingMs / 1000)}с` : ""}`,
          roomId: String(ctx?.roomId || room.id || "")
        };
      }

      function tableQueuePriority(meta) {
        if (meta?.isAction) return [0, Number.isFinite(Number(meta.remainingMs)) ? Number(meta.remainingMs) : Number.MAX_SAFE_INTEGER, Number(meta.tableId || 0)];
        const toneRank = { preaction: 1, playing: 2, ready: 3, waiting: 4, viewer: 5, paused: 6 };
        return [toneRank[meta?.tone] || 9, Number(meta.tableId || 0), 0];
      }

      function compareTableQueueMeta(a, b) {
        const pa = tableQueuePriority(a);
        const pb = tableQueuePriority(b);
        for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
          const diff = Number(pa[i] || 0) - Number(pb[i] || 0);
          if (diff) return diff;
        }
        return 0;
      }

      function renderActionStack(metas, activeId) {
        const actionMetas = (Array.isArray(metas) ? metas : []).filter((meta) => meta?.isAction);
        if (!actionStackWrapEl || !actionStackEl || actionMetas.length <= 0 || (Array.isArray(metas) && metas.length <= 1)) {
          setActionListOpen(false);
          if (actionStackWrapEl) {
            actionStackWrapEl.hidden = true;
            delete actionStackWrapEl.dataset.queueLeader;
            delete actionStackWrapEl.dataset.actionTables;
            delete actionStackWrapEl.dataset.actionRemainingMs;
            delete actionStackWrapEl.dataset.tone;
          }
          delete actionStackEl.dataset.queueLeader;
          delete actionStackEl.dataset.actionTables;
          delete actionStackEl.dataset.actionRemainingMs;
          delete actionStackEl.dataset.tone;
          if (actionListEl) {
            actionListEl.replaceChildren();
            delete actionListEl.dataset.actionTables;
            actionListEl.classList.remove("is-dense");
          }
          delete root.dataset.actionStackLeader;
          return;
        }
        const leader = actionMetas[0];
        const countLabel = actionCountLabel(actionMetas.length);
        const remaining = Number.isFinite(Number(leader.remainingMs)) ? Math.max(0, Number(leader.remainingMs)) : 0;
        const tone = actionToneForRemaining(remaining);
        const active = Number(leader.tableId) === Number(activeId || 0);
        actionStackWrapEl.hidden = false;
        actionStackEl.className = `mp-action-stack is-${tone}${active ? " is-active" : ""}`;
        for (const target of [actionStackWrapEl, actionStackEl]) {
          target.dataset.queueLeader = String(leader.tableId);
          target.dataset.actionTables = String(actionMetas.length);
          target.dataset.actionRemainingMs = String(Math.round(remaining));
          target.dataset.tone = tone;
        }
        root.dataset.actionStackLeader = String(leader.tableId);
        actionStackKickerEl.textContent = countLabel;
        actionStackTitleEl.textContent = `T${leader.tableId} · ${actionSecondsLabel(remaining)}`;
        actionStackMetaEl.textContent = leader.summary || (actionMetas.length > 1 ? "Показать очередь" : (active ? "Активный стол" : "Перейти к срочному"));
        actionStackEl.title = `${countLabel}: ${leader.title}. ${leader.summary ? `${leader.summary}. ` : ""}${actionMetas.length > 1 ? "Клик — раскрыть список срочных столов." : "Клик — перейти к самому срочному столу."}`;
        actionStackEl.setAttribute("aria-label", actionStackEl.title);
        if (actionMetas.length <= 1) setActionListOpen(false);
        renderActionList(actionMetas, activeId);
      }

      function renderActionList(actionMetas, activeId) {
        if (!actionListEl) return;
        const actionCount = Array.isArray(actionMetas) ? actionMetas.length : 0;
        const actionLocked = connectionActionLocked();
        const customValues = new Map();
        actionListEl.querySelectorAll("[data-mp-custom-raise]").forEach((form) => {
          const tableId = String(form?.dataset?.mpActionTable || "");
          const roomId = String(form?.dataset?.roomId || "");
          const value = roundedPopupAmount(form?.querySelector?.("[data-mp-custom-amount]")?.value);
          if (roomId && tableId && Number.isFinite(value) && value > 0) {
            customValues.set(`${roomId}:${tableId}`, value);
          }
        });
        actionListEl.dataset.actionTables = String(actionCount);
        actionListEl.classList.toggle("is-dense", actionCount >= 4);
        const leader = Array.isArray(actionMetas) ? actionMetas[0] : null;
        const header = leader ? (() => {
          const item = doc.createElement("div");
          item.className = "mp-action-popup-summary";
          item.dataset.queueLeader = String(leader.tableId);
          item.dataset.actionTables = String(actionMetas.length);
          item.setAttribute("role", "presentation");
          const kicker = doc.createElement("small");
          kicker.textContent = actionCountLabel(actionMetas.length);
          const title = doc.createElement("b");
          title.textContent = "Срочные столы";
          const details = doc.createElement("span");
          details.textContent = `${leader.label} · ${leader.summary || leader.status}`;
          item.append(kicker, title, details);
          return item;
        })() : null;
        const rows = (Array.isArray(actionMetas) ? actionMetas : []).map((meta, index) => {
          const active = Number(meta.tableId) === Number(activeId || 0);
          const row = doc.createElement("div");
          row.className = `mp-action-list-row is-${meta.tone}${active ? " is-active" : ""}`;
          row.dataset.queueRank = String(index + 1);
          row.dataset.tone = meta.tone;
          row.dataset.actionRemainingMs = String(Math.round(Math.max(0, Number(meta.remainingMs || 0))));
          row.dataset.street = meta.street || "";
          row.dataset.pot = String(Math.round(Number(meta.pot || 0) * 100) / 100);
          row.dataset.toCall = String(Math.round(Number(meta.toCall || 0) * 100) / 100);
          row.dataset.currentBet = String(Math.round(Number(meta.currentBet || 0) * 100) / 100);
          row.dataset.summary = meta.summary || "";
          row.dataset.quickActions = (meta.quickActions || []).map((action) => action.type).join(",");
          row.dataset.customRaise = meta.customRaise ? "true" : "false";
          row.setAttribute("role", "group");
          row.setAttribute("aria-label", `${meta.label}: ${meta.status}. ${meta.roomName}. ${meta.summary || ""}`);
          const select = doc.createElement("button");
          select.type = "button";
          select.className = "mp-action-list-select";
          select.dataset.mpActionTable = String(meta.tableId);
          select.setAttribute("role", "menuitem");
          select.setAttribute("aria-label", `${meta.label}: открыть ${meta.roomName}. ${meta.summary || ""}`);
          const label = doc.createElement("b");
          label.textContent = meta.label;
          const main = doc.createElement("span");
          main.className = "mp-action-list-main";
          const title = doc.createElement("span");
          title.textContent = meta.roomName;
          const details = doc.createElement("em");
          details.textContent = meta.summary || meta.status;
          main.append(title, details);
          const status = doc.createElement("small");
          status.textContent = meta.status;
          select.append(label, main, status);
          const actions = doc.createElement("span");
          actions.className = "mp-action-list-actions";
          for (const quickAction of meta.quickActions || []) {
            const button = doc.createElement("button");
            button.type = "button";
            button.className = `mp-action-list-quick is-${quickAction.tone || "main"}`;
            button.dataset.mpQuickAction = quickAction.type;
            button.dataset.mpActionTable = String(meta.tableId);
            button.dataset.roomId = meta.roomId;
            if (Number.isFinite(Number(quickAction.amount))) {
              button.dataset.mpQuickAmount = String(quickAction.amount);
            }
            button.disabled = actionLocked || quickActionBusyRooms.has(meta.roomId);
            button.textContent = quickAction.label;
            button.setAttribute("aria-label", `${quickAction.label}: ${meta.label} ${meta.roomName}`);
            actions.append(button);
          }
          const custom = meta.customRaise ? (() => {
            const restored = customValues.get(`${meta.roomId}:${meta.tableId}`);
            const customValue = Number.isFinite(restored)
              ? Math.min(meta.customRaise.max, Math.max(meta.customRaise.min, restored))
              : meta.customRaise.value;
            const form = doc.createElement("form");
            form.className = "mp-action-list-custom";
            form.dataset.mpCustomRaise = "true";
            form.dataset.mpActionTable = String(meta.tableId);
            form.dataset.roomId = meta.roomId;
            form.dataset.mpCustomMin = String(meta.customRaise.min);
            form.dataset.mpCustomMax = String(meta.customRaise.max);
            form.dataset.mpCustomStep = String(meta.customRaise.step);
            form.setAttribute("aria-label", `${meta.customRaise.label}: ${meta.label} ${meta.roomName}`);
            const range = doc.createElement("input");
            range.type = "range";
            range.min = String(meta.customRaise.min);
            range.max = String(meta.customRaise.max);
            range.step = String(meta.customRaise.step);
            range.value = String(customValue);
            range.className = "mp-action-list-custom-range";
            range.dataset.mpCustomRange = "true";
            range.disabled = actionLocked;
            range.setAttribute("aria-label", `${meta.customRaise.label}: slider ${meta.label}`);
            const amount = doc.createElement("input");
            amount.type = "number";
            amount.inputMode = "decimal";
            amount.min = String(meta.customRaise.min);
            amount.max = String(meta.customRaise.max);
            amount.step = String(meta.customRaise.step);
            amount.value = formatPreActionAmount(customValue);
            amount.className = "mp-action-list-custom-amount";
            amount.dataset.mpCustomAmount = "true";
            amount.disabled = actionLocked;
            amount.setAttribute("aria-label", `${meta.customRaise.label}: сумма ${meta.label}`);
            const submit = doc.createElement("button");
            submit.type = "submit";
            submit.className = "mp-action-list-custom-submit";
            submit.textContent = meta.customRaise.label;
            submit.disabled = actionLocked;
            submit.setAttribute("aria-label", `${meta.customRaise.label}: отправить ${meta.label} ${meta.roomName}`);
            form.append(range, amount, submit);
            return form;
          })() : null;
          row.append(...(custom ? [select, actions, custom] : [select, actions]));
          return row;
        });
        actionListEl.replaceChildren(...(header ? [header, ...rows] : rows));
      }

      function renderQueueClock() {
        if (!queueClock) return;
        const elapsedMs = Date.now() - queueClock.anchorMs;
        const liveMetas = queueClock.metas.map((meta) => liveQueueMeta(meta, elapsedMs));
        const byTableId = new Map(liveMetas.map((meta) => [String(meta.tableId), meta]));
        tableQueueEl.querySelectorAll("[data-mp-table-switch]").forEach((button) => {
          const meta = byTableId.get(String(button.getAttribute("data-mp-table-switch") || ""));
          if (!meta) return;
          const active = Number(meta.tableId) === Number(queueClock.activeId || 0);
          button.className = `mp-table-chip is-${meta.tone}${active ? " is-active" : ""}`;
          button.dataset.tone = meta.tone;
          button.setAttribute("aria-label", meta.title);
          button.title = meta.title;
          const status = button.querySelector("small");
          if (status) status.textContent = meta.status;
          if (meta.isAction && meta.remainingMs != null) button.dataset.actionRemainingMs = String(Math.round(meta.remainingMs));
          else delete button.dataset.actionRemainingMs;
        });
        renderActionStack(liveMetas, queueClock.activeId);
      }

      function renderTableQueue(target) {
        const contexts = orderedServerTableContexts();
        const activeId = Number(target?.tableId || 1);
        root.dataset.queueTables = String(contexts.length);
        const metas = contexts.map((ctx) => tableQueueMeta(ctx)).sort(compareTableQueueMeta);
        root.dataset.actionTables = String(metas.filter((meta) => meta.isAction).length);
        root.dataset.queueOrder = metas.map((meta) => `T${meta.tableId}`).join(",");
        root.dataset.queueLeader = metas[0] ? String(metas[0].tableId) : "";
        queueClock = { metas, activeId, anchorMs: Date.now() };
        tableQueueEl.hidden = contexts.length <= 1;
        if (contexts.length <= 1) {
          tableQueueEl.replaceChildren();
          renderActionStack([], activeId);
          return;
        }
        const buttons = metas.map((meta, index) => {
          const button = doc.createElement("button");
          const active = Number(meta.tableId) === activeId;
          button.type = "button";
          button.className = `mp-table-chip is-${meta.tone}${active ? " is-active" : ""}`;
          button.dataset.mpTableSwitch = String(meta.tableId);
          button.dataset.roomId = meta.roomId;
          button.dataset.tone = meta.tone;
          button.dataset.queueRank = String(index + 1);
          if (meta.isAction && meta.remainingMs != null) button.dataset.actionRemainingMs = String(Math.round(meta.remainingMs));
          button.setAttribute("aria-label", meta.title);
          button.setAttribute("aria-pressed", active ? "true" : "false");
          button.title = meta.title;
          const label = doc.createElement("b");
          label.textContent = meta.label;
          const status = doc.createElement("small");
          status.textContent = meta.status;
          button.append(label, status);
          return button;
        });
        tableQueueEl.replaceChildren(...buttons);
        renderActionStack(metas, activeId);
      }

      function onTableQueueClick(event) {
        const button = event?.target?.closest?.("[data-mp-table-switch]");
        if (!button || !tableQueueEl.contains(button)) return;
        event.preventDefault();
        event.stopPropagation?.();
        selectServerTable(button.getAttribute("data-mp-table-switch"), "mp-table-queue");
      }

      function onChromeRootClick(event) {
        const stack = event?.target?.closest?.("[data-mp-action-stack]");
        if (!stack || !root.contains(stack)) return;
        onActionStackClick(event);
      }

      function onActionStackClick(event) {
        const tableId = actionStackEl?.dataset?.queueLeader || "";
        if (!tableId || actionStackEl.hidden) return;
        event.preventDefault();
        event.stopPropagation?.();
        if (Number(actionStackEl.dataset.actionTables || 0) > 1) {
          setActionListOpen(!actionListOpen);
          return;
        }
        selectServerTable(tableId, "mp-action-stack");
      }

      function onActionListClick(event) {
        const quick = event?.target?.closest?.("[data-mp-quick-action]");
        if (quick && actionListEl.contains(quick)) {
          event.preventDefault();
          event.stopPropagation?.();
          sendPopupQuickAction(quick);
          return;
        }
        if (event?.target?.closest?.("[data-mp-custom-raise]")) {
          return;
        }
        const button = event?.target?.closest?.("[data-mp-action-table]");
        if (!button || !actionListEl.contains(button)) return;
        event.preventDefault();
        event.stopPropagation?.();
        setActionListOpen(false);
        selectServerTable(button.getAttribute("data-mp-action-table"), "mp-action-list");
      }

      function onActionListInput(event) {
        const range = event?.target?.closest?.("[data-mp-custom-range]");
        const amountInput = event?.target?.closest?.("[data-mp-custom-amount]");
        const target = range || amountInput;
        if (!target || !actionListEl.contains(target)) return;
        const form = target.closest("[data-mp-custom-raise]");
        const min = roundedPopupAmount(form?.dataset?.mpCustomMin);
        const max = roundedPopupAmount(form?.dataset?.mpCustomMax);
        const amount = form?.querySelector?.("[data-mp-custom-amount]");
        const slider = form?.querySelector?.("[data-mp-custom-range]");
        const rawValue = roundedPopupAmount(target.value);
        const value = Math.min(max || rawValue, Math.max(min || 0, rawValue));
        const label = formatPreActionAmount(value);
        if (range && amount && label) amount.value = label;
        if (amountInput && slider && label) slider.value = label;
      }

      function onActionListSubmit(event) {
        const form = event?.target?.closest?.("[data-mp-custom-raise]");
        if (!form || !actionListEl.contains(form)) return;
        event.preventDefault();
        event.stopPropagation?.();
        sendPopupCustomRaise(form);
      }

      function setPopupActionControlsDisabled(row, disabled) {
        row?.querySelectorAll?.(".mp-action-list-quick, .mp-action-list-custom input, .mp-action-list-custom button").forEach((control) => {
          control.disabled = Boolean(disabled);
        });
      }

      function sendPopupActionPayload(roomId, payload, source) {
        if (serverMutationBlockedByConnection()) return;
        if (!roomId || !client?.sendAction || !payload || quickActionBusyRooms.has(roomId)) return;
        quickActionBusyRooms.add(roomId);
        const row = source?.closest?.(".mp-action-list-row") || null;
        if (row) {
          row.dataset.quickActionBusy = "true";
          setPopupActionControlsDisabled(row, true);
        }
        client.sendAction(roomId, payload)
          .then((data) => {
            setActionListOpen(false);
            applyRoomSnapshot(roomId, data);
          })
          .catch((err) => {
            win.console?.warn?.("[mp] popup quick action rejected", err?.message || err);
            chrome.toast(actionErrorText(err), "warn");
            const view = err?.data && err.data.room ? { room: err.data.room, hand: err.data.hand || null } : null;
            if (view && roomId === activeRoomId) playSnapshot(view);
            else if (view && sideRooms.has(roomId)) applySideView(sideRooms.get(roomId), view);
            else if (sideRooms.has(roomId)) refreshSide(sideRooms.get(roomId));
            else refresh();
          })
          .finally(() => {
            quickActionBusyRooms.delete(roomId);
            if (row) {
              delete row.dataset.quickActionBusy;
              setPopupActionControlsDisabled(row, false);
            }
          });
      }

      function sendPopupQuickAction(button) {
        const action = String(button?.dataset?.mpQuickAction || "");
        const tableId = button?.dataset?.mpActionTable || "";
        const target = tableContextForId(tableId) || null;
        const roomId = String(button?.dataset?.roomId || target?.roomId || "");
        let payload = null;
        if (/^(fold|check|call)$/.test(action)) payload = { type: action };
        else if (action === "allin") payload = { type: "allin" };
        else if (action === "raise" || action === "bet") {
          const amount = Number(button?.dataset?.mpQuickAmount);
          if (Number.isFinite(amount) && amount > 0) payload = { type: "raise", amount };
        }
        sendPopupActionPayload(roomId, payload, button);
      }

      function sendPopupCustomRaise(form) {
        const tableId = form?.dataset?.mpActionTable || "";
        const target = tableContextForId(tableId) || null;
        const roomId = String(form?.dataset?.roomId || target?.roomId || "");
        const input = form?.querySelector?.("[data-mp-custom-amount]");
        const min = roundedPopupAmount(form?.dataset?.mpCustomMin);
        const max = roundedPopupAmount(form?.dataset?.mpCustomMax);
        const amount = roundedPopupAmount(input?.value);
        if (!Number.isFinite(amount) || amount <= 0 || amount < min - 1e-9 || amount > max + 1e-9) {
          chrome.toast("Сумма вне диапазона.", "warn");
          return;
        }
        sendPopupActionPayload(roomId, { type: "raise", amount }, form);
      }

      function onCheckPreAction() {
        onPreActionToggle("check-fold");
      }

      function onCallPreAction() {
        onPreActionToggle("call-current");
      }

      function onRaiseMinPreAction() {
        onPreActionToggle("raise-min");
      }

      function onRaiseThreeXPreAction() {
        onPreActionToggle("raise-3x");
      }

      function onRaisePotPreAction() {
        onPreActionToggle("raise-pot");
      }

      function onRaiseAllInPreAction() {
        onPreActionToggle("raise-all-in");
      }

      return {
        mounted: true,
        dispose() {
          try { win.clearInterval(turnTimer); } catch {}
          try { doc.removeEventListener("click", onVacantSeatClick); } catch {}
          try { doc.removeEventListener("keydown", onVacantSeatKeydown); } catch {}
          try { doc.removeEventListener("keydown", onServerTableHotkey); } catch {}
          try { doc.removeEventListener("click", onServerTableFocus); } catch {}
          try { doc.removeEventListener("focusin", onServerTableFocus); } catch {}
          try { root.removeEventListener("click", onChromeRootClick); } catch {}
          try { tableQueueEl.removeEventListener("click", onTableQueueClick); } catch {}
          try { actionListEl.removeEventListener("click", onActionListClick); } catch {}
          try { actionListEl.removeEventListener("input", onActionListInput); } catch {}
          try { actionListEl.removeEventListener("submit", onActionListSubmit); } catch {}
          try { takeSeatEl.removeEventListener("click", onTakeSeat); } catch {}
          try { dealEl.removeEventListener("click", onDeal); } catch {}
          try { preActionEl.removeEventListener("click", onCheckPreAction); } catch {}
          try { callPreActionEl.removeEventListener("click", onCallPreAction); } catch {}
          try { raiseMinPreActionEl.removeEventListener("click", onRaiseMinPreAction); } catch {}
          try { raiseThreeXPreActionEl.removeEventListener("click", onRaiseThreeXPreAction); } catch {}
          try { raisePotPreActionEl.removeEventListener("click", onRaisePotPreAction); } catch {}
          try { raiseAllInPreActionEl.removeEventListener("click", onRaiseAllInPreAction); } catch {}
          try { sitEl.removeEventListener("click", onSitToggle); } catch {}
          try { historyEl.removeEventListener("click", onHistory); } catch {}
          try { inviteEl.removeEventListener("click", onInvite); } catch {}
          try { leaveEl.removeEventListener("click", onLeave); } catch {}
        },
        // Hide the turn clock immediately (used while a paced replay drains so a
        // stale "Ваш ход" / red alarm doesn't linger for an action already taken).
        clearTurn() { turn = null; root.classList.remove("is-your-turn"); turnEl.hidden = true; },
        update(view) {
          const target = chromeTarget(view);
          view = target?.view || view;
          const room = view?.room;
          if (!room) return;
          lastRenderedView = view;
          renderConnectionState();
          const actionLocked = connectionActionLocked();
          root.dataset.tableId = String(target?.tableId || "");
          root.dataset.roomId = String(target?.roomId || room.id || "");
          renderTableQueue(target);
          if (tableEl) {
            tableEl.hidden = !target || Number(target.tableId || 1) <= 1;
            tableEl.textContent = target && Number(target.tableId || 1) > 1 ? `T${Number(target.tableId)}` : "";
          }
          nameEl.textContent = room.name || "Стол";
          const occupied = Number(room.occupiedCount || 0);
          const max = Number(room.maxSeats || 0);
          seatsEl.textContent = max ? `· ${occupied}/${max}` : "";
          hostEl.hidden = !room.isHost;
          if (walletEl) {
            const balance = Number(view.wallet?.balanceChips);
            walletEl.hidden = !Number.isFinite(balance);
            walletEl.textContent = Number.isFinite(balance) ? `· ${formatWalletChips(balance)} фантиков` : "";
          }
          renderWalletActivity(walletActivityEl, view.wallet);
          const isPrivateRoom = Boolean(room.settings?.isPrivate);
          const hasAccessCode = Boolean(room.hasAccessCode);
          root.dataset.roomPrivate = isPrivateRoom ? "true" : "false";
          root.dataset.roomProtected = hasAccessCode ? "true" : "false";
          if (privateEl) {
            privateEl.hidden = !isPrivateRoom;
            privateEl.textContent = "приватный";
            privateEl.title = "Стол не отображается в публичном списке";
            privateEl.setAttribute("aria-label", "Приватный стол");
          }
          if (lockEl) {
            lockEl.hidden = !hasAccessCode;
            lockEl.textContent = "код";
            lockEl.title = "Вход по коду доступа";
            lockEl.setAttribute("aria-label", "Стол защищён кодом");
          }
          // Between-hands state. Bots auto-fill + the host auto-deals, but the
          // host always gets an explicit "Раздать" so a room can never dead-end,
          // and everyone sees whether the table is waiting or playing. "Can start"
          // mirrors the auto-start rule: 2+ humans, or a lone human when bots fill.
          const handLive = view.hand && view.hand.status === "betting";
          const seats = room.seats || [];
          const yourSeat = seats.find((s) => s.isYou) || null;
          const isSpectator = !yourSeat;
          const sittingOut = yourSeat?.state === "sitting-out";
          const humans = seats.filter((s) => s.occupied).length;
          const botFill = room.settings?.botFill !== false;
          const hasEmptySeat = seats.some((s) => !s.occupied);
          const canStart = humans >= 2 || (botFill && humans >= 1 && hasEmptySeat);
          const handHistoryCount = Array.isArray(room.handHistory) ? room.handHistory.length : 0;
          viewerEl.hidden = !isSpectator;
          takeSeatEl.hidden = !(isSpectator && hasEmptySeat);
          takeSeatEl.disabled = actionLocked || seatClaimBusy;
          const viewerCanDeal = Boolean(yourSeat) && !handLive && canStart;
          dealEl.hidden = !viewerCanDeal;
          dealEl.disabled = actionLocked;
          sitEl.hidden = !(yourSeat && (!handLive || sittingOut));
          sitEl.disabled = actionLocked || sitBusy;
          sitEl.textContent = sittingOut ? "Вернуться" : "Перерыв";
          sitEl.title = sittingOut ? "Вернуться в следующие раздачи" : "Не участвовать в следующих раздачах";
          historyEl.hidden = handHistoryCount <= 0;
          historyEl.textContent = handHistoryCount > 1 ? `История ${handHistoryCount}` : "История";
          const preAction = checkFoldPreAction(view);
          const callPreAction = callCurrentPreAction(view);
          const raisePreAction = raiseMinPreAction(view);
          const threeXPreAction = raiseThreeXPreAction(view);
          const potPreAction = raisePotPreAction(view);
          const allInPreAction = raiseAllInPreAction(view);
          const preActionReady = serverPreActionAvailable(view);
          const callReady = serverCallPreActionAvailable(view);
          const raiseReady = serverRaiseMinPreActionAvailable(view);
          const threeXReady = serverRaiseThreeXPreActionAvailable(view);
          const potReady = serverRaisePotPreActionAvailable(view);
          const allInReady = serverRaiseAllInPreActionAvailable(view);
          const currentToCall = viewerCurrentToCall(view);
          const minRaiseTo = viewerMinRaiseTo(view);
          const threeXRaiseTo = viewerThreeXRaiseTo(view);
          const potRaiseTo = viewerPotRaiseTo(view);
          const allInRaiseTo = viewerAllInRaiseTo(view);
          preActionEl.hidden = !(preAction || preActionReady);
          preActionEl.disabled = actionLocked || preActionBusy || !(preAction || preActionReady);
          preActionEl.classList.toggle("is-armed", Boolean(preAction));
          if (preAction) preActionEl.dataset.preAction = preAction.type;
          else delete preActionEl.dataset.preAction;
          preActionEl.textContent = preAction ? "Чек/пас ✓" : "Чек/пас";
          preActionEl.title = preAction
            ? "Отменить серверный чек/пас"
            : "Сервер сделает чек, если бесплатно, иначе пас";
          callPreActionEl.hidden = !(callPreAction || callReady);
          callPreActionEl.disabled = actionLocked || preActionBusy || !(callPreAction || callReady);
          callPreActionEl.classList.toggle("is-armed", Boolean(callPreAction));
          if (callPreAction) callPreActionEl.dataset.preAction = callPreAction.type;
          else delete callPreActionEl.dataset.preAction;
          const callAmount = formatPreActionAmount(callPreAction?.maxToCall || currentToCall);
          callPreActionEl.textContent = callPreAction ? `Колл ${callAmount} ✓` : `Колл ${callAmount}`;
          callPreActionEl.title = callPreAction
            ? `Отменить серверный колл до ${callAmount} BB`
            : `Сервер заколлит только если цена не выше ${callAmount} BB`;
          raiseMinPreActionEl.hidden = !(raisePreAction || raiseReady);
          raiseMinPreActionEl.disabled = actionLocked || preActionBusy || !(raisePreAction || raiseReady);
          raiseMinPreActionEl.classList.toggle("is-armed", Boolean(raisePreAction));
          if (raisePreAction) raiseMinPreActionEl.dataset.preAction = raisePreAction.type;
          else delete raiseMinPreActionEl.dataset.preAction;
          const raiseAmount = formatPreActionAmount(raisePreAction?.minRaiseTo || minRaiseTo);
          raiseMinPreActionEl.textContent = raisePreAction ? `Мин рейз ${raiseAmount} ✓` : `Мин рейз ${raiseAmount}`;
          raiseMinPreActionEl.title = raisePreAction
            ? `Отменить серверный min-raise до ${raiseAmount} BB`
            : `Сервер сделает min-raise до ${raiseAmount} BB, если цена колла не вырастет`;
          raiseThreeXPreActionEl.hidden = !(threeXPreAction || threeXReady);
          raiseThreeXPreActionEl.disabled = actionLocked || preActionBusy || !(threeXPreAction || threeXReady);
          raiseThreeXPreActionEl.classList.toggle("is-armed", Boolean(threeXPreAction));
          if (threeXPreAction) raiseThreeXPreActionEl.dataset.preAction = threeXPreAction.type;
          else delete raiseThreeXPreActionEl.dataset.preAction;
          const threeXAmount = formatPreActionAmount(threeXPreAction?.raiseTo || threeXRaiseTo);
          raiseThreeXPreActionEl.textContent = threeXPreAction ? `3x ${threeXAmount} ✓` : `3x ${threeXAmount}`;
          raiseThreeXPreActionEl.title = threeXPreAction
            ? `Отменить серверный 3x до ${threeXAmount} BB`
            : `Сервер сделает 3x raise до ${threeXAmount} BB, если цена колла не вырастет`;
          raisePotPreActionEl.hidden = !(potPreAction || potReady);
          raisePotPreActionEl.disabled = actionLocked || preActionBusy || !(potPreAction || potReady);
          raisePotPreActionEl.classList.toggle("is-armed", Boolean(potPreAction));
          if (potPreAction) raisePotPreActionEl.dataset.preAction = potPreAction.type;
          else delete raisePotPreActionEl.dataset.preAction;
          const potAmount = formatPreActionAmount(potPreAction?.raiseTo || potRaiseTo);
          raisePotPreActionEl.textContent = potPreAction ? `Пот ${potAmount} ✓` : `Пот ${potAmount}`;
          raisePotPreActionEl.title = potPreAction
            ? `Отменить серверный pot-raise до ${potAmount} BB`
            : `Сервер сделает pot-raise до ${potAmount} BB, если цена колла не вырастет`;
          raiseAllInPreActionEl.hidden = !(allInPreAction || allInReady);
          raiseAllInPreActionEl.disabled = actionLocked || preActionBusy || !(allInPreAction || allInReady);
          raiseAllInPreActionEl.classList.toggle("is-armed", Boolean(allInPreAction));
          if (allInPreAction) raiseAllInPreActionEl.dataset.preAction = allInPreAction.type;
          else delete raiseAllInPreActionEl.dataset.preAction;
          const allInAmount = formatPreActionAmount(allInPreAction?.raiseTo || allInRaiseTo);
          raiseAllInPreActionEl.textContent = allInPreAction ? `Олл-ин ${allInAmount} ✓` : `Олл-ин ${allInAmount}`;
          raiseAllInPreActionEl.title = allInPreAction
            ? `Отменить серверный all-in до ${allInAmount} BB`
            : `Сервер поставит all-in до ${allInAmount} BB, если цена колла не вырастет`;
          if (preAction || callPreAction || raisePreAction || threeXPreAction || potPreAction || allInPreAction) root.dataset.preAction = (preAction || callPreAction || raisePreAction || threeXPreAction || potPreAction || allInPreAction).type;
          else delete root.dataset.preAction;
          phaseEl.hidden = handLive;
          if (!handLive) phaseEl.textContent = canStart ? "· готов к раздаче" : "· ждём игроков";
          // Turn clock: surface the SERVER action deadline while a hand is live
          // (complementary to the phase chip, which hides during a hand). Display
          // only — the server already auto-folds on timeout.
          const hand = view.hand;
          if (handLive && Number(hand.toActSeatIndex) >= 0 && (Number(hand.actionRemainingMs) > 0 || Number(hand.actionDeadline) > 0)) {
            const seat = (hand.seats || []).find((s) => s.seatIndex === hand.toActSeatIndex);
            const isYou = Boolean(hand.youToAct || seat?.isYou);
            // Prefer the server-computed remaining time (skew-proof); fall back to
            // the absolute deadline for an older server with no actionRemainingMs.
            const remainingMs = Number.isFinite(Number(hand.actionRemainingMs))
              ? Math.max(0, Number(hand.actionRemainingMs))
              : Math.max(0, Number(hand.actionDeadline) - Date.now());
            turn = { remainingMs, anchorMs: Date.now(), label: isYou ? "Ваш ход" : `Ход: ${seat?.playerName || "игрок"}` };
            root.classList.toggle("is-your-turn", isYou);
            renderTurn();
            turnEl.hidden = false;
          } else {
            turn = null;
            root.classList.remove("is-your-turn");
            turnEl.hidden = true;
          }
        },
        setConn(state) {
          root.dataset.conn = state;
          renderConnectionState();
          try { if (lastRenderedView) this.update(lastRenderedView); } catch {}
          try { if (queueClock) renderActionStack(queueClock.metas, queueClock.activeId); } catch {}
        },
        connectionState() { return root.dataset.conn || ""; },
        actionsLocked: connectionActionLocked,
        showLoading(title, message) {
          titleEl.textContent = title || "Подключение к столу…";
          msgEl.textContent = message || "Садимся за стол и синхронизируем раздачу.";
          actionsEl.replaceChildren();
          overlay.dataset.state = "loading";
        },
        showError(title, message, withRetry) {
          titleEl.textContent = title || "Не удалось подключиться";
          msgEl.textContent = message || "";
          actionsEl.replaceChildren(...(withRetry ? [retryButton(), lobbyButton()] : [lobbyButton()]));
          overlay.dataset.state = "error";
        },
        showLoginRequired(view) {
          const configured = view?.auth?.configured !== false;
          titleEl.textContent = configured ? "Нужен вход через Google" : "Вход временно недоступен";
          msgEl.textContent = configured
            ? "Этот стол играет на фантики аккаунта. Войди через Google, затем вернёшься по этой же ссылке."
            : "Google вход ещё не настроен. Пока можно только смотреть стол без посадки.";
          const buttons = configured
            ? [actionButton("Войти через Google", "primary", () => startGoogleLogin()), lobbyButton()]
            : [lobbyButton()];
          actionsEl.replaceChildren(...buttons);
          overlay.dataset.state = "error";
        },
        showHistory(view, target = chromeTarget(view)) {
          const hands = Array.isArray(view?.room?.handHistory) ? view.room.handHistory : [];
          const tableLabel = Number(target?.tableId || 1) > 1 ? ` · T${Number(target.tableId)}` : "";
          titleEl.textContent = `История раздач${tableLabel}`;
          if (!hands.length) {
            msgEl.innerHTML = '<div class="mp-history-empty">Завершённых раздач ещё нет.</div>';
          } else {
            msgEl.innerHTML = '<div class="mp-history-list">' + hands.slice(0, 8).map((hand) => {
              const board = Array.isArray(hand.board) && hand.board.length ? hand.board.join(" ") : "без борда";
              const winners = Array.isArray(hand.winners) && hand.winners.length
                ? hand.winners.slice(0, 2).map((winner) => winner.playerName).join(", ")
                : "банк";
              const actionCount = Array.isArray(hand.hand?.actionTrail) ? hand.hand.actionTrail.length : 0;
              const handNo = Number(hand.handNo || hand.hand?.handNo || 0);
              return '<article class="mp-history-item">' +
                '<div class="mp-history-item-head">' +
                  `<b>#${escapeHtml(handNo || "")} · ${escapeHtml(winners)}</b>` +
                  `<button type="button" class="mp-history-replay" data-mp-history-hand="${escapeHtml(handNo)}" ${showReplay ? "" : "disabled"}>Повтор</button>` +
                '</div>' +
                `<span>${escapeHtml(hand.result || "Раздача завершена")}</span>` +
                `<small>${escapeHtml(board)} · ${escapeHtml(String(actionCount))} событий</small>` +
              '</article>';
            }).join("") + '</div>';
            msgEl.querySelectorAll("[data-mp-history-hand]").forEach((button) => {
              button.addEventListener("click", () => {
                const opened = openServerHistoryReplay(button.getAttribute("data-mp-history-hand"), target);
                if (opened) {
                  overlay.dataset.state = "";
                  msgEl.textContent = "";
                }
              });
            });
          }
          actionsEl.replaceChildren(actionButton("Закрыть", "primary", () => {
            overlay.dataset.state = "";
            msgEl.textContent = "";
          }));
          overlay.dataset.state = "history";
        },
        showInvite(target = chromeTarget()) {
          const view = target?.view || latest || {};
          const room = view.room || {};
          const roomId = String(target?.roomId || room.id || activeRoomId || "");
          const link = roomLinkForContext(target);
          const hasAccessCode = Boolean(room.hasAccessCode);
          const isPrivateRoom = Boolean(room.settings?.isPrivate);
          const accessCode = hasAccessCode ? readStoredAccessCode(roomId) : "";
          const roomName = String(room.name || "Онлайн-стол").trim();
          const inviteText = [
            `${roomName}`,
            link,
            accessCode ? `Код доступа: ${accessCode}` : ""
          ].filter(Boolean).join("\n");
          titleEl.textContent = "Приглашение за стол";
          msgEl.innerHTML =
            '<div class="mp-invite-panel">' +
              '<div class="mp-invite-flags">' +
                (isPrivateRoom ? '<span>приватный</span>' : '') +
                (hasAccessCode ? '<span>код</span>' : '') +
              '</div>' +
              '<label class="mp-invite-field">' +
                '<span>Ссылка</span>' +
                `<code data-mp-invite-link>${escapeHtml(link)}</code>` +
              '</label>' +
              (hasAccessCode
                ? '<label class="mp-invite-field">' +
                    '<span>Код доступа</span>' +
                    `<code data-mp-invite-code data-state="${accessCode ? "known" : "missing"}">${escapeHtml(accessCode || "не сохранён на этом устройстве")}</code>` +
                  '</label>'
                : '') +
              `<p>${escapeHtml(hasAccessCode
                ? accessCode
                  ? "Ссылка остаётся без секрета. Отправь код отдельным сообщением или скопируй готовое приглашение."
                  : "Ссылка остаётся без секрета. Код не сохранён здесь — отправь его игроку отдельно из безопасного канала."
                : isPrivateRoom
                ? "Приватный стол не виден в публичном списке, но открывается по этой ссылке."
                : "Игрок откроет стол по этой ссылке.")}</p>` +
            '</div>';
          const close = actionButton("Закрыть", "", () => {
            overlay.dataset.state = "";
            msgEl.textContent = "";
          });
          const copyLink = actionButton("Скопировать ссылку", "primary", () => {
            copyTextToClipboard(link, () => toast("Ссылка на стол скопирована"), "Скопируй ссылку из приглашения");
          });
          copyLink.dataset.mpInviteCopy = "link";
          const buttons = [copyLink];
          if (accessCode) {
            const copyCode = actionButton("Скопировать код", "", () => {
              copyTextToClipboard(accessCode, () => toast("Код доступа скопирован"), "Скопируй код из приглашения");
            });
            copyCode.dataset.mpInviteCopy = "code";
            const copyMessage = actionButton("Скопировать всё", "", () => {
              copyTextToClipboard(inviteText, () => toast("Приглашение скопировано"), "Скопируй приглашение вручную");
            });
            copyMessage.dataset.mpInviteCopy = "message";
            buttons.push(copyCode, copyMessage);
          }
          actionsEl.replaceChildren(...buttons, close);
          overlay.dataset.state = "invite";
        },
        // Ask the joiner for a table name before sitting (link-openers who never
        // passed through the lobby / login gate). Resolves with the chosen name.
        promptName(suggested) {
          return new Promise((resolve) => {
            titleEl.textContent = "Под каким именем сесть за стол?";
            msgEl.textContent = "Имя увидят другие игроки. Сменить можно позже в лобби.";
            inputEl.type = "text";
            inputEl.autocomplete = "nickname";
            inputEl.placeholder = "Например, FunFarmShark";
            inputEl.setAttribute("aria-label", "Имя за столом");
            inputEl.value = suggested || "";
            const submit = () => {
              const name = (inputEl.value || "").replace(/\s+/g, " ").trim().slice(0, 24);
              if (!name) { inputEl.focus(); return; }
              overlay.dataset.state = "";
              resolve(name);
            };
            inputEl.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } };
            actionsEl.replaceChildren(actionButton("Сесть за стол", "primary", submit));
            overlay.dataset.state = "name";
            win.setTimeout(() => { try { inputEl.focus(); } catch {} }, 60);
          });
        },
        promptAccessCode(message) {
          return new Promise((resolve) => {
            titleEl.textContent = "Код доступа к столу";
            msgEl.textContent = message || "Этот стол защищён. Введите код, который дал хост.";
            inputEl.type = "password";
            inputEl.autocomplete = "one-time-code";
            inputEl.placeholder = "Код доступа";
            inputEl.setAttribute("aria-label", "Код доступа к столу");
            inputEl.value = "";
            const submit = () => {
              const code = cleanAccessCode(inputEl.value);
              if (!code) { inputEl.focus(); return; }
              overlay.dataset.state = "";
              resolve(code);
            };
            inputEl.onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } };
            actionsEl.replaceChildren(
              actionButton("Войти", "primary", submit),
              actionButton("В лобби", "", () => { overlay.dataset.state = ""; resolve(""); })
            );
            overlay.dataset.state = "access";
            win.setTimeout(() => { try { inputEl.focus(); } catch {} }, 60);
          });
        },
        hideOverlay() { if (overlay.dataset.state !== "name" && overlay.dataset.state !== "access" && overlay.dataset.state !== "history" && overlay.dataset.state !== "invite") overlay.dataset.state = ""; },
        toast
      };
    })();

    if (doc?.body) {
      doc.addEventListener("click", onVacantSeatClick);
      doc.addEventListener("keydown", onVacantSeatKeydown);
      doc.addEventListener("keydown", onServerTableHotkey);
      doc.addEventListener("click", onServerTableFocus);
      doc.addEventListener("focusin", onServerTableFocus);
    }

    function onServerTableFocus(event) {
      if (leaving) return;
      const shell = event?.target?.closest?.(".table-shell[data-table-id]");
      if (!shell || (doc?.body && !doc.body.contains(shell))) return;
      const target = tableContextForId(shell.dataset.tableId);
      if (target?.view && chrome.mounted) chrome.update(target.view);
    }

    function serverTableHotkeyIgnored(event) {
      const target = event?.target;
      const tag = String(target?.tagName || "").toUpperCase();
      const overlayState = doc?.querySelector?.(".mp-overlay")?.dataset?.state || "";
      return Boolean(
        leaving
        || event?.defaultPrevented
        || event?.repeat
        || event?.metaKey
        || event?.ctrlKey
        || event?.altKey
        || overlayState
        || tag === "INPUT"
        || tag === "SELECT"
        || tag === "TEXTAREA"
        || target?.isContentEditable
      );
    }

    function selectServerTableByOffset(delta) {
      const tables = orderedServerTables();
      if (tables.length < 2) return false;
      const state = getState() || {};
      const currentId = Number(state.activeTableId || tables[0]?.id || 1);
      const currentIndex = Math.max(0, tables.findIndex((table) => Number(table?.id) === currentId));
      const nextIndex = (currentIndex + delta + tables.length) % tables.length;
      const next = tables[nextIndex];
      if (!next?.id || Number(next.id) === currentId) return false;
      return selectServerTable(next.id, "mp-select-table");
    }

    function onServerTableHotkey(event) {
      if (event?.key !== "[" && event?.key !== "]") return;
      if (serverTableHotkeyIgnored(event)) return;
      if (!selectServerTableByOffset(event.key === "]" ? 1 : -1)) return;
      event.preventDefault();
      event.stopPropagation?.();
    }

    function onInvite() {
      chrome.showInvite?.(chromeTarget());
    }
    function copyTextToClipboard(text, done, failMessage) {
      if (!text) return;
      try {
        if (win.navigator?.clipboard?.writeText) {
          win.navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done, failMessage));
        } else {
          fallbackCopy(text, done, failMessage);
        }
      } catch { fallbackCopy(text, done, failMessage); }
    }
    function fallbackCopy(text, done, failMessage) {
      try {
        const ta = doc.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        doc.body.appendChild(ta);
        ta.select();
        doc.execCommand("copy");
        ta.remove();
        done?.();
      } catch {
        chrome.toast(failMessage || "Скопируй текст вручную", "warn");
      }
    }

    function serverMutationBlockedByConnection() {
      if (!chrome.actionsLocked?.()) return false;
      chrome.toast("Дождитесь переподключения к столу", "warn");
      return true;
    }
    function contextHasLiveSeatedHand(ctx) {
      const view = ctx?.view || null;
      return view?.hand?.status === "betting" && Number(view?.room?.youSeatIndex ?? -1) >= 0;
    }
    function liveSeatedHandLeaveState(ctx) {
      const view = ctx?.view || null;
      if (!contextHasLiveSeatedHand(ctx)) return null;
      const handSeat = (view?.hand?.seats || []).find((seat) => seat?.isYou) || null;
      return { live: true, allIn: Boolean(handSeat?.allIn && !handSeat?.folded) };
    }
    function liveSeatedHandLeaveStates() {
      const states = [];
      try {
        for (const ctx of orderedServerTableContexts()) {
          const state = liveSeatedHandLeaveState(ctx);
          if (state) states.push(state);
        }
      } catch {}
      if (!states.length) {
        const state = liveSeatedHandLeaveState({ view: latest });
        if (state) states.push(state);
      }
      return states;
    }
    function hasLiveSeatedServerHand() {
      return liveSeatedHandLeaveStates().length > 0;
    }
    function liveLeaveConfirmText() {
      const states = liveSeatedHandLeaveStates();
      const hasAllIn = states.some((state) => state.allIn);
      const hasFoldForfeit = states.some((state) => !state.allIn);
      if (hasAllIn && hasFoldForfeit) {
        return "Выйти из-за столов сейчас? Руки без all-in будут сброшены (фолд), а all-in руки доиграются до шоудауна и рассчитаются после.";
      }
      if (hasAllIn) {
        if (states.length > 1) {
          return "Выйти из-за столов сейчас? Вы уже all-in на этих руках, они доиграются до шоудауна, а стеки вернутся после расчёта.";
        }
        return "Выйти из-за стола сейчас? Вы уже all-in, рука доиграется до шоудауна, а стек вернётся после расчёта.";
      }
      if (states.length > 1) {
        return "Выйти из-за столов сейчас? Текущие руки будут сброшены (фолд).";
      }
      return "Выйти из-за стола сейчас? Текущая рука будет сброшена (фолд).";
    }
    function onLeave() {
      if (leaving) return;
      // Mid-hand leave forfeits the current hand — confirm so it is never an
      // accidental fold. All-in seats cannot fold; they become pending leavers
      // and settle after showdown. In multi-table mode the button leaves every
      // connected room, so inspect every server-table context, not just primary.
      const inLiveHand = hasLiveSeatedServerHand();
      if (inLiveHand && typeof win.confirm === "function" &&
          !win.confirm(liveLeaveConfirmText())) return;
      leaving = true;
      try { stopPlayback(); } catch {}
      // ALWAYS `leave` (never closeRoom): the server hands the host role to the
      // next player and only closes the room if you were the last one — so one
      // person leaving never kills everyone else's game.
      const done = () => { try { win.location.href = LOBBY_URL; } catch {} };
      let leaveAll;
      try {
        leaveAll = Promise.all([...leaveSideRooms(), leaveRoomSettled(activeRoomId)])
          .then((results) => {
            const failed = results.filter((result) => !result?.ok);
            if (!failed.length) return results;
            const error = failed[0]?.error || new Error("leave_failed");
            error.leaveResults = results;
            throw error;
          });
      } catch (err) {
        leaveAll = Promise.reject(err);
      }
      Promise.resolve(leaveAll)
        .then(() => {
          try { sub?.close?.(); } catch {}
          try { stopHeartbeat?.(); } catch {}
          setServerModeShell(false);
          closeSideRooms();
          done();
        })
        .catch((err) => {
          leaving = false;
          win.console?.warn?.("[mp] leave rejected", err?.message || err);
          chrome.toast(leaveErrorText(err), "warn");
          try { Promise.resolve(refresh()).catch(() => {}); } catch {}
          try { sideRooms.forEach((ctx) => refreshSide(ctx)); } catch {}
        });
    }

    function onDeal() {
      if (serverMutationBlockedByConnection()) return;
      const target = chromeTarget();
      const targetRoomId = target?.roomId || activeRoomId;
      client.startHand(targetRoomId)
        .then((data) => applyRoomSnapshot(targetRoomId, data))
        .catch((err) => {
          const code = String(err?.message || "");
          chrome.toast(
            /not_enough_players/.test(code) ? "Нужно больше игроков или ботов"
              : /hand_in_progress/.test(code) ? "Рука уже идёт"
              : "Не удалось раздать",
            "warn"
          );
        });
    }

    function applyPreActionSnapshot(targetRoomId, data) {
      if (targetRoomId === activeRoomId) {
        playSnapshot(data);
        return;
      }
      const ctx = sideRooms.get(targetRoomId);
      if (ctx) applySideView(ctx, data);
      else refresh();
    }

    function onPreActionToggle(type = "check-fold") {
      if (serverMutationBlockedByConnection()) return;
      const target = chromeTarget();
      const view = target?.view || latest;
      const targetRoomId = target?.roomId || activeRoomId;
      if (preActionBusy || !targetRoomId || !view?.room || typeof client.setPreAction !== "function") return;
      const normalized = type === "call-current" ? "call-current"
        : type === "raise-min" ? "raise-min"
          : type === "raise-3x" ? "raise-3x"
            : type === "raise-pot" ? "raise-pot"
              : type === "raise-all-in" ? "raise-all-in"
                : "check-fold";
      const armed = view.room.preAction?.type === normalized;
      const currentToCall = viewerCurrentToCall(view);
      const minRaiseTo = viewerMinRaiseTo(view);
      const threeXRaiseTo = viewerThreeXRaiseTo(view);
      const potRaiseTo = viewerPotRaiseTo(view);
      const allInRaiseTo = viewerAllInRaiseTo(view);
      const available = normalized === "call-current"
        ? serverCallPreActionAvailable(view)
        : normalized === "raise-min"
          ? serverRaiseMinPreActionAvailable(view)
          : normalized === "raise-3x"
            ? serverRaiseThreeXPreActionAvailable(view)
            : normalized === "raise-pot"
              ? serverRaisePotPreActionAvailable(view)
              : normalized === "raise-all-in"
                ? serverRaiseAllInPreActionAvailable(view)
                : serverPreActionAvailable(view);
      if (!armed && !available) {
        chrome.toast("Pre-action доступен только во время раздачи", "warn");
        return;
      }
      preActionBusy = true;
      try { chrome.update(view); } catch {}
      const payload = armed ? null : (normalized === "call-current"
        ? { type: "call-current", maxToCall: currentToCall }
        : normalized === "raise-min"
          ? { type: "raise-min", maxToCall: currentToCall }
          : normalized === "raise-3x"
            ? { type: "raise-3x", maxToCall: currentToCall }
            : normalized === "raise-pot"
              ? { type: "raise-pot", maxToCall: currentToCall }
              : normalized === "raise-all-in"
                ? { type: "raise-all-in", maxToCall: currentToCall }
        : { type: "check-fold" });
      client.setPreAction(targetRoomId, payload)
        .then((data) => {
          applyPreActionSnapshot(targetRoomId, data);
          const amount = formatPreActionAmount(normalized === "raise-min" ? minRaiseTo : normalized === "raise-3x" ? threeXRaiseTo : normalized === "raise-pot" ? potRaiseTo : normalized === "raise-all-in" ? allInRaiseTo : currentToCall);
          chrome.toast(armed
            ? "Pre-action отменён"
            : normalized === "call-current" ? `Колл ${amount} поставлен`
              : normalized === "raise-min" ? `Мин рейз ${amount} поставлен`
                : normalized === "raise-3x" ? `3x ${amount} поставлен`
                  : normalized === "raise-pot" ? `Пот ${amount} поставлен`
                    : normalized === "raise-all-in" ? `Олл-ин ${amount} поставлен`
                    : "Чек/пас поставлен");
        })
        .catch((err) => {
          win.console?.warn?.("[mp] pre-action rejected", err?.message || err);
          chrome.toast(/not_seated/.test(String(err?.message || "")) ? "Вы не за столом" : "Pre-action не поставлен", "warn");
          const errorView = err?.data && err.data.room ? { room: err.data.room, hand: err.data.hand || null } : null;
          if (errorView && targetRoomId === activeRoomId) playSnapshot(errorView);
          else if (errorView && sideRooms.has(targetRoomId)) applySideView(sideRooms.get(targetRoomId), errorView);
          else if (sideRooms.has(targetRoomId)) refreshSide(sideRooms.get(targetRoomId));
          else refresh();
        })
        .finally(() => {
          preActionBusy = false;
          const current = roomContextForId(targetRoomId);
          try { chrome.update(current?.view || latest || view); } catch {}
        });
    }

    function onHistory() {
      const target = chromeTarget();
      const view = target?.view || latest;
      if (!view?.room?.handHistory?.length) {
        chrome.toast("История появится после первой завершённой раздачи", "warn");
        return;
      }
      chrome.showHistory(view, target);
    }

    function openServerHistoryReplay(handNo, target = chromeTarget()) {
      if (!showReplay) {
        chrome.toast("Визуальный повтор недоступен в этой сборке", "warn");
        return false;
      }
      const view = target?.view || latest;
      const entries = syncServerReplayEntries(view, getState() || {}, target?.tableId || tableIdForRoom(view?.room?.id), target?.roomId || view?.room?.id);
      const wanted = Number(handNo);
      const entry = entries.find((candidate) => Number(candidate.no) === wanted) || entries[0] || null;
      if (!entry) {
        chrome.toast("Не удалось собрать повтор этой раздачи", "warn");
        return false;
      }
      showReplay(entry);
      return true;
    }

    function claimSeat(seatIndex, target = chromeTarget()) {
      if (serverMutationBlockedByConnection()) return;
      const view = target?.view || latest;
      const targetRoomId = target?.roomId || activeRoomId;
      if (seatClaimBusy || !view?.room) return;
      const seats = view.room.seats || [];
      const yourSeatIndex = Number(view.room.youSeatIndex);
      const isSeated = yourSeatIndex >= 0;
      const handLive = view.hand && view.hand.status === "betting";
      const numericSeat = Number(seatIndex);
      const wantsSpecific = Number.isInteger(numericSeat) && numericSeat >= 0;
      if (isSeated && !wantsSpecific) return;
      if (isSeated && wantsSpecific && numericSeat === yourSeatIndex) return;
      if (isSeated && handLive) {
        chrome.toast("Менять место можно между раздачами", "warn");
        return;
      }
      const hasEmptySeat = wantsSpecific
        ? seats.some((seat) => Number(seat.index) === numericSeat && !seat.occupied)
        : seats.some((seat) => !seat.occupied);
      if (!hasEmptySeat) {
        chrome.toast(wantsSpecific ? "Это место уже заняли" : "Свободных мест нет — вы наблюдаете", "warn");
        refreshRoomContext(target);
        return;
      }
      seatClaimBusy = true;
      try { chrome.update(view); } catch {}
      client.join(targetRoomId, wantsSpecific ? numericSeat : undefined, readSavedNick() || displayName || "", readStoredAccessCode(targetRoomId))
        .then((data) => {
          applyRoomSnapshot(targetRoomId, data);
          chrome.toast(isSeated ? "Вы сменили место" : "Вы сели за стол");
        })
        .catch((err) => {
          const code = String(err?.message || "");
          chrome.toast(/hand_in_progress/.test(code) ? "Менять место можно между раздачами"
            : /room_full|seat_taken/.test(code) ? "Место уже заняли" : joinErrorText(err), "warn");
          refreshRoomContext(target);
        })
        .finally(() => {
          seatClaimBusy = false;
          try { chrome.update(); } catch {}
        });
    }

    function onTakeSeat() {
      claimSeat(undefined, chromeTarget());
    }

    function vacantSeatFromEvent(event) {
      const seatEl = event?.target?.closest?.('.seat.is-vacant[data-mp-vacant-seat="true"][data-room-seat-index]');
      if (!seatEl || (doc?.body && !doc.body.contains(seatEl))) return null;
      return seatEl;
    }

    function onVacantSeatClick(event) {
      if (leaving || !latest?.room) return;
      const seatEl = vacantSeatFromEvent(event);
      if (!seatEl) return;
      event.preventDefault();
      const target = tableContextForId(seatEl.closest("[data-table-id]")?.dataset?.tableId) || chromeTarget();
      claimSeat(seatEl.getAttribute("data-room-seat-index"), target);
    }

    function onVacantSeatKeydown(event) {
      if (event?.key !== "Enter" && event?.key !== " ") return;
      if (leaving) return;
      const seatEl = vacantSeatFromEvent(event);
      if (!seatEl) return;
      event.preventDefault();
      const target = tableContextForId(seatEl.closest("[data-table-id]")?.dataset?.tableId) || chromeTarget();
      claimSeat(seatEl.getAttribute("data-room-seat-index"), target);
    }

    function onSitToggle() {
      if (serverMutationBlockedByConnection()) return;
      const target = chromeTarget();
      const view = target?.view || latest;
      const targetRoomId = target?.roomId || activeRoomId;
      if (sitBusy || !view?.room) return;
      const yourSeat = (view.room.seats || []).find((seat) => seat.isYou);
      if (!yourSeat) {
        chrome.toast("Вы наблюдаете — места за столом нет", "warn");
        return;
      }
      const sittingOut = yourSeat.state === "sitting-out";
      sitBusy = true;
      try { chrome.update(view); } catch {}
      const request = sittingOut ? client.sitIn(targetRoomId) : client.sitOut(targetRoomId);
      request
        .then((data) => {
          applyRoomSnapshot(targetRoomId, data);
          chrome.toast(sittingOut ? "Вы вернулись в игру" : "Перерыв включён");
        })
        .catch((err) => {
          const code = String(err?.message || "");
          chrome.toast(/not_seated/.test(code) ? "Вы не за столом" : "Не удалось изменить статус", "warn");
        })
        .finally(() => {
          sitBusy = false;
          try { chrome.update(); } catch {}
        });
    }

    // The name to sit under: hub-wide FFPlayerProgress profile, else the login
    // gate's localStorage fallback (simulator-identity.js). Empty -> we prompt.
    const NICK_KEY = "ff.poker.table-simulator.identity.v1";
    const cleanNick = (value) => String(value || "").replace(/\s+/g, " ").trim().slice(0, 24);
    function readSavedNick() {
      // Mirror simulator-identity.js: when FFPlayerProgress is present it is the
      // source of truth — a real nick only if the profile is NOT the "guest"
      // placeholder (whose display name is a localized stub like "Гость"). Fall
      // back to the login-gate localStorage only when FFProgress never loaded.
      try {
        const p = win.FFPlayerProgress;
        if (p && typeof p.getActiveProfile === "function") {
          const pr = p.getActiveProfile() || {};
          return (pr.id && String(pr.id) !== "guest") ? cleanNick(pr.name) : "";
        }
      } catch {}
      try {
        const raw = win.localStorage?.getItem(NICK_KEY);
        return raw ? cleanNick(JSON.parse(raw)?.nickname) : "";
      } catch {}
      return "";
    }
    function saveNick(name) {
      const clean = cleanNick(name);
      if (!clean) return;
      try { win.localStorage?.setItem(NICK_KEY, JSON.stringify({ nickname: clean, ts: Date.now() })); } catch {}
      try { win.FFPlayerProgress?.login?.(clean); } catch {}
    }

    function serverTableCountFor(count) {
      const n = Math.max(1, Number(count || 1));
      if (n >= 3) return 4;
      if (n >= 2) return 2;
      return 1;
    }

    function tableIdForRoom(roomId) {
      const id = String(roomId || "");
      if (!id || id === String(activeRoomId || "")) return 1;
      const ctx = sideRooms.get(id);
      return Number(ctx?.tableId || 1);
    }

    function roomContextForId(roomId) {
      const id = String(roomId || "");
      if (!id) return null;
      if (id === String(activeRoomId || "")) {
        return { roomId: activeRoomId, tableId: 1, view: latest, table: primaryTable, isPrimary: true };
      }
      const ctx = sideRooms.get(id);
      return ctx ? { roomId: ctx.roomId, tableId: ctx.tableId, view: ctx.latest, table: ctx.table, ctx, isPrimary: false } : null;
    }

    function tableContextForId(tableId) {
      const id = Number(tableId || 0);
      if (!Number.isFinite(id) || id <= 0) return null;
      const state = getState() || {};
      const table = (state.tables || []).find((candidate) => Number(candidate?.id) === id) || null;
      const byRoom = roomContextForId(table?.serverRoomId);
      if (byRoom) return { ...byRoom, table: table || byRoom.table };
      if (id === 1) return roomContextForId(activeRoomId);
      let found = null;
      sideRooms.forEach((ctx) => {
        if (!found && Number(ctx?.tableId) === id) found = { roomId: ctx.roomId, tableId: ctx.tableId, view: ctx.latest, table: ctx.table, ctx, isPrimary: false };
      });
      return found;
    }

    function chromeTarget(preferredView = null) {
      const state = getState() || {};
      const activeCtx = tableContextForId(state.activeTableId);
      if (activeCtx?.view) return activeCtx;
      const preferredCtx = roomContextForId(preferredView?.room?.id);
      if (preferredCtx?.view) return preferredCtx;
      if (preferredView?.room) {
        return {
          roomId: preferredView.room.id || activeRoomId,
          tableId: tableIdForRoom(preferredView.room.id),
          view: preferredView,
          table: null,
          isPrimary: String(preferredView.room.id || "") === String(activeRoomId || "")
        };
      }
      return roomContextForId(activeRoomId) || { roomId: activeRoomId, tableId: 1, view: latest, table: primaryTable, isPrimary: true };
    }

    function applyRoomSnapshot(roomId, data) {
      const id = String(roomId || activeRoomId);
      if (Number(data?.room?.youSeatIndex ?? -1) >= 0) heartbeatLostSeatRooms.delete(id);
      if (id === String(activeRoomId || "")) {
        playSnapshot(data);
        return;
      }
      const ctx = sideRooms.get(id);
      if (ctx) applySideView(ctx, data);
      else refresh();
    }

    function refreshRoomContext(target = chromeTarget()) {
      if (target?.isPrimary) refresh();
      else if (target?.ctx) refreshSide(target.ctx);
    }

    function handleHeartbeatNotSeated(roomId, target = null) {
      if (leaving) return;
      const id = String(roomId || "");
      if (!id || heartbeatLostSeatRooms.has(id)) return;
      heartbeatLostSeatRooms.add(id);
      chrome.toast("Место освободилось из-за потери связи — можно сесть снова", "warn");
      if (target?.ctx) refreshSide(target.ctx);
      else if (id === String(activeRoomId || "")) refresh();
      else {
        const found = roomContextForId(id);
        if (found?.ctx) refreshSide(found.ctx);
        else refresh();
      }
    }

    function roomLinkForContext(target = chromeTarget()) {
      const id = String(target?.roomId || activeRoomId || "");
      if (!id) {
        try { return win.location.href || ""; } catch { return ""; }
      }
      try {
        const url = new URL(win.location.href);
        url.search = "";
        url.searchParams.set("room", id);
        return url.href;
      } catch {
        return `poker-simulator.html?room=${encodeURIComponent(id)}`;
      }
    }

    function orderedServerTableContexts() {
      const contexts = [];
      const primary = roomContextForId(activeRoomId);
      if (primary?.view || primary?.table) contexts.push(primary);
      sideRooms.forEach((ctx) => {
        if (ctx?.latest || ctx?.table) {
          contexts.push({ roomId: ctx.roomId, tableId: ctx.tableId, view: ctx.latest, table: ctx.table, ctx, isPrimary: false });
        }
      });
      return contexts.sort((a, b) => Number(a?.tableId || 0) - Number(b?.tableId || 0));
    }

    function orderedServerTables() {
      const tables = [];
      if (primaryTable) tables.push(primaryTable);
      sideRooms.forEach((ctx) => {
        if (ctx?.table) tables.push(ctx.table);
      });
      return tables;
    }

    function selectServerTable(tableId, reason = "mp-select-table") {
      const target = tableContextForId(tableId);
      if (!target?.view) return false;
      const id = Number(target.tableId || tableId);
      if (!Number.isFinite(id) || id <= 0) return false;
      manualTableFocusUntil = Date.now() + MANUAL_TABLE_FOCUS_GRACE_MS;
      const state = getState() || {};
      const currentId = Number(state.activeTableId || 0);
      if (id !== currentId) {
        setActiveTable(id);
        flushRender(reason);
        clearTimers();
      }
      if (chrome.mounted) chrome.update(target.view);
      return true;
    }

    function renderServerTables(reason = "mp-update") {
      const state = getState() || {};
      const tables = orderedServerTables();
      state.started = true;
      state.tables = tables;
      const currentFocus = tables.find((table) => Number(table?.id) === Number(state.activeTableId || 0)) || null;
      const heroFocus = tables.find((table) => table?.heroTurn) || null;
      const manualFocus = currentFocus && manualTableFocusUntil > Date.now();
      const focus = (manualFocus || currentFocus?.heroTurn) ? currentFocus : (heroFocus || currentFocus || tables[0] || null);
      state.activeTableId = focus?.id || 1;
      if (state.settings) state.settings.tableCount = serverTableCountFor(Math.max(tables.length, initialRoomIds.length));
      markAllTablesDirty();
      flushRender(reason);
      clearTimers();
    }

    function tableFromServerView(view, tableId, previousHandView, roomViewerId) {
      return adapterKit.serverHandToTable({
        room: view?.room,
        hand: view?.hand || null,
        viewerId: roomViewerId || viewerId,
        tableId,
        prevHand: previousHandView
      });
    }

    function applySideView(ctx, view) {
      if (!ctx || !view || !view.room) return;
      const seq = Number(view.room.eventSeq || 0);
      if (seq < ctx.lastAppliedSeq) return;
      ctx.lastAppliedSeq = seq;
      ctx.viewerId = view.playerId || ctx.viewerId || viewerId;
      if (view.streamToken) ctx.streamToken = String(view.streamToken || "");
      const hand = view.hand || null;
      const table = tableFromServerView(view, ctx.tableId, ctx.prevHandView, ctx.viewerId);
      const newHand = hand && (!ctx.prevHandView || ctx.prevHandView.handNo !== hand.handNo);
      const enteredShowdown = hand && hand.status === "complete" && (!ctx.prevHandView || ctx.prevHandView.status !== "complete");
      const boardGrew = (table.board || []).length > Number(ctx.prevBoardLen || 0);

      try {
        if (newHand && hand.status === "betting") {
          prime.deal?.(table);
        } else if (hand && hand.status === "betting" && (table.actionAnimations.length || boardGrew)) {
          prime.annotate?.(table);
          prime.action?.(table, { previousBoardLength: Number(ctx.prevBoardLen || 0) });
        }
        if (enteredShowdown) prime.showdown?.(table);
      } catch (err) {
        win.console?.warn?.("[mp] side-table prime failed", err?.message || err);
      }

      ctx.table = table;
      ctx.latest = view;
      ctx.prevHandView = hand;
      ctx.prevBoardLen = (table.board || []).length;
      renderServerTables("mp-side-update");
      if (chrome.mounted) chrome.update(view);
      maybeAutoStartSide(ctx, view);
    }

    function refreshSide(ctx) {
      if (!ctx || leaving) return;
      if (ctx.refreshing) { ctx.refreshAgain = true; return; }
      ctx.refreshing = true;
      client.getRoom(ctx.roomId, readStoredAccessCode(ctx.roomId))
        .then((view) => applySideView(ctx, view))
        .catch((err) => {
          win.console?.warn?.("[mp] side refresh failed", ctx.roomId, err?.message || err);
        })
        .finally(() => {
          ctx.refreshing = false;
          if (ctx.refreshAgain && !leaving) {
            ctx.refreshAgain = false;
            refreshSide(ctx);
          }
        });
    }

    function maybeAutoStartSide(ctx, view) {
      if (!ctx) return;
      if (ctx.autoStartTimer) { win.clearTimeout(ctx.autoStartTimer); ctx.autoStartTimer = null; }
      const room = view?.room;
      const handActive = view?.hand && view.hand.status === "betting";
      if (handActive || Number(room?.youSeatIndex ?? -1) < 0) return;
      const activeSeated = (room.seats || []).filter((seat) => seat.occupied && seat.state === "active").length;
      const botFill = room.settings?.botFill !== false;
      const hasEmptySeat = (room.seats || []).some((seat) => !seat.occupied);
      if (activeSeated < 2 && !(botFill && activeSeated >= 1 && hasEmptySeat)) return;
      const delay = view.hand && view.hand.status === "complete" ? 4500 : 1200;
      ctx.autoStartTimer = win.setTimeout(() => {
        client.startHand(ctx.roomId).then((data) => applySideView(ctx, data)).catch(() => {});
      }, delay);
    }

    async function bootSideRoom(sideRoomId, tableId, joinName) {
      if (!sideRoomId || sideRooms.has(sideRoomId)) return null;
      const ctx = {
        roomId: sideRoomId,
        tableId,
        latest: null,
        table: null,
        prevHandView: null,
        prevBoardLen: 0,
        lastAppliedSeq: -1,
        viewerId: "",
        streamToken: "",
        sub: null,
        stopHeartbeat: null,
        autoStartTimer: null,
        refreshing: false,
        refreshAgain: false
      };
      sideRooms.set(sideRoomId, ctx);
      try {
        let joined;
        try {
          joined = await client.join(sideRoomId, undefined, joinName, readStoredAccessCode(sideRoomId));
        } catch (joinErr) {
          if (isAccessCodeError(joinErr)) throw joinErr;
          joined = await client.getRoom(sideRoomId, readStoredAccessCode(sideRoomId));
        }
        applySideView(ctx, joined);
        ctx.stopHeartbeat = client.startHeartbeat(sideRoomId, 5000, {
          onNotSeated: () => handleHeartbeatNotSeated(sideRoomId, { ctx })
        });
        ctx.sub = client.subscribe(sideRoomId, {
          since: ctx.latest?.room?.eventSeq || 0,
          accessCode: streamAccessCodeForRoom(sideRoomId, ctx.streamToken),
          streamToken: ctx.streamToken,
          onEvent: () => refreshSide(ctx),
          onOpen: () => {},
          onStreamError: () => {},
          onError: (payload) => {
            const code = String(payload?.error || payload?.code || "");
            if (/room_not_found|room_closed/i.test(code)) {
              try { ctx.sub?.close?.(); } catch {}
              try { ctx.stopHeartbeat?.(); } catch {}
              sideRooms.delete(sideRoomId);
              renderServerTables("mp-side-closed");
            }
          },
          onRoomClosed: () => {
            try { ctx.sub?.close?.(); } catch {}
            try { ctx.stopHeartbeat?.(); } catch {}
            sideRooms.delete(sideRoomId);
            renderServerTables("mp-side-closed");
          }
        });
        return ctx;
      } catch (err) {
        sideRooms.delete(sideRoomId);
        win.console?.warn?.("[mp] side room failed", sideRoomId, err?.message || err);
        if (isAccessCodeError(err)) chrome.toast("Дополнительный стол защищён кодом — откройте его отдельно", "warn");
        else chrome.toast("Дополнительный стол не подключился", "warn");
        renderServerTables("mp-side-error");
        return null;
      }
    }

    function closeSideRooms({ leave = false } = {}) {
      const leaves = [];
      sideRooms.forEach((ctx) => {
        try { if (ctx.autoStartTimer) win.clearTimeout(ctx.autoStartTimer); } catch {}
        try { ctx.sub?.close?.(); } catch {}
        try { ctx.stopHeartbeat?.(); } catch {}
        if (leave && ctx.roomId) {
          try { leaves.push(Promise.resolve(client.leave(ctx.roomId)).catch(() => {})); } catch {}
        }
      });
      sideRooms.clear();
      return leaves;
    }

    function leaveSideRooms() {
      const leaves = [];
      sideRooms.forEach((ctx) => {
        if (!ctx?.roomId) return;
        try { leaves.push(leaveRoomSettled(ctx.roomId)); }
        catch (err) { leaves.push(Promise.resolve({ ok: false, roomId: ctx.roomId, error: err })); }
      });
      return leaves;
    }

    // Map the simulator's hero action (already bet-sized by the runtime) to the
    // server action envelope and POST it. Installed on runtime state so
    // handleHeroAction routes here instead of the local engine.
    function setServerActionPending(table, roomId, pending) {
      if (!table || !roomId) return;
      const ctx = roomContextForId(roomId);
      if (!ctx?.table || ctx.table !== table) return;
      if (pending) {
        table.serverActionPending = true;
        table.busy = true;
      } else if (table.serverActionPending) {
        delete table.serverActionPending;
        table.busy = false;
      }
      renderServerTables(pending ? "mp-action-pending" : "mp-action-settled");
      if (chrome.mounted && ctx.view) chrome.update(ctx.view);
    }

    function serverActionHandler(table, action, amount) {
      if (serverMutationBlockedByConnection()) return;
      let payload = null;
      if (action === "fold") payload = { type: "fold" };
      else if (action === "check") payload = { type: "check" };
      else if (action === "call") payload = { type: "call" };
      else if (action === "allin") payload = { type: "allin" };
      else if (/raise|bet|open/i.test(String(action))) {
        payload = Number.isFinite(Number(amount)) ? { type: "raise", amount: Number(amount) } : { type: "raise" };
      } else {
        return;
      }
      const serverRoomId = String(table?.serverRoomId || activeRoomId);
      if (actionBusyRooms.has(serverRoomId)) return;
      actionBusyRooms.add(serverRoomId);
      setServerActionPending(table, serverRoomId, true);
      client.sendAction(serverRoomId, payload)
        .then((data) => {
          if (serverRoomId === activeRoomId) playSnapshot(data);
          else {
            const ctx = sideRooms.get(serverRoomId);
            if (ctx) applySideView(ctx, data);
            else refresh();
          }
        })
        .catch((err) => {
          win.console?.warn?.("[mp] action rejected", err?.message || err);
          chrome.toast(actionErrorText(err), "warn");
          // Re-sync the action bar to the authoritative state. The rejection
          // response now carries the room + hand view, so apply it directly
          // (guarded by playSnapshot) instead of paying another getRoom RTT; fall
          // back to refresh() for an older server with no hand in its error body.
          const view = err?.data && err.data.room ? { room: err.data.room, hand: err.data.hand || null } : null;
          if (view && serverRoomId === activeRoomId) playSnapshot(view);
          else if (view && sideRooms.has(serverRoomId)) applySideView(sideRooms.get(serverRoomId), view);
          else if (sideRooms.has(serverRoomId)) refreshSide(sideRooms.get(serverRoomId));
          else refresh();
        })
        .finally(() => {
          actionBusyRooms.delete(serverRoomId);
          setServerActionPending(table, serverRoomId, false);
        });
    }

    function flipToTableView() {
      const state = getState() || {};
      state.settings = state.settings || {};
      state.settings.setupCompleted = true;
      state.settings.tableCount = serverTableCountFor(initialRoomIds.length);
      state.settings.serverMode = true; // advisory marker
      state.serverMode = true;          // read by simulator-hero-action-runtime
      state.serverActionHandler = serverActionHandler;
      state.started = true;
      state.paused = false;
      state.pauseStartedAt = 0;
    }

    function applyView(view) {
      if (!view || !view.room) return;
      // Monotonic guard: a slower out-of-order fetch must not clobber a newer
      // applied view (which would reverse the prevHandView/prevBoardLen animation
      // diff and flicker old state). eventSeq increments per room event.
      const seq = Number(view.room.eventSeq || 0);
      if (seq < lastAppliedSeq) return;
      lastAppliedSeq = seq;
      viewerId = view.playerId || viewerId;
      if (view.streamToken) streamToken = String(view.streamToken || "");
      const hand = view.hand || null;
      const table = tableFromServerView(view, 1, prevHandView, viewerId);
      const state = getState() || {};
      state.started = true;
      syncServerReplayEntries(view, state);

      // Transitions for animation priming.
      const newHand = hand && (!prevHandView || prevHandView.handNo !== hand.handNo);
      const enteredShowdown = hand && hand.status === "complete" && (!prevHandView || prevHandView.status !== "complete");
      const boardGrew = (table.board || []).length > prevBoardLen;

      // Prime BEFORE flushRender so the renderer sees the visual deadlines.
      // Showdown is primed here too (it arms setTimeout-driven staged renders
      // that fire AFTER this synchronous flush regardless of arming order), so a
      // completed hand needs only ONE full render instead of the old back-to-back
      // mp-update + mp-showdown pair on top of the largest state jump.
      try {
        if (newHand && hand.status === "betting") {
          prime.deal?.(table);
        } else if (hand && hand.status === "betting" && (table.actionAnimations.length || boardGrew)) {
          prime.annotate?.(table);
          prime.action?.(table, { previousBoardLength: prevBoardLen });
        }
        if (enteredShowdown) prime.showdown?.(table);
      } catch (err) {
        win.console?.warn?.("[mp] prime failed", err?.message || err);
      }

      latest = view;
      latestView = view;
      primaryTable = table;
      renderServerTables("mp-update");

      prevHandView = hand;
      prevBoardLen = (table.board || []).length;
      // Drop buffered events this authoritative view already incorporates so the
      // replay buffer never re-applies a landed action.
      if (handEventBuffer.length) handEventBuffer = handEventBuffer.filter((ev) => Number(ev.seq || 0) > lastAppliedSeq);
      if (chrome.mounted) {
        chrome.update(view);
        chrome.hideOverlay();
        streamErrorCount = 0;
        chrome.setConn("online");
      }
      maybeAutoStart(view);
    }

    // The host auto-deals the next hand a few seconds after the table is idle,
    // mirroring the simulator's auto-deal between hands. Only the host starts,
    // to avoid two clients racing a start.
    function maybeAutoStart(view) {
      if (autoStartTimer) { win.clearTimeout(autoStartTimer); autoStartTimer = null; }
      const room = view.room;
      const handActive = view.hand && view.hand.status === "betting";
      if (handActive || Number(room?.youSeatIndex ?? -1) < 0) return;
      const activeSeated = (room.seats || []).filter((seat) => seat.occupied && seat.state === "active").length;
      const botFill = room.settings?.botFill !== false;
      const hasEmptySeat = (room.seats || []).some((seat) => !seat.occupied);
      // Start with 2+ humans, OR a lone human when bots fill an empty seat.
      if (activeSeated < 2 && !(botFill && activeSeated >= 1 && hasEmptySeat)) return;
      const delay = view.hand && view.hand.status === "complete" ? 4500 : 1200;
      autoStartTimer = win.setTimeout(() => {
        client.startHand(activeRoomId).then((data) => applyView(data)).catch(() => {});
      }, delay);
    }

    async function refresh() {
      if (leaving) return;
      // Coalesce a burst of SSE events: at most one fetch in flight + one trailing
      // re-fetch, so unordered/overlapping GETs can't pile up (the seq guard in
      // applyView still drops any that resolve out of order).
      if (refreshing) { refreshAgain = true; return; }
      refreshing = true;
      try {
        playSnapshot(await client.getRoom(activeRoomId, readStoredAccessCode(activeRoomId)));
      } catch (err) {
        win.console?.warn?.("[mp] refresh failed", err?.message || err);
      } finally {
        refreshing = false;
        if (refreshAgain && !leaving) { refreshAgain = false; refresh(); }
      }
    }

    // --- mp-step-playback:start ----------------------------------------------
    // Replay a multi-action server burst one beat at a time instead of snapping.
    // STRICTLY display-only: nothing here POSTs an action / drives a hero action /
    // touches an engine timer map (the mp-server-mode-timer-guard smoke scans this
    // exact region). The only timer is `stepTimer`, a visual setTimeout cleared on
    // leave / pagehide. Reconstruction is authoritative-event-driven (no engine
    // math, no invented cards) and self-healing: we pace ONLY when the rebuilt
    // states reach the authoritative target, then land on the real snapshot.
    let reducedMotionQuery;
    function prefersReducedMotion() {
      // OS accessibility preference ONLY — never the tempo-derived motion flag,
      // which is already true for the default handTempo "fast", so gating on it
      // would disable pacing for most users. Cache the MediaQueryList; .matches
      // stays live.
      if (!win.matchMedia) return false;
      if (reducedMotionQuery === undefined) {
        reducedMotionQuery = win.matchMedia("(prefers-reduced-motion: reduce)") || null;
      }
      return Boolean(reducedMotionQuery && reducedMotionQuery.matches);
    }

    function bufferHandEvent(type, payload) {
      if (!payload || leaving) return;
      handEventBuffer.push({ ...payload, type, seq: Number(payload.seq || 0) });
      // Bound the buffer (a hand is ~tens of events); stale entries are also
      // excluded by the seq filter in playSnapshot.
      if (handEventBuffer.length > 400) handEventBuffer.splice(0, handEventBuffer.length - 400);
    }

    // Compact (online-snappy) inter-beat delay for one reconstructed step. Reads
    // the global visual timing table only — never an engine timer. Compact is the
    // timings' explicit online-client pace (see simulator-timings.js), so a burst
    // stays readable but bounded.
    function beatBudgetMs(step) {
      const T = win.PokerSimulatorTimings || {};
      if (step.kind === "street") {
        return (T.compactBoardRevealDurationMs || 378) + (T.boardCardStaggerMs || 135) + (T.compactBoardSettleDurationMs || 91);
      }
      const tone = step.tone || "passive";
      const think = tone === "fold" ? (T.compactFoldThinkDurationMs || 390)
        : tone === "aggressive" ? (T.compactAggressiveThinkDurationMs || 750)
          : tone === "allin" ? (T.compactAllInThinkDurationMs || 960)
            : (T.compactPassiveThinkDurationMs || 585);
      const settle = tone === "fold" ? (T.compactFoldActionSettleDurationMs || 150)
        : tone === "aggressive" ? (T.compactAggressiveActionSettleDurationMs || 270)
          : tone === "allin" ? (T.compactAllInActionSettleDurationMs || 360)
            : (T.compactPassiveActionSettleDurationMs || 210);
      return think + settle;
    }

    // Render ONE reconstructed intermediate hand-view through the same adapter +
    // animation primers as a real snapshot, WITHOUT the authoritative-apply
    // side-effects (chrome / seq guard / auto-start / showdown). Mirrors the
    // betting branch of applyView.
    function renderIntermediate(hand, room) {
      const table = tableFromServerView({ room, hand }, 1, prevHandView, viewerId);
      const state = getState() || {};
      state.started = true;
      const boardGrew = (table.board || []).length > prevBoardLen;
      // CONTRACT (structural-hardening plan C11): per-intermediate re-prime is the
      // INTENDED origin source here. The MP beat-pacer (drainSteps) OWNS beat
      // tempo — each drained step is a fresh, independent visual snapshot, so
      // re-priming the action reveal per beat is deliberate, NOT the single-table
      // "reuse the existing action-sequence origin" behavior. This path is
      // intentionally NOT unified with the single-table sequence clock: the pacer
      // decides when each beat starts, and re-anchoring the reveal to that beat is
      // exactly what keeps the replay paced. Audit C11 confirmed the mechanism and
      // found the harm unproven, so the design is PINNED, not changed. Do not
      // "fix" this into a reuse-origin path without re-opening C11.
      // See docs/simulator-structural-hardening-plan-2026-07.md (C11).
      try {
        if (table.actionAnimations.length || boardGrew) {
          prime.annotate?.(table);
          prime.action?.(table, { previousBoardLength: prevBoardLen });
        }
      } catch (err) {
        win.console?.warn?.("[mp] step prime failed", err?.message || err);
      }
      primaryTable = table;
      renderServerTables("mp-step");
      prevHandView = hand;
      prevBoardLen = (table.board || []).length;
    }

    // Entry point for a mid-hand authoritative snapshot: pace the burst if we can,
    // else snap. Always keeps `latestView` pointing at the newest target so a
    // drain in progress lands on the freshest state.
    function playSnapshot(view) {
      if (!view || !view.room) return;
      latestView = view;
      if (playing) return; // the active drain will land on latestView when it ends
      const hand = view.hand;
      const base = prevHandView;
      if (!stepInterp || prefersReducedMotion() || !hand || hand.status !== "betting"
        || !base || base.handNo !== hand.handNo) {
        applyView(view);
        return;
      }
      // Only the buffered events AFTER the rendered base (its room.eventSeq) are in
      // play; older ones already landed. reachedTarget guards against gaps.
      const pending = handEventBuffer.filter((ev) => Number(ev.seq || 0) > lastAppliedSeq);
      const { steps, reachedTarget } = stepInterp.reconstructSteps(base, pending, view);
      if (!reachedTarget || steps.length < 2 || steps.length > MAX_PACED_STEPS) {
        applyView(view);
        return;
      }
      drainSteps(steps);
    }

    function drainSteps(steps) {
      playing = true;
      // The stale turn clock ("Ваш ход" + red alarm) belongs to the pre-burst
      // state; clear it for the replay so it doesn't count down an action already
      // taken. The final applyView restores the correct turn state.
      if (chrome.mounted) chrome.clearTurn();
      // Render every step EXCEPT the last (which equals the target); the
      // authoritative applyView(latestView) is the final beat (chrome / seq guard /
      // auto-start / showdown all run there).
      const intermediates = steps.slice(0, -1);
      // If the burst ends on the HERO's turn, the action bar is disabled for the
      // whole replay while the server's clock already runs — so cap the total
      // paced wall-time and split it across the beats (display-only: only shortens
      // the setTimeout delays; touches no engine timer).
      const heroEndsTurn = Boolean(latestView && latestView.hand && latestView.hand.youToAct);
      const capPerBeat = heroEndsTurn && intermediates.length
        ? Math.floor(HERO_TURN_REPLAY_CAP_MS / intermediates.length)
        : Infinity;
      let i = 0;
      const tick = () => {
        if (leaving) { playing = false; stepTimer = null; return; }
        if (i >= intermediates.length) {
          playing = false;
          stepTimer = null;
          applyView(latestView);
          return;
        }
        const step = intermediates[i++];
        try { renderIntermediate(step.hand, (latestView && latestView.room) || null); }
        catch (err) { win.console?.warn?.("[mp] step render failed", err?.message || err); }
        stepTimer = win.setTimeout(tick, Math.min(beatBudgetMs(step), capPerBeat));
      };
      tick();
    }

    function stopPlayback() {
      if (stepTimer) { try { win.clearTimeout(stepTimer); } catch {} stepTimer = null; }
      playing = false;
    }
    // --- mp-step-playback:end ------------------------------------------------

    async function joinWithAccessPrompt(targetRoomId, joinName, firstErr) {
      let accessErr = firstErr;
      while (isAccessCodeError(accessErr)) {
        if (!chrome.mounted) throw accessErr;
        clearStoredAccessCode(targetRoomId);
        const entered = await chrome.promptAccessCode(/access_code_invalid/i.test(String(accessErr?.message || ""))
          ? "Код не подошёл. Проверьте код у хоста и попробуйте ещё раз."
          : "Этот стол защищён. Введите код, который дал хост.");
        chrome.showLoading();
        if (!entered) throw accessErr;
        const code = cleanAccessCode(entered);
        try {
          const joined = await client.join(targetRoomId, undefined, joinName, code);
          storeAccessCode(targetRoomId, code);
          return joined;
        } catch (nextErr) {
          if (!isAccessCodeError(nextErr)) throw nextErr;
          accessErr = nextErr;
        }
      }
      throw accessErr;
    }

    async function boot() {
      chrome.showLoading();
      flipToTableView();
      flushRender("mp-boot"); // primes the felt under the (opaque) loading overlay
      // The name to sit under: explicit ?name=, else the saved hub nick, else
      // ask (someone who opened a shared link without ever setting a nick). This
      // is why link-joiners aren't all anonymous "Гость".
      let joinName = displayName || readSavedNick();
      if (!joinName && chrome.mounted) {
        try { joinName = await chrome.promptName(""); } catch {}
        chrome.showLoading();
      }
      if (joinName) saveNick(joinName);
      try {
        if (roomId === "new") {
          chrome.showError(
            "Стол не создан",
            "Игроки больше не создают столы из ссылки. Открой готовый стол из лобби.",
            true
          );
          return;
        } else {
          // Try to claim a seat; if that fails (e.g. full) fall back to a
          // spectator read so a valid room still loads. Only a missing/closed
          // room is a hard failure (getRoom throws -> caught below).
          let joined;
          let joinFailure = null;
          const bootAccessCode = bootAccessCodeForRoom(activeRoomId, initialAccessCode);
          try {
            joined = await client.join(activeRoomId, undefined, joinName, bootAccessCode);
            if (bootAccessCode && joined?.room?.hasAccessCode) storeAccessCode(activeRoomId, bootAccessCode);
          } catch (joinErr) {
            if (isAccessCodeError(joinErr)) {
              joined = await joinWithAccessPrompt(activeRoomId, joinName, joinErr);
            } else {
              joinFailure = joinErr;
              joined = await client.getRoom(activeRoomId, bootAccessCode);
              if (bootAccessCode && joined?.room?.hasAccessCode) storeAccessCode(activeRoomId, bootAccessCode);
            }
          }
          applyView(joined);
          if (joinFailure && /login_required/i.test(String(joinFailure?.message || "")) && !joined?.auth?.authenticated) {
            chrome.showLoginRequired(joined);
          } else if (joinFailure) {
            chrome.toast(joinErrorText(joinFailure), "warn");
          } else if (latest?.room && latest.room.youSeatIndex === -1) {
            chrome.toast("Стол заполнен — вы наблюдаете", "warn");
          }
        }
        let nextSideTableId = 2;
        for (const sideRoomId of secondaryInitialRoomIds) {
          await bootSideRoom(sideRoomId, nextSideTableId, joinName);
          nextSideTableId += 1;
        }
      } catch (err) {
        // A blank "started" felt with no recovery is the worst failure mode; show
        // an explicit error with a way back to the lobby instead.
        win.console?.warn?.("[mp] join failed", err?.message || err);
        chrome.showError("Не удалось войти за стол", joinErrorText(err), true);
        return; // do not start heartbeat / SSE on a hard failure
      }
      stopHeartbeat = client.startHeartbeat(activeRoomId, 5000, {
        onNotSeated: () => handleHeartbeatNotSeated(activeRoomId)
      });
      sub = client.subscribe(activeRoomId, {
        since: latest?.room?.eventSeq || 0,
        accessCode: streamAccessCodeForRoom(activeRoomId, streamToken),
        streamToken,
        onEvent: () => { if (!leaving) refresh(); },
        // Buffer the granular per-event public deltas so playSnapshot can replay a
        // burst one beat at a time (the snapshot from onEvent->refresh reconciles).
        onHandAction: (p) => bufferHandEvent("hand-action", p),
        onStreet: (p) => bufferHandEvent("street", p),
        onShowdown: (p) => bufferHandEvent("showdown", p),
        onOpen: () => { streamErrorCount = 0; chrome.setConn("online"); },
        onStreamError: () => {
          if (leaving) return;
          streamErrorCount += 1;
          if (streamErrorCount >= 2) {
            chrome.setConn("reconnecting");
            if (streamErrorCount === 2) chrome.toast("Соединение прервалось — переподключаемся…", "warn");
          }
        },
        // Named terminal stream events: the room vanished or the host closed it.
        onError: (payload) => {
          const code = String(payload?.error || payload?.code || "");
          if (/room_not_found|room_closed/i.test(code)) {
            try { sub?.close?.(); } catch {}
            chrome.showError("Стол закрыт", "Этот стол больше не существует.", false);
          }
        },
        onRoomClosed: () => {
          try { sub?.close?.(); } catch {}
          try { stopHeartbeat?.(); } catch {}
          chrome.showError("Стол закрыт", "Хост закрыл стол.", false);
        }
      });
      // Hero actions are routed via state.serverActionHandler (installed in
      // flipToTableView), intercepted inside simulator-hero-action-runtime —
      // exact bet sizing, no capture-phase recompute.
      // NOTE: we intentionally do NOT call leave() on pagehide — a refresh fires
      // pagehide too, and the guest-token + heartbeat design reclaims the seat on
      // return. Only the explicit "Выйти" button frees the seat.
      win.addEventListener("pagehide", () => {
        try { stopPlayback(); } catch {}
        try { closeSideRooms(); } catch {}
        try { sub?.close?.(); } catch {}
        try { stopHeartbeat?.(); } catch {}
        try { chrome.dispose?.(); } catch {}
        setServerModeShell(false);
      });
    }

    boot();
    return { refresh };
  }

  root.PokerSimulatorMultiplayerRuntime = { start };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorMultiplayerRuntime;
})(typeof window !== "undefined" ? window : globalThis);
