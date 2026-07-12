(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  // Rank values from engine.parseCardCode: 2..14 (T=10, J=11, Q=12, K=13, A=14).
  const RANK_LABELS = ["", "", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
  const RANK_VALUES_BY_LABEL = { 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, T: 10, J: 11, Q: 12, K: 13, A: 14 };

  function fallbackEscapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function rankLabel(value) {
    return RANK_LABELS[Number(value) || 0] || "";
  }

  function rankPluralGenitive(value) {
    const labels = {
      14: "тузов",
      13: "королей",
      12: "дам",
      11: "валетов",
      10: "десяток",
      9: "девяток",
      8: "восьмёрок",
      7: "семёрок",
      6: "шестёрок",
      5: "пятёрок",
      4: "четвёрок",
      3: "троек",
      2: "двоек"
    };
    return labels[Number(value)] || rankLabel(value);
  }

  function fallbackRankValue(card) {
    const raw = String(card || "").trim().toUpperCase();
    const rank = raw.length === 3 ? raw.slice(0, 2) : raw.slice(0, -1);
    return RANK_VALUES_BY_LABEL[rank === "10" ? "T" : rank] || 0;
  }

  function cardRankValue(card, deckKit = null) {
    try {
      const parsed = deckKit?.parseCard?.(card);
      return RANK_VALUES_BY_LABEL[parsed?.rank] || 0;
    } catch (error) {
      return fallbackRankValue(card);
    }
  }

  function formatMadeHandFromScore(score, fallback = "", holeCards = [], rankValue = fallbackRankValue) {
    if (!Array.isArray(score) || !score.length) return String(fallback || "");
    const [category, ...values] = score.map(Number);
    switch (category) {
      case 0: return `Старшая карта ${rankLabel(values[0])}`;
      case 1: return `Пара ${rankPluralGenitive(values[0])}`;
      case 2: return `Две пары ${rankLabel(values[0])}/${rankLabel(values[1])}`;
      case 3: {
        // Сет = pocket pair hitting its third; otherwise (one hole card +
        // board pair, or board trips) it is Трипс. Default to Сет only when
        // hole cards are unknown.
        const cards = Array.isArray(holeCards) ? holeCards : [];
        const isSet = cards.length ? cards.filter((card) => rankValue(card) === values[0]).length >= 2 : true;
        return `${isSet ? "Сет" : "Трипс"} ${rankPluralGenitive(values[0])}`;
      }
      case 4: return values[0] === 5 ? "Стрит A-5" : `Стрит до ${rankLabel(values[0])}`;
      case 5: return `Флеш от ${rankLabel(values[0])}`;
      case 6: return `Фулл-хаус ${rankLabel(values[0])} на ${rankLabel(values[1])}`;
      case 7: return `Каре ${rankPluralGenitive(values[0])}`;
      case 8: return values[0] === 14 ? "Роял-флеш" : `Стрит-флеш до ${rankLabel(values[0])}`;
      default: return String(fallback || "");
    }
  }

  function model({ deckKit, engine, getDeckTheme, escapeHtml, visibleBoardLength } = {}) {
    const safeEscape = typeof escapeHtml === "function" ? escapeHtml : fallbackEscapeHtml;
    const rankValue = (card) => cardRankValue(card, deckKit);
    const currentDeckTheme = () => String(typeof getDeckTheme === "function" ? getDeckTheme() : "");

    return {
      rankLabel,
      rankPluralGenitive,
      cardRankValue: rankValue,
      formatMadeHandFromScore: (score, fallback = "", holeCards = []) => formatMadeHandFromScore(score, fallback, holeCards, rankValue),
      heroHandLabel(table) {
        if (!table || !engine?.evaluateBest) return "";
        const visible = typeof visibleBoardLength === "function"
          ? visibleBoardLength(table)
          : (Array.isArray(table.board) ? table.board.length : 0);
        if (visible < 3) return "";
        const hero = (table.seats || []).find((seat) => seat.isHero);
        const heroCards = Array.isArray(hero?.cards) && hero.cards.length >= 2
          ? hero.cards
          : (Array.isArray(table.heroHand) ? table.heroHand : []);
        if (heroCards.length < 2) return "";
        const board = (table.board || []).slice(0, visible);
        const combined = [...heroCards, ...board];
        if (combined.length < 5) return "";
        const result = engine.evaluateBest(combined);
        if (!result) return "";
        return formatMadeHandFromScore(result.score, "", heroCards, rankValue);
      },
      renderCard(card, options = {}) {
        if (!deckKit?.renderCard) return `<span>${safeEscape(card)}</span>`;
        const cardRole = options.cardRole || (options.winning ? "winning" : "");
        const showdownRole = ["core", "support", "kicker"].includes(cardRole) ? cardRole : "";
        const attributes = [
          options.silent ? 'aria-hidden="true"' : "",
          options.attributes || ""
        ].filter(Boolean).join(" ");
        const classNames = [
          options.silent ? "is-silent-card" : "",
          cardRole ? "is-winning-card" : "",
          showdownRole ? `is-showdown-${showdownRole}` : ""
        ].filter(Boolean).join(" ");
        const deckTheme = String(options.theme || options.deckTheme || currentDeckTheme());
        return deckKit.renderCard(card, {
          theme: deckTheme,
          board: Boolean(options.board),
          hero: Boolean(options.hero),
          mini: Boolean(options.mini),
          fourColor: deckTheme === "online-four-color",
          className: classNames,
          attributes
        });
      }
    };
  }

  root.PokerSimulatorCards = {
    RANK_LABELS,
    RANK_VALUES_BY_LABEL,
    rankLabel,
    rankPluralGenitive,
    cardRankValue,
    formatMadeHandFromScore,
    model
  };
})();
