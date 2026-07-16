(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;
  const SPOT_ID = "vs3-btn-ip-51_80-4x-v1";
  const HERO_CARDS = Object.freeze(["As", "Js"]);
  const VILLAIN_CARDS = Object.freeze(["Qh", "Qc"]);
  const SEAT_ORDER = Object.freeze(["UTG", "MP", "HJ", "CO", "BTN", "SB", "BB"]);

  function deepFreeze(value) {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
    Object.values(value).forEach(deepFreeze);
    return Object.freeze(value);
  }

  function seats(heroStack, villainStack, revealVillain = false) {
    return SEAT_ORDER.map((label) => {
      const hero = label === "BTN";
      const villain = label === "SB";
      return {
        label,
        state: hero ? "hero" : villain ? "waiting" : "folded",
        stackBb: hero ? heroStack : villain ? villainStack : 60,
        cards: villain && revealVillain ? VILLAIN_CARDS.slice() : [],
        revealCardsAfterAnswer: Boolean(villain && revealVillain)
      };
    });
  }

  function table({
    street,
    board,
    pot,
    heroStack,
    villainStack,
    toCall = 0,
    currentBet = 0,
    actionLine,
    historyLine,
    revealVillain = false
  }) {
    return {
      seats: seats(heroStack, villainStack, revealVillain),
      heroPosition: "BTN",
      heroStack: `${heroStack} BB`,
      effectiveStack: `${Math.min(heroStack, villainStack)} BB`,
      pot: `${pot} BB`,
      anteBb: 0,
      heroCards: HERO_CARDS.slice(),
      boardCards: board.slice(),
      street,
      actionLine: actionLine.slice(),
      historyLine,
      toCall,
      currentBet,
      dealerPosition: "BTN"
    };
  }

  function showdownNode({
    id,
    title,
    question,
    board,
    pot,
    heroStack,
    villainStack,
    actionLine,
    historyLine,
    winner,
    summary
  }) {
    return {
      id,
      title,
      question,
      terminal: true,
      table: table({
        street: "showdown",
        board,
        pot,
        heroStack,
        villainStack,
        actionLine,
        historyLine,
        revealVillain: true
      }),
      result: { winner, summary }
    };
  }

  const continuation = deepFreeze({
    schemaVersion: 1,
    start: "flop-vs-cbet",
    ui: {
      launchLabel: "Доиграть 3-бет-пот до шоудауна",
      coachEyebrow: "Свободное доигрывание · 3-бет-пот",
      coachTitle: "SB принял колл — играем постфлоп в позиции",
      coachCopy: "Первый ответ уже оценён. Теперь выбери готовые действия на флопе и тёрне; они не меняют счёт тренажёра.",
      completeEyebrow: "Шоудаун · диапазон стал конкретным",
      completeTitle: "SB открыл Q♥Q♣ и полный runout",
      completeCopy: "Продолжение показывает цену позиции и pot control: корректная защита префлоп не обязана выиграть конкретную раздачу."
    },
    nodes: {
      "flop-vs-cbet": {
        id: "flop-vs-cbet",
        title: "Флоп в позиции",
        question: "SB ставит 5,5 BB в 17 BB на J♦7♣2♥. Как разыграть top pair с A♠J♠?",
        table: table({
          street: "flop",
          board: ["Jd", "7c", "2h"],
          pot: 22.5,
          heroStack: 52,
          villainStack: 46.5,
          toCall: 5.5,
          currentBet: 5.5,
          actionLine: ["BTN call 6 BB preflop", "SB bet 5.5 BB"],
          historyLine: "BTN open 2 BB · SB 3-bet 8 BB · BTN call"
        }),
        options: [
          {
            key: "fold",
            label: "Пас",
            correct: false,
            feedback: "Top pair с сильным кикером слишком высоко в диапазоне BTN для немедленного паса на небольшой c-bet.",
            next: "showdown-flop-fold",
            advanceLabel: "Открыть карты SB"
          },
          {
            key: "call",
            label: "Колл 5,5 BB",
            correct: true,
            feedback: "Колл сохраняет блефы SB, реализует позицию и не раздувает банк против оверпар.",
            next: "turn-after-call",
            advanceLabel: "Открыть тёрн"
          },
          {
            key: "raise",
            label: "Рейз до 17 BB",
            correct: false,
            feedback: "Рейз изолирует AJs против сильных продолжений и выбивает часть рук, которые могли баррелить хуже.",
            next: "showdown-flop-raise",
            advanceLabel: "Доиграть ветку и открыть карты"
          }
        ]
      },
      "turn-after-call": {
        id: "turn-after-call",
        title: "Тёрн после колла",
        question: "На 4♠ SB чекает. Как использовать позицию с одной парой?",
        table: table({
          street: "turn",
          board: ["Jd", "7c", "2h", "4s"],
          pot: 28,
          heroStack: 46.5,
          villainStack: 46.5,
          actionLine: ["Flop: SB bet 5.5 BB", "BTN call 5.5 BB", "Turn: SB check"],
          historyLine: "3-bet pot · flop c-bet-call · turn SB check"
        }),
        options: [
          {
            key: "check",
            label: "Чек следом",
            correct: true,
            feedback: "Чек сохраняет showdown value, защищает диапазон check-back и не платит лишнее оверпаре.",
            next: "showdown-turn-check",
            advanceLabel: "Открыть ривер и карты SB"
          },
          {
            key: "bet",
            label: "Поставить 8 BB",
            correct: false,
            feedback: "Тонкий bet возможен против более широкого профиля, но в учебной линии чаще изолирует нас против лучшего.",
            next: "showdown-turn-bet",
            advanceLabel: "Доиграть ветку и открыть карты"
          }
        ]
      },
      "showdown-flop-fold": showdownNode({
        id: "showdown-flop-fold",
        title: "Пас на флопе",
        question: "Учебный runout открыт вместе с рукой SB.",
        board: ["Jd", "7c", "2h", "4s", "3d"],
        pot: 22.5,
        heroStack: 52,
        villainStack: 46.5,
        actionLine: ["SB bet 5.5 BB", "BTN fold", "SB shows Q♥Q♣"],
        historyLine: "BTN защитил префлоп, но сдал top pair на первом барреле",
        winner: "SB",
        summary: "SB показал Q♥Q♣. Пас A♠J♠ на небольшой c-bet недореализовал сильную часть диапазона колла BTN."
      }),
      "showdown-flop-raise": showdownNode({
        id: "showdown-flop-raise",
        title: "Раздутый банк",
        question: "SB заколлировал рейз; дальнейшие улицы прошли check-check.",
        board: ["Jd", "7c", "2h", "4s", "3d"],
        pot: 51,
        heroStack: 35,
        villainStack: 35,
        actionLine: ["BTN raise to 17 BB", "SB call 11.5 BB", "Turn check-check", "River check-check"],
        historyLine: "Flop raise-call · showdown",
        winner: "SB",
        summary: "SB показал Q♥Q♣. Флоп-рейз A♠J♠ построил большой банк против оверпары и выбил слабые баррели."
      }),
      "showdown-turn-check": showdownNode({
        id: "showdown-turn-check",
        title: "Pot control в позиции",
        question: "Ривер 3♦ прошёл check-check. Открываем карты.",
        board: ["Jd", "7c", "2h", "4s", "3d"],
        pot: 28,
        heroStack: 46.5,
        villainStack: 46.5,
        actionLine: ["Turn check-check", "River check-check", "SB shows Q♥Q♣"],
        historyLine: "Call preflop · call flop · check back turn · showdown",
        winner: "SB",
        summary: "SB показал Q♥Q♣ и выиграл 28 BB. BTN реализовал equity A♠J♠, сохранил слабые руки в диапазоне SB и не раздул банк."
      }),
      "showdown-turn-bet": showdownNode({
        id: "showdown-turn-bet",
        title: "Тонкий bet получил call",
        question: "SB заколлировал 8 BB; ривер прошёл check-check.",
        board: ["Jd", "7c", "2h", "4s", "3d"],
        pot: 44,
        heroStack: 38.5,
        villainStack: 38.5,
        actionLine: ["BTN bet 8 BB", "SB call 8 BB", "River check-check", "SB shows Q♥Q♣"],
        historyLine: "Call preflop · call flop · turn bet-call · showdown",
        winner: "SB",
        summary: "SB показал Q♥Q♣ и выиграл 44 BB. Turn bet A♠J♠ добавил деньги против верхней части check-range без улучшения руки."
      })
    }
  });

  const continuations = deepFreeze({ [SPOT_ID]: continuation });
  const registry = Object.freeze({
    schemaVersion: 1,
    spotIds: Object.freeze([SPOT_ID]),
    getContinuation(spotId) {
      return continuations[String(spotId || "")] || null;
    }
  });

  root.FF_VS3BET_CONTINUATIONS = registry;
  if (typeof module !== "undefined" && module.exports) module.exports = registry;
})();
