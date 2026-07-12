(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  function avatarColor(seat) {
    const colors = ["#56606b", "#8b7358", "#b83c35", "#7c6f4a", "#5f4f82", "#477399", "#9b7b31", "#404348", "#5a4574"];
    return colors[Number(seat?.id || 0) % colors.length];
  }

  const avatarFiles = Array.from({ length: 12 }, (_, index) =>
    `../avatars/simulator-avatar-${String(index + 1).padStart(2, "0")}.svg`
  );

  function stableHash(value) {
    const text = String(value || "");
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function avatarUrlForSeat(seat) {
    const key = [seat?.name, seat?.position, seat?.id].filter(Boolean).join(":");
    return avatarFiles[stableHash(key) % avatarFiles.length];
  }

  // Skill-tier bucket for villain seat-box coloring (data-bot-tier → CSS
  // green/blue/red). Mirrors the engine's three-tier model: fish=easy,
  // weak-reg=standard, top-reg(pro, incl. nit/GTO)=pro. Hero and real
  // (non-bot) opponents carry no botProfile, so they return "" and stay
  // uncolored — you cannot classify a human by archetype.
  function botTierFromSeat(seat) {
    if (!seat || seat.isHero) return "";
    const profile = seat.botProfile;
    if (!profile) return "";
    const difficulty = String(profile.difficulty || "").toLowerCase();
    if (difficulty === "easy" || difficulty === "loose" || difficulty === "weak") return "easy";
    if (difficulty === "pro" || difficulty === "nitty" || difficulty === "hard" || difficulty === "expert") return "pro";
    if (difficulty === "standard" || difficulty === "public" || difficulty === "normal" || difficulty === "mid" || difficulty === "medium") return "standard";
    // Defensive fallback when difficulty is absent: derive from play style.
    const style = String(profile.style || profile.archetype || "").toLowerCase();
    if (style === "fish" || style === "station") return "easy";
    if (style === "nit") return "pro";
    if (style) return "standard";
    return "";
  }

  function compactProfileText(value, max = 24) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    if (!text) return "";
    if (text.length <= max) return text;
    return `${text.slice(0, Math.max(0, max - 3)).trim()}...`;
  }

  function botProfileSummaryFromSeat(seat) {
    if (!seat || seat.isHero || !seat.isBot) return null;
    const profile = seat.botProfile && typeof seat.botProfile === "object" ? seat.botProfile : null;
    if (!profile) return null;
    const label = compactProfileText(profile.label || profile.style || profile.archetype, 22);
    const archetype = compactProfileText(profile.archetype || profile.style || "", 32);
    const style = compactProfileText(profile.style || profile.archetype || "", 32);
    if (!label && !archetype && !style) return null;
    return { label: label || archetype || style, archetype, style };
  }

  function model(options = {}) {
    const visibleSeatLobbyState = typeof options.visibleSeatLobbyState === "function" ? options.visibleSeatLobbyState : () => "active";
    const canHeroAct = typeof options.canHeroAct === "function" ? options.canHeroAct : () => false;
    const seatVisuallyFolded = typeof options.seatVisuallyFolded === "function" ? options.seatVisuallyFolded : () => false;
    const visibleSeatStack = typeof options.visibleSeatStack === "function" ? options.visibleSeatStack : (_table, seat) => Math.max(0, Number(seat?.stack || 0));
    const seatIsWinner = typeof options.seatIsWinner === "function" ? options.seatIsWinner : () => false;
    const seatPoint = typeof options.seatPoint === "function" ? options.seatPoint : () => ({ x: 50, y: 50 });
    const visibleSeatAction = typeof options.visibleSeatAction === "function" ? options.visibleSeatAction : () => null;
    const seatCardState = typeof options.seatCardState === "function" ? options.seatCardState : () => ({ cards: [], hidden: true, folded: false, showFoldedMuck: false, revealAllIn: false });
    const allInEquityLayoutReady = typeof options.allInEquityLayoutReady === "function" ? options.allInEquityLayoutReady : () => false;
    const allInEquityForSeat = typeof options.allInEquityForSeat === "function" ? options.allInEquityForSeat : () => null;
    const allInOutsForSeat = typeof options.allInOutsForSeat === "function" ? options.allInOutsForSeat : () => null;
    const opponentNoteForSeat = typeof options.opponentNoteForSeat === "function" ? options.opponentNoteForSeat : () => null;
    const renderOpponentNoteButton = typeof options.renderOpponentNoteButton === "function" ? options.renderOpponentNoteButton : () => "";
    const isActionSequenceActive = typeof options.isActionSequenceActive === "function" ? options.isActionSequenceActive : () => false;
    const escapeHtml = typeof options.escapeHtml === "function" ? options.escapeHtml : (value) => String(value ?? "");
    const actionBubbleLabel = typeof options.actionBubbleLabel === "function" ? options.actionBubbleLabel : (action) => action?.label || action?.type || "";
    const revealDelayForSeat = typeof options.revealDelayForSeat === "function" ? options.revealDelayForSeat : () => 0;
    const heroHandLabel = typeof options.heroHandLabel === "function" ? options.heroHandLabel : () => "";
    const renderSeatCards = typeof options.renderSeatCards === "function" ? options.renderSeatCards : () => "";
    const renderHeroFeltBet = typeof options.renderHeroFeltBet === "function" ? options.renderHeroFeltBet : () => "";
    const opponentNoteHasContent = typeof options.opponentNoteHasContent === "function" ? options.opponentNoteHasContent : () => false;
    const seatZone = typeof options.seatZone === "function" ? options.seatZone : () => "mid";
    const seatSlotContext = typeof options.seatSlotContext === "function" ? options.seatSlotContext : () => null;
    const formatAmount = typeof options.formatAmount === "function" ? options.formatAmount : (value) => String(value ?? 0);
    const getLastDealerSeatId = typeof options.getLastDealerSeatId === "function" ? options.getLastDealerSeatId : () => null;
    const showSeatAvatars = typeof options.showSeatAvatars === "function" ? options.showSeatAvatars : () => true;

      function renderSeat(table, seat) {
        const lobbyState = visibleSeatLobbyState(table, seat);
        if (lobbyState === "eliminated") return "";

        const acting = seat.isHero && canHeroAct(table);
        const visuallyFolded = seatVisuallyFolded(table, seat);
        const isSittingOut = lobbyState === "sitting-out";
        const isDisconnected = lobbyState === "disconnected";
        // An open MP chair (pre-hand lobby) — render a dimmed "Свободно"
        // placeholder with no stack/avatar so the felt shows a real N-max table
        // waiting for players. Not a real occupant: it must not read as all-in
        // just because its stack is 0.
        const isVacant = lobbyState === "vacant" || Boolean(seat.vacant);
        const isInactiveLobby = isSittingOut || isDisconnected || isVacant;
        const displayStack = visibleSeatStack(table, seat);
        const allIn = !isInactiveLobby && !visuallyFolded && displayStack <= 0;
        const runoutAllIn = allIn && allInEquityLayoutReady(table);
        const thinking = !seat.isHero && table.status === "playing" && table.busy && Number(table.activeVillain) === Number(seat.id);
        const winner = seatIsWinner(table, seat);
        const point = seatPoint(table, seat.id);
        const slotContext = seatSlotContext(table, seat.id) || {};
        const resolvedZone = slotContext.zone || seatZone(point);
        const slotStyleVars = slotContext.styleVars ? ` ${slotContext.styleVars};` : "";
        const action = visibleSeatAction(table, seat);
        const cardState = seatCardState(table, seat);
        const equityState = allInEquityForSeat(table, seat);
        const outsState = allInOutsForSeat(table, seat);
        const opponentNote = !seat.isHero ? opponentNoteForSeat(seat) : null;
        // Opponent note "+" button hidden for now (UI declutter): it read as a
        // stray object floating on every villain box. Note data still tracked;
        // restore by re-enabling renderOpponentNoteButton here.
        const opponentNoteButton = "";
        // Aggressor halo: last person to bet/raise on the current street gets
        // a subtle gold ring on the seat panel. Helps the player remember
        // who pressured them after the action bubble has faded. Skip while
        // the action cascade is replaying — the halo would jump around as
        // each bet animates in.
        const aggressorSeatId = !isActionSequenceActive(table) ? Number(table?.streetAggressorSeatId ?? -1) : -1;
        const isAggressor = !visuallyFolded && Number(seat.id) === aggressorSeatId && table.status === "playing";
        // Multi-lobby state: in future multi-lobby mode real players may
        // sit out, disconnect, or get eliminated in tournament mode.
        // Engine field `seat.lobbyState` defaults to "active" for bots;
        // lobby layer can set "sitting-out", "disconnected", or
        // "eliminated" via `engine.setSeatLobbyState`. The UI rules
        // here render the indicator regardless of whether multi-lobby is
        // wired — the dimming + badge mean the same thing for bots if a
        // future test mode sits them out.
        const lobbyBadge = isDisconnected
          ? '<span class="seat-action-badge is-fold is-lobby-state">Нет связи</span>'
          : isSittingOut
          ? '<span class="seat-action-badge is-passive is-lobby-state">Ситаут</span>'
          : "";
        const seatBadge = lobbyBadge
          ? lobbyBadge
          : winner
          ? `<span class="seat-action-badge is-aggressive">${table.result?.startsWith("Split") ? "Сплит" : "Победитель"}</span>`
          : thinking
          ? '<span class="seat-action-badge is-passive">Думает</span>'
          : action
          ? `<span class="seat-action-badge is-${escapeHtml(action.tone || "neutral")}">${escapeHtml(actionBubbleLabel(table, { ...action, seatId: seat.id, isHeroAction: seat.isHero }))}</span>`
          : seat.isHero && allIn && table.status === "playing"
          ? '<span class="seat-action-badge is-aggressive">Олл-ин</span>'
          : "";
        // Showdown reveal order (item #15): aggressor first, then clockwise.
        // Each revealed seat gets a CSS delay so opponents flip cards one by
        // one rather than all at once — matches real-client showdown rhythm.
        const revealDelayMs = revealDelayForSeat(table, seat);
        const seatCardStyleVars = [];
        // Apply the var even when negative: a passed-its-turn seat needs a
        // negative animation-delay so the reveal animation lands on its final
        // (visible) frame instead of restarting hidden on the next re-render.
        if (Number.isFinite(revealDelayMs) && revealDelayMs !== 0) seatCardStyleVars.push(`--reveal-delay:${Math.round(revealDelayMs)}ms`);
        if (Number.isFinite(Number(cardState.muckDelayMs))) seatCardStyleVars.push(`--fold-muck-delay:${Math.max(0, Number(cardState.muckDelayMs))}ms`);
        const seatCardsStyle = seatCardStyleVars.length ? ` style="${seatCardStyleVars.join(";")}"` : "";
        const handStrength = seat.isHero && !visuallyFolded ? heroHandLabel(table) : "";
        // Always emit the hero hand-strength row (empty until a made hand
        // exists) so CSS can pre-reserve its height during an all-in — the
        // made-hand label appearing at the flop reveal then fills a reserved
        // row instead of shoving the box content up mid-runout. The empty
        // span collapses to nothing in normal play (.hand-strength:empty).
        const handStrengthHtml = seat.isHero && !visuallyFolded
          ? `<span class="hand-strength">${escapeHtml(handStrength)}</span>`
          : "";
        const seatEquityHtml = equityState
          ? `<span class="seat-equity" style="--seat-equity:${equityState.percent}%"><b>${escapeHtml(equityState.label)}</b></span>`
          : "";
        // Seat avatars removed for now (UI declutter): they rendered
        // inconsistently (dealer/some seats had none) and read as noise. Forced
        // off here regardless of the showSeatAvatars setting; the position badge
        // keeps its plain colored circle + label. Re-enable by restoring the
        // showSeatAvatars(table, seat) read below.
        const avatarVisible = false;
        const seatAvatarVars = avatarVisible
          ? `--avatar-color: ${avatarColor(seat)}; --seat-avatar-image: url('${avatarUrlForSeat(seat)}');`
          : `--avatar-color: ${avatarColor(seat)};`;
        const avatarStyle = avatarVisible
          ? `--avatar-color: ${avatarColor(seat)}; --seat-avatar-image: url('${avatarUrlForSeat(seat)}');`
          : `--avatar-color: ${avatarColor(seat)};`;
        const avatarClass = avatarVisible ? "seat-position has-avatar" : "seat-position";
        // Outs for the player who is behind, shown over the cards while the
        // turn/river are still to come (see allInOutsForSeat).
        const seatOutsHtml = outsState
          ? `<span class="seat-outs" aria-label="Ауты до следующей карты"><b>${escapeHtml(String(outsState.count))}</b> <span class="seat-outs-word">${escapeHtml(outsState.label.replace(/^\d+\s*/, ""))}</span></span>`
          : "";
        // Tint the villain box by bot skill tier (green=фиш/easy,
        // blue=средний рег/standard, red=топ страта/pro). CSS reads
        // data-bot-tier; absent for Hero and real opponents.
        const botTier = botTierFromSeat(seat);
        const botTierAttr = botTier ? ` data-bot-tier="${botTier}"` : "";
        const botProfileSummary = botProfileSummaryFromSeat(seat);
        const botProfileAttrs = botProfileSummary
          ? `${botProfileSummary.archetype ? ` data-bot-archetype="${escapeHtml(botProfileSummary.archetype)}"` : ""}${botProfileSummary.style ? ` data-bot-style="${escapeHtml(botProfileSummary.style)}"` : ""}`
          : "";
        const seatPositionHtml = !isVacant && seat.position
          ? `<span class="${avatarClass}" style="${avatarStyle}" aria-label="${escapeHtml(`Позиция ${seat.position}`)}"><span class="seat-position-label">${escapeHtml(seat.position)}</span></span>`
          : "";
        const numericRoomSeatIndex = Number(seat?.roomSeatIndex);
        const numericSeatId = Number(seat?.id);
        const roomSeatIndex = Number.isFinite(numericRoomSeatIndex)
          ? numericRoomSeatIndex
          : Number.isFinite(numericSeatId) ? numericSeatId : -1;
        const roomSeatAttr = roomSeatIndex >= 0 ? ` data-room-seat-index="${roomSeatIndex}"` : "";
        const vacantSeatAttr = isVacant ? ' data-mp-vacant-seat="true" role="button" tabindex="0" aria-label="Свободное место. Сесть за стол"' : "";
        return `
          <div class="seat seat--${seat.id} seat-zone-${resolvedZone} ${slotContext.mode === "slot-model" ? "seat-slot-model" : ""} ${seat.isHero ? "is-hero" : ""} ${seat.dealer ? "is-dealer" : ""} ${visuallyFolded ? "is-folded" : ""} ${allIn ? "is-all-in" : ""} ${runoutAllIn ? "is-runout-all-in" : ""} ${equityState ? "has-equity" : ""} ${outsState ? "has-outs" : ""} ${acting ? "is-acting" : ""} ${thinking ? "is-thinking" : ""} ${winner ? "is-winner" : ""} ${isAggressor ? "is-aggressor" : ""} ${opponentNoteHasContent(opponentNote) ? "has-opponent-note" : ""} ${isSittingOut ? "is-sitting-out" : ""} ${isDisconnected ? "is-disconnected" : ""} ${isVacant ? "is-vacant" : ""}"${botTierAttr}${botProfileAttrs}${roomSeatAttr}${vacantSeatAttr} style="--seat-left:${point.x}%; --seat-top:${point.y}%;${slotStyleVars}${seatAvatarVars}">
            <div class="seat-cards ${cardState.className}"${seatCardsStyle}>
              ${renderSeatCards(table, seat, cardState)}
              ${seat.isHero ? renderHeroFeltBet(table) : ""}
            </div>
            ${handStrengthHtml}
            ${seatOutsHtml}
            ${seatPositionHtml}
            <div class="seat-panel ${equityState ? "has-equity" : ""}">
              ${opponentNoteButton}
              <span class="seat-main-row"><span class="seat-name">${escapeHtml(seat.name)}</span></span>
              ${isVacant ? "" : `<span class="seat-stack">${escapeHtml(formatAmount(displayStack))}</span>`}
              ${seatEquityHtml}
              ${seat.dealer ? `<span class="dealer-dot${getLastDealerSeatId(table) !== Number(seat.id) ? " is-fresh" : ""}" aria-label="Дилер">D</span>` : ""}
            </div>
            ${seatBadge}
          </div>
        `;
      }

    return { renderSeat, avatarColor, avatarUrlForSeat };
  }

  root.PokerSimulatorSeatRenderer = { model, avatarColor, avatarUrlForSeat };
  if (typeof module !== "undefined" && module.exports) module.exports = { model, avatarColor, avatarUrlForSeat };
})();
