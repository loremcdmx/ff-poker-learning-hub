const RANK_ORDER = "23456789TJQKA";
export const RAW_RFI_SUPPORTED_NETWORKS = Object.freeze([
  "888Poker",
  "Chico",
  "GGNetwork",
  "PokerPlanets",
  "PokerStars",
  "PokerStars(FR-ES-PT)",
  "Winamax.fr",
  "WPN",
  "iPoker",
]);
const SUPPORTED_NETWORKS = new Set(RAW_RFI_SUPPORTED_NETWORKS);

export function parseRawRfiHand({ network = "", hhText = "", heroNickname = "" } = {}) {
  if (!SUPPORTED_NETWORKS.has(network)) return rejected("unsupported-network");
  if (!hhText) return rejected("empty-hand-history");
  if (network === "iPoker") return parseIpokerHand(hhText, network, heroNickname);
  return parseTextHand(hhText, network, heroNickname);
}

export function normalizeHandClass(cards) {
  if (!Array.isArray(cards) || cards.length !== 2) return "";
  const normalized = cards.map(normalizeCard);
  if (normalized.some((card) => !card)) return "";
  if (normalized[0].rank === normalized[1].rank && normalized[0].suit === normalized[1].suit) return "";
  const [first, second] = normalized;
  const ordered = [first, second].sort((left, right) => {
    return RANK_ORDER.indexOf(right.rank) - RANK_ORDER.indexOf(left.rank);
  });
  if (ordered[0].rank === ordered[1].rank) return `${ordered[0].rank}${ordered[1].rank}`;
  return `${ordered[0].rank}${ordered[1].rank}${ordered[0].suit === ordered[1].suit ? "s" : "o"}`;
}

