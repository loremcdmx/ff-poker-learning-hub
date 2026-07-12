(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  function fallbackEscapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function fallbackClampIndex(index, length) {
    if (!length) return 0;
    return Math.max(0, Math.min(length - 1, Number(index) || 0));
  }

  function model(options = {}) {
    const windowRef = options.windowRef || root;
    const documentRef = options.documentRef || windowRef.document;
    const replayModel = options.replayModel || {};
    const cardModel = options.cardModel || {};
    const renderCard = typeof options.renderCard === "function"
      ? options.renderCard
      : typeof cardModel.renderCard === "function"
        ? cardModel.renderCard
        : () => "";
    const chipKit = options.chipKit || windowRef.PokerChipKit || null;
    const formatAmount = typeof options.formatAmount === "function" ? options.formatAmount : (value) => String(value ?? 0);
    const formatInlineAmounts = typeof options.formatInlineAmounts === "function" ? options.formatInlineAmounts : (value) => String(value ?? "");
    const escapeHtml = typeof options.escapeHtml === "function" ? options.escapeHtml : fallbackEscapeHtml;
    const clampIndex = typeof options.clampIndex === "function" ? options.clampIndex : replayModel.clampIndex || fallbackClampIndex;
    const replayVisibleEvents = typeof options.replayVisibleEvents === "function" ? options.replayVisibleEvents : replayModel.replayVisibleEvents || (() => []);
    const replayStepView = typeof options.replayStepView === "function" ? options.replayStepView : replayModel.replayStepView || null;
    const replayHandSummary = typeof options.replayHandSummary === "function" ? options.replayHandSummary : replayModel.replayHandSummary || (() => ({ totalPot: 0, winnerAmounts: [] }));
    const replaySnapshot = typeof options.replaySnapshot === "function" ? options.replaySnapshot : replayModel.replaySnapshot || (() => ({ board: [], seats: [], pot: 0 }));
    const replaySeatOrder = typeof options.replaySeatOrder === "function" ? options.replaySeatOrder : replayModel.replaySeatOrder || ((seats) => Array.isArray(seats) ? seats.filter(Boolean) : []);
    const replaySeatSlot = typeof options.replaySeatSlot === "function" ? options.replaySeatSlot : replayModel.replaySeatSlot || ((seat, fallbackIndex = 0) => Number(seat?.id ?? fallbackIndex));
    const replayActorLabel = typeof options.replayActorLabel === "function" ? options.replayActorLabel : replayModel.replayActorLabel || (() => "");
    const replayActorSeat = typeof options.replayActorSeat === "function" ? options.replayActorSeat : replayModel.replayActorSeat || (() => null);
    const replayRevealContext = typeof options.replayRevealContext === "function" ? options.replayRevealContext : replayModel.replayRevealContext || (() => null);
    const replayRevealMap = typeof options.replayRevealMap === "function" ? options.replayRevealMap : replayModel.replayRevealMap || (() => new Map());
    const replayDisplayActionLabel = typeof options.replayDisplayActionLabel === "function" ? options.replayDisplayActionLabel : replayModel.replayDisplayActionLabel || ((_event, _snapshot, fallback = "Раздача") => fallback);
    const replayStreetLabel = typeof options.replayStreetLabel === "function" ? options.replayStreetLabel : replayModel.replayStreetLabel || ((value) => String(value || ""));
    let replayHandListCacheKey = "";
    let replayHandListCacheHtml = "";

    let replayReducedMotionQuery;
    function replayPrefersReducedMotion() {
      // Cache the MediaQueryList (matches stays live); same safe pattern as
      // simulator-action-visuals — avoids re-parsing the media query per call.
      if (typeof windowRef.matchMedia !== "function") return false;
      if (replayReducedMotionQuery === undefined) {
        replayReducedMotionQuery = windowRef.matchMedia("(prefers-reduced-motion: reduce)") || null;
      }
      return Boolean(replayReducedMotionQuery && replayReducedMotionQuery.matches);
    }

    function replayAnimationRoot(replayBody) {
      return replayBody?.querySelector?.("[data-replay-animation-root]")
        || replayBody?.querySelector?.(".replay-felt")
        || null;
    }

    function runReplayAnimationFrame(callback) {
      if (typeof windowRef.requestAnimationFrame === "function") {
        windowRef.requestAnimationFrame(callback);
        return;
      }
      callback();
    }

    function animateReplayAdvance(replayBody, replayDialog, hand, replayIndex) {
      if (!replayDialog?.open || replayPrefersReducedMotion() || typeof replayStepView !== "function") return;
      const events = replayVisibleEvents(hand);
      const activeIndex = clampIndex(replayIndex, events.length);
      const view = replayStepView(hand, events, activeIndex);
      if (!view) return;

      runReplayAnimationFrame(() => {
        if (!replayDialog?.open || replayPrefersReducedMotion()) return;
        const surface = replayAnimationRoot(replayBody);
        if (!surface || typeof surface.querySelectorAll !== "function") return;

        const delta = Array.isArray(view.boardDelta) ? view.boardDelta.length : 0;
        if (delta > 0) {
          const cards = surface.querySelectorAll(".replay-board .poker-deck-card:not(.replay-board-slot)");
          for (let i = Math.max(0, cards.length - delta); i < cards.length; i += 1) {
            cards[i].classList.add("is-fresh");
          }
        }

        const pot = surface.querySelector(".replay-pot");
        if (pot && Number(view.potAfter) > Number(view.potBefore ?? view.potAfter)) {
          pot.classList.add("is-bumped");
        }

        const seatId = events[activeIndex]?.seatId;
        if (view.amountPaid && view.amountPaid > 0 && seatId != null) {
          const betTarget = surface.querySelector(`.replay-bet[data-seat-id="${seatId}"]`) || pot;
          flyReplayChip(surface, surface.querySelector(`.replay-seat[data-seat-id="${seatId}"]`), betTarget, view.amountPaid);
        }
      });
    }

    function flyReplayChip(surface, seatNode, potNode, amount) {
      if (!surface || !seatNode || !potNode || typeof surface.getBoundingClientRect !== "function" || !documentRef?.createElement) return;
      const fr = surface.getBoundingClientRect();
      const sr = seatNode.getBoundingClientRect();
      const pr = potNode.getBoundingClientRect();
      if (!fr.width || !sr.width || !pr.width) return;
      const fromX = sr.left + sr.width / 2 - fr.left;
      const fromY = sr.top + sr.height / 2 - fr.top;
      const toX = pr.left + pr.width / 2 - fr.left;
      const toY = pr.top + pr.height / 2 - fr.top;
      const chip = documentRef.createElement("div");
      chip.className = "replay-chip-fly";
      chip.textContent = formatAmount(amount);
      chip.style.left = `${fromX}px`;
      chip.style.top = `${fromY}px`;
      surface.appendChild(chip);
      if (typeof chip.animate !== "function") {
        windowRef.setTimeout(() => chip.remove(), 600);
        return;
      }
      const dx = toX - fromX;
      const dy = toY - fromY;
      // Parabolic chip-flight arc height (px): scales with vertical travel,
      // clamped to a visible band so short/long hops still arc readably.
      const ARC_Y_MAX = 78;
      const ARC_Y_MIN = 26;
      const ARC_DISTANCE_SCALE = 0.32;
      const ARC_BASE_OFFSET = 24;
      const arcY = Math.min(ARC_Y_MAX, Math.max(ARC_Y_MIN, Math.abs(dy) * ARC_DISTANCE_SCALE + ARC_BASE_OFFSET));
      const anim = chip.animate([
        { transform: "translate3d(-50%, -50%, 0) scale(0.72)", opacity: 0.08 },
        { transform: `translate3d(calc(-50% + ${dx * 0.5}px), calc(-50% + ${dy * 0.42 - arcY}px), 0) scale(1.08)`, opacity: 1, offset: 0.55 },
        { transform: `translate3d(calc(-50% + ${dx}px), calc(-50% + ${dy}px), 0) scale(0.94)`, opacity: 0.9 }
      ], { duration: 620, easing: "cubic-bezier(0.16, 1, 0.3, 1)" });
      anim.onfinish = () => chip.remove();
      anim.oncancel = () => chip.remove();
    }

    function syncReplayTimelineScroll(replayBody) {
      const activeItem = replayBody?.querySelector?.(".replay-hand-item.is-active");
      const handList = activeItem?.closest?.(".replay-hand-list");
      if (activeItem && handList) {
        handList.scrollTop = Math.max(0, activeItem.offsetTop - (handList.clientHeight / 2) + (activeItem.clientHeight / 2));
      }
    }

    function renderReplayHandList(entries, hand) {
      const list = Array.isArray(entries) ? entries : [];
      const key = [
        hand?.sessionId || "",
        hand?.handNo || "",
        hand?.tableId || "",
        list.length,
        ...list.map((entry) => [entry.no, entry.tableId, entry.combo, entry.result, entry.outcome].join(":"))
      ].join("|");
      if (key === replayHandListCacheKey) return replayHandListCacheHtml;
      replayHandListCacheKey = key;
      replayHandListCacheHtml = list.length
        ? list.map((entry) => renderReplayHandItem(entry, hand)).join("")
        : '<div class="replay-step is-empty"><b>empty</b><span>Сыгранных раздач пока нет.</span><small></small></div>';
      return replayHandListCacheHtml;
    }

    function renderReplay(hand, options = {}) {
      const actionI18n = root.PokerSimulatorActionI18n || {};
      const localizeActionText = typeof actionI18n.localizeActionText === "function" ? actionI18n.localizeActionText : (value) => value;
      const actions = replayVisibleEvents(hand);
      const replayIndex = Number(options.replayIndex ?? 0);
      const replayPlaying = Boolean(options.replayPlaying);
      const activeIndex = clampIndex(replayIndex, actions.length);
      const handSummary = replayHandSummary(hand);
      const summary = [
        `#${hand?.handNo}`,
        hand?.spot?.title || "",
        hand?.combo || "",
        `${formatAmount(handSummary.totalPot ?? hand?.pot ?? 0)} Pot`,
        ...(Array.isArray(handSummary.potBreakdown) && handSummary.potBreakdown.length
          ? handSummary.potBreakdown
          : handSummary.winnerAmounts.map((winner) => `${winner.label} ${formatAmount(winner.amount)}`)),
        hand?.result || ""
      ].filter(Boolean);
      const activeEvent = actions[activeIndex] || actions[actions.length - 1] || null;
      const snapshot = replaySnapshot(hand, activeEvent);
      const progress = actions.length > 1 ? Math.round((activeIndex / (actions.length - 1)) * 100) : 100;
      const entries = Array.isArray(options.entries) ? options.entries : [];
      return `
        <div class="replay-shell">
          <section class="replay-stage" aria-label="Визуальный повтор раздачи">
            <div class="replay-summary">
              <div class="replay-hand-title">
                <span>${hand?.handNo ? `HD${escapeHtml(String(hand.handNo))}` : ""}</span>
                <strong class="replay-action-line">${replayActionLineHtml(hand, activeEvent, snapshot, hand?.result || "Раздача")}</strong>
              </div>
              <div class="replay-pills">
                ${summary.slice(1).map((item) => `<span class="stat-pill">${escapeHtml(formatInlineAmounts(item))}</span>`).join("")}
              </div>
            </div>
            ${renderReplayVisual(hand, activeEvent, snapshot)}
            <div class="replay-now">
              <div>
                <span class="replay-kicker">${escapeHtml(replayStreetLabel(activeEvent?.street || snapshot.street || hand?.status))} · ${escapeHtml(activeEvent?.phase || "snapshot")}</span>
                <strong class="replay-action-line">${replayActionLineHtml(hand, activeEvent, snapshot, hand?.result || "Раздача")}</strong>
              </div>
              <span class="replay-pot-pill">Банк ${escapeHtml(formatAmount(snapshot.pot ?? activeEvent?.pot ?? hand?.pot ?? 0))}</span>
            </div>
            ${renderReplayStreetGrid(hand, actions, activeIndex)}
            <div class="replay-controls">
              <button class="ghost-button replay-nav-button" type="button" data-replay-nav="prev" ${activeIndex <= 0 ? "disabled" : ""} aria-label="Предыдущий шаг">‹</button>
              <button class="primary-button replay-play-button" type="button" data-replay-nav="play" ${actions.length <= 1 ? "disabled" : ""} aria-label="${replayPlaying ? "Пауза" : "Старт"}">${replayPlaying ? "Ⅱ" : "▶"}</button>
              <button class="ghost-button replay-nav-button" type="button" data-replay-nav="next" ${activeIndex >= actions.length - 1 ? "disabled" : ""} aria-label="Следующий шаг">›</button>
              <span class="replay-step-counter">Шаг <b>${actions.length ? activeIndex + 1 : 0}</b> из ${actions.length}</span>
            </div>
            <div class="replay-progress" aria-hidden="true"><span style="width:${progress}%"></span></div>
          </section>
          <aside class="replay-timeline replay-hand-list-panel" aria-label="Сыгранные раздачи">
            <div class="replay-timeline-head">
              <strong>My Cards</strong>
              <strong>Winner</strong>
              <span>Pot</span>
            </div>
            <div class="replay-hand-list">
              ${renderReplayHandList(entries, hand)}
            </div>
          </aside>
        </div>
      `;
    }

    const REPLAY_STREET_GRID = [
      { key: "blinds", label: "Blinds (Ante)" },
      { key: "preflop", label: "Pre-Flop" },
      { key: "flop", label: "Flop" },
      { key: "turn", label: "Turn" },
      { key: "river", label: "River" }
    ];

    function replayGridStreetKey(event, hand) {
      const street = String(event?.street || event?.state?.street || "").toLowerCase();
      const label = String(event?.label || "");
      if (street === "preflop" && /\b(small blind|big blind|ante)\b/i.test(label)) return "blinds";
      if (event?.phase === "chips" && street === "preflop") return "blinds";
      if (["preflop", "flop", "turn", "river"].includes(street)) return street;
      if (street === "showdown" || event?.phase === "result") {
        return Array.isArray(hand?.board) && hand.board.length >= 5 ? "river" : "preflop";
      }
      return "";
    }

    function replayGridShouldShowEvent(events, event, index) {
      if (!event || event.phase === "street") return false;
      if (event.phase !== "chips") return true;
      const next = Array.isArray(events) ? events[index + 1] : null;
      return !(next?.phase === "action"
        && Number(next?.seatId) === Number(event?.seatId)
        && String(next?.street || "") === String(event?.street || ""));
    }

    function replayGridPotForStreet(events, key, hand) {
      const last = events
        .filter((event) => replayGridStreetKey(event, hand) === key && Number.isFinite(Number(event?.pot ?? event?.state?.pot)))
        .slice(-1)[0];
      const amount = Number(last?.pot ?? last?.state?.pot ?? (key === "river" ? hand?.pot : 0));
      return Number.isFinite(amount) && amount > 0 ? formatAmount(amount) : "";
    }

    function replayGridEventClass(event, index, activeIndex, snapshot = null) {
      const classes = ["replay-street-event"];
      if (index === activeIndex) classes.push("is-active");
      const phase = String(event?.phase || "");
      const tone = String(event?.tone || "");
      if (phase === "result") classes.push("is-result");
      if (phase === "chips") classes.push("is-blind");
      if (phase === "action" && replayActorSeat(event, snapshot)?.isHero) classes.push("is-hero-action");
      if (tone) classes.push(`is-${tone}`);
      return classes.join(" ");
    }

    function replayGridEventHtml(hand, event, index, activeIndex) {
      const snapshot = replaySnapshot(hand, event);
      const actor = replayActorLabel(event, snapshot);
      const label = replayGridActionLabel(hand, event, snapshot);
      const winnerBoard = event?.phase === "result" && Array.isArray(hand?.showdown?.winningCards)
        ? `<span class="replay-street-board">${hand.showdown.winningCards.slice(0, 5).map((card) => renderCard(card, { mini: true, silent: true })).join("")}</span>`
        : "";
      return `
        <span class="${replayGridEventClass(event, index, activeIndex, snapshot)}">
          ${actor ? `<b>${escapeHtml(actor)}</b>` : ""}
          <span>${escapeHtml(formatInlineAmounts(label))}</span>
          ${winnerBoard}
        </span>
      `;
    }

    function replayGridActionLabel(hand, event, snapshot) {
      const fallback = event?.label || hand?.result || "Hand";
      let label = String(fallback || "");
      const actor = replayActorLabel(event, snapshot);
      if (event?.phase !== "result" && actor) {
        const prefix = `${actor} `;
        if (label.toLowerCase().startsWith(prefix.toLowerCase())) {
          label = label.slice(prefix.length);
        }
      }
      return formatInlineAmounts(label)
        .replace(/\bSmall blind\s+/gi, "SB ")
        .replace(/\bBig blind\s+/gi, "Blind ")
        .replace(/\bRaise to\s+/gi, "Raise ")
        .replace(/\bRaise\s+all[-\s]?in\s+/gi, "All-in ")
        .replace(/\bAll-in\b/g, "All-in")
        .replace(/\s+/g, " ")
        .trim();
    }

    function renderReplayStreetGrid(hand, visibleEvents, activeIndex) {
      const rawEvents = Array.isArray(hand?.actions) && hand.actions.length ? hand.actions : visibleEvents;
      const events = Array.isArray(rawEvents) ? rawEvents : [];
      const displayEvents = events
        .map((event, index) => ({ event, index }))
        .filter(({ event, index }) => replayGridShouldShowEvent(events, event, index));
      const potEvents = displayEvents.map(({ event }) => event);
      const columns = REPLAY_STREET_GRID.map((column) => {
        const columnEvents = displayEvents
          .filter(({ event }) => replayGridStreetKey(event, hand) === column.key)
          .slice(-6);
        const potLabel = replayGridPotForStreet(potEvents, column.key, hand);
        return `
          <section class="replay-street-column replay-street-${column.key}" aria-label="${escapeHtml(column.label)}">
            <header>
              <strong>${escapeHtml(column.label)}</strong>
              ${potLabel ? `<span>${escapeHtml(potLabel)}</span>` : ""}
            </header>
            <div class="replay-street-events">
              ${columnEvents.length ? columnEvents.map(({ event, index }) => replayGridEventHtml(hand, event, index, activeIndex)).join("") : '<span class="replay-street-event is-empty">—</span>'}
            </div>
          </section>
        `;
      });
      return `<div class="replay-street-grid" aria-label="Ход раздачи по улицам">${columns.join("")}</div>`;
    }

    const REPLAY_SEAT_SLOT_CW = [0, 6, 5, 4, 3, 2, 8, 1, 7];

    function replaySeatLayout(seats) {
      const list = Array.isArray(seats) ? seats.filter(Boolean) : [];
      const ordered = list.slice().sort((a, b) => {
        const ia = REPLAY_SEAT_SLOT_CW.indexOf(replaySeatSlot(a, 0));
        const ib = REPLAY_SEAT_SLOT_CW.indexOf(replaySeatSlot(b, 0));
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      });
      const n = Math.max(1, ordered.length);
      const round1 = (v) => Math.round(v * 10) / 10;
      const map = new Map();
      ordered.forEach((seat, k) => {
        const ang = (90 + (k * 360 / n)) * Math.PI / 180;
        const hero = Boolean(seat?.isHero);
        const sin = Math.sin(ang);
        const cy = 54;
        const betCy = 54;
        const rx = hero ? 41 : 47;
        const ry = hero ? 34 : 46;
        const brx = 34;
        const bry = 26;
        const betX = hero ? 68 : round1(50 + brx * Math.cos(ang));
        const betY = round1(betCy + bry * Math.sin(ang));
        const seatY = !hero && sin < -0.94 ? 4.8 : round1(cy + ry * sin);
        map.set(Number(seat?.id), {
          seatX: round1(50 + rx * Math.cos(ang)),
          seatY,
          betX,
          betY
        });
      });
      return map;
    }

    const REPLAY_CHIP_DENOMS = [
      { v: 100, c: "#3a3f4a", e: "#0e1118" },
      { v: 25, c: "#54bd7e", e: "#2b8a50" },
      { v: 10, c: "#5b86d0", e: "#2f56a0" },
      { v: 5, c: "#e0556a", e: "#a4263b" },
      { v: 1, c: "#dad8dd", e: "#9d9ba1" },
      { v: 0.5, c: "#cbaae2", e: "#9a6fc0" }
    ];

    function replayChipStack(amount) {
      if (chipKit && typeof chipKit.renderChip === "function") {
        const normalized = Math.max(0, Math.round((Number(amount) || 0) * 2) / 2);
        const breakdown = typeof chipKit.breakdownAmount === "function"
          ? chipKit.breakdownAmount(normalized, { maxVisual: 3, includeHalf: true })
          : { chips: normalized > 0 ? [normalized] : [0.5] };
        const values = Array.isArray(breakdown.chips) && breakdown.chips.length ? breakdown.chips : [0.5];
        return `
          <span class="poker-chip-stack denomination-chip-stack replay-chipstack" aria-label="${escapeHtml(`фишки ${formatAmount(amount)}`)}">
            ${values.map((value) => chipKit.renderChip(value, { detail: false })).join("")}
          </span>
        `;
      }
      let rem = Math.round((Number(amount) || 0) * 2) / 2;
      const discs = [];
      for (const d of REPLAY_CHIP_DENOMS) {
        while (rem >= d.v - 1e-9 && discs.length < 6) {
          discs.push(d);
          rem = Math.round((rem - d.v) * 2) / 2;
        }
      }
      if (!discs.length) discs.push(REPLAY_CHIP_DENOMS[5]);
      const inner = discs.map((d, i) => `<span class="replay-disc" style="bottom:${i * 7}px; background: radial-gradient(circle at 38% 30%, rgba(255,255,255,.5), transparent 56%), radial-gradient(circle at 50% 55%, ${d.c}, ${d.e} 74%); box-shadow: 0 0 0 2px ${d.e}, 0 2px 4px rgba(0,0,0,.55), inset 0 0 0 3px rgba(255,255,255,.12);"></span>`).join("");
      return `<span class="replay-chipstack" style="height:${20 + (discs.length - 1) * 7}px;">${inner}</span>`;
    }

    function renderReplayBet(seat, pos) {
      const style = pos ? `left:${pos.betX}%; top:${pos.betY}%` : "";
      return `<div class="replay-bet" data-seat-id="${Number(seat?.id)}" style="${style}">${replayChipStack(seat?.bet)}<span class="replay-bet-amt">${escapeHtml(formatAmount(seat?.bet))}</span></div>`;
    }

    function replayDealerSeat(seats) {
      const list = Array.isArray(seats) ? seats.filter(Boolean) : [];
      return list.find((seat) => seat?.dealer || seat?.isDealer || seat?.button || seat?.isButton)
        || list.find((seat) => String(seat?.position || "").toUpperCase() === "BTN")
        || (list.length === 2 ? list.find((seat) => String(seat?.position || "").toUpperCase() === "SB") : null)
        || null;
    }

    function renderReplayDealerButton(seats, layout) {
      const seat = replayDealerSeat(seats);
      if (!seat) return "";
      const pos = layout.get(Number(seat?.id));
      if (!pos) return "";
      const x = seat?.isHero
        ? Math.round((pos.seatX - 12) * 10) / 10
        : Math.round((50 + ((pos.seatX - 50) * 0.72)) * 10) / 10;
      const y = seat?.isHero
        ? Math.round((pos.seatY - 2) * 10) / 10
        : Math.round((54 + ((pos.seatY - 54) * 0.72)) * 10) / 10;
      return `<span class="replay-dealer-button" style="left:${x}%; top:${y}%;" aria-label="Dealer">D</span>`;
    }

    function renderReplayVisual(hand, event, snapshot = replaySnapshot(hand, event)) {
      const board = Array.isArray(snapshot.board) && snapshot.board.length ? snapshot.board : [];
      const seats = replaySeatOrder(snapshot.seats);
      const activeSeatId = event?.seatId ?? snapshot.activeVillain;
      const reveal = replayRevealContext(hand, event);
      const botCardMap = replayBotCardMap(hand);
      const heroSeatSnapshot = seats.find((seat) => seat?.isHero) || null;
      const heroCards = Array.isArray(heroSeatSnapshot?.cards) && heroSeatSnapshot.cards.length
        ? heroSeatSnapshot.cards
        : Array.isArray(hand?.heroHand)
        ? hand.heroHand
        : [];
      const isWinningCard = (card) => Boolean(reveal?.winningCards?.has(String(card)));
      const layout = replaySeatLayout(snapshot.seats);
      return `
        <div class="replay-visual">
          <div class="replay-felt" data-replay-animation-root>
            <div class="replay-pot">
              ${replayChipStack(snapshot.pot ?? event?.pot ?? hand?.pot ?? 0)}
              <span class="replay-pot-label">Банк</span>
              <b>${escapeHtml(formatAmount(snapshot.pot ?? event?.pot ?? hand?.pot ?? 0))}</b>
            </div>
            <div class="replay-board">
              ${board.length ? board.map((card) => renderCard(card, { board: true, winning: isWinningCard(card) })).join("") + Array.from({ length: Math.max(0, 5 - board.length) }, () => '<span class="poker-deck-card replay-board-slot" aria-hidden="true"></span>').join("") : '<span class="replay-empty-board">Префлоп</span>'}
            </div>
            ${seats.map((seat) => renderReplaySeat(seat, layout.get(Number(seat?.id)), heroCards, activeSeatId, reveal, botCardMap)).join("")}
            ${renderReplayDealerButton(snapshot.seats, layout)}
            ${seats.filter((seat) => Number(seat?.bet) > 0).map((seat) => renderReplayBet(seat, layout.get(Number(seat?.id)))).join("")}
          </div>
        </div>
      `;
    }

    function replayBotCardMap(hand) {
      const map = replayRevealMap(hand);
      return map instanceof Map ? map : new Map();
    }

    function replayBotSeatCards(seat, revealed) {
      const revealCards = Array.isArray(revealed?.cards) ? revealed.cards.filter(Boolean) : [];
      if (revealCards.length) return revealCards;
      return Array.isArray(seat?.cards) ? seat.cards.filter(Boolean) : [];
    }

    function renderReplaySeat(seat, pos, heroCards, activeSeatId, reveal = null, botCardMap = null) {
      const active = Number(seat.id) === Number(activeSeatId);
      const revealed = reveal?.map?.get(Number(seat.id)) || null;
      const botCardReveal = !seat.isHero ? (revealed || botCardMap?.get(Number(seat.id)) || null) : null;
      const isWinner = Boolean(reveal?.winners?.has(Number(seat.id)));
      let cardsHtml;
      if (seat.isHero) {
        const hc = Array.isArray(heroCards) && heroCards.length ? heroCards : (Array.isArray(seat.cards) ? seat.cards : []);
        cardsHtml = `<div class="replay-hole">${hc.length ? hc.map((card) => renderCard(card, { hero: true, winning: Boolean(reveal?.winningCards?.has(String(card))) })).join("") : renderReplayBacks(2)}</div>`;
      } else {
        const shown = replayBotSeatCards(seat, botCardReveal);
        const isPrimaryBotCards = shown.length && !seat.folded;
        const botCardClass = shown.length
          ? `has-bot-cards ${isPrimaryBotCards ? "is-primary-bot-cards" : "is-secondary-bot-cards"}`
          : "";
        const inner = shown.length ? shown.map((card) => renderCard(card, { mini: true, winning: Boolean(reveal?.winningCards?.has(String(card))) })).join("") : (seat.folded ? "" : renderReplayBacks(2));
        cardsHtml = `<div class="replay-seat-cards ${botCardReveal ? "is-revealed" : ""} ${botCardClass}">${inner}</div>`;
      }
      const style = pos ? `left:${pos.seatX}%; top:${pos.seatY}%` : "";
      return `
        <div class="replay-seat ${seat.isHero ? "is-hero" : ""} ${active ? "is-active" : ""} ${seat.folded ? "is-folded" : ""} ${botCardReveal ? "is-revealed" : ""} ${isWinner ? "is-winner" : ""}" data-seat-id="${Number(seat.id)}" style="${style}">
          ${cardsHtml}
          <div class="replay-seat-panel">
            <b>${isWinner ? '<span class="replay-winner-mark" aria-label="Победитель">●</span>' : ""}${escapeHtml(seat.isHero ? "Hero" : seat.position || seat.name || `Seat ${Number(seat.id)}`)}</b>
            <span>${escapeHtml(formatAmount(seat.stack || 0))}</span>
            ${revealed?.handName ? `<small class="replay-seat-hand">${escapeHtml(revealed.handName)}</small>` : ""}
          </div>
        </div>
      `;
    }

    function renderReplayBacks(count) {
      return Array.from({ length: count }, () => '<span class="sim-card-back replay-card-back" aria-label="закрытая карта"></span>').join("");
    }

    function replayActorChipHtml(event, snapshot) {
      const label = replayActorLabel(event, snapshot);
      if (!label) return "";
      const seat = replayActorSeat(event, snapshot);
      const tone = seat?.isHero ? " is-hero" : "";
      return `<span class="replay-actor-chip${tone}">${escapeHtml(label)}</span>`;
    }

    function replayActionLineHtml(hand, event, snapshot, fallback = "Раздача") {
      const label = replayDisplayActionLabel(event, snapshot, fallback);
      return `${replayActorChipHtml(event, snapshot)}<span>${escapeHtml(label)}</span>`;
    }

    function renderReplayHandItem(entry, currentHand) {
      const actionI18n = root.PokerSimulatorActionI18n || {};
      const localizeActionText = typeof actionI18n.localizeActionText === "function" ? actionI18n.localizeActionText : (value) => value;
      const heroCards = Array.isArray(entry?.handHistory?.heroHand) ? entry.handHistory.heroHand : [];
      const hand = entry?.handHistory && typeof entry.handHistory === "object" ? entry.handHistory : {};
      const potValue = Number(hand.pot ?? entry?.pot);
      const winnerLabel = Array.isArray(hand?.showdown?.winners) && hand.showdown.winners[0]
        ? String(hand.showdown.winners[0].label || hand.showdown.winners[0].name || "Winner")
        : entry.outcome === "win"
          ? "Hero"
          : entry.outcome === "split"
            ? "Split"
            : String(entry.result || hand.result || "Result");
      const active = currentHand
        && Number(entry.no) === Number(currentHand.handNo)
        && Number(entry.tableId) === Number(currentHand.tableId);
      const cardsHtml = heroCards.length
        ? heroCards.map((card) => renderCard(card, { mini: true, hero: true })).join("")
        : renderReplayBacks(2);
      const outcomeClass = entry.outcome === "win" ? "is-win" : entry.outcome === "split" ? "is-split" : "is-loss";
      return `
        <button class="replay-hand-item ${outcomeClass} ${active ? "is-active" : ""}" type="button" data-replay-hand="${entry.no}" data-replay-table="${entry.tableId}" aria-label="Раздача ${entry.no}: ${escapeHtml(localizeActionText(formatInlineAmounts(entry.result || "")))}">
          <span class="replay-hand-item-cards">${cardsHtml}</span>
          <span class="replay-hand-item-meta replay-hand-item-winner">
            <b>${escapeHtml(localizeActionText(formatInlineAmounts(winnerLabel)))}</b>
            <small>#${escapeHtml(String(entry.no))}${entry.combo ? ` · ${escapeHtml(entry.combo)}` : ""}</small>
          </span>
          <span class="replay-hand-item-pot">${Number.isFinite(potValue) && potValue > 0 ? escapeHtml(formatAmount(potValue)) : "—"}</span>
        </button>
      `;
    }

    return {
      renderReplay,
      animateReplayAdvance,
      syncReplayTimelineScroll
    };
  }

  root.PokerSimulatorReplayUi = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorReplayUi;
})();
