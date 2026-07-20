(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;
  const RANKS = Object.freeze(["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"]);
  const SUITS = Object.freeze(["c", "d", "h", "s"]);
  const SEATS = Object.freeze(["UTG", "HJ", "CO", "BTN", "SB", "BB"]);
  const CARD_RE = /^[2-9TJQKA][cdhs]$/;

  const ARCHETYPES = Object.freeze([
    { id: "xr-set", family: "checkraise", builder: buildSet, label: "Сет на вэлью", reason: "Сет строит банк уже на флопе и даёт сильную опору блефовой части чек-рейза." },
    { id: "call-middle-pair", family: "call", builder: buildMiddlePair, label: "Средняя пара", reason: "Есть шоудаун-вэлью, но рейз изолирует руку против более сильного продолжения." },
    { id: "fold-air", family: "fold", builder: buildAir, label: "Слабый воздух", reason: "Мало эквити и плохие блокеры: не надо превращать весь воздух в чек-рейз." },
    { id: "xr-combo-draw", family: "checkraise", builder: buildComboDraw, label: "Комбо-дро", reason: "Сильное дро хорошо переживает колл и одновременно выигрывает банк, когда c-bet сдаётся." },
    { id: "call-top-pair", family: "call", builder: buildTopPair, label: "Топ-пара для колла", reason: "Рука достаточно сильна для продолжения, но лучше удерживает блефы соперника в колле." },
    { id: "fold-weak-backdoor", family: "fold", builder: buildWeakBackdoor, label: "Один слабый бэкдор", reason: "Одного далёкого усиления мало: сначала рейзь руки с готовым дро или несколькими путями усиления." },
    { id: "xr-two-pair", family: "checkraise", builder: buildTwoPair, label: "Две пары", reason: "Две пары добирают с топ-пар и дро и естественно входят в вэлью-часть чек-рейза." },
    { id: "call-underpair", family: "call", builder: buildUnderpair, label: "Карманная пара", reason: "Пара ловит широкую маленькую ставку, но не нуждается в превращении в блеф." },
    { id: "thin-gutshot", family: "call", xrMix: true, builder: buildThinGutshot, label: "Гатшот", reason: "Гатшот уже не выбрасываем: колл — нижняя граница продолжения, а чек-рейз можно подмешивать как полублеф." },
    { id: "xr-nut-flush-draw", family: "checkraise", builder: buildNutFlushDraw, label: "Сильное флеш-дро", reason: "Сильное дро сохраняет много эквити после колла и получает немедленную прибыль от фолдов." },
    { id: "call-bottom-pair", family: "call", builder: buildBottomPair, label: "Нижняя пара", reason: "Готовая рука может спокойно реализовать эквити через колл и не обязана поляризовать банк." },
    { id: "call-strong-overcards", family: "call", builder: buildOvercards, label: "Две сильные оверкарты", reason: "Две сильные оверкарты сохраняют достаточно эквити против ставки до полбанка. Колл реализует его без лишнего раздувания банка." },
    { id: "xr-strong-top-pair", family: "checkraise", builder: buildStrongTopPair, label: "Сильная топ-пара", reason: "Верх топ-пар начинает добор и не оставляет диапазон чек-рейза только из сетов и дро." },
    { id: "call-ace-high", family: "call", builder: buildAceHigh, label: "A-high с бэкдорами", reason: "A-high ещё ловит часть воздуха и лучше реализует редкое усиление без раздувания банка." },
    { id: "fold-disconnected", family: "fold", builder: buildDisconnected, label: "Несвязанный воздух", reason: "Нет пары, готового дро или полезной связности — дисциплинированный пас сохраняет качество рейзов." },
    { id: "xr-oesd", family: "checkraise", builder: buildOesd, label: "Двустороннее стрит-дро", reason: "OESD имеет понятный план после колла и превращает фолд-эквити в дополнительную прибыль." }
  ]);

  const READS = Object.freeze([
    {
      pct: 49,
      label: "Учебный рид · фолдит обычно",
      copy: "У c-bet есть фолды на рейз. Ищи сильное вэлью и лучшие дро, но не рейзь весь диапазон."
    },
    {
      pct: 57,
      label: "Учебный рид · часто фолдит",
      copy: "Соперник часто сдаётся на чек-рейз. Это добавляет фолд-эквити, но слабый воздух всё равно уступает хорошим кандидатам."
    },
    {
      pct: 42,
      label: "Учебный рид · скорее липкий",
      copy: "Даже липкий соперник иногда выбрасывает, но после колла нужен план: ценнее сильные руки и живые дро."
    }
  ]);

  function hashSeed(value) {
    const text = String(value == null ? "" : value);
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function randomSeed() {
    if (root.crypto && typeof root.crypto.getRandomValues === "function") {
      const buffer = new Uint32Array(1);
      root.crypto.getRandomValues(buffer);
      return buffer[0] >>> 0;
    }
    return (Date.now() ^ Math.floor(Math.random() * 0x100000000)) >>> 0;
  }

  function mulberry32(seed) {
    let value = seed >>> 0;
    return function randomUnit() {
      value = (value + 0x6D2B79F5) >>> 0;
      let mixed = value;
      mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
      mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
      return ((mixed ^ (mixed >>> 14)) >>> 0) / 0x100000000;
    };
  }

  function randomInt(rng, maxExclusive) {
    return Math.floor(rng() * Math.max(1, maxExclusive));
  }

  function pick(rng, values) {
    return values[randomInt(rng, values.length)];
  }

  function shuffle(rng, values) {
    const copy = values.slice();
    for (let index = copy.length - 1; index > 0; index -= 1) {
      const swap = randomInt(rng, index + 1);
      [copy[index], copy[swap]] = [copy[swap], copy[index]];
    }
    return copy;
  }

  function rounded(value) {
    return Math.round(Number(value) * 10) / 10;
  }

  function formatBb(value) {
    return rounded(value).toFixed(Math.abs(rounded(value) - Math.round(rounded(value))) < 0.01 ? 0 : 1);
  }

  function suitMap(rng) {
    const shuffled = shuffle(rng, SUITS);
    return Object.fromEntries(SUITS.map((suit, index) => [suit, shuffled[index]]));
  }

  function card(rank, suit) {
    return `${rank}${suit}`;
  }

  function distinctRanks(rng, count, filter = () => true) {
    const candidates = shuffle(rng, RANKS.filter(filter));
    if (candidates.length < count) throw new Error("Not enough ranks for generated practice spot");
    return candidates.slice(0, count);
  }

  function rankValue(rank) {
    return RANKS.indexOf(rank) + 2;
  }

  function isStrongTwoOvercards(value) {
    const heroCards = Array.isArray(value?.heroCards) ? value.heroCards : [];
    const boardCards = Array.isArray(value?.boardCards) ? value.boardCards : [];
    if (heroCards.length !== 2 || boardCards.length < 3) return false;
    const heroRanks = heroCards.map((cardValue) => cardValue?.[0]);
    const boardRanks = boardCards.map((cardValue) => cardValue?.[0]);
    if ([...heroRanks, ...boardRanks].some((rank) => !RANKS.includes(rank))) return false;
    const combo = heroRanks.slice().sort((left, right) => rankValue(right) - rankValue(left)).join("");
    const boardHigh = Math.max(...boardRanks.map(rankValue));
    const cards = [...heroCards, ...boardCards];
    const suitCounts = cards.reduce((counts, cardValue) => {
      counts[cardValue[1]] = (counts[cardValue[1]] || 0) + 1;
      return counts;
    }, {});
    return ["AK", "AQ", "KQ"].includes(combo)
      && heroRanks.every((rank) => rankValue(rank) > boardHigh)
      && evaluateBest(cards).category === 0
      && !hasFourToStraight(cards)
      && Math.max(...Object.values(suitCounts)) < 4;
  }

  function rankFromValue(value) {
    return RANKS[value - 2];
  }

  function dryBoardRanks(rng, options = {}) {
    const minLow = Number(options.minLow || 2);
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const ranks = distinctRanks(rng, 3, (rank) => rankValue(rank) >= minLow)
        .sort((left, right) => rankValue(right) - rankValue(left));
      if (rankValue(ranks[0]) - rankValue(ranks[1]) >= 2 && rankValue(ranks[1]) - rankValue(ranks[2]) >= 2) {
        return ranks;
      }
    }
    return ["K", "8", "2"];
  }

  function remainingRank(rng, excluded, predicate = () => true) {
    return pick(rng, RANKS.filter((rank) => !excluded.includes(rank) && predicate(rank)));
  }

  function buildSet(rng) {
    const suits = suitMap(rng);
    const [top, middle, low] = dryBoardRanks(rng);
    const pairRank = pick(rng, [middle, low]);
    return {
      heroCards: [card(pairRank, suits.c), card(pairRank, suits.s)],
      boardCards: [card(top, suits.c), card(middle, suits.d), card(low, suits.h)]
    };
  }

  function buildTwoPair(rng) {
    const suits = suitMap(rng);
    const [top, middle, low] = dryBoardRanks(rng);
    return {
      heroCards: [card(top, suits.d), card(middle, suits.c)],
      boardCards: [card(top, suits.c), card(middle, suits.d), card(low, suits.h)]
    };
  }

  function buildStrongTopPair(rng) {
    const suits = suitMap(rng);
    const [top, middle, low] = dryBoardRanks(rng);
    const kicker = remainingRank(rng, [top, middle, low], (rank) => rankValue(rank) > rankValue(middle));
    return {
      heroCards: [card(top, suits.d), card(kicker, suits.d)],
      boardCards: [card(top, suits.c), card(middle, suits.h), card(low, suits.s)]
    };
  }

  function straightWindow(rng) {
    const lowValue = 2 + randomInt(rng, 6);
    return [lowValue, lowValue + 1, lowValue + 2, lowValue + 3].map(rankFromValue);
  }

  function extraHighRank(rng, excluded) {
    const candidates = RANKS.filter((rank) => !excluded.includes(rank) && rankValue(rank) >= 10);
    return pick(rng, candidates.length ? candidates : RANKS.filter((rank) => !excluded.includes(rank)));
  }

  function buildComboDraw(rng) {
    const suits = suitMap(rng);
    const [low, second, third, high] = straightWindow(rng);
    const over = extraHighRank(rng, [low, second, third, high]);
    return {
      heroCards: [card(third, suits.h), card(second, suits.h)],
      boardCards: [card(high, suits.h), card(low, suits.c), card(over, suits.h)]
    };
  }

  function buildNutFlushDraw(rng) {
    const suits = suitMap(rng);
    const boardRanks = distinctRanks(rng, 3, (rank) => rank !== "A");
    const kicker = remainingRank(rng, ["A", ...boardRanks], (rank) => rankValue(rank) >= 9);
    return {
      heroCards: [card("A", suits.h), card(kicker, suits.h)],
      boardCards: [card(boardRanks[0], suits.h), card(boardRanks[1], suits.h), card(boardRanks[2], suits.c)]
    };
  }

  function buildOesd(rng) {
    const suits = suitMap(rng);
    const [low, second, third, high] = straightWindow(rng);
    const over = extraHighRank(rng, [low, second, third, high]);
    return {
      heroCards: [card(third, suits.d), card(second, suits.c)],
      boardCards: [card(high, suits.s), card(low, suits.h), card(over, suits.c)]
    };
  }

  function buildTopPair(rng) {
    const suits = suitMap(rng);
    const [top, middle, low] = dryBoardRanks(rng);
    const kicker = remainingRank(rng, [top, middle, low], (rank) => rankValue(rank) < rankValue(middle));
    return {
      heroCards: [card(top, suits.d), card(kicker, suits.c)],
      boardCards: [card(top, suits.c), card(middle, suits.h), card(low, suits.s)]
    };
  }

  function buildMiddlePair(rng) {
    const suits = suitMap(rng);
    const [top, middle, low] = dryBoardRanks(rng);
    const kicker = remainingRank(rng, [top, middle, low], (rank) => rankValue(rank) > rankValue(middle));
    return {
      heroCards: [card(kicker, suits.d), card(middle, suits.c)],
      boardCards: [card(top, suits.c), card(middle, suits.h), card(low, suits.s)]
    };
  }

  function buildBottomPair(rng) {
    const suits = suitMap(rng);
    const [top, middle, low] = dryBoardRanks(rng);
    const kicker = remainingRank(rng, [top, middle, low], (rank) => rankValue(rank) > rankValue(middle));
    return {
      heroCards: [card(kicker, suits.d), card(low, suits.c)],
      boardCards: [card(top, suits.c), card(middle, suits.h), card(low, suits.s)]
    };
  }

  function buildUnderpair(rng) {
    const suits = suitMap(rng);
    const [top, middle, low] = dryBoardRanks(rng, { minLow: 5 });
    const pocket = remainingRank(rng, [top, middle, low], (rank) => rankValue(rank) < rankValue(low));
    return {
      heroCards: [card(pocket, suits.d), card(pocket, suits.s)],
      boardCards: [card(top, suits.c), card(middle, suits.h), card(low, suits.s)]
    };
  }

  function buildAceHigh(rng) {
    const suits = suitMap(rng);
    const [top, middle, low] = dryBoardRanks(rng).map((rank) => rank === "A" ? "K" : rank);
    const uniqueBoard = Array.from(new Set([top, middle, low]));
    while (uniqueBoard.length < 3) {
      uniqueBoard.push(remainingRank(rng, ["A", ...uniqueBoard]));
    }
    const kicker = remainingRank(rng, ["A", ...uniqueBoard], (rank) => rankValue(rank) >= 9);
    return {
      heroCards: [card("A", suits.h), card(kicker, suits.h)],
      boardCards: [card(uniqueBoard[0], suits.c), card(uniqueBoard[1], suits.h), card(uniqueBoard[2], suits.s)]
    };
  }

  function buildAir(rng) {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const suits = suitMap(rng);
      const [top, middle, low] = dryBoardRanks(rng);
      const candidates = RANKS.filter((rank) => (
        ![top, middle, low].includes(rank)
        && Math.abs(rankValue(rank) - rankValue(middle)) > 1
        && Math.abs(rankValue(rank) - rankValue(low)) > 1
      ));
      const heroRanks = shuffle(rng, candidates).slice(0, 2);
      if (heroRanks.length < 2) continue;
      const built = {
        heroCards: [card(heroRanks[0], suits.d), card(heroRanks[1], suits.c)],
        boardCards: [card(top, suits.c), card(middle, suits.h), card(low, suits.s)]
      };
      if (isCleanAir(built) && !isStrongTwoOvercards(built)) return built;
    }
    return { heroCards: ["Qd", "4c"], boardCards: ["Kc", "8h", "2s"] };
  }

  function buildWeakBackdoor(rng) {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const suits = suitMap(rng);
      const [top, middle, low] = dryBoardRanks(rng);
      const heroRanks = distinctRanks(rng, 2, (rank) => ![top, middle, low].includes(rank) && rankValue(rank) < rankValue(top));
      const built = {
        heroCards: [card(heroRanks[0], suits.h), card(heroRanks[1], suits.h)],
        boardCards: [card(top, suits.c), card(middle, suits.h), card(low, suits.s)]
      };
      if (isCleanAir(built)) return built;
    }
    return { heroCards: ["Jh", "5h"], boardCards: ["Kc", "8h", "2s"] };
  }

  function buildOvercards(rng) {
    const suits = suitMap(rng);
    const boardRanks = pick(rng, [
      ["J", "7", "2"],
      ["T", "6", "2"],
      ["9", "5", "2"],
      ["Q", "7", "3"]
    ]);
    const heroRanks = boardRanks.includes("Q") ? ["A", "K"] : pick(rng, [["A", "K"], ["A", "Q"], ["K", "Q"]]);
    return {
      heroCards: [card(heroRanks[0], suits.d), card(heroRanks[1], suits.c)],
      boardCards: [card(boardRanks[0], suits.c), card(boardRanks[1], suits.h), card(boardRanks[2], suits.s)]
    };
  }

  function buildDisconnected(rng) {
    for (let attempt = 0; attempt < 80; attempt += 1) {
      const suits = suitMap(rng);
      const board = pick(rng, [
        ["K", "8", "2"],
        ["Q", "7", "2"],
        ["A", "8", "3"],
        ["J", "7", "2"]
      ]);
      const available = RANKS.filter((rank) => !board.includes(rank));
      const heroRanks = shuffle(rng, available).slice(0, 2);
      if (Math.abs(rankValue(heroRanks[0]) - rankValue(heroRanks[1])) < 4) continue;
      const built = {
        heroCards: [card(heroRanks[0], suits.d), card(heroRanks[1], suits.c)],
        boardCards: [card(board[0], suits.c), card(board[1], suits.h), card(board[2], suits.s)]
      };
      if (isCleanAir(built)) return built;
    }
    return { heroCards: ["Qd", "4c"], boardCards: ["Kc", "8h", "2s"] };
  }

  function buildThinGutshot(rng) {
    const suits = suitMap(rng);
    const lowValue = 2 + randomInt(rng, 7);
    const low = rankFromValue(lowValue);
    const heroLow = rankFromValue(lowValue + 1);
    const heroHigh = rankFromValue(lowValue + 3);
    const boardHigh = rankFromValue(lowValue + 4);
    const extra = remainingRank(rng, [low, heroLow, heroHigh, boardHigh], (rank) => Math.abs(rankValue(rank) - lowValue) >= 5);
    return {
      heroCards: [card(heroHigh, suits.h), card(heroLow, suits.h)],
      boardCards: [card(boardHigh, suits.c), card(low, suits.d), card(extra, suits.s)]
    };
  }

  function straightHigh(values) {
    const unique = Array.from(new Set(values)).sort((left, right) => right - left);
    if (unique.includes(14)) unique.push(1);
    for (let index = 0; index <= unique.length - 5; index += 1) {
      const window = unique.slice(index, index + 5);
      if (window.every((value, offset) => value === window[0] - offset)) return window[0] === 1 ? 5 : window[0];
    }
    return 0;
  }

  function hasFourToStraight(cards) {
    const values = Array.from(new Set(cards.map((value) => rankValue(value[0]))));
    if (values.includes(14)) values.push(1);
    for (let high = 14; high >= 5; high -= 1) {
      const needed = [high, high - 1, high - 2, high - 3, high - 4];
      if (needed.filter((value) => values.includes(value)).length >= 4) return true;
    }
    return false;
  }

  function evaluateBest(cards) {
    const rankCounts = new Map();
    const suitCards = new Map();
    cards.forEach((value) => {
      const rank = rankValue(value[0]);
      rankCounts.set(rank, (rankCounts.get(rank) || 0) + 1);
      const suit = value[1];
      if (!suitCards.has(suit)) suitCards.set(suit, []);
      suitCards.get(suit).push(rank);
    });
    const groups = Array.from(rankCounts, ([rank, count]) => ({ rank, count }))
      .sort((left, right) => right.count - left.count || right.rank - left.rank);
    const flushRanks = Array.from(suitCards.values()).find((values) => values.length >= 5);
    if (flushRanks) {
      const high = straightHigh(flushRanks);
      if (high) return { category: 8, tiebreak: [high], label: "стрит-флеш" };
    }
    const quads = groups.find((group) => group.count === 4);
    if (quads) {
      const kicker = Math.max(...groups.filter((group) => group.rank !== quads.rank).map((group) => group.rank));
      return { category: 7, tiebreak: [quads.rank, kicker], label: "каре" };
    }
    const trips = groups.filter((group) => group.count >= 3).map((group) => group.rank).sort((a, b) => b - a);
    const pairs = groups.filter((group) => group.count >= 2).map((group) => group.rank).sort((a, b) => b - a);
    if (trips.length && pairs.some((rank) => rank !== trips[0])) {
      return { category: 6, tiebreak: [trips[0], pairs.find((rank) => rank !== trips[0])], label: "фулл-хаус" };
    }
    if (flushRanks) {
      return { category: 5, tiebreak: flushRanks.slice().sort((a, b) => b - a).slice(0, 5), label: "флеш" };
    }
    const straight = straightHigh(Array.from(rankCounts.keys()));
    if (straight) return { category: 4, tiebreak: [straight], label: "стрит" };
    if (trips.length) {
      const kickers = groups.filter((group) => group.rank !== trips[0]).map((group) => group.rank).sort((a, b) => b - a).slice(0, 2);
      return { category: 3, tiebreak: [trips[0], ...kickers], label: "сет или трипс" };
    }
    if (pairs.length >= 2) {
      const kicker = Math.max(...groups.filter((group) => !pairs.slice(0, 2).includes(group.rank)).map((group) => group.rank));
      return { category: 2, tiebreak: [pairs[0], pairs[1], kicker], label: "две пары" };
    }
    if (pairs.length === 1) {
      const kickers = groups.filter((group) => group.rank !== pairs[0]).map((group) => group.rank).sort((a, b) => b - a).slice(0, 3);
      return { category: 1, tiebreak: [pairs[0], ...kickers], label: "пара" };
    }
    return {
      category: 0,
      tiebreak: groups.map((group) => group.rank).sort((a, b) => b - a).slice(0, 5),
      label: "старшая карта"
    };
  }

  function compareEvaluations(left, right) {
    if (left.category !== right.category) return left.category > right.category ? 1 : -1;
    const length = Math.max(left.tiebreak.length, right.tiebreak.length);
    for (let index = 0; index < length; index += 1) {
      const leftValue = left.tiebreak[index] || 0;
      const rightValue = right.tiebreak[index] || 0;
      if (leftValue !== rightValue) return leftValue > rightValue ? 1 : -1;
    }
    return 0;
  }

  function isCleanAir(built) {
    const cards = [...built.heroCards, ...built.boardCards];
    const suitCounts = cards.reduce((counts, value) => {
      counts[value[1]] = (counts[value[1]] || 0) + 1;
      return counts;
    }, {});
    return evaluateBest(cards).category === 0
      && !hasFourToStraight(cards)
      && Math.max(...Object.values(suitCounts)) < 4;
  }

  function fullDeck() {
    if (Array.isArray(root.PokerDeckKit?.fullDeck) && root.PokerDeckKit.fullDeck.length === 52) {
      return root.PokerDeckKit.fullDeck.slice();
    }
    return RANKS.flatMap((rank) => SUITS.map((suit) => card(rank, suit)));
  }

  function seats(stack, villain, revealCards = []) {
    return SEATS.map((label) => ({
      label,
      state: label === "BB" ? "hero" : label === villain ? "waiting" : "folded",
      stackBb: stack,
      ...(label === villain && revealCards.length === 2
        ? { cards: revealCards.slice(), revealCardsAfterAnswer: true }
        : {})
    }));
  }

  function tableSnapshot(context, street, boardCards, pot, stack, actionLine, historyLine, revealCards = []) {
    return {
      seats: seats(stack, context.villain, revealCards),
      heroPosition: "BB",
      heroStack: `${formatBb(stack)} BB`,
      effectiveStack: `${formatBb(stack)} BB`,
      pot: `${formatBb(pot)} BB`,
      anteBb: 1,
      heroCards: context.heroCards.slice(),
      boardCards: boardCards.slice(),
      street,
      actionLine: actionLine.slice(),
      historyLine,
      toCall: 0,
      currentBet: 0,
      dealerPosition: "BTN"
    };
  }

  function showCards(cards) {
    const symbols = { c: "♣", d: "♦", h: "♥", s: "♠" };
    return cards.map((value) => `${value[0]}${symbols[value[1]]}`).join(" ");
  }

  function terminalNode(id, context, title, summary, winner, pot, stack, actionLine) {
    return {
      id,
      title,
      terminal: true,
      question: title,
      table: tableSnapshot(
        context,
        "showdown",
        [...context.boardCards, context.turnCard, context.riverCard],
        pot,
        stack,
        actionLine,
        "Учебная линия от флопа до завершения",
        context.villainCards
      ),
      result: {
        winner,
        title,
        summary
      }
    };
  }

  function decisionNode(id, context, street, boardCards, pot, stack, title, question, options, historyLine) {
    return {
      id,
      title,
      question,
      table: tableSnapshot(context, street, boardCards, pot, stack, [`${street === "turn" ? "Turn" : "River"} · BB to act`], historyLine),
      options
    };
  }

  function facingBetNode(id, context, street, boardCards, pot, stack, bet, title, question, options, historyLine) {
    const table = tableSnapshot(
      context,
      street,
      boardCards,
      pot,
      stack,
      ["BB check", `${context.villain} bet ${formatBb(bet)} BB`],
      historyLine
    );
    table.toCall = bet;
    table.currentBet = bet;
    return { id, title, question, table, options };
  }

  function isTopPairOrBetter(cards, boardCards) {
    const evaluation = evaluateBest([...cards, ...boardCards]);
    const boardEvaluation = evaluateBest(boardCards);
    if (evaluation.category <= boardEvaluation.category) return false;
    if (evaluation.category >= 2) return true;
    if (evaluation.category !== 1) return false;
    const pairRank = evaluation.tiebreak[0];
    const holeRanks = cards.map((value) => rankValue(value[0]));
    const boardHigh = Math.max(...boardCards.map((value) => rankValue(value[0])));
    const pairUsesHoleCard = holeRanks.includes(pairRank) || holeRanks[0] === holeRanks[1];
    return pairUsesHoleCard && pairRank >= boardHigh;
  }

  function buildContinuation(context, rng) {
    const deck = shuffle(rng, fullDeck().filter((value) => ![...context.heroCards, ...context.boardCards].includes(value)));
    context.villainCards = deck.slice(0, 2);
    context.turnCard = deck[2];
    context.riverCard = deck[3];

    const fullBoard = [...context.boardCards, context.turnCard, context.riverCard];
    const heroEvaluation = evaluateBest([...context.heroCards, ...fullBoard]);
    const villainEvaluation = evaluateBest([...context.villainCards, ...fullBoard]);
    const comparison = compareEvaluations(heroEvaluation, villainEvaluation);
    const showdownWinner = comparison > 0 ? "Hero" : comparison < 0 ? context.villain : "Ничья";
    const showdownSummary = `Hero ${showCards(context.heroCards)} — ${heroEvaluation.label}; ${context.villain} ${showCards(context.villainCards)} — ${villainEvaluation.label}. ${showdownWinner === "Ничья" ? "Банк делится." : `Банк забирает ${showdownWinner}.`} Оценка флопа от результата не меняется.`;

    const potAfterFold = rounded(context.pot + context.bet);
    const potAfterCall = rounded(context.pot + context.bet * 2);
    const potAfterRaise = rounded(context.pot + context.raiseTo * 2);
    const potAfterRaiseFold = rounded(context.pot + context.bet + context.raiseTo);
    const stackAfterCall = Math.max(0, rounded(context.stack - context.bet));
    const stackAfterRaise = Math.max(0, rounded(context.stack - context.raiseTo));
    const callLead = Math.min(stackAfterCall, rounded(potAfterCall * 0.5));
    const potAfterCallLead = rounded(potAfterCall + callLead * 2);
    const stackAfterCallLead = Math.max(0, rounded(stackAfterCall - callLead));
    const villainTurnBet = Math.min(stackAfterCall, rounded(potAfterCall * 0.6));
    const potAfterVillainTurnBet = rounded(potAfterCall + villainTurnBet);
    const potAfterVillainTurnBetCall = rounded(potAfterCall + villainTurnBet * 2);
    const stackAfterVillainTurnBetCall = Math.max(0, rounded(stackAfterCall - villainTurnBet));
    const villainRiverBet = Math.min(stackAfterCall, rounded(potAfterCall * 0.65));
    const villainRiverBetAfterTurnCall = Math.min(
      stackAfterVillainTurnBetCall,
      rounded(potAfterVillainTurnBetCall * 0.65)
    );
    const callTurnBetRiverLead = Math.min(
      stackAfterVillainTurnBetCall,
      rounded(potAfterVillainTurnBetCall * 0.6)
    );
    const xrBarrel = Math.min(stackAfterRaise, rounded(potAfterRaise * 0.6));
    const potAfterXrBarrel = rounded(potAfterRaise + xrBarrel * 2);
    const stackAfterXrBarrel = Math.max(0, rounded(stackAfterRaise - xrBarrel));
    const callCheckRiverBet = Math.min(stackAfterCall, rounded(potAfterCall * 0.6));
    const callLeadRiverBet = Math.min(stackAfterCallLead, rounded(potAfterCallLead * 0.6));
    const xrCheckRiverBet = Math.min(stackAfterRaise, rounded(potAfterRaise * 0.65));
    const xrBarrelRiverBet = Math.min(stackAfterXrBarrel, rounded(potAfterXrBarrel * 0.65));
    const villainFoldsToRaise = rng() < (context.foldRead.pct / 100);
    const valueRiver = ["xr-set", "xr-two-pair", "xr-strong-top-pair"].includes(context.archetype.id);
    const turnBoard = [...context.boardCards, context.turnCard];
    const villainValueBetsTurn = isTopPairOrBetter(context.villainCards, turnBoard);
    const villainValueBetsRiver = isTopPairOrBetter(context.villainCards, fullBoard);
    const heroContinuesTurn = evaluateBest([...context.heroCards, ...turnBoard]).category >= 1;
    const heroContinuesRiver = isTopPairOrBetter(context.heroCards, fullBoard);

    const makeShowdown = (id, title, pot, stack, actionLine) => terminalNode(
      id,
      context,
      title,
      showdownSummary,
      showdownWinner,
      pot,
      stack,
      actionLine
    );

    const nodes = {
      "end-after-fold": terminalNode(
        "end-after-fold",
        context,
        "Пас — раздача закончилась",
        `${context.villain} забрал банк на флопе. Дальнейшие карты не влияют на решение Hero.`,
        context.villain,
        potAfterFold,
        context.stack,
        ["BB fold", `${context.villain} wins`]
      ),
      "end-after-xr-fold": terminalNode(
        "end-after-xr-fold",
        context,
        `${context.villain} выбросил на чек-рейз`,
        "Забрали банк без шоудауна — именно ради этого блефовая часть рейза существует.",
        "Без шоудауна",
        potAfterRaiseFold,
        stackAfterRaise,
        [`BB check-raise to ${formatBb(context.raiseTo)} BB`, `${context.villain} fold`]
      ),
      "turn-after-call": decisionNode(
        "turn-after-call",
        context,
        "turn",
        [...context.boardCards, context.turnCard],
        potAfterCall,
        stackAfterCall,
        "Тёрн после колла",
        "Сохранять контролируемый банк или перехватить инициативу?",
        [
          {
            key: "check",
            label: "Чек",
            correct: true,
            feedback: "Колл на флопе обычно продолжает линию контроля.",
            next: villainValueBetsTurn ? "turn-call-facing-bet" : "river-call-check"
          },
          { key: "lead", label: `Поставить ${formatBb(callLead)} BB`, correct: false, feedback: "Донк без явной причины ломает исходный план колла.", next: "river-call-lead" }
        ],
        `Flop: BB call ${formatBb(context.bet)} BB`
      ),
      "turn-call-facing-bet": facingBetNode(
        "turn-call-facing-bet",
        context,
        "turn",
        turnBoard,
        potAfterCall,
        stackAfterCall,
        villainTurnBet,
        `${context.villain} ставит тёрн`,
        "Что делать против второго барреля?",
        [
          {
            key: "fold",
            label: "Пас",
            correct: !heroContinuesTurn,
            feedback: "Без пары или сильного дро второй баррель чаще отпускаем.",
            next: "end-after-turn-bet-fold"
          },
          {
            key: "call",
            label: `Колл ${formatBb(villainTurnBet)} BB`,
            correct: heroContinuesTurn,
            feedback: "Готовая рука ещё может продолжить против ставки около 60% банка.",
            next: "river-call-after-turn-bet"
          }
        ],
        `Flop call · Turn BB check · ${context.villain} bet ${formatBb(villainTurnBet)} BB`
      ),
      "river-call-check": decisionNode(
        "river-call-check",
        context,
        "river",
        fullBoard,
        potAfterCall,
        stackAfterCall,
        "Ривер после чек-чека",
        "Как завершить линию без лишней поляризации?",
        [
          {
            key: "check",
            label: "Чек",
            correct: true,
            feedback: "Средняя часть диапазона чаще доходит до шоудауна через чек.",
            next: villainValueBetsRiver ? "river-call-facing-bet" : "showdown-call-check-check"
          },
          { key: "bet", label: `Поставить ${formatBb(callCheckRiverBet)} BB`, correct: false, feedback: "Крупная ставка требует более полярной руки.", next: "showdown-call-check-bet" }
        ],
        "Flop call · Turn check-check"
      ),
      "river-call-facing-bet": facingBetNode(
        "river-call-facing-bet",
        context,
        "river",
        fullBoard,
        potAfterCall,
        stackAfterCall,
        villainRiverBet,
        `${context.villain} добирает ривер`,
        "Как ответить на ривер-бет?",
        [
          { key: "fold", label: "Пас", correct: !heroContinuesRiver, feedback: "Слабая пара не обязана оплачивать велью-бет.", next: "end-after-river-bet-fold" },
          { key: "call", label: `Колл ${formatBb(villainRiverBet)} BB`, correct: heroContinuesRiver, feedback: "Сильная готовая рука может вскрывать ривер-бет.", next: "showdown-call-check-villain-bet-call" }
        ],
        `Flop call · Turn check-check · River BB check · ${context.villain} bet ${formatBb(villainRiverBet)} BB`
      ),
      "river-call-after-turn-bet": decisionNode(
        "river-call-after-turn-bet",
        context,
        "river",
        fullBoard,
        potAfterVillainTurnBetCall,
        stackAfterVillainTurnBetCall,
        "Ривер после колла тёрна",
        "Донкать или снова передать слово?",
        [
          {
            key: "check",
            label: "Чек",
            correct: true,
            feedback: "После колла тёрна средняя рука снова чекает в агрессора.",
            next: villainValueBetsRiver ? "river-call-facing-bet-after-turn-bet" : "showdown-call-turn-bet-check-check"
          },
          {
            key: "bet",
            label: `Поставить ${formatBb(callTurnBetRiverLead)} BB`,
            correct: false,
            feedback: "Донк на ривере требует ясной велью-цели или сильных блокеров.",
            next: "showdown-call-turn-bet-river-lead"
          }
        ],
        `Flop call · Turn BB check · ${context.villain} bet ${formatBb(villainTurnBet)} BB · BB call`
      ),
      "river-call-facing-bet-after-turn-bet": facingBetNode(
        "river-call-facing-bet-after-turn-bet",
        context,
        "river",
        fullBoard,
        potAfterVillainTurnBetCall,
        stackAfterVillainTurnBetCall,
        villainRiverBetAfterTurnCall,
        `${context.villain} ставит снова`,
        "Как ответить на третий баррель?",
        [
          { key: "fold", label: "Пас", correct: !heroContinuesRiver, feedback: "Слабая пара не обязана оплачивать три барреля.", next: "end-after-river-bet-after-turn-bet-fold" },
          { key: "call", label: `Колл ${formatBb(villainRiverBetAfterTurnCall)} BB`, correct: heroContinuesRiver, feedback: "Сильная готовая рука может вскрывать третий баррель.", next: "showdown-call-turn-bet-river-bet-call" }
        ],
        `Flop call · Turn bet-call · River BB check · ${context.villain} bet ${formatBb(villainRiverBetAfterTurnCall)} BB`
      ),
      "river-call-lead": decisionNode(
        "river-call-lead",
        context,
        "river",
        fullBoard,
        potAfterCallLead,
        stackAfterCallLead,
        "Ривер после донка и колла",
        "Продолжать раздувать банк?",
        [
          { key: "check", label: "Чек", correct: true, feedback: "После тонкого донка разумно остановить давление.", next: "showdown-call-lead-check" },
          { key: "bet", label: `Поставить ${formatBb(callLeadRiverBet)} BB`, correct: false, feedback: "Вторая ставка слишком широко поляризует среднюю руку.", next: "showdown-call-lead-bet" }
        ],
        `Flop call · Turn BB bet ${formatBb(callLead)} BB · ${context.villain} call`
      ),
      "turn-after-xr-call": decisionNode(
        "turn-after-xr-call",
        context,
        "turn",
        [...context.boardCards, context.turnCard],
        potAfterRaise,
        stackAfterRaise,
        "Тёрн после чек-рейза",
        "Продолжать давление или взять бесплатную карту?",
        [
          {
            key: "barrel",
            label: "Поставить 60%",
            correct: context.baselineAction === "checkraise",
            feedback: context.baselineAction === "checkraise"
              ? "У базового чек-рейза есть план продолжения на подходящих картах."
              : "После лузового чек-рейза второй баррель требует особенно хорошего тёрна.",
            next: "river-xr-barrel"
          },
          {
            key: "check",
            label: "Чек",
            correct: context.baselineAction !== "checkraise",
            feedback: context.baselineAction === "checkraise"
              ? "Чек допустим на плохих картах, но этот учебный узел сохраняет инициативу."
              : "После тонкого рейза разумно остановить давление без нового преимущества.",
            next: "river-xr-check"
          }
        ],
        `Flop: BB check-raise ${formatBb(context.raiseTo)} BB · ${context.villain} call`
      ),
      "river-xr-barrel": decisionNode(
        "river-xr-barrel",
        context,
        "river",
        fullBoard,
        potAfterXrBarrel,
        stackAfterXrBarrel,
        "Ривер после барреля и колла",
        "Есть ли ещё одна ставка?",
        [
          {
            key: "check",
            label: "Чек",
            correct: !valueRiver,
            feedback: "Не каждый флоп-чек-рейз обязан превращаться в три барреля.",
            next: "showdown-xr-barrel-check"
          },
          {
            key: "bet",
            label: `Поставить ${formatBb(xrBarrelRiverBet)} BB`,
            correct: valueRiver,
            feedback: "Сильное вэлью продолжает добор; блефу нужен хороший ривер и блокеры.",
            next: "showdown-xr-barrel-bet"
          }
        ],
        `Flop X/R-call · Turn BB bet ${formatBb(xrBarrel)} BB · ${context.villain} call`
      ),
      "river-xr-check": decisionNode(
        "river-xr-check",
        context,
        "river",
        fullBoard,
        potAfterRaise,
        stackAfterRaise,
        "Ривер после чек-чека",
        "Возвращать давление после паузы?",
        [
          { key: "check", label: "Чек", correct: true, feedback: "После чека тёрна линия чаще спокойно доходит до шоудауна.", next: "showdown-xr-check-check" },
          { key: "bet", label: `Поставить ${formatBb(xrCheckRiverBet)} BB`, correct: false, feedback: "Поздний крупный баррель требует ясного вэлью или хороших блокеров.", next: "showdown-xr-check-bet" }
        ],
        "Flop X/R-call · Turn check-check"
      )
    };

    Object.assign(nodes, {
      "end-after-turn-bet-fold": terminalNode(
        "end-after-turn-bet-fold",
        context,
        "Пас на тёрне",
        `${context.villain} забрал банк вторым баррелем. Оценка флопа от результата не меняется.`,
        context.villain,
        potAfterVillainTurnBet,
        stackAfterCall,
        ["Turn BB check", `${context.villain} bet ${formatBb(villainTurnBet)} BB`, "BB fold"]
      ),
      "end-after-river-bet-fold": terminalNode(
        "end-after-river-bet-fold",
        context,
        "Пас на ривере",
        `${context.villain} забрал банк ривер-бетом. Оценка флопа от результата не меняется.`,
        context.villain,
        rounded(potAfterCall + villainRiverBet),
        stackAfterCall,
        ["Turn check-check", "River BB check", `${context.villain} bet ${formatBb(villainRiverBet)} BB`, "BB fold"]
      ),
      "end-after-river-bet-after-turn-bet-fold": terminalNode(
        "end-after-river-bet-after-turn-bet-fold",
        context,
        "Пас на третий баррель",
        `${context.villain} забрал банк ставками на тёрне и ривере. Оценка флопа от результата не меняется.`,
        context.villain,
        rounded(potAfterVillainTurnBetCall + villainRiverBetAfterTurnCall),
        stackAfterVillainTurnBetCall,
        [
          `Turn ${context.villain} bet ${formatBb(villainTurnBet)} BB · BB call`,
          `River BB check · ${context.villain} bet ${formatBb(villainRiverBetAfterTurnCall)} BB`,
          "BB fold"
        ]
      ),
      "showdown-call-check-check": makeShowdown(
        "showdown-call-check-check",
        "Шоудаун после колла",
        potAfterCall,
        stackAfterCall,
        ["Turn check-check", "River check-check", "Showdown"]
      ),
      "showdown-call-check-bet": makeShowdown(
        "showdown-call-check-bet",
        "Шоудаун после ривер-бета",
        rounded(potAfterCall + callCheckRiverBet * 2),
        Math.max(0, rounded(stackAfterCall - callCheckRiverBet)),
        [`River BB bet ${formatBb(callCheckRiverBet)} BB`, `${context.villain} call`, "Showdown"]
      ),
      "showdown-call-check-villain-bet-call": makeShowdown(
        "showdown-call-check-villain-bet-call",
        "Шоудаун после ривер-бета",
        rounded(potAfterCall + villainRiverBet * 2),
        Math.max(0, rounded(stackAfterCall - villainRiverBet)),
        ["Turn check-check", `River ${context.villain} bet ${formatBb(villainRiverBet)} BB · BB call`, "Showdown"]
      ),
      "showdown-call-turn-bet-check-check": makeShowdown(
        "showdown-call-turn-bet-check-check",
        "Шоудаун после второго барреля",
        potAfterVillainTurnBetCall,
        stackAfterVillainTurnBetCall,
        [`Turn ${context.villain} bet ${formatBb(villainTurnBet)} BB · BB call`, "River check-check", "Showdown"]
      ),
      "showdown-call-turn-bet-river-lead": makeShowdown(
        "showdown-call-turn-bet-river-lead",
        "Шоудаун после ривер-донка",
        rounded(potAfterVillainTurnBetCall + callTurnBetRiverLead * 2),
        Math.max(0, rounded(stackAfterVillainTurnBetCall - callTurnBetRiverLead)),
        [
          `Turn ${context.villain} bet ${formatBb(villainTurnBet)} BB · BB call`,
          `River BB bet ${formatBb(callTurnBetRiverLead)} BB · ${context.villain} call`,
          "Showdown"
        ]
      ),
      "showdown-call-turn-bet-river-bet-call": makeShowdown(
        "showdown-call-turn-bet-river-bet-call",
        "Шоудаун после трех баррелей",
        rounded(potAfterVillainTurnBetCall + villainRiverBetAfterTurnCall * 2),
        Math.max(0, rounded(stackAfterVillainTurnBetCall - villainRiverBetAfterTurnCall)),
        [
          `Turn ${context.villain} bet ${formatBb(villainTurnBet)} BB · BB call`,
          `River ${context.villain} bet ${formatBb(villainRiverBetAfterTurnCall)} BB · BB call`,
          "Showdown"
        ]
      ),
      "showdown-call-lead-check": makeShowdown(
        "showdown-call-lead-check",
        "Шоудаун после донка",
        potAfterCallLead,
        stackAfterCallLead,
        [`Turn BB bet ${formatBb(callLead)} BB · call`, "River check-check", "Showdown"]
      ),
      "showdown-call-lead-bet": makeShowdown(
        "showdown-call-lead-bet",
        "Шоудаун после двух ставок",
        rounded(potAfterCallLead + callLeadRiverBet * 2),
        Math.max(0, rounded(stackAfterCallLead - callLeadRiverBet)),
        [`River BB bet ${formatBb(callLeadRiverBet)} BB`, `${context.villain} call`, "Showdown"]
      ),
      "showdown-xr-barrel-check": makeShowdown(
        "showdown-xr-barrel-check",
        "Шоудаун после барреля",
        potAfterXrBarrel,
        stackAfterXrBarrel,
        [`Turn BB bet ${formatBb(xrBarrel)} BB · call`, "River check-check", "Showdown"]
      ),
      "showdown-xr-barrel-bet": makeShowdown(
        "showdown-xr-barrel-bet",
        "Шоудаун после трёх ставок",
        rounded(potAfterXrBarrel + xrBarrelRiverBet * 2),
        Math.max(0, rounded(stackAfterXrBarrel - xrBarrelRiverBet)),
        [`River BB bet ${formatBb(xrBarrelRiverBet)} BB`, `${context.villain} call`, "Showdown"]
      ),
      "showdown-xr-check-check": makeShowdown(
        "showdown-xr-check-check",
        "Шоудаун после паузы",
        potAfterRaise,
        stackAfterRaise,
        ["Turn check-check", "River check-check", "Showdown"]
      ),
      "showdown-xr-check-bet": makeShowdown(
        "showdown-xr-check-bet",
        "Шоудаун после отложенной ставки",
        rounded(potAfterRaise + xrCheckRiverBet * 2),
        Math.max(0, rounded(stackAfterRaise - xrCheckRiverBet)),
        [`River BB bet ${formatBb(xrCheckRiverBet)} BB`, `${context.villain} call`, "Showdown"]
      )
    });

    const xrNext = villainFoldsToRaise ? "end-after-xr-fold" : "turn-after-xr-call";
    return {
      continuation: { schemaVersion: 1, start: "turn-after-call", nodes },
      rootNext: {
        fold: "end-after-fold",
        call: "turn-after-call",
        checkraise: xrNext
      },
      villainFoldsToRaise
    };
  }

  function isBlockerOvercardMix(archetype, heroCards, boardCards) {
    if (archetype.id !== "call-strong-overcards") return false;
    const heroRanks = heroCards.map((cardValue) => cardValue[0]).sort((left, right) => rankValue(right) - rankValue(left)).join("");
    const boardRanks = boardCards.map((cardValue) => cardValue[0]).sort((left, right) => rankValue(right) - rankValue(left)).join("");
    return heroRanks === "KQ" && boardRanks === "J72";
  }

  function mixFeedback(archetype, heroCards, boardCards) {
    if (isBlockerOvercardMix(archetype, heroCards, boardCards)) {
      return "KQ блокирует KK, QQ, KJ и QJ, сохраняет эквити двух оверкарт и бэкдорные усиления.";
    }
    return "У гатшота есть усиления и фолд-эквити.";
  }

  function rootFeedback(archetype, action, raiseTo, foldRead, xrMix, heroCards, boardCards) {
    if (archetype.family === "checkraise") {
      if (action === "checkraise") {
        return `Есть вэлью или живое дро, а у c-bet есть фолды. Чек-рейз до ${formatBb(raiseTo)} BB использует обе причины.`;
      }
      return `${archetype.reason} ${action === "fold" ? "Пас" : "Колл"} оставляет фолд-эквити неиспользованным.`;
    }
    if (action === archetype.family) return archetype.reason;
    if (action === "checkraise") {
      if (xrMix) {
        return `Колл — базовая линия, но чек-рейз до ${formatBb(raiseTo)} BB тоже ок: ${mixFeedback(archetype, heroCards, boardCards)}`;
      }
      return foldRead.pct >= 55
        ? `Против частых фолдов рейз может сработать, но это лузовый эксплойт. ${archetype.reason}`
        : `Фолд-эквити есть, но рука плохо переживает колл. ${archetype.reason}`;
    }
    return `Базовая линия здесь — ${archetype.family === "call" ? "колл" : "пас"}. ${archetype.reason}`;
  }

  function rootOutcome(archetype, action, xrMix) {
    if (archetype.family === "checkraise") return action === "checkraise" ? "xr-ok" : "missed-xr";
    if (action === archetype.family) return "correct";
    if (action === "checkraise" && xrMix) return "mix-xr";
    if (action === "checkraise") return "loose-xr";
    return "wrong";
  }

  function visibleFingerprint(heroCards, boardCards) {
    return `${heroCards.slice().sort().join(".")}|${boardCards.join(".")}`;
  }

  function buildSpot(archetype, rng, serial, seed) {
    const built = archetype.builder(rng);
    const heroCards = built.heroCards;
    const boardCards = built.boardCards;
    const visibleCards = [...heroCards, ...boardCards];
    if (visibleCards.some((value) => !CARD_RE.test(value)) || new Set(visibleCards).size !== visibleCards.length) {
      throw new Error(`Invalid generated root cards for ${archetype.id}`);
    }

    const villain = pick(rng, ["CO", "BTN"]);
    const stack = pick(rng, [25, 30, 35, 40, 50, 60]);
    const open = pick(rng, [2, 2.2, 2.5]);
    const pot = rounded(open * 2 + 1.1);
    const fraction = pick(rng, [0.25, 0.33, 0.4, 0.5]);
    const bet = Math.max(1, rounded(pot * fraction));
    const raiseTo = Math.min(stack, rounded(Math.max(bet * 3, bet + 3)));
    const foldRead = { ...pick(rng, READS) };
    const baselineAction = archetype.family;
    const xrMix = archetype.xrMix === true || isBlockerOvercardMix(archetype, heroCards, boardCards);
    const visibleSignature = visibleFingerprint(heroCards, boardCards);
    const signature = [
      visibleSignature,
      villain,
      stack,
      formatBb(open),
      formatBb(bet),
      formatBb(raiseTo),
      foldRead.pct
    ].join("|");
    const context = {
      archetype,
      heroCards,
      boardCards,
      villain,
      stack,
      pot,
      bet,
      raiseTo,
      foldRead,
      baselineAction
    };
    const fullHand = buildContinuation(context, rng);
    const actionLabels = {
      fold: "Пас",
      call: "Колл",
      checkraise: `Чек-рейз до ${formatBb(raiseTo)} BB`
    };
    const options = ["fold", "call", "checkraise"].map((action) => ({
      key: action,
      label: actionLabels[action],
      correct: action === baselineAction,
      feedback: rootFeedback(archetype, action, raiseTo, foldRead, xrMix, heroCards, boardCards),
      outcome: rootOutcome(archetype, action, xrMix),
      next: fullHand.rootNext[action],
      ...(action === "checkraise" && baselineAction !== "checkraise"
        ? xrMix
          ? { acceptableMix: true }
          : { acceptableExploit: true }
        : {}),
      ...(action === "fold"
        ? { continuationTitle: "Ты выбросил — раздача закончилась", continuationCopy: "Фолд тоже часть правильной защиты. Посмотри итог и переходи к новой ситуации." }
        : action === "call"
          ? { continuationTitle: `${villain} получил колл`, continuationCopy: "Доиграй спокойную ветку колла на тёрне и ривере." }
          : {
              continuationTitle: fullHand.villainFoldsToRaise ? `${villain} решает, продолжать ли против рейза` : `${villain} коллирует чек-рейз`,
              continuationCopy: "Фолд соперника — часть прибыли рейза; после колла нужен план на следующих улицах."
            })
    }));

    return {
      id: `generated-xr-${seed.toString(16)}-${serial}`,
      title: `${archetype.label} · ${villain} ставит ${formatBb(bet)} BB`,
      hand: heroCards.map((value) => value[0]).join(""),
      question: `${villain} поставил ${formatBb(bet)} BB после чека BB. Что выбираешь?`,
      answer: archetype.reason,
      context: "Смешанная практика: здесь встречаются чек-рейзы, коллы и фолды.",
      practiceMeta: {
        generated: true,
        signature,
        visibleSignature,
        serial,
        family: archetype.family,
        archetype: archetype.id,
        baselineAction,
        reason: archetype.reason,
        foldRead,
        xrGrade: archetype.family === "checkraise" ? "clear" : xrMix ? "mix" : "control",
        runoutCards: [...context.villainCards, context.turnCard, context.riverCard]
      },
      table: {
        seats: seats(stack, villain),
        heroPosition: "BB",
        heroStack: `${formatBb(stack)} BB`,
        effectiveStack: `${formatBb(stack)} BB`,
        pot: `${formatBb(pot)} BB`,
        anteBb: 1,
        heroCards: heroCards.slice(),
        boardCards: boardCards.slice(),
        street: "flop",
        actionLine: ["BB check", `${villain} bet ${formatBb(bet)} BB`],
        historyLine: `${villain} открывает ${formatBb(open)} BB · BB коллирует · на флопе двое`,
        toCall: bet,
        currentBet: bet,
        dealerPosition: "BTN"
      },
      options,
      continuation: fullHand.continuation
    };
  }

  function fingerprint(spot) {
    return String(spot?.practiceMeta?.signature || visibleFingerprint(spot?.table?.heroCards || [], spot?.table?.boardCards || []));
  }

  function validateSpot(spot) {
    const errors = [];
    const cards = [...(spot?.table?.heroCards || []), ...(spot?.table?.boardCards || [])];
    if (cards.length !== 5 || cards.some((value) => !CARD_RE.test(value)) || new Set(cards).size !== cards.length) {
      errors.push("root cards must contain five unique valid cards");
    }
    const options = Array.isArray(spot?.options) ? spot.options : [];
    if (options.length !== 3) errors.push("root needs fold/call/checkraise");
    if (options.filter((option) => option?.correct === true).length !== 1) errors.push("root needs exactly one correct action");
    if (!spot?.practiceMeta?.generated || !fingerprint(spot)) errors.push("generated metadata and signature are required");
    if (!spot?.continuation || spot.continuation.schemaVersion !== 1) errors.push("native continuation graph is required");
    return { ok: errors.length === 0, errors };
  }

  function createSession(options = {}) {
    const initialSeed = options.seed == null ? randomSeed() : hashSeed(options.seed);
    let rng = mulberry32(initialSeed);
    let serial = 0;
    let bag = [];
    let recentFamilies = [];
    const seen = new Set();
    const seenVisible = new Set();

    function refillBag() {
      bag = shuffle(rng, ARCHETYPES);
      if (recentFamilies.length >= 2 && recentFamilies.at(-1) === recentFamilies.at(-2)) {
        const blocked = recentFamilies.at(-1);
        const swapIndex = bag.findIndex((item) => item.family !== blocked);
        if (swapIndex > 0) [bag[0], bag[swapIndex]] = [bag[swapIndex], bag[0]];
      }
    }

    function nextArchetype() {
      if (!bag.length) refillBag();
      const blocked = recentFamilies.length >= 2 && recentFamilies.at(-1) === recentFamilies.at(-2)
        ? recentFamilies.at(-1)
        : "";
      if (blocked && bag[0]?.family === blocked) {
        let swapIndex = bag.findIndex((item) => item.family !== blocked);
        if (swapIndex < 0) {
          const deferred = bag.slice();
          refillBag();
          bag.push(...deferred);
          swapIndex = bag.findIndex((item) => item.family !== blocked);
        }
        if (swapIndex > 0) [bag[0], bag[swapIndex]] = [bag[swapIndex], bag[0]];
      }
      return bag.shift();
    }

    function next() {
      const archetype = nextArchetype();
      for (let attempt = 0; attempt < 600; attempt += 1) {
        const spot = buildSpot(archetype, rng, serial, initialSeed);
        const signature = fingerprint(spot);
        if (seen.has(signature)) continue;
        const visibleSignature = spot.practiceMeta.visibleSignature;
        if (seenVisible.size < 2500 && seenVisible.has(visibleSignature)) continue;
        const validation = validateSpot(spot);
        if (!validation.ok) continue;
        seen.add(signature);
        seenVisible.add(visibleSignature);
        serial += 1;
        recentFamilies = [...recentFamilies.slice(-1), archetype.family];
        return spot;
      }
      throw new Error("Could not generate a unique check-raise practice spot");
    }

    function reset() {
      rng = mulberry32(initialSeed);
      serial = 0;
      bag = [];
      recentFamilies = [];
      seen.clear();
      seenVisible.clear();
    }

    return Object.freeze({
      seed: initialSeed,
      next,
      reset,
      seenCount() { return seen.size; }
    });
  }

  function generateSpot(options = {}) {
    const targetSerial = Math.max(0, Math.floor(Number(options.serial || 0)));
    const session = createSession({ seed: options.seed == null ? 1 : options.seed });
    let spot = null;
    for (let index = 0; index <= targetSerial; index += 1) spot = session.next();
    return spot;
  }

  const api = Object.freeze({
    schemaVersion: 1,
    createSession,
    generateSpot,
    buildContinuation,
    fingerprint,
    validateSpot,
    isStrongTwoOvercards,
    isTopPairOrBetter,
    evaluateBest,
    compareEvaluations
  });

  root.FFFlopCheckraisePracticeGenerator = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