function parseTextHand(hhText, network, heroNickname) {
  const rawSeats = parseTextSeats(hhText);

  const dealtCandidates = [...hhText.matchAll(/^Dealt to\s+(.+?)\s*\[\s*([^\]]+?)\s*\]\s*$/gim)]
    .map((match) => ({
      player: cleanPlayer(match[1]),
      cards: match[2].match(/(?:10|[2-9TJQKA])[cdhs]/gi) || [],
    }))
    .filter((item) => item.cards.length === 2);
  const selectedHero = selectHeroCandidate(dealtCandidates, heroNickname);
  if (!selectedHero.candidate) {
    return rejected(selectedHero.reason, { playerCount: rawSeats.length });
  }
  const dealt = selectedHero.candidate;

  const handClass = normalizeHandClass(dealt.cards);
  if (!handClass) return rejected("invalid-hero-cards", { playerCount: rawSeats.length });
  const forcedContributions = parseTextForcedContributions(hhText);
  const preflop = textPreflopSection(hhText);
  if (!preflop) {
    return rejected("preflop-section-not-found", {
      playerCount: rawSeats.length,
      handClass,
    });
  }
  const actions = parseTextActions(preflop);
  const seats = rawSeats;
  if (seats.length !== 7) {
    return rejected("not-exact-7", {
      playerCount: seats.length,
      rawSeatCount: rawSeats.length,
      handClass,
    });
  }
  const heroSeatIndex = seats.findIndex((seat) => samePlayer(seat.player, dealt.player));
  if (heroSeatIndex < 0) return rejected("hero-seat-not-found", { playerCount: seats.length, handClass });

  const buttonMatch = hhText.match(/(?:Table[^\r\n]*\s)?Seat\s+#?(\d+)\s+is\s+the\s+button/i);
  if (!buttonMatch) return rejected("button-not-found", { playerCount: seats.length, handClass });
  let buttonSeatIndex = seats.findIndex((seat) => seat.seat === Number(buttonMatch[1]));
  let usedButtonFallback = false;
  if (buttonSeatIndex < 0) {
    buttonSeatIndex = inferButtonFromSmallBlind(seats, forcedContributions);
    usedButtonFallback = buttonSeatIndex >= 0;
  }
  if (buttonSeatIndex < 0) return rejected("button-seat-not-found", { playerCount: seats.length, handClass });
  let positionCode = positionCodeFromSeatIndexes(heroSeatIndex, buttonSeatIndex, seats.length);
  if (positionCode === null || positionCode === 8) {
    return rejected("unsupported-position", { playerCount: seats.length, handClass, positionCode });
  }

  const postedBigBlind = forcedContributions.find((item) => item.kind === "big blind")?.amount || 0;
  const postedSmallBlind = forcedContributions.find((item) => item.kind === "small blind")?.amount || 0;
  const bigBlind = Math.max(postedBigBlind, postedSmallBlind * 2);
  if (!(bigBlind > 0)) return rejected("big-blind-not-found", { playerCount: seats.length, handClass });

  const heroActionIndex = actions.findIndex((action) => samePlayer(action.player, dealt.player));
  if (heroActionIndex < 0) return rejected("hero-action-not-found", { playerCount: seats.length, handClass });
  const priorActions = actions.slice(0, heroActionIndex);
  let usedDeadBlindFallback = false;
  let unopened = hasExactPriorFolds(
    priorActions,
    seats,
    buttonSeatIndex,
    heroSeatIndex,
    positionCode
  );
  if (!unopened && hasDeadSmallBlind(forcedContributions)) {
    const fallbackPosition = positionCodeFromPriorFolds(priorActions, seats, dealt.player);
    if (fallbackPosition !== null) {
      positionCode = fallbackPosition;
      usedDeadBlindFallback = true;
      unopened = true;
    }
  }
  if (!unopened) {
    return rejected("not-unopened", { playerCount: seats.length, handClass });
  }
  const heroAction = actions[heroActionIndex];
  if (!["fold", "limp", "raise"].includes(heroAction.kind)) {
    return rejected("unsupported-hero-action", { playerCount: seats.length, handClass });
  }

  const heroSeat = seats[heroSeatIndex];
  const nextHeroAction = actions.slice(heroActionIndex + 1)
    .findIndex((action) => samePlayer(action.player, dealt.player));
  const behindEnd = nextHeroAction < 0 ? actions.length : heroActionIndex + 1 + nextHeroAction;
  const playersBehind = actions.slice(heroActionIndex + 1, behindEnd).map((action) => action.player);
  const stackCandidates = decisionStackCandidates(
    seats,
    heroSeatIndex,
    buttonSeatIndex,
    forcedContributions.filter((item) => item.kind === "ante"),
    forcedContributions.find((item) => item.kind === "big blind")?.player || "",
    playersBehind
  );
  const effectiveChips = usedDeadBlindFallback
    ? Math.max(stackCandidates.actionBehind, stackCandidates.bigBlind)
    : stackCandidates.maxBehind;
  if (!(effectiveChips > 0)) return rejected("effective-stack-not-found", { playerCount: seats.length, handClass });
  const effectiveStackBb = effectiveChips / bigBlind;
  const shoveToleranceChips = bigBlind * 0.01;
  const heroPostedBlind = forcedContributions
    .filter((item) => (
      samePlayer(item.player, dealt.player)
      && (item.kind === "small blind" || item.kind === "big blind")
    ))
    .reduce((sum, item) => sum + item.amount, 0);
  const heroCommitmentAmount = network === "888Poker"
    && heroAction.amountCount === 1
    && !heroAction.hasTotalTo
    ? heroAction.amount + heroPostedBlind
    : heroAction.amount;
  const shove = heroAction.kind === "raise" && (
    heroAction.allIn
    || heroCommitmentAmount >= effectiveChips - shoveToleranceChips
  );

  return {
    ok: true,
    network,
    playerCount: seats.length,
    handClass,
    heroSeat: heroSeat.seat,
    buttonSeat: seats[buttonSeatIndex].seat,
    positionCode,
    bigBlind,
    effectiveChips,
    effectiveStackBb,
    stackCandidatesBb: divideStackCandidates(stackCandidates, bigBlind),
    action: shove ? "shove" : heroAction.kind,
    actionAmount: heroAction.amount,
    actionCommitment: heroCommitmentAmount,
    allInText: heroAction.allIn,
    usedButtonFallback,
    usedDeadBlindFallback,
  };
}

