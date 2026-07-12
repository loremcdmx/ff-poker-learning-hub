(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  function model(options = {}) {
    const chipKit = options.chipKit || null;
    const chipBreakdown = typeof options.chipBreakdown === "function"
      ? options.chipBreakdown
      : () => ({ values: [], chips: 0 });
    const formatAmount = typeof options.formatAmount === "function" ? options.formatAmount : (value) => String(value ?? 0);
    const formatInlineAmounts = typeof options.formatInlineAmounts === "function" ? options.formatInlineAmounts : (value) => String(value ?? "");
    const escapeHtml = typeof options.escapeHtml === "function" ? options.escapeHtml : (value) => String(value ?? "");
    const actionAnimationHasStarted = typeof options.actionAnimationHasStarted === "function" ? options.actionAnimationHasStarted : () => true;
    const actionI18n = options.actionI18n || root.PokerSimulatorActionI18n || {};
    const localizeActionLabel = typeof actionI18n.localizeActionLabel === "function" ? actionI18n.localizeActionLabel : (value) => value;
    const localizeActionText = typeof actionI18n.localizeActionText === "function" ? actionI18n.localizeActionText : (value) => value;

    function renderDenominationChipStack(value, label) {
      if (!chipKit) return "";
      const breakdown = chipBreakdown(value);
      if (!breakdown.values.length && breakdown.chips <= 0) return "";
      const values = breakdown.values.length ? breakdown.values : [1];
      return `
        <span class="poker-chip-stack denomination-chip-stack" aria-label="${escapeHtml(label)}" title="${breakdown.chips} chips">
          ${values.map((chipValue) => chipKit.renderChip(chipValue, { detail: false })).join("")}
        </span>
      `;
    }

    function renderMiniChipStack(amount, label, context = {}) {
      const seat = context.seat;
      const isSmallBlind = context.table?.street === "preflop" && seat?.blind === "SB" && Number(amount) === 0.5;
      const isBigBlind = context.table?.street === "preflop" && seat?.blind === "BB" && Number(amount) === 1;
      if ((isSmallBlind || isBigBlind) && chipKit?.renderBlind) {
        return chipKit.renderBlind(seat.blind, { className: "denomination-chip-stack", label, detail: false });
      }
      return renderDenominationChipStack(amount, label);
    }

    function renderChipStack(amount) {
      return renderDenominationChipStack(amount, `банк ${formatAmount(amount)}`);
    }

    function renderPotChipStack(amount, className = "") {
      if (!chipKit) return "";
      // Cap the carried-pile motif at 3 visible chips. The denomination stack
      // grows UPWARD (≈1.72×chip tall at 5 chips), which exceeds the БАНК pill's
      // content box at the larger ui-scales (chip 21–25px) — the tower then
      // bloats the pill and spills past its rounded top/bottom caps. 3 chips
      // keep the tower ≈1.36×chip, which stays inside the pill at every scale;
      // the exact amount is still read from the pill's text.
      const breakdown = chipBreakdown(amount, 3);
      if (!breakdown.values.length && breakdown.chips <= 0) return "";
      const values = breakdown.values.length ? breakdown.values : [1];
      const classNames = ["poker-chip-stack", "denomination-chip-stack", "pot-chip-stack", className].filter(Boolean).join(" ");
      return `
        <span class="${escapeHtml(classNames)}" aria-label="${escapeHtml(`банк ${formatAmount(amount)}`)}" title="${breakdown.chips} chips">
          ${values.map((chipValue) => chipKit.renderChip(chipValue, { detail: false })).join("")}
        </span>
      `;
    }

    function compactActionText(value) {
      return localizeActionText(localizeActionLabel(formatInlineAmounts(String(value || "").split(" · ")[0])));
    }

    function actionAnimationLabel(table, item) {
      const seat = table?.seats?.find((candidate) => Number(candidate.id) === Number(item.seatId));
      const actor = seat?.isHero ? `Hero ${seat.position || ""}`.trim() : seat?.position || seat?.name || "";
      return `${actor} ${item.label || ""}`.trim();
    }

    function actionRevealText(table) {
      const labels = (table?.actionAnimations || [])
        .map((item, index) => ({ item, index }))
        .filter(({ index }) => actionAnimationHasStarted(table, index))
        .map(({ item }) => compactActionText(actionAnimationLabel(table, item)))
        .filter(Boolean)
        .slice(-4);
      if (!labels.length) return "";
      return labels.join(" → ");
    }

    return {
      renderDenominationChipStack,
      renderMiniChipStack,
      renderChipStack,
      renderPotChipStack,
      compactActionText,
      actionAnimationLabel,
      actionRevealText
    };
  }

  root.PokerSimulatorRenderSupport = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = { model };
})();
