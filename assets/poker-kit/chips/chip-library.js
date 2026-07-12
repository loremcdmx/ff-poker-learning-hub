(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function classNames(...values) {
    return values.flat().filter(Boolean).join(" ");
  }

  const denominations = [
    { key: "thousand", value: 1000, label: "1k", color: "orange" },
    { key: "five-hundred", value: 500, label: "500", color: "purple" },
    { key: "hundred", value: 100, label: "100", color: "black" },
    { key: "twenty-five", value: 25, label: "25", color: "green" },
    { key: "ten", value: 10, label: "10", color: "blue" },
    { key: "five", value: 5, label: "5", color: "red" },
    { key: "one", value: 1, label: "1", color: "white" },
    { key: "half", value: 0.5, label: "0.5", color: "gold" }
  ];

  const chipThemes = [
    { id: "black", label: "Black", collection: "casino-clay", description: "Single runtime casino clay chip set." }
  ];

  const chipThemeIds = chipThemes.map((theme) => theme.id);

  const colorAliases = {
    orange: 1000,
    yellow: 1000,
    purple: 500,
    black: 100,
    green: 25,
    blue: 10,
    red: 5,
    white: 1,
    gold: 0.5
  };

  const blindStacks = {
    SB: [0.5],
    BB: [0.5, 0.5]
  };

  function resolveDenomination(value = 0.5) {
    const normalized = typeof value === "string" && value in colorAliases ? colorAliases[value] : Number(value);
    return denominations.find((item) => item.value === normalized) || denominations[denominations.length - 1];
  }

  function resolveChipTheme(value = "black") {
    const normalized = String(value || "black").trim().toLowerCase();
    return chipThemes.find((theme) => theme.id === normalized) || chipThemes[0];
  }

  function renderChip(value = 0.5, options = {}) {
    const { className = "", label = "", ariaLabel = "", detail = true } = options;
    const denomination = resolveDenomination(options.value ?? value);
    const visibleLabel = label || denomination.label;
    const aria = ariaLabel
      ? ` aria-label="${escapeHtml(ariaLabel)}"`
      : ` aria-label="${escapeHtml(`фишка ${visibleLabel}`)}"`;
    const chipClasses = classNames(
      "poker-chip",
      `poker-chip--${denomination.key}`,
      `poker-chip--${denomination.color}`,
      detail ? "" : "poker-chip--lite",
      className
    );
    if (!detail) {
      return `<span class="${chipClasses}" data-denomination="${escapeHtml(visibleLabel)}"${aria}></span>`;
    }
    return `<span class="${chipClasses}" data-denomination="${escapeHtml(visibleLabel)}"${aria}><span class="poker-chip__outer-label poker-chip__outer-label--left" aria-hidden="true"></span><span class="poker-chip__outer-label poker-chip__outer-label--right" aria-hidden="true"></span><span class="poker-chip__rim poker-chip__rim--top" aria-hidden="true"></span><span class="poker-chip__brand" aria-hidden="true"></span><span class="poker-chip__emblem" aria-hidden="true"></span><span class="poker-chip__value" aria-hidden="true">${escapeHtml(visibleLabel)}</span><span class="poker-chip__microline" aria-hidden="true"></span><span class="poker-chip__security-ring" aria-hidden="true"></span><span class="poker-chip__serial" aria-hidden="true"></span><span class="poker-chip__rim poker-chip__rim--bottom" aria-hidden="true"></span></span>`;
  }

  function renderChipStack(values = [0.5, 0.5], options = {}) {
    const { className = "", label = "стек фишек", detail = true } = options;
    const chips = values.length ? values : [0.5];
    return `
      <span class="${classNames("poker-chip-stack", className)}" aria-label="${escapeHtml(label)}">
        ${chips.map((value) => renderChip(value, { detail })).join("")}
      </span>
    `;
  }

  function renderChipBarrel(value = 100, options = {}) {
    const { className = "", label = "", ariaLabel = "" } = options;
    const denomination = resolveDenomination(options.value ?? value);
    const visibleLabel = label || denomination.label;
    const rawCount = Number(options.count ?? 9);
    const chipCount = Math.max(4, Math.min(14, Number.isFinite(rawCount) ? Math.round(rawCount) : 9));
    const slices = Array.from({ length: chipCount }, (_, index) => (
      `<span class="poker-chip-barrel__slice" data-denomination="${escapeHtml(visibleLabel)}" style="--slice-index:${index}" aria-hidden="true"></span>`
    )).join("");
    const aria = ariaLabel || `баррель фишек ${visibleLabel}`;
    return `<span class="${classNames("poker-chip-barrel", `poker-chip-barrel--${denomination.key}`, `poker-chip-barrel--${denomination.color}`, className)}" data-denomination="${escapeHtml(visibleLabel)}" style="--barrel-count:${chipCount}" aria-label="${escapeHtml(aria)}">${slices}<span class="poker-chip-barrel__face" aria-hidden="true">${renderChip(denomination.value, { label: visibleLabel, detail: true })}</span></span>`;
  }

  function renderBlind(blind = "SB", options = {}) {
    const blindKey = String(blind).toUpperCase() === "BB" ? "BB" : "SB";
    const label = options.label || (blindKey === "BB"
      ? "большой блайнд: две фишки по 0.5"
      : "малый блайнд: одна фишка 0.5");
    return renderChipStack(blindStacks[blindKey], {
      className: classNames("blind-chip-stack", options.className),
      label,
      detail: options.detail !== false
    });
  }

  function breakdownAmount(amount, options = {}) {
    const { maxVisual = Infinity, includeHalf = true } = options;
    const available = denominations
      .filter((item) => includeHalf || item.value >= 1)
      .sort((a, b) => b.value - a.value);
    const n = Number(amount);
    const roundedAmount = Math.max(0, Math.round((Number.isFinite(n) ? n : 0) * 2) / 2);
    let remaining = roundedAmount;
    const chips = [];
    const HARD_CAP = Number.isFinite(maxVisual) ? maxVisual : 4096;
    let totalCount = 0;
    available.forEach((denomination) => {
      const count = Math.floor((remaining + 0.0001) / denomination.value);
      remaining = Math.round((remaining - count * denomination.value) * 2) / 2;
      totalCount += count;
      const toPush = Math.min(count, Math.max(0, HARD_CAP - chips.length));
      for (let index = 0; index < toPush; index += 1) {
        chips.push(denomination.value);
      }
    });
    return {
      // overflow vs the EFFECTIVE cap (HARD_CAP), not raw maxVisual: with the
      // default maxVisual=Infinity, totalCount - Infinity was always 0 so a huge
      // amount reported overflow:0; total now matches the rounded amount the chips
      // actually represent (they disagreed for 0.1-BB-granular values).
      chips: chips.slice(0, HARD_CAP),
      overflow: Math.max(0, totalCount - HARD_CAP),
      total: roundedAmount
    };
  }

  function renderAmount(amount, options = {}) {
    const { className = "", label = `фишки ${amount}`, maxVisual = 12, includeHalf = true, detail = true } = options;
    const breakdown = breakdownAmount(amount, { maxVisual, includeHalf });
    const chips = breakdown.chips.length ? breakdown.chips : [0.5];
    return `
      <span class="${classNames("poker-chip-stack", className)}" aria-label="${escapeHtml(label)}">
        ${chips.map((value) => renderChip(value, { detail })).join("")}
        ${breakdown.overflow ? `<span class="chip-overflow">+${breakdown.overflow}</span>` : ""}
      </span>
    `;
  }

  function renderDealerButton(options = {}) {
    const { className = "", label = "D" } = options;
    return `<span class="${classNames("poker-dealer-button", className)}" aria-label="баттон дилера">${escapeHtml(label)}</span>`;
  }

  const api = {
    denominations,
    chipThemes,
    chipThemeIds,
    blindStacks,
    breakdownAmount,
    resolveDenomination,
    resolveChipTheme,
    renderChip,
    renderChipStack,
    renderChipBarrel,
    renderBlind,
    renderAmount,
    renderDealerButton
  };

  root.PokerChipKit = api;
  if (root.document?.documentElement) {
    root.document.documentElement.dataset.pokerChipKit = "ready";
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})();
