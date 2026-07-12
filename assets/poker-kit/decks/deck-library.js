(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  const RANK_ORDER = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
  const SUIT_ORDER = ["h", "d", "c", "s"];
  const RANK_DISPLAY = { A: "A", K: "K", Q: "Q", J: "J", T: "T", 9: "9", 8: "8", 7: "7", 6: "6", 5: "5", 4: "4", 3: "3", 2: "2" };
  const SUIT_META = {
    h: { key: "h", symbol: "♥", file: "hearts", red: true },
    d: { key: "d", symbol: "♦", file: "diamonds", red: true },
    c: { key: "c", symbol: "♣", file: "clubs", red: false },
    s: { key: "s", symbol: "♠", file: "spades", red: false }
  };
  const SUIT_ALIASES = {
    h: "h",
    H: "h",
    "♥": "h",
    heart: "h",
    hearts: "h",
    d: "d",
    D: "d",
    "♦": "d",
    diamond: "d",
    diamonds: "d",
    c: "c",
    C: "c",
    "♣": "c",
    club: "c",
    clubs: "c",
    s: "s",
    S: "s",
    "♠": "s",
    spade: "s",
    spades: "s"
  };
  const RANK_ALIASES = { 10: "T", t: "T", T: "T", j: "J", q: "Q", k: "K", a: "A" };
  const PIP_POSITIONS = {
    2: [[50, 20, 0], [50, 80, 180]],
    3: [[50, 20, 0], [50, 50, 0], [50, 80, 180]],
    4: [[32, 20, 0], [68, 20, 0], [32, 80, 180], [68, 80, 180]],
    5: [[32, 20, 0], [68, 20, 0], [50, 50, 0], [32, 80, 180], [68, 80, 180]],
    6: [[32, 18, 0], [68, 18, 0], [32, 50, 0], [68, 50, 0], [32, 82, 180], [68, 82, 180]],
    7: [[32, 17, 0], [68, 17, 0], [50, 34, 0], [32, 50, 0], [68, 50, 0], [32, 83, 180], [68, 83, 180]],
    8: [[32, 17, 0], [68, 17, 0], [50, 34, 0], [32, 50, 0], [68, 50, 0], [50, 66, 180], [32, 83, 180], [68, 83, 180]],
    9: [[32, 15, 0], [68, 15, 0], [32, 34, 0], [68, 34, 0], [50, 50, 0], [32, 66, 180], [68, 66, 180], [32, 85, 180], [68, 85, 180]],
    10: [[32, 14, 0], [68, 14, 0], [50, 29, 0], [32, 38, 0], [68, 38, 0], [32, 62, 180], [68, 62, 180], [50, 71, 180], [32, 86, 180], [68, 86, 180]]
  };

  const CARD_BACKS = {
    bicycleRider: "assets/poker-kit/decks/backs/bicycle-rider.png",
    ornateRed: "assets/poker-kit/decks/backs/ornate-red.svg",
    ornateBlue: "assets/poker-kit/decks/backs/ornate-blue.svg"
  };
  const LOCAL_CLASSIC_DIR = "assets/poker-kit/decks/classic-english";
  const imageCache = new Map();
  const fullDeck = RANK_ORDER.flatMap((rank) => SUIT_ORDER.map((suit) => `${rank}${suit}`));

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

  function normalizeRank(value) {
    const raw = String(value).trim();
    return RANK_ALIASES[raw] || raw.toUpperCase();
  }

  function parseCard(card) {
    if (Array.isArray(card)) {
      const rank = normalizeRank(card[0]);
      const suitKey = SUIT_ALIASES[String(card[1]).trim()];
      if (!RANK_DISPLAY[rank] || !suitKey) throw new Error(`Invalid card: ${card.join("")}`);
      return { rank, ...SUIT_META[suitKey] };
    }

    const raw = String(card).trim();
    const rankPart = raw.length === 3 ? raw.slice(0, 2) : raw.slice(0, -1);
    const suitPart = raw.slice(raw.length === 3 ? 2 : -1);
    const rank = normalizeRank(rankPart);
    const suitKey = SUIT_ALIASES[suitPart];
    if (!RANK_DISPLAY[rank] || !suitKey) throw new Error(`Invalid card: ${raw}`);
    return { rank, ...SUIT_META[suitKey] };
  }

  function cardImageUrl(card) {
    const parsed = parseCard(card);
    return `${LOCAL_CLASSIC_DIR}/${parsed.rank}${parsed.key}.svg`;
  }

  function preloadImage(url) {
    if (imageCache.has(url)) return imageCache.get(url);
    const ready = new Promise((resolve) => {
      const image = new Image();
      image.decoding = "async";
      image.loading = "eager";
      image.onload = () => {
        if (image.decode) {
          image.decode().then(() => resolve(true)).catch(() => resolve(true));
          return;
        }
        resolve(true);
      };
      image.onerror = () => resolve(false);
      image.src = url;
    });
    imageCache.set(url, ready);
    return ready;
  }

  function warmupDeck(back = CARD_BACKS.ornateRed) {
    return Promise.all([preloadImage(back), ...fullDeck.map((card) => preloadImage(cardImageUrl(card)))]);
  }

  function pipGridMarkup(rank, symbol) {
    const count = rank === "T" ? 10 : Number(rank);
    const positions = PIP_POSITIONS[count] || [];
    return `
      <div class="poker-deck-card__pip-grid">
        ${positions.map(([x, y, rotation]) => `<span class="poker-deck-card__pip" style="--x:${x}%;--y:${y}%;--r:${rotation}deg">${symbol}</span>`).join("")}
      </div>
    `;
  }

  function generatedFaceMarkup(parsed, theme) {
    const rank = RANK_DISPLAY[parsed.rank] || parsed.rank;
    const isCourt = ["K", "Q", "J"].includes(parsed.rank);
    const onlineFace = `
      <div class="poker-deck-card__online-face${isCourt ? " is-court" : ""}">
        <span>${rank}</span>
        <small>${parsed.symbol}</small>
      </div>
    `;
    const classicFace = ["K", "Q", "J"].includes(parsed.rank)
      ? `<div class="poker-deck-card__face" data-rank="${rank}"><span class="poker-deck-card__face-suit">${parsed.symbol}</span></div>`
      : parsed.rank === "A"
        ? `<div class="poker-deck-card__ace" data-suit="${parsed.symbol}">${parsed.symbol}</div>`
        : pipGridMarkup(parsed.rank, parsed.symbol);

    return `
      <div class="poker-deck-card__corner"><span>${rank}</span></div>
      ${["online", "online-four-color"].includes(theme) ? onlineFace : classicFace}
      <div class="poker-deck-card__corner poker-deck-card__corner--bottom"><span>${rank}</span></div>
    `;
  }

  function colorBlockMarkup(rank, symbol) {
    return `
      <span class="poker-deck-card__cb-index poker-deck-card__cb-index--tl" aria-hidden="true"><span>${rank}</span><small>${symbol}</small></span>
      <span class="poker-deck-card__cb-rank">${rank}</span>
      <span class="poker-deck-card__cb-index poker-deck-card__cb-index--br" aria-hidden="true"><span>${rank}</span><small>${symbol}</small></span>
    `;
  }

  function renderCard(card, options = {}) {
    const {
      theme = "image",
      back = false,
      backUrl = CARD_BACKS.ornateRed,
      backStyle = "image",
      mini = false,
      board = false,
      hero = false,
      fourColor = false,
      className = "",
      attributes = ""
    } = options;

    const sizeClass = classNames(
      mini && "poker-deck-card--mini",
      board && "poker-deck-card--board",
      hero && "poker-deck-card--hero"
    );

    if (back) {
      if (backStyle === "trainer-online") {
        return `
          <article class="${classNames("poker-deck-card", "poker-deck-card--back", "poker-deck-card--trainer-online-back", sizeClass, className)}" aria-label="рубашка карты" ${attributes}>
            <span class="poker-deck-card__trainer-back-center" aria-hidden="true"></span>
          </article>
        `;
      }

      return `
        <article class="${classNames("poker-deck-card", "poker-deck-card--image", "poker-deck-card--back", sizeClass, className)}" aria-label="рубашка карты" ${attributes}>
          <img class="poker-deck-card__img" src="${escapeHtml(backUrl)}" alt="рубашка карты" loading="eager" decoding="async" fetchpriority="high">
        </article>
      `;
    }

    let parsed;
    try {
      parsed = parseCard(card);
    } catch (error) {
      // Degrade a malformed/undefined card code to a blank slot instead of
      // throwing — a corrupt imported/replay card shouldn't crash the render.
      return `
        <article class="${classNames("poker-deck-card", "poker-deck-card--image", "poker-deck-card--back", sizeClass, className)}" aria-label="карта недоступна" ${attributes}></article>
      `;
    }
    const label = `${RANK_DISPLAY[parsed.rank] || parsed.rank}${parsed.symbol}`;
    const colorClass = fourColor ? `poker-deck-card--suit-${parsed.key}` : parsed.red ? "poker-deck-card--red" : "";

    if (theme === "color-block") {
      // Whole card flooded with the suit's colour (always four-colour) and just
      // a large rank plus explicit suit glyphs. The fill colour is a fast suit
      // cue, but the glyphs keep training boards unambiguous at small sizes.
      return `
        <article class="${classNames("poker-deck-card", "poker-deck-card--color-block", `poker-deck-card--suit-${parsed.key}`, sizeClass, className)}" data-card="${parsed.rank}${parsed.key}" aria-label="${label}" ${attributes}>
          ${colorBlockMarkup(RANK_DISPLAY[parsed.rank] || parsed.rank, parsed.symbol)}
        </article>
      `;
    }

    if (["online", "online-four-color", "classic-generated"].includes(theme)) {
      const themeClass = {
        "classic-generated": "poker-deck-card--classic-generated"
      }[theme] || "poker-deck-card--online";
      return `
        <article class="${classNames("poker-deck-card", "poker-deck-card--generated", themeClass, sizeClass, colorClass, className)}" data-card="${parsed.rank}${parsed.key}" aria-label="${label}" ${attributes}>
          ${generatedFaceMarkup(parsed, theme)}
        </article>
      `;
    }

    return `
      <article class="${classNames("poker-deck-card", "poker-deck-card--image", sizeClass, colorClass, className)}" data-card="${parsed.rank}${parsed.key}" aria-label="${label}" ${attributes}>
        <img class="poker-deck-card__img" src="${cardImageUrl(card)}" alt="${label}" loading="eager" decoding="async" fetchpriority="${mini ? "low" : "high"}">
      </article>
    `;
  }

  const api = {
    RANK_ORDER,
    SUIT_ORDER,
    RANK_DISPLAY,
    SUIT_META,
    CARD_BACKS,
    fullDeck,
    parseCard,
    cardImageUrl,
    preloadImage,
    warmupDeck,
    renderCard
  };

  root.PokerDeckKit = api;
  if (root.document?.documentElement) {
    root.document.documentElement.dataset.pokerDeckKit = "ready";
  }
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})();