function parseIpokerHand(hhText, network, heroNickname) {
  const playerNodes = deduplicateExact(
    hhText.match(/<player\b[^>]*>/gi) || []
  );
  const players = playerNodes.map((node) => ({
    seat: Number(xmlAttribute(node, "seat")),
    player: cleanPlayer(xmlAttribute(node, "name")),
    chips: parseAmount(xmlAttribute(node, "chips")),
    dealer: xmlAttribute(node, "dealer") === "1",
    node,
  }));
  const uniqueSeats = new Set(players.map((player) => player.seat));
  if (
    players.length !== 7
    || uniqueSeats.size !== players.length
    || players.some((player) => !(player.seat > 0) || !(player.chips > 0))
  ) {
    return rejected("not-exact-7", { playerCount: players.length });
  }
  players.sort((left, right) => left.seat - right.seat);

  const heroSeatIndex = players.findIndex((player) => (
    samePlayer(player.player, heroNickname)
  ));
  if (heroSeatIndex < 0) {
    return rejected("hero-seat-not-found", { playerCount: players.length });
  }
  const forcedActions = parseIpokerActions(extractIpokerRound(hhText, "0"));
  const preflopActions = parseIpokerActions(extractIpokerRound(hhText, "1"));
  const buttonIndexes = players
    .map((player, index) => player.dealer ? index : -1)
    .filter((index) => index >= 0);
  let buttonSeatIndex = buttonIndexes.length === 1 ? buttonIndexes[0] : -1;
  let usedButtonFallback = false;
  if (buttonSeatIndex < 0 && buttonIndexes.length === 0) {
    buttonSeatIndex = inferIpokerButtonFromSmallBlind(players, forcedActions);
    usedButtonFallback = buttonSeatIndex >= 0;
  }
  if (buttonSeatIndex < 0) {
    return rejected("button-seat-not-found", { playerCount: players.length });
  }
  let positionCode = positionCodeFromSeatIndexes(
    heroSeatIndex,
    buttonSeatIndex,
    players.length
  );
  if (positionCode === null || positionCode === 8) {
    return rejected("unsupported-position", {
      playerCount: players.length,
      positionCode,
    });
  }

  const heroPocketNodes = deduplicateExact(
    (hhText.match(/<cards\b[^>]*>[^<]*<\/cards>/gi) || []).filter((node) => (
      xmlAttribute(node, "type") === "Pocket"
      && samePlayer(xmlAttribute(node, "player"), heroNickname)
    ))
  );
  if (heroPocketNodes.length !== 1) {
    return rejected("hero-cards-not-found", { playerCount: players.length });
  }
  const suitFirstCards = (
    extractXmlPayload(heroPocketNodes[0]).match(/[CDHS](?:10|[2-9TJQKA])/gi) || []
  );
  if (suitFirstCards.length !== 2) {
    return rejected("invalid-hero-cards", { playerCount: players.length });
  }
  const handClass = normalizeHandClass(suitFirstCards.map((card) => (
    `${card.slice(1)}${card[0]}`
  )));
  if (!handClass) {
    return rejected("invalid-hero-cards", { playerCount: players.length });
  }

  const bigBlind = parseAmount(extractXmlElement(hhText, "bigblind"));
  if (!(bigBlind > 0)) {
    return rejected("big-blind-not-found", {
      playerCount: players.length,
      handClass,
    });
  }
  if (!preflopActions.length) {
    return rejected("preflop-section-not-found", {
      playerCount: players.length,
      handClass,
    });
  }
  const anteFor = (player) => forcedActions
    .filter((action) => action.type === "15" && samePlayer(action.player, player))
    .reduce((sum, action) => sum + action.amount, 0);
  const decisionStacks = players.map((player) => (
    Math.max(0, player.chips - anteFor(player.player))
  ));
  const bigBlindActions = forcedActions.filter((action) => action.type === "2");
  const bigBlindSeatIndex = bigBlindActions.length === 1
    ? players.findIndex((player) => samePlayer(player.player, bigBlindActions[0].player))
    : -1;
  const bigBlindDecisionStack = bigBlindSeatIndex >= 0
    ? decisionStacks[bigBlindSeatIndex]
    : 0;
  const actionOrderOffsets = [3, 4, 5, 6, 0, 1, 2];
  const seatActionOrders = players.map((player, index) => (
    actionOrderOffsets.indexOf(
      (index - buttonSeatIndex + players.length) % players.length
    )
  ));
  const heroActionOrder = seatActionOrders[heroSeatIndex];
  const stacksBehind = decisionStacks.filter((stack, index) => (
    seatActionOrders[index] > heroActionOrder
  ));
  let effectiveChips = Math.min(
    decisionStacks[heroSeatIndex],
    Math.max(0, ...stacksBehind)
  );
  if (!(effectiveChips > 0)) {
    return rejected("effective-stack-not-found", {
      playerCount: players.length,
      handClass,
    });
  }

  const heroActionIndex = preflopActions.findIndex((action) => (
    samePlayer(action.player, players[heroSeatIndex].player)
  ));
  if (heroActionIndex < 0) {
    return rejected("hero-action-not-found", {
      playerCount: players.length,
      handClass,
    });
  }
  let usedDeadBlindFallback = false;
  let unopened = heroActionIndex === expectedPriorFolds(positionCode);
  for (let index = 0; unopened && index < heroActionIndex; index += 1) {
    const expectedSeatIndex = (
      buttonSeatIndex + actionOrderOffsets[index]
    ) % players.length;
    if (
      preflopActions[index].type !== "0"
      || !samePlayer(
        preflopActions[index].player,
        players[expectedSeatIndex].player
      )
    ) {
      unopened = false;
    }
  }
  if (!unopened && hasDeadIpokerSmallBlind(forcedActions)) {
    const fallbackPosition = positionCodeFromIpokerPriorFolds(
      preflopActions.slice(0, heroActionIndex),
      players,
      players[heroSeatIndex].player
    );
    if (fallbackPosition !== null) {
      const nextHeroActionOffset = preflopActions.slice(heroActionIndex + 1)
        .findIndex((action) => samePlayer(
          action.player,
          players[heroSeatIndex].player
        ));
      const behindEnd = nextHeroActionOffset < 0
        ? preflopActions.length
        : heroActionIndex + 1 + nextHeroActionOffset;
      const actionBehindStacks = [...new Set(
        preflopActions.slice(heroActionIndex + 1, behindEnd)
          .map((action) => action.player)
      )]
        .map((player) => players.findIndex((candidate) => (
          samePlayer(candidate.player, player)
        )))
        .filter((index) => index >= 0)
        .map((index) => decisionStacks[index]);
      if (actionBehindStacks.length && bigBlindDecisionStack > 0) {
        effectiveChips = Math.min(
          decisionStacks[heroSeatIndex],
          Math.max(bigBlindDecisionStack, ...actionBehindStacks)
        );
        positionCode = fallbackPosition;
        usedDeadBlindFallback = true;
        unopened = true;
      }
    }
  }
  if (!unopened) {
    return rejected("not-unopened", {
      playerCount: players.length,
      handClass,
    });
  }

  const heroAction = preflopActions[heroActionIndex];
  const shoveToleranceChips = bigBlind * 0.01;
  let action = "other";
  if (heroAction.type === "0") action = "fold";
  else if (heroAction.type === "3") action = "limp";
  else if (heroAction.type === "23") {
    action = heroAction.amount >= effectiveChips - shoveToleranceChips
      ? "shove"
      : "raise";
  } else if (heroAction.type === "7") {
    action = heroAction.amount > bigBlind ? "shove" : "limp";
  }
  if (!["fold", "limp", "raise", "shove"].includes(action)) {
    return rejected("unsupported-hero-action", {
      playerCount: players.length,
      handClass,
    });
  }

  return {
    ok: true,
    network,
    playerCount: players.length,
    handClass,
    heroSeat: players[heroSeatIndex].seat,
    buttonSeat: players[buttonSeatIndex].seat,
    positionCode,
    bigBlind,
    effectiveChips,
    effectiveStackBb: effectiveChips / bigBlind,
    action,
    actionAmount: heroAction.amount,
    allInText: heroAction.type === "7",
    usedButtonFallback,
    usedDeadBlindFallback,
  };
}

