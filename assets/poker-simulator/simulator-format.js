(function () {
  const root = typeof window !== "undefined" ? window : globalThis;
  const chipScale = 100;

  function finiteNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function amountToChips(value) {
    return Math.max(0, Math.round(finiteNumber(value, 0) * chipScale));
  }

  function formatBb(value, engine) {
    return engine && typeof engine.formatBb === "function"
      ? engine.formatBb(value)
      : `${finiteNumber(value, 0)} BB`;
  }

  function formatBlindMultiplier(value) {
    const number = finiteNumber(value, 1);
    return String(Math.round(number * 10) / 10).replace(/\.0$/, "");
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function cssEscape(value, cssApi = root.CSS) {
    if (cssApi && typeof cssApi.escape === "function") return cssApi.escape(String(value));
    return String(value).replace(/["\\]/g, "\\$&");
  }

  function amountFormatter({ engine, chipKit, getAmountMode } = {}) {
    const amountMode = () => String(typeof getAmountMode === "function" ? getAmountMode() : "bb");
    const api = {
      amountToChips,
      formatBb: (value) => formatBb(value, engine),
      formatAmount(value) {
        return amountMode() === "chips" ? String(amountToChips(value)) : api.formatBb(value);
      },
      formatCompactAmount(value) {
        return api.formatAmount(value).replace(/\s*BB\b/g, "");
      },
      formatBlindMultiplier,
      formatInlineAmounts(value) {
        const text = String(value || "");
        if (amountMode() !== "chips") return text;
        return text.replace(/(\d+(?:\.\d+)?)\s*BB\b/g, (_, amount) => String(amountToChips(Number(amount))));
      },
      chipBreakdown(value, maxVisual = 12) {
        const chips = amountToChips(value);
        const breakdown = chipKit && typeof chipKit.breakdownAmount === "function"
          ? chipKit.breakdownAmount(chips, { maxVisual, includeHalf: false })
          : { chips: [], overflow: 0 };
        return {
          values: breakdown.chips,
          overflow: breakdown.overflow,
          chips
        };
      }
    };
    return api;
  }

  root.PokerSimulatorFormat = {
    chipScale,
    amountToChips,
    formatBb,
    formatBlindMultiplier,
    escapeHtml,
    cssEscape,
    amountFormatter
  };
})();
