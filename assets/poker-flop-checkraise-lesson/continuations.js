(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;
  const CARD_RE = /^(?:[2-9TJQKA])[cdhs]$/;
  const STREET_BOARD_COUNTS = Object.freeze({ flop: 3, turn: 4, river: 5, showdown: 5 });

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  }

  function finite(value) {
    return Number.isFinite(Number(value));
  }

  function close(left, right, tolerance = 0.001) {
    return Math.abs(Number(left) - Number(right)) <= tolerance;
  }

  function cardsInSnapshot(graph, snapshot) {
    return [
      ...(graph.hero.cards || []),
      ...(snapshot.reveal?.villainCards || []),
      ...(snapshot.table.board || [])
    ];
  }

  function validateGraph(graph) {
    const errors = [];
    const fail = (message) => errors.push(String(message));
    if (!graph || typeof graph !== "object") return { ok: false, errors: ["graph must be an object"] };
    if (graph.schema !== "ff-flop-checkraise-continuation-v1") fail("unexpected graph schema");
    if (!graph.spotId) fail("spotId is required");
    if (!graph.entryNodeId) fail("entryNodeId is required");
    if (!Array.isArray(graph.hero?.cards) || graph.hero.cards.length !== 2) fail("Hero must have exactly two cards");
    if (!Array.isArray(graph.villain?.cards) || graph.villain.cards.length !== 2) fail("Villain must have exactly two private cards");
    const privateCards = [...(graph.hero?.cards || []), ...(graph.villain?.cards || [])];
    privateCards.forEach((card) => { if (!CARD_RE.test(String(card))) fail(`invalid private card ${card}`); });
    if (new Set(privateCards).size !== privateCards.length) fail("private cards must be unique");
    if (!finite(graph.trackedChipsBb) || Number(graph.trackedChipsBb) <= 0) fail("trackedChipsBb must be positive");

    const nodes = graph.nodes && typeof graph.nodes === "object" ? graph.nodes : {};
    if (!Object.keys(nodes).length) fail("graph must have nodes");
    if (!nodes[graph.entryNodeId]) fail("entryNodeId must reference an existing node");
    let terminalCount = 0;

    Object.entries(nodes).forEach(([nodeId, node]) => {
      if (!node || typeof node !== "object") {
        fail(`${nodeId}: node must be an object`);
        return;
      }
      if (node.id !== nodeId) fail(`${nodeId}: node.id must match its registry key`);
      const snapshot = node.snapshot || {};
      const table = snapshot.table || {};
      const board = Array.isArray(table.board) ? table.board : [];
      const expectedBoardCount = STREET_BOARD_COUNTS[table.street];
      if (expectedBoardCount == null) fail(`${nodeId}: unsupported street ${table.street}`);
      else if (board.length !== expectedBoardCount) fail(`${nodeId}: ${table.street} needs ${expectedBoardCount} board cards`);
      board.forEach((card) => { if (!CARD_RE.test(String(card))) fail(`${nodeId}: invalid board card ${card}`); });
      const visibleCards = cardsInSnapshot(graph, snapshot);
      if (new Set(visibleCards).size !== visibleCards.length) fail(`${nodeId}: duplicate visible/private card`);
      if (!Array.isArray(table.seats) || table.seats.length !== 6) fail(`${nodeId}: table needs six seats`);
      for (const key of ["potBb", "heroStackBb", "villainStackBb"]) {
        if (!finite(table[key]) || Number(table[key]) < 0) fail(`${nodeId}: ${key} must be a non-negative number`);
      }
      if (
        finite(table.potBb)
        && finite(table.heroStackBb)
        && finite(table.villainStackBb)
        && !close(Number(table.potBb) + Number(table.heroStackBb) + Number(table.villainStackBb), graph.trackedChipsBb)
      ) {
        fail(`${nodeId}: pot plus live stacks must conserve ${graph.trackedChipsBb} BB`);
      }
      const options = Array.isArray(node.options) ? node.options : [];
      const optionKeys = options.map((option) => String(option?.key || ""));
      if (new Set(optionKeys).size !== optionKeys.length || optionKeys.some((key) => !key)) fail(`${nodeId}: option keys must be non-empty and unique`);
      options.forEach((option) => {
        if (!nodes[option.nextNodeId]) fail(`${nodeId}.${option.key}: nextNodeId does not exist`);
      });
      if (node.nextNodeId && !nodes[node.nextNodeId]) fail(`${nodeId}: nextNodeId does not exist`);

      if (node.kind === "terminal") {
        terminalCount += 1;
        if (options.length || node.nextNodeId) fail(`${nodeId}: terminal nodes cannot continue`);
        if (table.street !== "showdown") fail(`${nodeId}: terminal node must be a showdown snapshot`);
        if (snapshot.reveal?.villainCards?.join(",") !== graph.villain.cards.join(",")) fail(`${nodeId}: showdown must reveal the configured Villain cards`);
        if (snapshot.result?.winner !== "hero") fail(`${nodeId}: this teaching graph must resolve to Hero`);
        if (!close(snapshot.result?.payoutBb, table.potBb)) fail(`${nodeId}: payout must equal the showdown pot`);
      }
    });

    if (!terminalCount) fail("graph needs at least one terminal showdown");
    return { ok: errors.length === 0, errors };
  }

  const seatOrder = ["UTG", "HJ", "CO", "BTN", "SB", "BB"];

  function seats(heroStackBb, villainStackBb, revealVillain = false) {
    return seatOrder.map((position) => ({
      position,
      role: position === "BB" ? "hero" : position === "BTN" ? "villain" : "folded",
      stackBb: position === "BB" ? heroStackBb : position === "BTN" ? villainStackBb : null,
      cards: position === "BB" ? ["Th", "9h"] : position === "BTN" && revealVillain ? ["Kd", "Ks"] : []
    }));
  }

  function snapshot({
    street,
    board,
    potBb,
    heroStackBb,
    villainStackBb,
    prompt,
    actionLine,
    history,
    reveal = false,
    result = null
  }) {
    return {
      table: {
        street,
        board,
        potBb,
        heroStackBb,
        villainStackBb,
        heroPosition: "BB",
        villainPosition: "BTN",
        dealerPosition: "BTN",
        actor: street === "showdown" ? null : "BB",
        toCallBb: 0,
        currentBetBb: 0,
        seats: seats(heroStackBb, villainStackBb, reveal)
      },
      prompt,
      actionLine,
      history,
      ...(reveal ? { reveal: { villainCards: ["Kd", "Ks"], reason: "showdown" } } : {}),
      ...(result ? { result } : {})
    };
  }

  const graph = {
    schema: "ff-flop-checkraise-continuation-v1",
    version: 1,
    spotId: "xr-t9-backdoors",
    title: "T♥9♥ на K♣8♥2♠ · сыграть до шоудауна",
    entryNodeId: "flop-xr-called",
    trackedChipsBb: 85.5,
    hero: { position: "BB", cards: ["Th", "9h"] },
    villain: { position: "BTN", cards: ["Kd", "Ks"], revealAt: "showdown" },
    setup: {
      effectiveStackAtFlopBb: 40,
      flopPotBeforeBetBb: 5.5,
      sourceDecision: { action: "checkraise", raiseToBb: 5.5 },
      resolvedActions: [
        { street: "flop", actor: "BB", action: "check" },
        { street: "flop", actor: "BTN", action: "bet", amountBb: 1.8, potAfterBb: 7.3 },
        { street: "flop", actor: "BB", action: "raise", raiseToBb: 5.5, potAfterBb: 12.8 },
        { street: "flop", actor: "BTN", action: "call", amountBb: 3.7, potAfterBb: 16.5 }
      ]
    },
    nodes: {
      "flop-xr-called": {
        id: "flop-xr-called",
        kind: "transition",
        snapshot: snapshot({
          street: "flop",
          board: ["Kc", "8h", "2s"],
          potBb: 16.5,
          heroStackBb: 34.5,
          villainStackBb: 34.5,
          prompt: "BTN заколлировал check-raise. Открываем терн.",
          actionLine: ["BB check", "BTN bet 1.8 BB", "BB raise to 5.5 BB", "BTN call 3.7 BB"],
          history: "SRP BTN vs BB · flop check-raise получил колл"
        }),
        transition: { action: "deal", card: "Jh" },
        nextNodeId: "turn-jh-decision"
      },
      "turn-jh-decision": {
        id: "turn-jh-decision",
        kind: "decision",
        snapshot: snapshot({
          street: "turn",
          board: ["Kc", "8h", "2s", "Jh"],
          potBb: 16.5,
          heroStackBb: 34.5,
          villainStackBb: 34.5,
          prompt: "J♥ превратил два backdoor-направления в OESD и flush draw. Продолжать давление?",
          actionLine: ["Turn J♥ · BB to act"],
          history: "Flop: BB check-raise 5.5 BB · BTN call"
        }),
        options: [
          {
            key: "bet-10",
            label: "Поставить 10 BB",
            action: { type: "bet", amountBb: 10 },
            recommended: true,
            feedback: "Около 61% банка: Hero давит на Kx и сохраняет много equity против колла.",
            nextNodeId: "turn-bet-called"
          },
          {
            key: "check",
            label: "Чек",
            action: { type: "check" },
            recommended: false,
            feedback: "Чек сохраняет equity и ведёт в более маленький river pot; это пассивная ветка примера.",
            nextNodeId: "turn-checked-through"
          }
        ]
      },
      "turn-bet-called": {
        id: "turn-bet-called",
        kind: "transition",
        snapshot: snapshot({
          street: "turn",
          board: ["Kc", "8h", "2s", "Jh"],
          potBb: 36.5,
          heroStackBb: 24.5,
          villainStackBb: 24.5,
          prompt: "Hero поставил 10 BB, BTN заколлировал. Открываем ривер.",
          actionLine: ["BB bet 10 BB", "BTN call 10 BB"],
          history: "Flop X/R-call · Turn barrel-call"
        }),
        transition: { action: "deal", card: "Qh" },
        nextNodeId: "river-qh-after-barrel"
      },
      "turn-checked-through": {
        id: "turn-checked-through",
        kind: "transition",
        snapshot: snapshot({
          street: "turn",
          board: ["Kc", "8h", "2s", "Jh"],
          potBb: 16.5,
          heroStackBb: 34.5,
          villainStackBb: 34.5,
          prompt: "Hero прочекал, BTN сыграл check back. Открываем ривер.",
          actionLine: ["BB check", "BTN check"],
          history: "Flop X/R-call · Turn checked through"
        }),
        transition: { action: "deal", card: "Qh" },
        nextNodeId: "river-qh-after-checkback"
      },
      "river-qh-after-barrel": {
        id: "river-qh-after-barrel",
        kind: "decision",
        snapshot: snapshot({
          street: "river",
          board: ["Kc", "8h", "2s", "Jh", "Qh"],
          potBb: 36.5,
          heroStackBb: 24.5,
          villainStackBb: 24.5,
          prompt: "Q♥ закрыл backdoor flush. Как добирать после turn barrel-call?",
          actionLine: ["River Q♥ · BB to act"],
          history: "Flop X/R-call · Turn 10 BB-call"
        }),
        options: [
          {
            key: "jam-24.5",
            label: "Олл-ин 24.5 BB",
            action: { type: "allin", amountBb: 24.5 },
            recommended: true,
            feedback: "Около 67% банка. Пример добирает со скрытого backdoor flush; BTN коллирует с сетом.",
            nextNodeId: "showdown-barrel-jam"
          },
          {
            key: "check",
            label: "Чек",
            action: { type: "check" },
            recommended: false,
            feedback: "Чек гарантирует шоудаун, но оставляет вэлью на столе против сильной made hand.",
            nextNodeId: "showdown-barrel-check"
          }
        ]
      },
      "river-qh-after-checkback": {
        id: "river-qh-after-checkback",
        kind: "decision",
        snapshot: snapshot({
          street: "river",
          board: ["Kc", "8h", "2s", "Jh", "Qh"],
          potBb: 16.5,
          heroStackBb: 34.5,
          villainStackBb: 34.5,
          prompt: "После check-check на терне Hero собрал flush. Как добирать в маленьком банке?",
          actionLine: ["River Q♥ · BB to act"],
          history: "Flop X/R-call · Turn check-check"
        }),
        options: [
          {
            key: "bet-12",
            label: "Поставить 12 BB",
            action: { type: "bet", amountBb: 12 },
            recommended: true,
            feedback: "Около 73% банка. BTN коллирует с сетом, и Hero реализует скрытое river value.",
            nextNodeId: "showdown-checkback-bet"
          },
          {
            key: "check",
            label: "Чек",
            action: { type: "check" },
            recommended: false,
            feedback: "Рука выигрывает шоудаун, но чек недобирает против сильной made hand.",
            nextNodeId: "showdown-checkback-check"
          }
        ]
      },
      "showdown-barrel-jam": {
        id: "showdown-barrel-jam",
        kind: "terminal",
        snapshot: snapshot({
          street: "showdown",
          board: ["Kc", "8h", "2s", "Jh", "Qh"],
          potBb: 85.5,
          heroStackBb: 0,
          villainStackBb: 0,
          prompt: "BTN коллирует олл-ин и открывает K♦K♠.",
          actionLine: ["BB all-in 24.5 BB", "BTN call 24.5 BB", "Showdown"],
          history: "Три барреля после check-raise",
          reveal: true,
          result: { winner: "hero", payoutBb: 85.5, heroHand: "Q-high flush", villainHand: "set of Kings" }
        })
      },
      "showdown-barrel-check": {
        id: "showdown-barrel-check",
        kind: "terminal",
        snapshot: snapshot({
          street: "showdown",
          board: ["Kc", "8h", "2s", "Jh", "Qh"],
          potBb: 36.5,
          heroStackBb: 24.5,
          villainStackBb: 24.5,
          prompt: "BTN чекает следом и открывает K♦K♠.",
          actionLine: ["BB check", "BTN check", "Showdown"],
          history: "Turn barrel-call · River check-check",
          reveal: true,
          result: { winner: "hero", payoutBb: 36.5, heroHand: "Q-high flush", villainHand: "set of Kings" }
        })
      },
      "showdown-checkback-bet": {
        id: "showdown-checkback-bet",
        kind: "terminal",
        snapshot: snapshot({
          street: "showdown",
          board: ["Kc", "8h", "2s", "Jh", "Qh"],
          potBb: 40.5,
          heroStackBb: 22.5,
          villainStackBb: 22.5,
          prompt: "BTN коллирует 12 BB и открывает K♦K♠.",
          actionLine: ["BB bet 12 BB", "BTN call 12 BB", "Showdown"],
          history: "Turn check-check · River value bet-call",
          reveal: true,
          result: { winner: "hero", payoutBb: 40.5, heroHand: "Q-high flush", villainHand: "set of Kings" }
        })
      },
      "showdown-checkback-check": {
        id: "showdown-checkback-check",
        kind: "terminal",
        snapshot: snapshot({
          street: "showdown",
          board: ["Kc", "8h", "2s", "Jh", "Qh"],
          potBb: 16.5,
          heroStackBb: 34.5,
          villainStackBb: 34.5,
          prompt: "BTN чекает следом и открывает K♦K♠.",
          actionLine: ["BB check", "BTN check", "Showdown"],
          history: "Turn check-check · River check-check",
          reveal: true,
          result: { winner: "hero", payoutBb: 16.5, heroHand: "Q-high flush", villainHand: "set of Kings" }
        })
      }
    }
  };

  const validation = validateGraph(graph);
  if (!validation.ok) throw new Error(`Invalid flop check-raise continuation: ${validation.errors.join("; ")}`);

  const graphs = deepFreeze({ [graph.spotId]: graph });

  function nativeStreet(value) {
    return value;
  }

  function resolvePlayableNode(nodes, nodeId) {
    let currentId = nodeId;
    const visited = new Set();
    while (nodes[currentId]?.kind === "transition") {
      if (visited.has(currentId)) throw new Error(`Continuation transition cycle at ${currentId}`);
      visited.add(currentId);
      currentId = nodes[currentId].nextNodeId;
    }
    return currentId;
  }

  function nativeSeats(source, graphSource, terminal) {
    return (source || []).map((seat) => {
      const position = seat.position;
      const isHero = position === graphSource.hero.position;
      const isVillain = position === graphSource.villain.position;
      return {
        label: position,
        state: isHero ? "hero" : isVillain ? "waiting" : "folded",
        stackBb: seat.stackBb == null ? 40 : seat.stackBb,
        cards: terminal && isVillain ? graphSource.villain.cards.slice() : [],
        revealCardsAfterAnswer: Boolean(terminal && isVillain)
      };
    });
  }

  function nativeTable(graphSource, sourceNode) {
    const source = sourceNode.snapshot;
    const table = source.table;
    const terminal = sourceNode.kind === "terminal";
    return {
      seats: nativeSeats(table.seats, graphSource, terminal),
      heroPosition: graphSource.hero.position,
      heroStack: `${table.heroStackBb} BB`,
      effectiveStack: `${Math.min(table.heroStackBb, table.villainStackBb)} BB`,
      pot: `${table.potBb} BB`,
      heroCards: graphSource.hero.cards.slice(),
      boardCards: table.board.slice(),
      street: nativeStreet(table.street),
      actionLine: (source.actionLine || []).slice(),
      historyLine: source.history || "",
      toCall: 0,
      currentBet: 0,
      dealerPosition: table.dealerPosition || graphSource.villain.position
    };
  }

  function resultSummary(graphSource, sourceNode) {
    const result = sourceNode.snapshot.result || {};
    const suits = { c: "♣", d: "♦", h: "♥", s: "♠" };
    const showCards = (cards) => cards.map((card) => `${card[0]}${suits[card[1]] || card[1]}`).join(" ");
    const handLabels = {
      "Q-high flush": "флеш до дамы",
      "set of Kings": "сет королей"
    };
    const hero = showCards(graphSource.hero.cards);
    const villain = showCards(graphSource.villain.cards);
    return `Hero ${hero}: ${handLabels[result.heroHand] || result.heroHand || "готовая рука"}. ${graphSource.villain.position} ${villain}: ${handLabels[result.villainHand] || result.villainHand || "готовая рука"}. Карты соперника открыты вместе с полной линией раздачи.`;
  }

  function toNativeContinuation(spotId) {
    const graphSource = graphs[String(spotId || "")];
    if (!graphSource) return null;
    const nodes = {};
    Object.values(graphSource.nodes).forEach((sourceNode) => {
      if (sourceNode.kind === "transition") return;
      const terminal = sourceNode.kind === "terminal";
      nodes[sourceNode.id] = {
        id: sourceNode.id,
        title: terminal ? "Шоудаун: против чего играли" : (sourceNode.snapshot.table.street === "turn" ? "Решение на тёрне" : "Решение на ривере"),
        question: sourceNode.snapshot.prompt,
        table: nativeTable(graphSource, sourceNode),
        ...(terminal ? {
          terminal: true,
          result: {
            winner: sourceNode.snapshot.result?.winner === "hero" ? "Hero" : graphSource.villain.position,
            summary: resultSummary(graphSource, sourceNode)
          }
        } : {
          options: sourceNode.options.map((option) => {
            const target = resolvePlayableNode(graphSource.nodes, option.nextNodeId);
            return {
              key: option.key,
              label: option.label,
              correct: option.recommended === true,
              feedback: option.feedback,
              next: target,
              advanceLabel: graphSource.nodes[target]?.kind === "terminal" ? "Показать showdown и карты BTN" : "Открыть следующую улицу"
            };
          })
        })
      };
    });
    return deepFreeze({
      schemaVersion: 1,
      start: resolvePlayableNode(graphSource.nodes, graphSource.entryNodeId),
      nodes
    });
  }

  const registry = Object.freeze({
    schema: "ff-flop-checkraise-continuation-registry-v1",
    graphs,
    get(spotId) { return graphs[String(spotId || "")] || null; },
    getContinuation: toNativeContinuation,
    validate: validateGraph
  });

  root.FF_FLOP_CHECKRAISE_CONTINUATIONS = registry;
  if (typeof module !== "undefined" && module.exports) module.exports = registry;
})();