function parseTextSeats(hhText) {
  const seats = [];
  for (const line of hhText.replace(/\r/g, "").split("\n")) {
    if (/\bout of hand\b/i.test(line)) continue;
    const match = line.match(/^Seat\s+(\d+):\s+(.+?)\s+\(\s*([0-9]+(?:,[0-9]{3})*(?:\.[0-9]+)?)/i);
    if (!match) continue;
    const chips = parseAmount(match[3]);
    if (!(chips > 0)) continue;
    seats.push({
      seat: Number(match[1]),
      player: cleanPlayer(match[2]),
      chips,
    });
  }
  const unique = new Map();
  for (const seat of seats) {
    if (!unique.has(seat.seat)) unique.set(seat.seat, seat);
  }
  return [...unique.values()].sort((left, right) => left.seat - right.seat);
}

function parseIpokerActions(roundPayload) {
  return (roundPayload.match(/<action\b[^>]*\/>/gi) || []).map((node) => ({
    player: cleanPlayer(xmlAttribute(node, "player")),
    type: xmlAttribute(node, "type"),
    amount: parseAmount(xmlAttribute(node, "sum")),
  }));
}

function extractIpokerRound(hhText, roundNumber) {
  const matches = [...hhText.matchAll(/<round\b([^>]*)>([\s\S]*?)<\/round>/gi)]
    .filter((match) => xmlAttribute(`<round ${match[1]}>`, "no") === roundNumber);
  return matches.length === 1 ? matches[0][2] : "";
}

function extractXmlElement(xml, element) {
  const match = xml.match(new RegExp(`<${element}>([^<]*)</${element}>`, "i"));
  return match?.[1] || "";
}

function extractXmlPayload(node) {
  return node.match(/>([^<]*)<\/cards>/i)?.[1] || "";
}

function xmlAttribute(node, attribute) {
  const match = node.match(new RegExp(`\\b${attribute}="([^"]*)"`, "i"));
  return decodeXml(match?.[1] || "");
}

function deduplicateExact(values) {
  return [...new Set(values)];
}

function parseTextForcedContributions(hhText) {
  const contributions = [];
  for (const rawLine of hhText.replace(/\r/g, "").split("\n")) {
    const match = rawLine.trim().match(/^(.+?)(?::)?\s+posts(?:\s+the)?\s+(ante|small blind|big blind)\s*\[?\s*([0-9][0-9,.]*)/i);
    if (!match) continue;
    contributions.push({
      player: cleanPlayer(match[1]),
      kind: match[2].toLowerCase(),
      amount: parseAmount(match[3]),
    });
  }
  return contributions;
}

function textPreflopSection(hhText) {
  const normalized = hhText.replace(/\r/g, "");
  const startPatterns = [
    /\*\*\*\s*HOLE CARDS\s*\*\*/i,
    /\*\*\*\s*PRE-FLOP\s*\*\*\*/i,
    /\*\*\s*Dealing down cards\s*\*\*/i,
  ];
  const start = startPatterns.map((pattern) => pattern.exec(normalized))
    .find(Boolean);
  if (!start) return "";
  const rest = normalized.slice(start.index + start[0].length);
  const end = rest.search(/^\*{2,3}\s*(?:FLOP|Dealing Flop)\b/im);
  return end >= 0 ? rest.slice(0, end) : rest;
}

function parseTextActions(preflop) {
  const actions = [];
  for (const rawLine of preflop.split("\n")) {
    const line = rawLine.trim();
    if (!line || /^Dealt to\b/i.test(line)) continue;
    const match = line.match(/^(.+?)(?::)?\s+(folds?|calls?|raises?|checks?)\b(.*)$/i);
    if (!match) continue;
    const verb = match[2].toLowerCase();
    let kind = "other";
    if (verb.startsWith("fold")) kind = "fold";
    else if (verb.startsWith("call")) kind = "limp";
    else if (verb.startsWith("raise")) kind = "raise";
    const amounts = (match[3].match(/[0-9][0-9,.]*/g) || []).map(parseAmount);
    actions.push({
      player: cleanPlayer(match[1]),
      kind,
      amount: amounts.at(-1) || 0,
      amountCount: amounts.length,
      hasTotalTo: /\bto\b/i.test(match[3]),
      allIn: /\ball(?:-| )?in\b/i.test(match[3]),
    });
  }
  return actions;
}

function positionCodeFromSeatIndexes(heroSeatIndex, buttonSeatIndex, playerCount) {
  if (playerCount !== 7 || heroSeatIndex < 0 || buttonSeatIndex < 0) return null;
  const offset = (heroSeatIndex - buttonSeatIndex + playerCount) % playerCount;
  return [0, 9, 8, 4, 3, 2, 1][offset] ?? null;
}

function expectedPriorFolds(positionCode) {
  return ({ 4: 0, 3: 1, 2: 2, 1: 3, 0: 4, 9: 5 })[positionCode] ?? -1;
}

function positionCodeFromFoldCount(foldCount) {
  // A dead small blind leaves one extra leading fold in the observed action
  // stream. The structured seven-max overlap confirms that removing exactly
  // that one fold reproduces the nominal EP..BTN position labels.
  return [null, 4, 3, 2, 1, 0][foldCount] ?? null;
}

function positionCodeFromPriorFolds(priorActions, seats, heroPlayer) {
  if (priorActions.length > 5 || priorActions.some((action) => action.kind !== "fold")) {
    return null;
  }
  const actorKeys = priorActions.map((action) => playerKey(action.player));
  if (
    new Set(actorKeys).size !== actorKeys.length
    || priorActions.some((action) => (
      samePlayer(action.player, heroPlayer)
      || !seats.some((seat) => samePlayer(seat.player, action.player))
    ))
  ) {
    return null;
  }
  return positionCodeFromFoldCount(priorActions.length);
}

function positionCodeFromIpokerPriorFolds(priorActions, players, heroPlayer) {
  if (priorActions.length > 5 || priorActions.some((action) => action.type !== "0")) {
    return null;
  }
  const actorKeys = priorActions.map((action) => playerKey(action.player));
  if (
    new Set(actorKeys).size !== actorKeys.length
    || priorActions.some((action) => (
      samePlayer(action.player, heroPlayer)
      || !players.some((player) => samePlayer(player.player, action.player))
    ))
  ) {
    return null;
  }
  return positionCodeFromFoldCount(priorActions.length);
}

function hasDeadSmallBlind(forcedContributions) {
  return (
    forcedContributions.filter((item) => item.kind === "small blind").length === 0
    && forcedContributions.filter((item) => item.kind === "big blind").length === 1
  );
}

function hasDeadIpokerSmallBlind(forcedActions) {
  return (
    forcedActions.filter((action) => action.type === "1").length === 0
    && forcedActions.filter((action) => action.type === "2").length === 1
  );
}

function inferButtonFromSmallBlind(seats, forcedContributions) {
  const smallBlinds = forcedContributions.filter((item) => item.kind === "small blind");
  if (smallBlinds.length !== 1) return -1;
  const smallBlindSeatIndex = seats.findIndex((seat) => (
    samePlayer(seat.player, smallBlinds[0].player)
  ));
  if (smallBlindSeatIndex < 0) return -1;
  return (smallBlindSeatIndex - 1 + seats.length) % seats.length;
}

function inferIpokerButtonFromSmallBlind(players, forcedActions) {
  const smallBlinds = forcedActions.filter((action) => action.type === "1");
  if (smallBlinds.length !== 1) return -1;
  const smallBlindSeatIndex = players.findIndex((player) => (
    samePlayer(player.player, smallBlinds[0].player)
  ));
  if (smallBlindSeatIndex < 0) return -1;
  return (smallBlindSeatIndex - 1 + players.length) % players.length;
}

function hasExactPriorFolds(priorActions, seats, buttonSeatIndex, heroSeatIndex, positionCode) {
  const actionOrderOffsets = [3, 4, 5, 6, 0, 1, 2];
  const heroOffset = (heroSeatIndex - buttonSeatIndex + seats.length) % seats.length;
  const heroOrder = actionOrderOffsets.indexOf(heroOffset);
  if (heroOrder !== expectedPriorFolds(positionCode) || priorActions.length !== heroOrder) return false;
  return priorActions.every((action, index) => {
    const expectedSeatIndex = (buttonSeatIndex + actionOrderOffsets[index]) % seats.length;
    return action.kind === "fold" && samePlayer(action.player, seats[expectedSeatIndex].player);
  });
}

function selectHeroCandidate(candidates, heroNickname) {
  candidates = [...new Map(candidates.map((item) => [
    `${item.player}\u0000${item.cards.join(" ").toLowerCase()}`,
    item,
  ])).values()];
  const exactMatches = heroNickname
    ? candidates.filter((item) => samePlayer(item.player, heroNickname))
    : [];
  if (exactMatches.length === 1) return { candidate: exactMatches[0], reason: "" };
  if (exactMatches.length > 1) return { candidate: null, reason: "ambiguous-hero-cards" };

  // GG exports can anonymize the tracked nickname as the literal `Hero`.
  // This is the only fallback certified by the structured overlap sample.
  const literalHeroMatches = candidates.filter((item) => item.player.toLowerCase() === "hero");
  if (literalHeroMatches.length === 1) return { candidate: literalHeroMatches[0], reason: "" };
  if (literalHeroMatches.length > 1) return { candidate: null, reason: "ambiguous-hero-cards" };
  return { candidate: null, reason: "hero-cards-not-found" };
}

function decisionStackCandidates(seats, heroSeatIndex, buttonSeatIndex, anteContributions, bigBlindPlayer, playersBehind) {
  const actionOrder = [3, 4, 5, 6, 0, 1, 2];
  const heroOffset = (heroSeatIndex - buttonSeatIndex + seats.length) % seats.length;
  const heroOrder = actionOrder.indexOf(heroOffset);
  if (heroOrder < 0) return { hero: 0, maxBehind: 0, minBehind: 0, bigBlind: 0, actionBehind: 0 };
  const anteFor = (player) => anteContributions
    .filter((item) => samePlayer(item.player, player))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const decisionStacks = seats.map((seat, seatIndex) => ({
    stack: Math.max(0, seat.chips - anteFor(seat.player)),
    order: actionOrder.indexOf((seatIndex - buttonSeatIndex + seats.length) % seats.length),
  }));
  const heroStack = decisionStacks[heroSeatIndex].stack;
  const stacksBehind = decisionStacks
    .filter((item) => item.order > heroOrder)
    .map((item) => item.stack);
  const bigBlindSeatIndex = seats.findIndex((seat) => samePlayer(seat.player, bigBlindPlayer));
  const bigBlindStack = bigBlindSeatIndex >= 0 ? decisionStacks[bigBlindSeatIndex].stack : 0;
  const actionBehindStacks = [...new Set(playersBehind)]
    .map((player) => seats.findIndex((seat) => samePlayer(seat.player, player)))
    .filter((seatIndex) => seatIndex >= 0)
    .map((seatIndex) => decisionStacks[seatIndex].stack);
  return {
    hero: heroStack,
    maxBehind: stacksBehind.length ? Math.min(heroStack, Math.max(...stacksBehind)) : 0,
    minBehind: stacksBehind.length ? Math.min(heroStack, Math.min(...stacksBehind)) : 0,
    bigBlind: bigBlindStack > 0 ? Math.min(heroStack, bigBlindStack) : 0,
    actionBehind: actionBehindStacks.length ? Math.min(heroStack, Math.max(...actionBehindStacks)) : 0,
  };
}

function divideStackCandidates(candidates, bigBlind) {
  return Object.fromEntries(Object.entries(candidates).map(([key, value]) => [
    key,
    bigBlind > 0 ? value / bigBlind : 0,
  ]));
}

function normalizeCard(raw) {
  const match = String(raw || "").trim().match(/^(10|[2-9TJQKA])([cdhs])$/i);
  if (!match) return null;
  return {
    rank: match[1].toUpperCase().replace("10", "T"),
    suit: match[2].toLowerCase(),
  };
}

function parseAmount(raw) {
  const normalized = String(raw || "").replace(/\s/g, "").replace(/,/g, "").replace(/[^\d.-]/g, "");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : 0;
}

function cleanPlayer(raw) {
  return decodeXml(String(raw || "").trim().replace(/:$/, ""));
}

function samePlayer(left, right) {
  return playerKey(left) === playerKey(right);
}

function playerKey(player) {
  return cleanPlayer(player).normalize("NFKC");
}

function decodeXml(raw) {
  return String(raw || "")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function rejected(reason, partial = {}) {
  return { ok: false, reason, ...partial };
}
