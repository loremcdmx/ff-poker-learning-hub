(function () {
  "use strict";

  const preflopSeats = [
    { label: "UTG", state: "folded" },
    { label: "HJ", state: "folded" },
    { label: "CO", state: "folded" },
    { label: "BTN", state: "hero" },
    { label: "SB", state: "blind" },
    { label: "BB", state: "blind" }
  ];

  const firstHandPreflopSeats = [
    { label: "ранняя", state: "folded" },
    { label: "средняя", state: "folded" },
    { label: "CO", state: "folded" },
    { label: "BTN", state: "hero" },
    { label: "SB", state: "blind" },
    { label: "BB", state: "blind" }
  ];

  const firstHandPostflopSeats = [
    { label: "ранняя", state: "folded" },
    { label: "средняя", state: "folded" },
    { label: "CO", state: "folded" },
    { label: "BTN", state: "hero" },
    { label: "SB", state: "folded" },
    { label: "BB", state: "villain" }
  ];

  const commonContract = {
    schema: "ff-trainer-shell-pack-v1",
    runtime: "FFTrainerShell.mount",
    telemetry: "ff-trainer-event-v1",
    result: "FFPlayerProgress.setResult",
    richEvents: ["trainer_decision", "trainer_session"],
    requiredSpotFields: ["id", "title", "question", "table", "options"]
  };

  const packs = [
    {
      ...commonContract,
      id: "trainer-shell-first-hand",
      title: "Первая раздача",
      subtitle: "Одна раздача на общем скелете: префлоп, флоп, тёрн, ривер",
      trainer: {
        key: "start",
        title: "Первая раздача",
        version: "first-hand-shell-20260605"
      },
      theme: {
        tone: "analysis",
        accent: "violet",
        table: "violet"
      },
      qualityBar: {
        id: "first_hand_shell_quality_v1",
        label: "Скелет первой раздачи",
        labVersion: "first-hand-shell-20260605",
        skillKey: "start",
        checkpointGateId: "test_razdacha",
        canvasRows: ["test_razdacha:6:223"],
        sourceRows: ["istoria_pokera_trainer_n", "test_razdacha_2_n", "test_termini_n", "test_stavki_n"],
        sourcePacks: [
          "6a3dd07c-a684-49bc-b569-85fa22c48463",
          "29920207-dd15-4fd6-a1b8-71df28bc8eed",
          "c84aca24-abc3-4f22-9efb-1f5c11dd68a1",
          "d1bcaeb7-602d-4559-b187-a901f7e5c17c",
          "a621f420-ee86-4ce1-8934-815be9ba887e",
          "31c7c422-8949-49f9-9d47-a10098c6a642",
          "a17db9c8-8742-4573-89b2-71397427ba60",
          "56a37502-0715-4ea8-9bfd-46e90a4105c4",
          "8ffe7e46-fddb-4bc2-88c2-e17510386254"
        ]
      },
      sessionLength: 4,
      passScore: 75,
      nextRecommendation: "positions",
      sourceRows: ["istoria_pokera_trainer_n", "test_razdacha_2_n", "test_termini_n", "test_stavki_n"],
      reviewRoutes: [
        {
          label: "Повторить первую раздачу",
          href: "first-hand-story.html?source=player-path&skill=start&checkpoint=test_razdacha",
          reason: "закрепить базовую линию на всех улицах первой раздачи",
          targetTags: ["too_tight_button_open", "missed_small_cbet", "missed_draw_pressure", "hero_call_king_high"]
        }
      ],
      spots: [
        {
          id: "first-hand-shell-preflop-kqs-btn",
          title: "Префлоп / BTN KQs",
          question: "До Героя все выбросили. Мы на BTN с KQs. Выбери первое действие.",
          source: {
            label: "first_hand_source_gate",
            row: "test_razdacha_2_n",
            detail: "первая раздача: стартовая улица"
          },
          table: {
            seats: firstHandPreflopSeats,
            heroPosition: "BTN",
            heroStack: "40 BB",
            pot: "1.5 BB",
            heroCards: ["Ks", "Qs"],
            boardCards: [],
            street: "preflop",
            actionLine: ["ранняя fold", "средняя fold", "CO fold"],
            line: "Ранняя, средняя и CO выкинули. За нами только блайнды.",
            potLabel: "блайнды"
          },
          metrics: [
            { label: "Улица", value: "префлоп", tone: "good" },
            { label: "Позиция", value: "BTN", tone: "good" },
            { label: "Рука", value: "KQs", tone: "good" },
            { label: "Банк", value: "пустой", tone: "neutral" }
          ],
          gates: [
            { label: "Источник", value: "test_razdacha_2_n", state: "passed", detail: "кадр первой раздачи покрыт" },
            { label: "Позиция", value: "BTN", state: "passed", detail: "поздняя позиция открывается шире" },
            { label: "Легально", value: "open / fold", state: "passed", detail: "колла до открытия нет" },
            { label: "Действие", value: "open", state: "open", detail: "закроется после ответа" }
          ],
          model: {
            label: "Позиция + инициатива",
            primary: "Открываем KQs на баттоне: забираем инициативу и играем против блайндов.",
            reject: "Не превращаем сильную позднюю руку в пас и не лимпим в пустой банк.",
            exploit: "Сужаемся только против явного давления от обоих блайндов."
          },
          actionMap: [
            { label: "Позиция", value: "BTN", state: "good" },
            { label: "Рука", value: "KQs", state: "good" },
            { label: "Сайзинг", value: "2.2 BB", state: "good" },
            { label: "Лик", value: "слишком тайтово", state: "warn" }
          ],
          options: [
            {
              key: "fold",
              label: "Пас",
              tone: "bad",
              errorTag: "too_tight_button_open",
              feedback: "Слишком тайтово. KQs на баттоне достаточно сильна, чтобы открыть торговлю."
            },
            {
              key: "open",
              label: "Открыть 2.2 BB",
              tone: "good",
              correct: true,
              feedback: "Хорошо. Мы забираем инициативу, играем в позиции и не раздуваем банк без причины."
            },
            {
              key: "limp",
              label: "Просто колл",
              tone: "warn",
              errorTag: "invalid_limp_unopened",
              feedback: "До нас никто не вошёл в банк. Колл невозможен: нужно либо открыть, либо выбросить."
            }
          ]
        },
        {
          id: "first-hand-shell-flop-small-cbet",
          title: "Флоп / сухой туз",
          question: "BB заколлил. Флоп A72 rainbow, соперник чекнул. Выбери базовую линию.",
          source: {
            label: "first_hand_bet_gate",
            row: "test_stavki_n",
            detail: "первая раздача: ставка на флопе"
          },
          table: {
            seats: firstHandPostflopSeats,
            heroPosition: "BTN",
            heroStack: "38 BB",
            pot: "5.5 BB",
            heroCards: ["Ks", "Qs"],
            boardCards: ["As", "7h", "2c"],
            street: "flop",
            actionLine: ["BTN open 2.2 BB", "BB call", "BB check"],
            line: "Герой открыл BTN, BB защитился и чекнул сухой A-high флоп.",
            potLabel: "рейженный банк"
          },
          metrics: [
            { label: "Улица", value: "флоп", tone: "good" },
            { label: "Доска", value: "сухой A", tone: "good" },
            { label: "Инициатива", value: "у нас", tone: "good" },
            { label: "Размер", value: "малый", tone: "neutral" }
          ],
          gates: [
            { label: "Источник", value: "test_stavki_n", state: "passed", detail: "кадр ставки покрыт" },
            { label: "Текстура", value: "сухой A-high", state: "passed", detail: "борд хорошо подходит рейзеру" },
            { label: "Легально", value: "bet / check", state: "passed", detail: "оппонент чекнул" },
            { label: "Действие", value: "малый c-bet", state: "open", detail: "закроется после ответа" }
          ],
          model: {
            label: "Малый c-bet",
            primary: "Ставим небольшой c-bet: сухой тузовый флоп часто забирается диапазоном.",
            reject: "Не ставим банк с K-high и не сдаёмся только потому, что рука не попала.",
            exploit: "Чекаем чаще только против соперника, который хорошо атакует маленькие ставки."
          },
          actionMap: [
            { label: "Текстура", value: "сухая", state: "good" },
            { label: "Преимущество", value: "рейзер", state: "good" },
            { label: "Рука", value: "K-high", state: "warn" },
            { label: "Лик", value: "оверсайз", state: "warn" }
          ],
          options: [
            {
              key: "check",
              label: "Чек",
              tone: "warn",
              errorTag: "missed_small_cbet",
              feedback: "Чек возможен, но базовая линия здесь чаще маленькая ставка: доска сухая и хорошо подходит нашему диапазону."
            },
            {
              key: "bet-small",
              label: "Ставка 33%",
              tone: "good",
              correct: true,
              feedback: "Хорошо. Маленькая ставка давит на слабые руки и не раздувает банк без готовой сильной руки."
            },
            {
              key: "bet-pot",
              label: "Ставка в банк",
              tone: "bad",
              errorTag: "oversized_flop_cbet",
              feedback: "Слишком много. Большая ставка с король-хай создаёт лишний риск."
            }
          ]
        },
        {
          id: "first-hand-shell-turn-draw-pressure",
          title: "Тёрн / дро и давление",
          question: "BB заколлил флоп. Тёрн 9s, у Героя появилось дро. Соперник чекнул.",
          source: {
            label: "first_hand_terms_gate",
            row: "test_termini_n",
            detail: "первая раздача: улицы и легальные действия"
          },
          table: {
            seats: firstHandPostflopSeats,
            heroPosition: "BTN",
            heroStack: "36 BB",
            pot: "9.2 BB",
            heroCards: ["Ks", "Qs"],
            boardCards: ["As", "7h", "2c", "9s"],
            street: "turn",
            actionLine: ["BTN open 2.2 BB", "BB call", "BTN bet 33%", "BB call", "BB check"],
            line: "После колла флопа у Героя сохраняется инициатива и появляется дополнительное эквити.",
            potLabel: "банк тёрна"
          },
          metrics: [
            { label: "Улица", value: "тёрн", tone: "neutral" },
            { label: "Эквити", value: "дро", tone: "good" },
            { label: "Fold equity", value: "есть", tone: "good" },
            { label: "Риск", value: "пуш", tone: "warn" }
          ],
          gates: [
            { label: "Источник", value: "test_termini_n", state: "passed", detail: "улица и действие покрыты" },
            { label: "Легально", value: "bet / check", state: "passed", detail: "фолд на чек невозможен" },
            { label: "План", value: "давление", state: "passed", detail: "ставка оставляет fold equity" },
            { label: "Действие", value: "ставка", state: "open", detail: "закроется после ответа" }
          ],
          model: {
            label: "Дро + fold equity",
            primary: "Ставим с дро и инициативой: можно забрать банк сейчас или усилиться после колла.",
            reject: "Не превращаем дро в автопуш и не фолдим, когда против нас нет ставки.",
            exploit: "Чек подходит против игрока, который слишком часто чек-рейзит тёрн."
          },
          actionMap: [
            { label: "Инициатива", value: "у нас", state: "good" },
            { label: "Эквити", value: "дро", state: "good" },
            { label: "Ставка", value: "60%", state: "good" },
            { label: "Лик", value: "автопуш", state: "warn" }
          ],
          options: [
            {
              key: "bet-turn",
              label: "Ставка 60%",
              tone: "good",
              correct: true,
              feedback: "Хорошо. У нас есть давление и шанс усилиться, если получим колл."
            },
            {
              key: "check",
              label: "Чек",
              tone: "warn",
              errorTag: "missed_draw_pressure",
              feedback: "Чек не катастрофа, но мы часто теряем возможность забрать банк прямо сейчас."
            },
            {
              key: "jam",
              label: "Пуш",
              tone: "bad",
              errorTag: "draw_overpush",
              feedback: "Слишком дорого. Дро не стоит превращать в автоматический олл-ин при таком стеке."
            }
          ]
        },
        {
          id: "first-hand-shell-river-discipline",
          title: "Ривер / дисциплина",
          question: "Ривер 2d. Дро не закрылось, BB ставит 14 BB. Что делаем с K-high?",
          source: {
            label: "first_hand_history_gate",
            row: "istoria_pokera_trainer_n",
            detail: "первая раздача: итоговая дисциплина"
          },
          table: {
            seats: firstHandPostflopSeats,
            heroPosition: "BTN",
            heroStack: "28 BB",
            pot: "20.2 BB",
            heroCards: ["Ks", "Qs"],
            boardCards: ["As", "7h", "2c", "9s", "2d"],
            street: "river",
            actionLine: ["BTN bet 33%", "BB call", "BTN check turn", "BB bet 14 BB"],
            line: "Флеш не закрылся. В банк летит крупная ставка, а у Героя только K-high.",
            potLabel: "ривер"
          },
          metrics: [
            { label: "Улица", value: "ривер", tone: "neutral" },
            { label: "Рука", value: "K-high", tone: "warn" },
            { label: "Ставка", value: "14 BB", tone: "bad" },
            { label: "Линия", value: "пас", tone: "good" }
          ],
          gates: [
            { label: "Источник", value: "istoria_pokera_trainer_n", state: "passed", detail: "финальный кадр покрыт" },
            { label: "Готовая рука", value: "нет", state: "warn", detail: "дро промазало" },
            { label: "Цена", value: "дорого", state: "warn", detail: "крупная ставка против нас" },
            { label: "Действие", value: "пас", state: "open", detail: "закроется после ответа" }
          ],
          model: {
            label: "Дисциплина против ставки",
            primary: "Пасуем: без пары и без доезда платим только с сильной причиной.",
            reject: "Не делаем hero call из любопытства, когда банк уже дорогой.",
            exploit: "Рейз-блеф оставляем для продвинутых спотов с понятными блокерами и фолд-эквити."
          },
          actionMap: [
            { label: "Рука", value: "без пары", state: "warn" },
            { label: "Дро", value: "мимо", state: "warn" },
            { label: "Цена", value: "высокая", state: "bad" },
            { label: "Лик", value: "hero call", state: "bad" }
          ],
          options: [
            {
              key: "fold",
              label: "Пас",
              tone: "good",
              correct: true,
              feedback: "Хорошо. Дро не закрылось, готовой руки нет, ставка крупная. Дисциплина на ривере экономит деньги."
            },
            {
              key: "call",
              label: "Колл",
              tone: "bad",
              errorTag: "hero_call_king_high",
              feedback: "Слишком любопытно. Большие коллы с король-хай быстро съедают банкролл."
            },
            {
              key: "raise",
              label: "Переставить",
              tone: "warn",
              errorTag: "advanced_bluff_raise",
              feedback: "Блеф-переставление здесь слишком сложное для базовой линии и плохо подходит новичку."
            }
          ]
        }
      ]
    },
    {
      ...commonContract,
      id: "trainer-shell-preflop",
      title: "Скелет / Префлоп",
      subtitle: "Единая оболочка для тренажёров решений",
      trainer: {
        key: "trainer_shell_lab",
        title: "Скелет тренажёра",
        version: "trainer-shell-v1"
      },
      theme: {
        tone: "command",
        accent: "mint",
        table: "graphite"
      },
      qualityBar: {
        id: "trainer_shell_skeleton_v1",
        label: "Скелет v1"
      },
      sessionLength: 3,
      passScore: 67,
      nextRecommendation: "trainer_shell_lab.review",
      sourceRows: ["openraise_from_bu", "trainer_izol_reiz_1_n", "test_strategia_bb_n"],
      reviewRoutes: [
        {
          label: "Повторить префлоп",
          href: "trainer-shell-lab.html?pack=trainer-shell-preflop",
          reason: "закрепить общий префлоп-скелет перед переносом следующего тренажёра",
          targetTags: ["shell_wrong_route", "shell_price_miss"]
        }
      ],
      spots: [
        {
          id: "shell-rfi-btn-q9s-30bb",
          title: "BTN первым входит / 30 BB",
          question: "Герой на BTN с Q9s. До нас все выкинули. Выбери базовую линию.",
          source: {
            label: "open_first_source_gate",
            row: "openraise_from_bu",
            detail: "строка открытия с поздней позиции"
          },
          table: {
            seats: preflopSeats,
            heroPosition: "BTN",
            heroStack: "30 BB",
            pot: "1.5 BB",
            heroCards: ["Qs", "9s"],
            boardCards: [],
            street: "preflop",
            actionLine: ["UTG fold", "HJ fold", "CO fold"],
            line: "UTG, HJ и CO выкинули. За нами только блайнды.",
            potLabel: "блайнды"
          },
          metrics: [
            { label: "Позиция", value: "BTN", tone: "good" },
            { label: "Стек", value: "30 BB", tone: "neutral" },
            { label: "Рука", value: "Q9s", tone: "good" },
            { label: "Давление", value: "низкое", tone: "good" }
          ],
          gates: [
            { label: "Источник", value: "openraise_from_bu", state: "passed", detail: "строка позднего RFI покрыта" },
            { label: "Позиция", value: "BTN", state: "passed", detail: "самое широкое открытие первым" },
            { label: "Стек", value: "30 BB", state: "passed", detail: "стек для raise/fold, не пуш-фолд" },
            { label: "Телеметрия", value: "общая", state: "passed", detail: "результат и решение идут через общий outbox" }
          ],
          model: {
            label: "Поздний RFI",
            primary: "Открываем одномастную даму на BTN и давим на оба блайнда.",
            reject: "Не выкидываем прибыльное позднее открытие только потому, что рука не премиум.",
            exploit: "Сужаемся только против явного 3-бет давления от обоих блайндов."
          },
          actionMap: [
            { label: "Класс руки", value: "одномастная высокая", state: "good" },
            { label: "Позиция", value: "BTN", state: "good" },
            { label: "Сайзинг", value: "2.2 BB", state: "good" },
            { label: "Лик", value: "оверфолд BTN", state: "warn" }
          ],
          options: [
            {
              key: "fold",
              label: "Пас",
              tone: "bad",
              errorTag: "shell_button_overfold",
              feedback: "Так мы слишком часто отдаём позднее эквити и дарим блайндам бесплатный проход."
            },
            {
              key: "open",
              label: "Открыть 2.2 BB",
              tone: "good",
              correct: true,
              feedback: "Верно. Скелет фиксирует источник, позицию, стек и действие перед записью результата."
            },
            {
              key: "push",
              label: "Пуш",
              tone: "warn",
              errorTag: "shell_wrong_stack_mode",
              feedback: "Рука играется, но 30 BB — это не ветка пуш-фолда."
            }
          ]
        },
        {
          id: "shell-iso-co-a8s-40bb",
          title: "CO против одного лимпера / 40 BB",
          question: "Один лимпер в MP, Герой на CO с A8s. Выбери изоляцию по источнику.",
          source: {
            label: "isolation_source_gate",
            row: "trainer_izol_reiz_1_n",
            detail: "строка изоляции одного лимпера"
          },
          table: {
            seats: [
              { label: "UTG", state: "folded" },
              { label: "MP", state: "limper" },
              { label: "CO", state: "hero" },
              { label: "BTN", state: "waiting" },
              { label: "SB", state: "blind" },
              { label: "BB", state: "blind" }
            ],
            heroPosition: "CO",
            heroStack: "40 BB",
            pot: "2.5 BB",
            heroCards: ["As", "8s"],
            boardCards: [],
            street: "preflop",
            actionLine: ["UTG fold", "MP limp 1 BB"],
            line: "MP лимпит. У Героя есть позиция и возможность забрать инициативу.",
            potLabel: "лимп + блайнды"
          },
          metrics: [
            { label: "Лимперы", value: "1", tone: "warn" },
            { label: "Позиция", value: "CO", tone: "good" },
            { label: "Рука", value: "A8s", tone: "good" },
            { label: "Сайзинг", value: "4.5 BB", tone: "neutral" }
          ],
          gates: [
            { label: "Источник", value: "trainer_izol_reiz_1_n", state: "passed", detail: "строка против одного лимпера" },
            { label: "Лимп", value: "один", state: "passed", detail: "рейз больше обычного RFI" },
            { label: "Позиция", value: "CO", state: "passed", detail: "после лимпера на постфлопе" },
            { label: "Действие", value: "изолейт", state: "open", detail: "закроется после ответа" }
          ],
          model: {
            label: "Изоляция",
            primary: "Рейзим и изолируем лимпера одномастным тузом, который доминирует худшие руки колла.",
            reject: "Лимп вдогонку отдаёт инициативу и дешево пускает блайнды.",
            exploit: "Меньший сайзинг нужен только если лимпер пере-фолдит на любой рейз."
          },
          actionMap: [
            { label: "Лимперы", value: "1", state: "good" },
            { label: "Позиция", value: "CO", state: "good" },
            { label: "Доминирование", value: "одномастный туз", state: "good" },
            { label: "Лик", value: "пассивный колл", state: "warn" }
          ],
          options: [
            {
              key: "overlimp",
              label: "Оверлимп",
              tone: "warn",
              errorTag: "shell_passive_iso",
              feedback: "Оверлимп оставляет банк мультивей и отдаёт инициативу."
            },
            {
              key: "isolate",
              label: "Рейз 4.5 BB",
              tone: "good",
              correct: true,
              feedback: "Верно. Скелет показывает проверку лимпера без изменений кода движка."
            },
            {
              key: "fold",
              label: "Пас",
              tone: "bad",
              errorTag: "shell_missed_iso",
              feedback: "Слишком тайтово. Suited ace в позиции — чистый кандидат на изоляцию."
            }
          ]
        },
        {
          id: "shell-bb-defense-kto-price",
          title: "Защита BB / цена колла",
          question: "BTN открывает 2.2 BB, Герой на BB с KTo. Выбери дефолтную защиту.",
          source: {
            label: "bb_defense_source_gate",
            row: "test_strategia_bb_n",
            detail: "строка цены и защиты диапазона"
          },
          table: {
            seats: [
              { label: "UTG", state: "folded" },
              { label: "HJ", state: "folded" },
              { label: "CO", state: "folded" },
              { label: "BTN", state: "villain" },
              { label: "SB", state: "folded" },
              { label: "BB", state: "hero" }
            ],
            heroPosition: "BB",
            heroStack: "34 BB",
            pot: "4.2 BB",
            heroCards: ["Kh", "Tc"],
            boardCards: [],
            street: "preflop",
            actionLine: ["BTN open 2.2 BB", "SB fold"],
            toCall: "1.2 BB",
            line: "BTN открывает 2.2 BB. SB выкинул. Герой закрывает действие.",
            potLabel: "рейз + блайнды"
          },
          metrics: [
            { label: "Цена", value: "1.2 до колла", tone: "good" },
            { label: "Закрываем", value: "да", tone: "good" },
            { label: "Рука", value: "KTo", tone: "neutral" },
            { label: "Риск", value: "доминирование", tone: "warn" }
          ],
          gates: [
            { label: "Источник", value: "test_strategia_bb_n", state: "passed", detail: "строка цены BB" },
            { label: "Цена", value: "дешево закрыть", state: "passed", detail: "колл реализует достаточно эквити" },
            { label: "Диапазон", value: "защита", state: "passed", detail: "не дефолтный 3-бет блеф" },
            { label: "Действие", value: "колл", state: "open", detail: "закроется после ответа" }
          ],
          model: {
            label: "Защита по цене",
            primary: "Коллируем и реализуем эквити: цена на BB хорошая, действие закрывается.",
            reject: "Не 3-бетим доминируемую разномастную руку без явного exploit-рида.",
            exploit: "Фолд только против очень тайтового открытия и сильного постфлоп-недостатка."
          },
          actionMap: [
            { label: "Шансы банка", value: "хорошие", state: "good" },
            { label: "Действие", value: "закрываем", state: "good" },
            { label: "3-бет value", value: "низкое", state: "warn" },
            { label: "Лик", value: "оверфолд BB", state: "warn" }
          ],
          options: [
            {
              key: "fold",
              label: "Пас",
              tone: "bad",
              errorTag: "shell_bb_overfold",
              feedback: "Фолд отдаёт слишком много против такой цены BTN."
            },
            {
              key: "call",
              label: "Колл",
              tone: "good",
              correct: true,
              feedback: "Верно. Тот же скелет показывает цену колла и защиту BB."
            },
            {
              key: "threebet",
              label: "3-бет",
              tone: "warn",
              errorTag: "shell_bad_3bet",
              feedback: "Слишком агрессивный дефолт. Рука защищается коллом, а не value 3-бетом."
            }
          ]
        }
      ]
    },
    {
      ...commonContract,
      id: "trainer-shell-postflop",
      title: "Скелет / Постфлоп",
      subtitle: "Тот же движок, другой пак: борд, текстура и давление",
      trainer: {
        key: "trainer_shell_lab",
        title: "Скелет тренажёра",
        version: "trainer-shell-v1"
      },
      theme: {
        tone: "analysis",
        accent: "amber",
        table: "slate"
      },
      qualityBar: {
        id: "trainer_shell_skeleton_v1",
        label: "Скелет v1"
      },
      sessionLength: 2,
      passScore: 50,
      nextRecommendation: "trainer_shell_lab.port_next",
      sourceRows: ["test_kontbet_n", "test_bez_pozicii_n"],
      reviewRoutes: [
        {
          label: "Повторить постфлоп",
          href: "trainer-shell-lab.html?pack=trainer-shell-postflop",
          reason: "повторить текстуру и давление в общем скелете",
          targetTags: ["shell_texture_miss", "shell_pressure_miss"]
        }
      ],
      spots: [
        {
          id: "shell-flop-ip-dry-a72",
          title: "IP контбет / сухой туз-хай",
          question: "Герой открыл CO, BTN заколлил. Флоп A72 разномастный. Выбери базовую линию.",
          source: {
            label: "flop_aggressor_source_gate",
            row: "test_kontbet_n",
            detail: "строка контбета в позиции"
          },
          table: {
            seats: [
              { label: "HJ", state: "folded" },
              { label: "CO", state: "hero" },
              { label: "BTN", state: "villain" },
              { label: "SB", state: "folded" },
              { label: "BB", state: "folded" }
            ],
            heroPosition: "CO",
            heroStack: "36 BB",
            pot: "5.4 BB",
            heroCards: ["Kc", "Qd"],
            boardCards: ["As", "7d", "2c"],
            street: "flop",
            actionLine: ["CO open 2.3 BB", "BTN call", "BTN check"],
            line: "У Героя преимущество диапазона на сухом туз-хай борде.",
            potLabel: "рейженный банк"
          },
          metrics: [
            { label: "Текстура", value: "A72r", tone: "good" },
            { label: "Преимущество", value: "диапазон", tone: "good" },
            { label: "Эквити", value: "низкое", tone: "warn" },
            { label: "Сайзинг", value: "малый", tone: "neutral" }
          ],
          gates: [
            { label: "Источник", value: "test_kontbet_n", state: "passed", detail: "контрольная точка контбета" },
            { label: "Текстура", value: "сухой A", state: "passed", detail: "борд за рейзером" },
            { label: "Линия", value: "малый контбет", state: "passed", detail: "ставка диапазоном разрешена" },
            { label: "Действие", value: "бет", state: "open", detail: "закроется после ответа" }
          ],
          model: {
            label: "Текстура",
            primary: "Ставим маленький контбет: борд сухой и сильно за префлоп-рейзером.",
            reject: "Не сдаёмся только потому, что Герой не попал в борд.",
            exploit: "Чекаем чаще только против липких игроков, которые хорошо атакуют малые ставки."
          },
          actionMap: [
            { label: "Борд", value: "сухой туз-хай", state: "good" },
            { label: "Диапазон", value: "рейзер", state: "good" },
            { label: "Рука", value: "воздух", state: "warn" },
            { label: "Лик", value: "попал или пас", state: "warn" }
          ],
          options: [
            {
              key: "check",
              label: "Чек",
              tone: "warn",
              errorTag: "shell_fit_or_fold",
              feedback: "Если слишком часто чекать борды с преимуществом диапазона, стратегия становится прозрачной."
            },
            {
              key: "bet-small",
              label: "Ставка 25%",
              tone: "good",
              correct: true,
              feedback: "Верно. Пак борда меняется, но скелет продолжает вести тот же поток решения."
            },
            {
              key: "bet-pot",
              label: "Ставка в банк",
              tone: "bad",
              errorTag: "shell_bad_size",
              feedback: "Слишком крупно для сухой текстуры, где нужна ставка диапазоном."
            }
          ]
        },
        {
          id: "shell-flop-oop-wet-jt9",
          title: "OOP контбет / мокрый JT9",
          question: "Герой 3-бетнул SB, BTN заколлил. Флоп JTs9s. Выбери дисциплинированную линию.",
          source: {
            label: "flop_aggressor_source_gate",
            row: "test_bez_pozicii_n",
            detail: "строка давления без позиции"
          },
          table: {
            seats: [
              { label: "HJ", state: "folded" },
              { label: "CO", state: "folded" },
              { label: "BTN", state: "villain" },
              { label: "SB", state: "hero" },
              { label: "BB", state: "folded" }
            ],
            heroPosition: "SB",
            heroStack: "42 BB",
            pot: "15.5 BB",
            heroCards: ["Ac", "Kh"],
            boardCards: ["Js", "Ts", "9d"],
            street: "flop",
            actionLine: ["SB 3-bet 9 BB", "BTN call", "SB first to act"],
            line: "3-бет банк, Герой OOP на связанном борде.",
            potLabel: "3-бет банк"
          },
          metrics: [
            { label: "Текстура", value: "мокрая", tone: "bad" },
            { label: "Позиция", value: "OOP", tone: "warn" },
            { label: "Рука", value: "оверкарты", tone: "neutral" },
            { label: "Давление", value: "высокое", tone: "bad" }
          ],
          gates: [
            { label: "Источник", value: "test_bez_pozicii_n", state: "passed", detail: "строка OOP" },
            { label: "Текстура", value: "JT9 two-tone", state: "failed", detail: "villain сильно попадает" },
            { label: "Позиция", value: "OOP", state: "warn", detail: "реализация низкая" },
            { label: "Действие", value: "чек", state: "open", detail: "закроется после ответа" }
          ],
          model: {
            label: "Давление",
            primary: "Чекаем и защищаем диапазон: текстура отлично подходит коллеру.",
            reject: "Не ставим авто-контбет в каждый 3-бет банк, когда текстура и позиция против нас.",
            exploit: "Ставим только с понятным вэлью/защитой или сильным дро."
          },
          actionMap: [
            { label: "Текстура", value: "связанная", state: "danger" },
            { label: "Позиция", value: "OOP", state: "warn" },
            { label: "Эквити", value: "хрупкое", state: "warn" },
            { label: "Лик", value: "авто-контбет", state: "danger" }
          ],
          options: [
            {
              key: "bet-third",
              label: "Ставка 33%",
              tone: "warn",
              errorTag: "shell_auto_cbet",
              feedback: "Даже маленькая ставка слишком часто использует плохой борд для диапазона Героя."
            },
            {
              key: "check",
              label: "Чек",
              tone: "good",
              correct: true,
              feedback: "Верно. Скелет записывает решение по текстуре/давлению в той же форме телеметрии."
            },
            {
              key: "jam",
              label: "Пуш",
              tone: "bad",
              errorTag: "shell_spew",
              feedback: "Слишком высокий риск при хрупком эквити и плохой реализации."
            }
          ]
        }
      ]
    }
  ];

  window.FFTrainerShellPacks = {
    version: "trainer-shell-pack-library-v1",
    defaultPackId: "trainer-shell-preflop",
    packs
  };
}());
