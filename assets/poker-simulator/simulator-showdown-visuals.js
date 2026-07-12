(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  // Hand-strength category indices as produced by the engine score[0] (mirrors
  // engine-core HAND_NAMES: 0=high card … 8=straight flush). Used to classify
  // which winning cards form the made hand vs support/kicker at showdown.
  const HAND_CATEGORY = {
    HIGH_CARD: 0, PAIR: 1, TWO_PAIR: 2, TRIPS: 3, STRAIGHT: 4,
    FLUSH: 5, FULL_HOUSE: 6, QUADS: 7, STRAIGHT_FLUSH: 8
  };
  // Categories where every winning card is part of the made hand (no kicker split).
  const ALL_CARDS_CORE_CATEGORIES = new Set([
    HAND_CATEGORY.STRAIGHT, HAND_CATEGORY.FLUSH, HAND_CATEGORY.STRAIGHT_FLUSH
  ]);
  // Categories where cards matching the primary rank are the made hand; rest are support.
  const PRIMARY_RANK_CORE_CATEGORIES = new Set([
    HAND_CATEGORY.PAIR, HAND_CATEGORY.TRIPS, HAND_CATEGORY.FULL_HOUSE, HAND_CATEGORY.QUADS
  ]);

  function model(options = {}) {
    const boardRevealMs = typeof options.boardRevealMs === "function" ? options.boardRevealMs : () => 0;
    const boardCardStaggerMs = Math.max(0, Number(options.boardCardStaggerMs) || 0);
    const allInBoardDealGraceMs = Math.max(0, Number(options.allInBoardDealGraceMs) || 0);
    const showdownWinnerVisible = typeof options.showdownWinnerVisible === "function" ? options.showdownWinnerVisible : () => false;
    const showdownElapsedMs = typeof options.showdownElapsedMs === "function" ? options.showdownElapsedMs : () => 0;
    const allInBoardRunoutStartMs = typeof options.allInBoardRunoutStartMs === "function" ? options.allInBoardRunoutStartMs : () => 0;
    const allInRunoutStageDuration = typeof options.allInRunoutStageDuration === "function" ? options.allInRunoutStageDuration : () => 1;
    const isActionSequenceActive = typeof options.isActionSequenceActive === "function" ? options.isActionSequenceActive : () => false;
    const percent = typeof options.percent === "function" ? options.percent : (value) => `${Math.round(Number(value || 0) * 100)}%`;
    const resultTitle = typeof options.resultTitle === "function" ? options.resultTitle : (table, fallback = "") => String(fallback || table?.result || "");
    const formatAmount = typeof options.formatAmount === "function" ? options.formatAmount : (value) => String(value ?? "");
    const formatMadeHandFromScore = typeof options.formatMadeHandFromScore === "function"
      ? options.formatMadeHandFromScore
      : (_score, fallback = "") => String(fallback || "");
    const showdownRevealStepDuration = typeof options.showdownRevealStepDuration === "function" ? options.showdownRevealStepDuration : () => 0;
    const showdownAnimationStartAt = typeof options.showdownAnimationStartAt === "function" ? options.showdownAnimationStartAt : () => 0;
    const cardRankValue = typeof options.cardRankValue === "function" ? options.cardRankValue : () => 0;
    const now = typeof options.now === "function" ? options.now : () => Date.now();

    function allInRunoutStages(table) {
      return Array.isArray(table?.allInRunout?.stages) ? table.allInRunout.stages : [];
    }

    function allInRunoutStageState(table) {
      if (!table || table.status !== "showdown" || !table.allInRunout) return null;
      const stages = allInRunoutStages(table);
      if (!stages.length) return null;
      if (showdownWinnerVisible(table)) {
        return {
          index: stages.length - 1,
          previousIndex: Math.max(0, stages.length - 2),
          stage: stages[stages.length - 1],
          previousStage: stages[Math.max(0, stages.length - 2)] || stages[0],
          stageElapsedMs: allInRunoutStageDuration(table),
          dealing: false,
          outsDealing: false
        };
      }
      const elapsed = Math.max(0, showdownElapsedMs(table));
      const hold = allInBoardRunoutStartMs(table);
      const step = Math.max(1, allInRunoutStageDuration(table));
      const index = elapsed < hold ? 0 : Math.min(stages.length - 1, Math.floor((elapsed - hold) / step) + 1);
      const stageStart = index <= 0 ? 0 : hold + ((index - 1) * step);
      const stageElapsedMs = Math.max(0, elapsed - stageStart);
      const previousStage = stages[Math.max(0, index - 1)] || stages[index];
      return {
        index,
        previousIndex: Math.max(0, index - 1),
        stage: stages[index],
        previousStage,
        stageElapsedMs,
        dealing: index > 0 && stageElapsedMs <= allInBoardDealWindowMs(stages[index], previousStage),
        outsDealing: index > 0 && stageElapsedMs <= allInOutsDealWindowMs()
      };
    }

    function allInBoardDealWindowMs(stage, previousStage) {
      const boardLength = Array.isArray(stage?.board) ? stage.board.length : 0;
      const previousBoardLength = Array.isArray(previousStage?.board) ? previousStage.board.length : 0;
      const newCards = Math.max(0, boardLength - previousBoardLength);
      const staggerTail = Math.max(0, newCards - 1) * boardCardStaggerMs;
      return boardRevealMs() + staggerTail + allInBoardDealGraceMs;
    }

    // The smooth equity gauge and the board-deal animation (`dealing`) hold for
    // the FULL staggered reveal (allInBoardDealWindowMs) so a continuous % never
    // jumps ahead of a card still in flight. The discrete "X аутов" badge is a
    // single count for the whole street, not a per-card outcome predictor, so it
    // is safe to surface once the street's FIRST card has landed — it must not
    // wait out the multi-card stagger tail. Without this split a 3-card flop
    // reveal (stagger tail 270ms on top of 1015ms reveal + 140ms grace = 1425ms)
    // left the flop outs visible for only ~35ms of the 1460ms stage. Single-card
    // streets (turn/river) are unchanged: their stagger tail is already 0, so
    // this window equals allInBoardDealWindowMs for them.
    function allInOutsDealWindowMs() {
      return boardRevealMs() + allInBoardDealGraceMs;
    }

    function allInRunoutVisibleBoardLength(table) {
      const current = allInRunoutStageState(table);
      if (!current) return NaN;
      const board = Array.isArray(current.stage?.board) ? current.stage.board : [];
      return Math.min(5, board.length);
    }

    function allInRunoutShowsEquity(table, stageState) {
      if (!stageState || !table?.allInRunout) return false;
      const startedAtStreet = String(table.allInRunout.startedAtStreet || "").toLowerCase();
      const startBoardLength = Array.isArray(table.allInRunout.startBoard) ? table.allInRunout.startBoard.length : 0;
      const stageStreet = String(stageState.stage?.street || "").toLowerCase();
      return startedAtStreet !== "river" && startBoardLength < 5 && stageStreet !== "river";
    }

    function allInEquityDisplayReady(table) {
      if (!table?.allInRunout) return false;
      if (isActionSequenceActive(table)) return false;
      if (table.pendingHeroActionAnimation) return false;
      return true;
    }

    function allInRunoutHasEquityStage(table) {
      return allInRunoutStages(table)
        .some((stage) => allInRunoutShowsEquity(table, { stage }));
    }

    // The stable equity footprint is allowed only after the action that locked
    // the runout has visibly completed, and only for a runout that can ever
    // show equity. Keep it on across board-deal gaps and the river stage once
    // enabled; tying it to the current equity row would reintroduce T4 text
    // jumps whenever the row is temporarily hidden while a card is in flight.
    function allInEquityLayoutReady(table) {
      return allInEquityDisplayReady(table) && allInRunoutHasEquityStage(table);
    }

    function allInEquityForSeat(table, seat, stageState = allInRunoutStageState(table)) {
      if (!seat || !allInEquityDisplayReady(table) || !allInRunoutShowsEquity(table, stageState)) return null;
      // Suppress the % while a new board card is dealing in. The deal-in window
      // outlasts the card's slide (it hits opacity:1 at ~58% of the reveal, but
      // `dealing` stays true for the whole boardRevealMs + stagger + grace), so
      // reading the PREVIOUS street's equity here painted a stale, now-wrong
      // number over a board the player can already read — e.g. a flop "13%"
      // lingering ~0.5s over a turn card that completed hero's flush and left
      // the villain drawing dead (0%). Mirror allInOutsForSeat: hide during the
      // deal-in, then read the CURRENT stage once the card settles.
      if (stageState?.dealing) return null;
      const equities = Array.isArray(stageState?.stage?.handEquities)
        ? stageState.stage.handEquities
        : Array.isArray(stageState?.stage?.equities)
        ? stageState.stage.equities
        : [];
      const row = equities.find((entry) => Number(entry?.seatId) === Number(seat.id));
      if (!row) return null;
      const equity = Math.max(0, Math.min(1, Number(row.equity || 0)));
      return {
        equity,
        percent: Math.round(equity * 100),
        label: percent(equity)
      };
    }

    function outsLabel(count) {
      const value = Math.max(0, Math.round(Number(count) || 0));
      const mod100 = value % 100;
      const mod10 = value % 10;
      let word = "аутов";
      if (mod10 === 1 && mod100 !== 11) word = "аут";
      else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) word = "аута";
      return `${value} ${word}`;
    }

    function allInOutsForSeat(table, seat, stageState = allInRunoutStageState(table)) {
      if (!seat || !allInEquityDisplayReady(table) || !allInRunoutShowsEquity(table, stageState)) return null;
      // Like the equity % (which also suppresses during the deal-in window —
      // see allInEquityForSeat), the discrete "X аутов" badge names the cards
      // that lift the underdog into the lead ON THE NEXT card. The previous
      // stage's outs are "outs to THIS card",
      // so keeping them on screen while the card deals in claims outs for a card
      // that is already on the felt — e.g. a flop "6 аутов" still showing over a
      // turn ace that paired the board and killed every one of those outs (0).
      // So: suppress the badge during the deal-in window, then read the CURRENT
      // stage directly. The badge reappears with the new street's own outs once
      // the card settles, never lags a card behind, and never spoils the next.
      // Uses the outs-specific window (single-card grace, no multi-card stagger
      // tail — see allInOutsDealWindowMs) so a 3-card flop reveal does not bury
      // the flop outs for all but ~35ms of the stage.
      if (stageState?.outsDealing) return null;
      const board = Array.isArray(stageState?.stage?.board) ? stageState.stage.board : [];
      if (board.length >= 5) return null;
      const rows = Array.isArray(stageState?.stage?.outs) ? stageState.stage.outs : [];
      const row = rows.find((entry) => Number(entry?.seatId) === Number(seat.id));
      if (!row || row.ahead) return null;
      const count = Math.max(0, Math.round(Number(row.outs || 0)));
      if (count <= 0) return null;
      return { count, label: outsLabel(count) };
    }

    function showdownParticipantName(participant) {
      if (!participant) return "";
      if (participant.isHero) return "Hero";
      return participant.position || participant.name || `Seat ${participant.seatId ?? ""}`.trim();
    }

    function showdownParticipants(table) {
      if (Array.isArray(table?.showdown?.participants) && table.showdown.participants.length) {
        return table.showdown.participants;
      }
      return (table?.seats || [])
        .filter((seat) => seat && !seat.folded && (seat.isHero || seat.revealed))
        .map((seat) => ({
          seatId: seat.id,
          position: seat.position,
          name: seat.name,
          isHero: Boolean(seat.isHero),
          cards: Array.isArray(seat.cards) ? seat.cards.slice(0, 2) : [],
          handName: ""
        }));
    }

    function showdownWinnerParticipants(table) {
      const participants = showdownParticipants(table);
      const winners = Array.isArray(table?.showdown?.winners) ? table.showdown.winners : [];
      return winners
        .map((winner) => participants.find((participant) => Number(participant?.seatId) === Number(winner?.seatId)) || winner)
        .filter(Boolean);
    }

    function showdownPrimaryWinnerParticipant(table) {
      return showdownWinnerParticipants(table)[0] || null;
    }

    function showdownWinnerLabel(table) {
      // Prefer potWinners — the authoritative per-pot award winners — so side-pot
      // co-winners (who win a side pot but not the main/best-hand pot, and are
      // therefore absent from showdown.winners) are still named. Fall back to the
      // best-hand winners when no pot awards were recorded.
      const potWinners = Array.isArray(table?.showdown?.potWinners) ? table.showdown.potWinners : [];
      const winners = potWinners.length
        ? potWinners
        : (Array.isArray(table?.showdown?.winners) ? table.showdown.winners : []);
      if (winners.length > 1) {
        return winners.map(showdownParticipantName).join(" / ") || "Split";
      }
      return showdownParticipantName(winners[0]) || resultTitle(table, table?.result || "Showdown");
    }

    function showdownHandSummary(table, participant = showdownPrimaryWinnerParticipant(table)) {
      const score = Array.isArray(participant?.score) ? participant.score : [];
      const fallback = table?.showdown?.winningHandName || participant?.handName || "";
      const holeCards = Array.isArray(participant?.cards) ? participant.cards : [];
      return formatMadeHandFromScore(score, fallback, holeCards);
    }

    function showdownWinnerStatusText(table) {
      const winner = showdownWinnerLabel(table);
      const participant = showdownPrimaryWinnerParticipant(table);
      const handName = showdownHandSummary(table, participant);
      if (winner && handName) return `${winner}: ${handName}`;
      return winner || handName || "Подсвечиваем пять карт";
    }

    function showdownPotAwardStatusText(table) {
      // Prefer per-seat pot awards so side-pot splits show each winner's own
      // share (e.g. "Hero 30 BB -> SB 40 BB") instead of routing the WHOLE pot
      // to the headline winner — which overstates the awarded amount whenever a
      // side pot goes to a different seat. Fall back to the legacy single-line
      // form only when no pot awards were recorded.
      const potWinners = Array.isArray(table?.showdown?.potWinners)
        ? table.showdown.potWinners.filter((entry) => Number(entry?.amount) > 0)
        : [];
      if (potWinners.length) {
        const parts = potWinners.map((entry) => `${showdownParticipantName(entry)} ${formatAmount(entry.amount)}`);
        return parts.join(" / ");
      }
      const winner = showdownWinnerLabel(table);
      const amount = Number(table?.pot || 0) > 0 ? formatAmount(table.pot) : "";
      if (winner && amount) return `${amount} -> ${winner}`;
      if (winner) return `Банк -> ${winner}`;
      return "Банк уходит победителю";
    }

    function showdownWinningCards(table) {
      const cards = Array.isArray(table?.showdown?.winningCards) && table.showdown.winningCards.length
        ? table.showdown.winningCards
        : Array.isArray(table?.winningCards)
        ? table.winningCards
        : [];
      return cards.slice(0, 5).map(String);
    }

    // Real poker showdown order: last street aggressor reveals first, then
    // clockwise through remaining contesting players. If river was checked
    // through, fall back through previous aggressors, then first contestant.
    function showdownRevealOrder(table) {
      if (!table) return null;
      const isShowdown = table.street === "showdown" || table.status === "showdown";
      if (!isShowdown) return null;
      const contesting = (table.contestingSeatIds || [])
        .map(Number)
        .filter((id) => !Number.isNaN(id));
      if (contesting.length < 2) return null;
      const aggressor = [
        table.streetAggressorSeatId,
        table.previousStreetAggressorSeatId,
        table.preflopAggressorSeatId
      ]
        .map((id) => (id === null || id === undefined ? null : Number(id)))
        .find((id) => id !== null && contesting.includes(id));
      const firstId = aggressor !== undefined && aggressor !== null
        ? aggressor
        : contesting[0];
      return [firstId, ...contesting.filter((id) => id !== firstId)];
    }

    function revealDelayForSeat(table, seat) {
      if (!seat || seat.isHero) return 0;
      const order = showdownRevealOrder(table);
      if (!order) return 0;
      const index = order.indexOf(Number(seat.id));
      if (index < 0) return 0;
      const step = showdownRevealStepDuration(table);
      const startAt = showdownAnimationStartAt(table);
      if (!(startAt > 0)) return index * step;
      return startAt + index * step - now();
    }

    function showdownWinningCardRoleMap(table) {
      const cards = showdownWinningCards(table);
      const participant = showdownPrimaryWinnerParticipant(table);
      const score = Array.isArray(participant?.score) ? participant.score : [];
      const category = Number(score[0]);
      const primary = Number(score[1]);
      const secondary = Number(score[2]);
      const roles = new Map();
      cards.forEach((card) => {
        const rank = cardRankValue(card);
        let role = "kicker";
        if (ALL_CARDS_CORE_CATEGORIES.has(category)) {
          role = "core";
        } else if (PRIMARY_RANK_CORE_CATEGORIES.has(category)) {
          role = rank === primary ? "core" : "support";
        } else if (category === HAND_CATEGORY.TWO_PAIR) {
          role = rank === primary ? "core" : rank === secondary ? "support" : "kicker";
        } else if (category === HAND_CATEGORY.HIGH_CARD) {
          role = rank === primary ? "core" : "support";
        }
        roles.set(String(card), role);
      });
      return roles;
    }

    function showdownWinningCardRole(table, card) {
      if (!table || !card) return false;
      if (table.status !== "showdown") return false;
      if (!showdownWinnerVisible(table)) return false;
      const roles = showdownWinningCardRoleMap(table);
      return roles.get(String(card)) || "";
    }

    function isWinningCard(table, card) {
      return Boolean(showdownWinningCardRole(table, card));
    }

    return {
      allInRunoutStages,
      allInRunoutStageState,
      allInRunoutVisibleBoardLength,
      allInRunoutShowsEquity,
      allInEquityDisplayReady,
      allInRunoutHasEquityStage,
      allInEquityLayoutReady,
      allInEquityForSeat,
      outsLabel,
      allInOutsForSeat,
      showdownWinnerLabel,
      showdownWinnerStatusText,
      showdownHandSummary,
      showdownPotAwardStatusText,
      showdownParticipants,
      showdownParticipantName,
      showdownWinnerParticipants,
      showdownPrimaryWinnerParticipant,
      showdownWinningCards,
      showdownRevealOrder,
      revealDelayForSeat,
      showdownWinningCardRoleMap,
      showdownWinningCardRole,
      isWinningCard
    };
  }

  root.PokerSimulatorShowdownVisuals = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = { model };
})();
