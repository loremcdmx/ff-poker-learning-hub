(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  const defaultPreflopPresetConfig = "3.5bb,3x,pot,allin";
  const defaultPostflopBetPercents = "33,50,75,100,allin";
  const defaultTournamentBlindLevels = "1,2,3,5,8,12,20,30";

  const startRandomStackPresets = [
    { key: "full", label: "5-150", min: 5, max: 150 },
    { key: "short", label: "5-25", min: 5, max: 25 },
    { key: "mid", label: "15-60", min: 15, max: 60 },
    { key: "deep", label: "40-150", min: 40, max: 150 }
  ];
  // Hand tempo applies uniformly to 1/2/4 tables (default "fast"). "fast"
  // bundles compact motion + snappy cadence; "calm" keeps full single-table
  // animations on every table count.
  const handTempoOptions = [
    { key: "calm", label: "Спокойный", hint: "Полные анимации на всех столах" },
    { key: "fast", label: "Быстрый", hint: "Компактный темп на всех столах" }
  ];
  const startTimerPresets = [
    { key: "off", seconds: 0, label: "выкл", hint: "без лимита" },
    { key: "snap", seconds: 10, label: "10с", hint: "быстро" },
    { key: "normal", seconds: 20, label: "20с", hint: "стандарт" },
    { key: "slow", seconds: 30, label: "30с", hint: "спокойно" },
    { key: "study", seconds: 45, label: "45с", hint: "разбор" }
  ];
  const startTournamentPresets = [
    { key: "turbo", label: "Турбо", hint: "50 BB · 8 рук", stack: 50, hands: 8, levels: "1,2,3,5,8,12,20" },
    { key: "regular", label: "Регуляр", hint: "100 BB · 12 рук", stack: 100, hands: 12, levels: defaultTournamentBlindLevels },
    { key: "deep", label: "Глубокий", hint: "150 BB · 15 рук", stack: 150, hands: 15, levels: "1,2,3,4,5,8,12,20,30" }
  ];
  const startSessionTemplates = [
    {
      key: "random-deep",
      label: "Рандом глубокий",
      hint: "4 стола · 5-150 · таймер 20с",
      mode: "random",
      tableCount: 4,
      playerCount: 8,
      randomStackMinBb: 5,
      randomStackMaxBb: 150,
      actionTimerSeconds: 20
    },
    {
      key: "random-short",
      label: "Шорт-стек",
      hint: "4 стола · 5-25 · таймер 10с",
      mode: "random",
      tableCount: 4,
      playerCount: 8,
      randomStackMinBb: 5,
      randomStackMaxBb: 25,
      actionTimerSeconds: 10
    },
    {
      key: "mtt-turbo",
      label: "MTT turbo",
      hint: "2 стола · 50 BB · уровни 8 рук",
      mode: "tournament",
      tableCount: 2,
      playerCount: 8,
      tournamentStartingStackBb: 50,
      tournamentLevelHands: 8,
      tournamentBlindLevels: "1,2,3,5,8,12,20",
      actionTimerSeconds: 20
    }
  ];
  // Stakes Difficulty v1: the player-facing "Сложность" presets map to a
  // stakesLevel that drives exact bot composition. The difficulty/lineup/pool
  // fields stay as a coherent fallback for any legacy reader; composition is
  // resolved from stakesLevel in the engine.
  const startDifficultyPresets = [
    {
      key: "micro",
      label: "Микролимиты",
      shortLabel: "Микро",
      hint: "фиши и средние боты, без топов",
      stakesLevel: "micro",
      difficulty: "easy",
      botLineup: "soft",
      botStrategyPool: "auto"
    },
    {
      key: "mid",
      label: "Мидлстейк",
      shortLabel: "Мид",
      hint: "1-2 топа, 1-2 фиша, остальные мид-реги",
      stakesLevel: "mid",
      difficulty: "standard",
      botLineup: "mixed",
      botStrategyPool: "auto"
    },
    {
      key: "high",
      label: "Хайстейкс",
      shortLabel: "Хай",
      hint: "почти все топ-реги, 1-2 нита, до 1 фиша",
      stakesLevel: "high",
      difficulty: "pro",
      botLineup: "tough",
      botStrategyPool: "auto"
    }
  ];
  const startBotPackPresets = [
    { key: "hidden-archetypes", label: "Скрытые", hint: "типажи не раскрыты" },
    { key: "limping-fish", label: "Лимп-фиши", hint: "лимп/колл и пассив" },
    { key: "calling-stations", label: "Телефоны", hint: "тонкое вэлью" },
    { key: "nit-regs", label: "Ниты", hint: "стилы и фолды" },
    { key: "aggro-regs", label: "Агро", hint: "3-беты и давление" },
    { key: "gto-tough", label: "Tough", hint: "самый сильный пул" },
    { key: "exploit-auditors", label: "Аудит", hint: "ловит грубые ошибки" }
  ];

  function model(options = {}) {
    const engine = options.engine || {};
    const tableCounts = Array.isArray(engine.TABLE_COUNTS) ? engine.TABLE_COUNTS : [1, 2, 4];
    // 9-max removed from the playable simulator: with full-size nameplates the
    // 9-handed ring overcrowds the felt and the bottom-right seat collides with
    // the action dock. Cap selectable seats at 8 here (the engine keeps 9-handed
    // capability for tests/bot-training; it is just not offered in the UI).
    const playerCounts = (Array.isArray(engine.PLAYER_COUNTS) ? engine.PLAYER_COUNTS : [2, 3, 4, 5, 6, 7, 8, 9]).filter((count) => count <= 8);

    function defaultSettings() {
      return {
        tableCount: 2,
        playerCount: 8,
        pack: "basic-vpip",
        stakesLevel: "mid",
        difficulty: "standard",
        botLineup: "single",
        botStrategyPool: "auto",
        botPack: "hidden-archetypes",
        deck: "color-block",
        chips: "black",
        uiScale: "auto",
        amountMode: "bb",
        seatAvatars: true,
        sliderPresets: defaultPreflopPresetConfig,
        postflopBetPercents: defaultPostflopBetPercents,
        setupCompleted: false,
        simulationMode: "tournament",
        randomStackMinBb: 5,
        randomStackMaxBb: 150,
        tournamentStartingStackBb: 100,
        tournamentLevelHands: 12,
        tournamentBlindLevels: defaultTournamentBlindLevels,
        actionTimerSeconds: 20,
        trainingMode: false,
        handTempo: "fast",
        turboMode: false,
        revealOpponentCardsOnFinish: true,
        lobbyEvents: true,
        statsScope: "allTime",
        sound: false
      };
    }

    function sanitizeSimulationMode(value) {
      return String(value || "").toLowerCase() === "tournament" ? "tournament" : "random";
    }

    // Hand tempo applies uniformly to 1/2/4 tables; "fast" is the default.
    function sanitizeHandTempo(value) {
      const normalized = String(value || "").trim().toLowerCase();
      return normalized === "calm" || normalized === "fast" ? normalized : "fast";
    }

    function sanitizeDifficulty(value) {
      return typeof engine.normalizeDifficulty === "function" ? engine.normalizeDifficulty(value) : ["easy", "standard", "pro"].includes(value) ? value : "standard";
    }

    function sanitizeBotLineup(value) {
      return typeof engine.normalizeBotLineup === "function" ? engine.normalizeBotLineup(value) : ["single", "mixed", "soft", "tough"].includes(value) ? value : "single";
    }

    function sanitizeBotStrategyPool(value) {
      return typeof engine.normalizeBotStrategyPool === "function" ? engine.normalizeBotStrategyPool(value) : ["auto", "top", "standard", "weak", "mixed"].includes(value) ? value : "auto";
    }

    function sanitizeBotPack(value) {
      if (typeof engine.normalizeBotPack === "function") return engine.normalizeBotPack(value) || "hidden-archetypes";
      return startBotPackPresets.some((preset) => preset.key === value) ? value : "hidden-archetypes";
    }

    function botPackLabel(value) {
      const key = sanitizeBotPack(value);
      const preset = startBotPackPresets.find((item) => item.key === key);
      return preset?.label || (typeof engine.botPackLabel === "function" ? engine.botPackLabel(key) : key) || key;
    }

    function sanitizeStakesLevel(value) {
      return typeof engine.normalizeStakesLevel === "function" ? engine.normalizeStakesLevel(value) || "mid" : ["micro", "mid", "high"].includes(value) ? value : "mid";
    }

    function simulationModeLabel(value) {
      return sanitizeSimulationMode(value) === "tournament" ? "Турнир" : "Рандом";
    }

    function sanitizeBbNumber(value, min, max, fallback) {
      const trimmed = typeof value === "string" ? value.trim() : value;
      if (trimmed === "" || trimmed === null || trimmed === undefined) return fallback;
      const numeric = Number(trimmed);
      if (!Number.isFinite(numeric)) return fallback;
      return Math.round(Math.min(max, Math.max(min, numeric)) * 10) / 10;
    }

    function sanitizeInteger(value, min, max, fallback) {
      // Use Number() (not parseInt) so a partly-numeric token like "12abc" is
      // rejected to the fallback instead of silently becoming 12. Mirrors
      // sanitizeBbNumber's trim + finite guard, with an integer check.
      const trimmed = typeof value === "string" ? value.trim() : value;
      if (trimmed === "" || trimmed === null || trimmed === undefined) return fallback;
      const numeric = Number(trimmed);
      if (!Number.isInteger(numeric)) return fallback;
      return Math.min(max, Math.max(min, numeric));
    }

    function sanitizeRandomStackRange(minValue, maxValue, fallbackMin = 5, fallbackMax = 150, options = {}) {
      const min = sanitizeBbNumber(minValue, 1, 500, fallbackMin);
      const max = sanitizeBbNumber(maxValue, 1, 500, fallbackMax);
      // During transient input (per-keystroke draft) keep both fields exactly as
      // typed (each already clamped to 1..500) — do NOT swap. Swapping mid-edit
      // saves a reordered range and moves the value the user is typing into the
      // other field. Ordering is enforced only on commit (change/focusout/launch),
      // mirroring how blind-levels normalization is gated to those events.
      if (options.transient) return { min, max };
      if (min <= max) return { min, max };
      return { min: max, max: min };
    }

    function sanitizeBlindLevels(value, fallback = "1,2,3,5,8,12") {
      const raw = Array.isArray(value) ? value.join(",") : String(value || "");
      const levels = raw
        .split(/[,\s;]+/)
        .map((token) => Number(String(token).replace(",", ".")))
        .filter((level) => Number.isFinite(level) && level > 0)
        .map((level) => Math.max(1, Math.round(level)));
      const normalized = levels.length ? levels : fallback
        .split(",")
        .map(Number)
        .filter((level) => Number.isFinite(level) && level > 0)
        .map((level) => Math.max(1, Math.round(level)));
      const unique = [];
      normalized.sort((first, second) => first - second).forEach((level) => {
        if (!unique.includes(level)) unique.push(level);
      });
      return unique.slice(0, 40).join(",");
    }

    function normalizeBlindLevelsInput(input, fallback = "1,2,3,5,8,12") {
      const levels = sanitizeBlindLevels(input?.value, fallback);
      if (input && typeof options.setValueIfChanged === "function") {
        options.setValueIfChanged(input, levels);
      } else if (input) {
        input.value = levels;
      }
      return levels;
    }

    function isBlindLevelsInput(node) {
      return Boolean(node?.matches?.("[data-start-tournament-levels], #tournament-blind-levels-input"));
    }

    function shouldNormalizeBlindLevelsOnInput(input) {
      return /\d+\.\d*/.test(String(input?.value || ""));
    }

    function sanitizeTableCount(value) {
      const count = Number(value);
      if (tableCounts.includes(count)) return count;
      return tableCounts.reduce((best, candidate) => {
        return Math.abs(candidate - count) < Math.abs(best - count) ? candidate : best;
      }, tableCounts[tableCounts.length - 1] || 4);
    }

    function sanitizePlayerCount(value) {
      const count = Number(value);
      return playerCounts.includes(count) ? count : 8;
    }

    function sanitizePresetConfig(value) {
      const text = String(value || "").trim();
      const normalized = text.toLowerCase();
      // Migrate prior built-in defaults (including the legacy 6-button open set)
      // onto the current default so existing players pick up the curated layout
      // instead of carrying the crowded preset row in localStorage.
      if (
        normalized === "min,2.5x,3x,allin"
        || normalized === "min,2.2x,2.5x,3x,allin"
        || normalized === "min,2.2x,2.5x,pot,3x,allin"
      ) return defaultPreflopPresetConfig;
      return text ? text : defaultPreflopPresetConfig;
    }

    function sanitizePostflopBetPercents(value) {
      const cleaned = [];
      String(value || "")
        .split(",")
        .map((token) => token.trim().toLowerCase())
        .filter(Boolean)
        .forEach((token) => {
          if (cleaned.length >= 6) return;
          if (["allin", "all-in", "all in"].includes(token)) {
            if (!cleaned.includes("allin")) cleaned.push("allin");
            return;
          }
          const raw = token === "pot" ? "100" : token.replace(/%$/, "").replace(",", ".");
          const number = Number(raw);
          if (!Number.isFinite(number) || number <= 0) return;
          const rounded = roundPercentValue(number);
          const label = String(rounded);
          if (!cleaned.includes(label)) cleaned.push(label);
        });
      return cleaned.length ? cleaned.join(",") : defaultPostflopBetPercents;
    }

    function roundBb(value) {
      return Math.round(Number(value) * 10) / 10;
    }

    function roundPercentValue(value) {
      const rounded = Math.round(Number(value) * 10) / 10;
      return Number.isInteger(rounded) ? Math.trunc(rounded) : rounded;
    }

    function formatBbRange(min, max) {
      return `${roundBb(min)}-${roundBb(max)} BB`;
    }

    function renderStartFeltPreview() {
      const seats = [
        { x: 50, y: 7, rot: 0 },
        { x: 76, y: 16, rot: 18 },
        { x: 91, y: 48, rot: 88 },
        { x: 75, y: 82, rot: -18 },
        { x: 50, y: 93, rot: 0 },
        { x: 25, y: 82, rot: 18 },
        { x: 9, y: 48, rot: -88 },
        { x: 24, y: 16, rot: -18 }
      ];
      const seatHtml = seats.map((seat, index) => `
              <span class="start-preview-seat start-preview-seat-${index + 1}" style="--x:${seat.x}%; --y:${seat.y}%; --rot:${seat.rot}deg">
                <span class="start-preview-avatar"></span>
                <span class="start-preview-stack" aria-hidden="true"><i></i><i></i><i></i></span>
              </span>
            `).join("");
      const boardCards = [
        { r: "A", s: "&#9824;", red: false },
        { r: "K", s: "&#9830;", red: true },
        { r: "Q", s: "&#9827;", red: false },
        { r: "J", s: "&#9829;", red: true },
        { r: "T", s: "&#9824;", red: false }
      ];
      const boardHtml = boardCards
        .map((card) => `<span class="start-board-card${card.red ? " is-red" : ""}"><em>${card.r}</em><i>${card.s}</i></span>`)
        .join("");
      return `
          <div class="start-felt-preview" aria-hidden="true">
            <div class="start-felt-aura">
              <span class="start-aura-glow start-aura-glow-violet"></span>
              <span class="start-aura-glow start-aura-glow-gold"></span>
              <span class="start-suit start-suit-spade">&#9824;</span>
              <span class="start-suit start-suit-heart">&#9829;</span>
              <span class="start-suit start-suit-club">&#9827;</span>
              <span class="start-suit start-suit-diamond">&#9830;</span>
              <span class="start-aura-spark start-aura-spark-1"></span>
              <span class="start-aura-spark start-aura-spark-2"></span>
              <span class="start-aura-spark start-aura-spark-3"></span>
            </div>
            <div class="start-felt-table">
              <div class="start-preview-pot"><span></span><span></span><span></span></div>
              <div class="start-preview-board">
                ${boardHtml}
              </div>
              ${seatHtml}
            </div>
          </div>
        `;
    }

    function renderStartPanel(settings, renderOptions = {}) {
      const safeSettings = sanitizeStartSettings(settings);
      const mode = safeSettings.simulationMode;
      const randomSelected = mode === "random";
      const tournamentSelected = mode === "tournament";
      const escapeHtml = htmlEscaper(renderOptions.escapeHtml);
      const launchLabel = renderOptions.restoreAvailable ? "Продолжить" : "Старт";
      return renderStartFeltPreview() + `
          <section class="simulator-start-panel" data-start-panel aria-label="Параметры старта симуляции">
            <div class="start-table-rail" aria-hidden="true">
              <span></span><span></span><span></span>
            </div>
            <div class="start-panel-copy">
              <span class="start-panel-kicker">Параметры перед первой раздачей</span>
              <strong>Настрой сессию</strong>
              <div class="start-launch">
                <button class="primary-button start-panel-button" type="button" data-action="start-simulator">${escapeHtml(launchLabel)}</button>
              </div>
            </div>
            <div class="start-settings" aria-label="Настройки сессии">
              <input type="hidden" data-start-simulation-mode value="${escapeHtml(mode)}">
              <input type="hidden" data-start-table-count-value value="${safeSettings.tableCount}">
              <input type="hidden" data-start-hand-tempo-value value="${escapeHtml(safeSettings.handTempo)}">
              <input type="hidden" data-start-stakes value="${escapeHtml(safeSettings.stakesLevel)}">
              <input type="hidden" data-start-difficulty value="${escapeHtml(safeSettings.difficulty)}">
              <input type="hidden" data-start-lineup value="${escapeHtml(safeSettings.botLineup)}">
              <input type="hidden" data-start-strategy-pool value="${escapeHtml(safeSettings.botStrategyPool)}">
              <input type="hidden" data-start-bot-pack value="${escapeHtml(safeSettings.botPack)}">

              <div class="start-settings-head">
                <span>Перед стартом</span>
                <h2>Быстрые настройки</h2>
                <p>Формат, столы, таймбанк и уровень поля без лишних параметров.</p>
              </div>

              <div class="start-quick-list" aria-label="Быстрые настройки">
                <div class="start-quick-row start-mode-group" aria-labelledby="start-mode-label">
                  <span class="start-quick-label start-mode-label" id="start-mode-label">Тип игры</span>
                  <div class="start-mode-cards" role="group" aria-label="Выбор режима игры">
                    <button class="start-mode-card ${tournamentSelected ? "is-selected" : ""}" type="button" data-start-mode-value="tournament" aria-pressed="${tournamentSelected ? "true" : "false"}">
                      <span><strong>Турнир</strong></span>
                    </button>
                    <button class="start-mode-card ${randomSelected ? "is-selected" : ""}" type="button" data-start-mode-value="random" aria-pressed="${randomSelected ? "true" : "false"}">
                      <span><strong>Кеш</strong></span>
                    </button>
                  </div>
                </div>

                <div class="start-quick-row start-field" data-start-field="tables">
                  <span class="start-field-label">Столы</span>
                  <div class="start-segmented" role="group" aria-label="Количество столов">
                    ${renderStartTableCountButtons(safeSettings.tableCount)}
                  </div>
                </div>

                <div class="start-quick-row start-field start-field-choice" data-start-field="timer">
                  <span class="start-field-label">Таймбанк</span>
                  <input id="start-action-timer-input" data-start-action-timer type="hidden" value="${escapeHtml(safeSettings.actionTimerSeconds)}">
                  <div class="start-timebank-grid" role="group" aria-label="Таймбанк в секундах">
                    ${renderStartTimerPresetButtons(safeSettings, escapeHtml)}
                  </div>
                </div>

                <div class="start-quick-row start-difficulty-group" aria-labelledby="start-difficulty-label">
                  <span class="start-quick-label start-difficulty-label" id="start-difficulty-label">Оппоненты</span>
                  <div class="start-difficulty-row" role="group" aria-label="Сложность ботов">
                    ${renderStartDifficultyButtons(safeSettings, escapeHtml)}
                  </div>
                </div>
              </div>

              <details class="start-advanced" data-start-advanced>
                <summary>
                  <span>Адвансд</span>
                  <b data-start-advanced-summary>${escapeHtml(startAdvancedSummary(safeSettings))}</b>
                </summary>
                <div class="start-advanced-body">
                  <div class="start-core-grid" aria-label="Расширенные базовые параметры сессии">
                    <div class="start-field" data-start-field="format">
                      <span class="start-field-label">Размер стола</span>
                      <input type="hidden" data-start-player-count value="${safeSettings.playerCount}">
                      <div class="start-segmented start-segmented-format" role="group" aria-label="Размер стола">
                        ${renderStartPlayerCountButtons(safeSettings.playerCount)}
                      </div>
                    </div>

                    <div class="start-field" data-start-field="tempo">
                      <span class="start-field-label">Темп раздач</span>
                      <div class="start-segmented start-segmented-tempo" role="group" aria-label="Темп раздач для всех столов">
                        ${renderStartHandTempoButtons(safeSettings.handTempo, escapeHtml)}
                      </div>
                    </div>
                  </div>

                  <div class="start-template-group" aria-labelledby="start-template-label">
                    <span class="start-template-label" id="start-template-label">Пресеты</span>
                    <div class="start-template-row" role="group" aria-label="Быстрые пресеты сессии">
                      ${renderStartSessionTemplateButtons(safeSettings, escapeHtml)}
                    </div>
                  </div>
                  <div class="start-template-group start-bot-pack-group" aria-labelledby="start-bot-pack-label">
                    <span class="start-template-label" id="start-bot-pack-label">Пак оппонентов</span>
                    <div class="start-template-row start-bot-pack-row" role="group" aria-label="Пак оппонентов">
                      ${renderStartBotPackButtons(safeSettings, escapeHtml)}
                    </div>
                  </div>
                  <div class="start-settings-grid">
                    <div class="start-field start-field-range" data-start-field="random-stack" data-start-mode-panel="random" ${randomSelected ? "" : "hidden"}>
                      <span class="start-field-label">Стеки рандом, BB</span>
                      <div class="start-range">
                        <input id="start-random-min-input" data-start-random-stack-min type="number" min="1" max="500" step="1" inputmode="numeric" aria-label="Минимальный стек рандом" value="${escapeHtml(safeSettings.randomStackMinBb)}">
                        <span class="start-range-separator" aria-hidden="true">-</span>
                        <input id="start-random-max-input" data-start-random-stack-max type="number" min="1" max="500" step="1" inputmode="numeric" aria-label="Максимальный стек рандом" value="${escapeHtml(safeSettings.randomStackMaxBb)}">
                        <span class="start-range-unit" aria-hidden="true">BB</span>
                      </div>
                      <div class="start-preset-row start-preset-row-stack" aria-label="Пресеты стеков рандом">
                        ${renderStartStackPresetButtons(safeSettings, escapeHtml)}
                      </div>
                    </div>

                    <div class="start-field start-field-stepper" data-start-field="mtt-stack" data-start-mode-panel="tournament" ${tournamentSelected ? "" : "hidden"}>
                      <span class="start-field-label">Старт MTT</span>
                      <div class="start-stepper" role="group" aria-label="Стартовый стек MTT">
                        <button type="button" data-start-mtt-stack-step="-10" aria-label="Уменьшить стартовый стек на 10 BB">-</button>
                        <input id="start-tournament-stack-input" data-start-tournament-stack type="number" min="5" max="500" step="1" inputmode="numeric" aria-label="Стартовый стек MTT" value="${escapeHtml(safeSettings.tournamentStartingStackBb)}">
                        <button type="button" data-start-mtt-stack-step="10" aria-label="Увеличить стартовый стек на 10 BB">+</button>
                      </div>
                    </div>

                    <div class="start-field start-field-stepper" data-start-field="mtt-hands" data-start-mode-panel="tournament" ${tournamentSelected ? "" : "hidden"}>
                      <span class="start-field-label">Рук/уровень</span>
                      <div class="start-stepper" role="group" aria-label="Количество рук на уровень">
                        <button type="button" data-start-mtt-hands-step="-1" aria-label="Уменьшить уровень на одну руку">-</button>
                        <input id="start-tournament-hands-input" data-start-tournament-hands type="number" min="1" max="200" step="1" inputmode="numeric" aria-label="Рук на уровень" value="${escapeHtml(safeSettings.tournamentLevelHands)}">
                        <button type="button" data-start-mtt-hands-step="1" aria-label="Увеличить уровень на одну руку">+</button>
                      </div>
                    </div>

                    <div class="start-field start-field-structures" data-start-mode-panel="tournament" data-start-field="mtt-levels" ${tournamentSelected ? "" : "hidden"}>
                      <span class="start-field-label">Структура блайндов</span>
                      <input id="start-tournament-levels-input" data-start-tournament-levels type="hidden" value="${escapeHtml(safeSettings.tournamentBlindLevels)}">
                      <div class="start-blind-structure-grid" role="group" aria-label="Структура блайндов MTT">
                        ${renderStartTournamentPresetButtons(safeSettings, escapeHtml)}
                      </div>
                      <div class="start-blind-ladder" data-start-blind-ladder aria-label="Уровни BB">
                        ${renderStartBlindLevelPills(safeSettings.tournamentBlindLevels, escapeHtml)}
                      </div>
                    </div>
                  </div>
                </div>
              </details>
            </div>
          </section>
        `;
    }

    function sanitizeStartSettings(settings = {}, options = {}) {
      const fallback = defaultSettings();
      const randomRange = sanitizeRandomStackRange(
        settings.randomStackMinBb ?? fallback.randomStackMinBb,
        settings.randomStackMaxBb ?? fallback.randomStackMaxBb,
        fallback.randomStackMinBb,
        fallback.randomStackMaxBb,
        { transient: Boolean(options.transient) }
      );
      return {
        tableCount: sanitizeTableCount(settings.tableCount ?? fallback.tableCount),
        playerCount: sanitizePlayerCount(settings.playerCount ?? fallback.playerCount),
        stakesLevel: sanitizeStakesLevel(settings.stakesLevel ?? fallback.stakesLevel),
        difficulty: sanitizeDifficulty(settings.difficulty ?? fallback.difficulty),
        botLineup: sanitizeBotLineup(settings.botLineup ?? fallback.botLineup),
        botStrategyPool: sanitizeBotStrategyPool(settings.botStrategyPool ?? fallback.botStrategyPool),
        botPack: sanitizeBotPack(settings.botPack ?? fallback.botPack),
        simulationMode: sanitizeSimulationMode(settings.simulationMode ?? fallback.simulationMode),
        handTempo: sanitizeHandTempo(settings.handTempo ?? fallback.handTempo),
        randomStackMinBb: randomRange.min,
        randomStackMaxBb: randomRange.max,
        tournamentStartingStackBb: sanitizeBbNumber(settings.tournamentStartingStackBb, 5, 500, fallback.tournamentStartingStackBb),
        tournamentLevelHands: sanitizeInteger(settings.tournamentLevelHands, 1, 200, fallback.tournamentLevelHands),
        tournamentBlindLevels: sanitizeBlindLevels(settings.tournamentBlindLevels, fallback.tournamentBlindLevels),
        actionTimerSeconds: sanitizeInteger(settings.actionTimerSeconds, 0, 300, fallback.actionTimerSeconds)
      };
    }

    function startPanelSettingsFromElement(panel, base = {}, options = {}) {
      const mode = sanitizeSimulationMode(panel?.querySelector("[data-start-simulation-mode]")?.value || base.simulationMode);
      const randomRange = sanitizeRandomStackRange(
        panel?.querySelector("[data-start-random-stack-min]")?.value ?? base.randomStackMinBb,
        panel?.querySelector("[data-start-random-stack-max]")?.value ?? base.randomStackMaxBb,
        base.randomStackMinBb,
        base.randomStackMaxBb,
        { transient: Boolean(options.transient) }
      );
      const handTempo = sanitizeHandTempo(panel?.querySelector("[data-start-hand-tempo-value]")?.value || base.handTempo);
      return {
        handTempo,
        // turboMode is derived from tempo so the live engine (auto-deal cadence,
        // showdown hold) follows the start-screen choice without a reload.
        turboMode: handTempo === "fast",
        tableCount: sanitizeTableCount(panel?.querySelector("[data-start-table-count-value]")?.value || base.tableCount),
        playerCount: sanitizePlayerCount(panel?.querySelector("[data-start-player-count]")?.value || base.playerCount),
        stakesLevel: sanitizeStakesLevel(panel?.querySelector("[data-start-stakes]")?.value || base.stakesLevel),
        difficulty: sanitizeDifficulty(panel?.querySelector("[data-start-difficulty]")?.value || base.difficulty),
        botLineup: sanitizeBotLineup(panel?.querySelector("[data-start-lineup]")?.value || base.botLineup),
        botStrategyPool: sanitizeBotStrategyPool(panel?.querySelector("[data-start-strategy-pool]")?.value || base.botStrategyPool),
        botPack: sanitizeBotPack(panel?.querySelector("[data-start-bot-pack]")?.value || base.botPack),
        simulationMode: mode,
        randomStackMinBb: randomRange.min,
        randomStackMaxBb: randomRange.max,
        tournamentStartingStackBb: sanitizeBbNumber(panel?.querySelector("[data-start-tournament-stack]")?.value, 5, 500, base.tournamentStartingStackBb),
        tournamentLevelHands: sanitizeInteger(panel?.querySelector("[data-start-tournament-hands]")?.value, 1, 200, base.tournamentLevelHands),
        tournamentBlindLevels: sanitizeBlindLevels(panel?.querySelector("[data-start-tournament-levels]")?.value, base.tournamentBlindLevels),
        actionTimerSeconds: sanitizeInteger(panel?.querySelector("[data-start-action-timer]")?.value, 0, 300, base.actionTimerSeconds)
      };
    }

    function setStartPanelModeUi(panel, mode) {
      const activeMode = sanitizeSimulationMode(mode);
      setValue(panel?.querySelector("[data-start-simulation-mode]"), activeMode);
      panel?.querySelectorAll("[data-start-mode-value]").forEach((button) => {
        const selected = button.dataset.startModeValue === activeMode;
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-pressed", selected ? "true" : "false");
      });
      panel?.querySelectorAll("[data-start-mode-panel]").forEach((node) => {
        node.hidden = node.dataset.startModePanel !== activeMode;
      });
    }

    function setStartPanelTableCountUi(panel, count) {
      const nextCount = sanitizeTableCount(count);
      setValue(panel?.querySelector("[data-start-table-count-value]"), String(nextCount));
      panel?.querySelectorAll("[data-start-table-count]").forEach((button) => {
        const selected = Number(button.dataset.startTableCount) === nextCount;
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-pressed", selected ? "true" : "false");
      });
    }

    function setStartPanelHandTempoUi(panel, tempo) {
      const nextTempo = sanitizeHandTempo(tempo);
      setValue(panel?.querySelector("[data-start-hand-tempo-value]"), nextTempo);
      panel?.querySelectorAll("[data-start-hand-tempo]").forEach((button) => {
        const selected = button.dataset.startHandTempo === nextTempo;
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-pressed", selected ? "true" : "false");
      });
    }

    function setStartPanelPlayerCountUi(panel, count) {
      const nextCount = sanitizePlayerCount(count);
      setValue(panel?.querySelector("[data-start-player-count]"), String(nextCount));
      panel?.querySelectorAll("[data-start-player-count-option]").forEach((button) => {
        const selected = Number(button.dataset.startPlayerCountOption) === nextCount;
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-pressed", selected ? "true" : "false");
      });
    }

    function setStartPanelDifficultyUi(panel, preset) {
      if (!panel || !preset) return;
      setValue(panel.querySelector("[data-start-stakes]"), sanitizeStakesLevel(preset.stakesLevel));
      setValue(panel.querySelector("[data-start-difficulty]"), sanitizeDifficulty(preset.difficulty));
      setValue(panel.querySelector("[data-start-lineup]"), sanitizeBotLineup(preset.botLineup));
      setValue(panel.querySelector("[data-start-strategy-pool]"), sanitizeBotStrategyPool(preset.botStrategyPool));
      panel.querySelectorAll("[data-start-difficulty-preset]").forEach((button) => {
        const selected = button.dataset.startDifficultyPreset === preset.key;
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-pressed", selected ? "true" : "false");
      });
    }

    function setStartPanelBotPackUi(panel, value) {
      if (!panel) return;
      const nextPack = sanitizeBotPack(value);
      setValue(panel.querySelector("[data-start-bot-pack]"), nextPack);
      panel.querySelectorAll("[data-start-bot-pack-option]").forEach((button) => {
        const selected = sanitizeBotPack(button.dataset.startBotPackOption) === nextPack;
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-pressed", selected ? "true" : "false");
      });
    }

    function applyStartSessionTemplate(panel, key) {
      const template = startSessionTemplates.find((item) => item.key === key);
      if (!panel || !template) return false;
      setStartPanelModeUi(panel, template.mode);
      setStartPanelTableCountUi(panel, template.tableCount);
      setStartPanelPlayerCountUi(panel, template.playerCount);
      if (Number.isFinite(template.randomStackMinBb)) {
        setValue(panel.querySelector("[data-start-random-stack-min]"), String(template.randomStackMinBb));
      }
      if (Number.isFinite(template.randomStackMaxBb)) {
        setValue(panel.querySelector("[data-start-random-stack-max]"), String(template.randomStackMaxBb));
      }
      if (Number.isFinite(template.tournamentStartingStackBb)) {
        setValue(panel.querySelector("[data-start-tournament-stack]"), String(template.tournamentStartingStackBb));
      }
      if (Number.isFinite(template.tournamentLevelHands)) {
        setValue(panel.querySelector("[data-start-tournament-hands]"), String(template.tournamentLevelHands));
      }
      if (template.tournamentBlindLevels) {
        setValue(panel.querySelector("[data-start-tournament-levels]"), template.tournamentBlindLevels);
      }
      if (Number.isFinite(template.actionTimerSeconds)) {
        setValue(panel.querySelector("[data-start-action-timer]"), String(template.actionTimerSeconds));
      }
      return true;
    }

    function applyStartDifficultyPreset(panel, key) {
      const preset = startDifficultyPresets.find((item) => item.key === key);
      if (!panel || !preset) return false;
      setStartPanelDifficultyUi(panel, preset);
      return true;
    }

    function applyStartBotPackPreset(panel, key) {
      if (!panel || !startBotPackPresets.some((item) => item.key === sanitizeBotPack(key))) return false;
      setStartPanelBotPackUi(panel, key);
      return true;
    }

    function applyStartStackPreset(panel, dataset = {}) {
      if (!panel) return false;
      setValue(panel.querySelector("[data-start-random-stack-min]"), dataset.startStackMin || "");
      setValue(panel.querySelector("[data-start-random-stack-max]"), dataset.startStackMax || "");
      return true;
    }

    function applyStartTimerPreset(panel, dataset = {}) {
      if (!panel) return false;
      setValue(panel.querySelector("[data-start-action-timer]"), dataset.startTimerPreset || "");
      return true;
    }

    function applyStartTournamentStackStep(panel, dataset = {}) {
      const input = panel?.querySelector("[data-start-tournament-stack]");
      if (!input) return false;
      const current = sanitizeBbNumber(input.value, 5, 500, defaultSettings().tournamentStartingStackBb);
      const step = sanitizeInteger(dataset.startMttStackStep, -100, 100, 0);
      const next = Math.max(5, Math.min(500, current + step));
      setValue(input, String(next));
      setStartPanelModeUi(panel, "tournament");
      return true;
    }

    function applyStartTournamentHandsStep(panel, dataset = {}) {
      const input = panel?.querySelector("[data-start-tournament-hands]");
      if (!input) return false;
      const current = sanitizeInteger(input.value, 1, 200, defaultSettings().tournamentLevelHands);
      const step = sanitizeInteger(dataset.startMttHandsStep, -25, 25, 0);
      const next = Math.max(1, Math.min(200, current + step));
      setValue(input, String(next));
      setStartPanelModeUi(panel, "tournament");
      return true;
    }

    function applyStartTournamentPreset(panel, dataset = {}) {
      if (!panel) return false;
      setValue(panel.querySelector("[data-start-tournament-stack]"), dataset.startMttStack || "");
      setValue(panel.querySelector("[data-start-tournament-hands]"), dataset.startMttHands || "");
      setValue(panel.querySelector("[data-start-tournament-levels]"), dataset.startMttLevels || "");
      setStartPanelModeUi(panel, "tournament");
      return true;
    }

    function updateStartPanelSummary(panel, settings, renderOptions = {}) {
      const safeSettings = sanitizeStartSettings(settings, { transient: Boolean(renderOptions.transient) });
      const escapeHtml = htmlEscaper(renderOptions.escapeHtml);
      setHtml(panel?.querySelector("[data-start-blind-ladder]"), renderStartBlindLevelPills(safeSettings.tournamentBlindLevels, escapeHtml));
      setText(panel?.querySelector("[data-start-advanced-summary]"), startAdvancedSummary(safeSettings));
      syncStartPanelPresetStates(panel, safeSettings);
    }

    function reconcileStartPanelInputs(panel, settings) {
      if (!panel) return;
      const safeSettings = sanitizeStartSettings(settings);
      setValue(panel.querySelector("[data-start-random-stack-min]"), String(safeSettings.randomStackMinBb));
      setValue(panel.querySelector("[data-start-random-stack-max]"), String(safeSettings.randomStackMaxBb));
      setValue(panel.querySelector("[data-start-tournament-stack]"), String(safeSettings.tournamentStartingStackBb));
      setValue(panel.querySelector("[data-start-tournament-hands]"), String(safeSettings.tournamentLevelHands));
    }

    function syncStartPanelPresetStates(panel, settings) {
      if (!panel) return;
      const safeSettings = sanitizeStartSettings(settings);
      panel.querySelectorAll("[data-start-difficulty-preset]").forEach((button) => {
        const preset = startDifficultyPresets.find((item) => item.key === button.dataset.startDifficultyPreset);
        const selected = preset ? startDifficultyPresetMatches(safeSettings, preset) : false;
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-pressed", selected ? "true" : "false");
      });
      panel.querySelectorAll("[data-start-session-template]").forEach((button) => {
        const template = startSessionTemplates.find((item) => item.key === button.dataset.startSessionTemplate);
        const selected = template ? startSessionTemplateMatches(safeSettings, template) : false;
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-pressed", selected ? "true" : "false");
      });
      panel.querySelectorAll("[data-start-bot-pack-option]").forEach((button) => {
        const selected = sanitizeBotPack(button.dataset.startBotPackOption) === safeSettings.botPack;
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-pressed", selected ? "true" : "false");
      });
      panel.querySelectorAll("[data-start-stack-preset]").forEach((button) => {
        const selected = Number(safeSettings.randomStackMinBb) === Number(button.dataset.startStackMin)
          && Number(safeSettings.randomStackMaxBb) === Number(button.dataset.startStackMax);
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-pressed", selected ? "true" : "false");
      });
      panel.querySelectorAll("[data-start-timer-preset]").forEach((button) => {
        const selected = Number(safeSettings.actionTimerSeconds) === Number(button.dataset.startTimerPreset);
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-pressed", selected ? "true" : "false");
      });
      panel.querySelectorAll("[data-start-mtt-preset]").forEach((button) => {
        const preset = {
          stack: Number(button.dataset.startMttStack),
          hands: Number(button.dataset.startMttHands),
          levels: button.dataset.startMttLevels || ""
        };
        const selected = startTournamentPresetMatches(safeSettings, preset);
        button.classList.toggle("is-selected", selected);
        button.setAttribute("aria-pressed", selected ? "true" : "false");
      });
    }

    function startDifficultyPresetMatches(settings, preset) {
      return sanitizeStakesLevel(settings.stakesLevel) === sanitizeStakesLevel(preset.stakesLevel);
    }

    function startBotPackPresetMatches(settings, preset) {
      return sanitizeBotPack(settings.botPack) === sanitizeBotPack(preset.key);
    }

    function startTournamentPresetMatches(settings, preset) {
      return Number(settings.tournamentStartingStackBb) === preset.stack
        && Number(settings.tournamentLevelHands) === preset.hands
        && sanitizeBlindLevels(settings.tournamentBlindLevels, preset.levels) === preset.levels;
    }

    function startSessionTemplateMatches(settings, template) {
      if (settings.simulationMode !== template.mode) return false;
      if (Number(settings.tableCount) !== Number(template.tableCount)) return false;
      if (Number(settings.playerCount) !== Number(template.playerCount)) return false;
      if (Number(settings.actionTimerSeconds) !== Number(template.actionTimerSeconds)) return false;
      if (template.mode === "tournament") {
        return Number(settings.tournamentStartingStackBb) === Number(template.tournamentStartingStackBb)
          && Number(settings.tournamentLevelHands) === Number(template.tournamentLevelHands)
          && sanitizeBlindLevels(settings.tournamentBlindLevels, template.tournamentBlindLevels) === template.tournamentBlindLevels;
      }
      return Number(settings.randomStackMinBb) === Number(template.randomStackMinBb)
        && Number(settings.randomStackMaxBb) === Number(template.randomStackMaxBb);
    }

    function renderStartTableCountButtons(selected) {
      return tableCounts.map((count) => `
          <button class="${count === selected ? "is-selected" : ""}" type="button" data-start-table-count="${count}" aria-pressed="${count === selected ? "true" : "false"}">${count}</button>
        `).join("");
    }

    function renderStartHandTempoButtons(selected, escapeHtml) {
      const escaper = htmlEscaper(escapeHtml);
      const activeTempo = sanitizeHandTempo(selected);
      return handTempoOptions.map((option) => {
        const isSelected = option.key === activeTempo;
        return `
          <button class="${isSelected ? "is-selected" : ""}" type="button" data-start-hand-tempo="${escaper(option.key)}" aria-pressed="${isSelected ? "true" : "false"}" title="${escaper(option.hint)}">${escaper(option.label)}</button>
        `;
      }).join("");
    }

    function renderStartDifficultyButtons(settings, escapeHtml) {
      return startDifficultyPresets.map((preset) => {
        const selected = startDifficultyPresetMatches(settings, preset);
        return `
            <button class="start-difficulty-button ${selected ? "is-selected" : ""}" type="button" data-start-difficulty-preset="${escapeHtml(preset.key)}" aria-pressed="${selected ? "true" : "false"}">
              <strong>${escapeHtml(preset.shortLabel || preset.label)}</strong>
              <small>${escapeHtml(preset.hint)}</small>
            </button>
          `;
      }).join("");
    }

    function renderStartSessionTemplateButtons(settings, escapeHtml) {
      return startSessionTemplates.map((template) => {
        const selected = startSessionTemplateMatches(settings, template);
        return `
            <button class="${selected ? "is-selected" : ""}" type="button" data-start-session-template="${escapeHtml(template.key)}" aria-pressed="${selected ? "true" : "false"}">
              <strong>${escapeHtml(template.label)}</strong>
              <small>${escapeHtml(template.hint)}</small>
            </button>
          `;
      }).join("");
    }

    function renderStartBotPackButtons(settings, escapeHtml) {
      return startBotPackPresets.map((preset) => {
        const selected = startBotPackPresetMatches(settings, preset);
        return `
            <button class="${selected ? "is-selected" : ""}" type="button" data-start-bot-pack-option="${escapeHtml(preset.key)}" aria-pressed="${selected ? "true" : "false"}" title="${escapeHtml(botPackLabel(preset.key))}">
              <strong>${escapeHtml(preset.label)}</strong>
              <small>${escapeHtml(preset.hint)}</small>
            </button>
          `;
      }).join("");
    }

    function renderStartStackPresetButtons(settings, escapeHtml) {
      return startRandomStackPresets.map((preset) => {
        const selected = Number(settings.randomStackMinBb) === preset.min && Number(settings.randomStackMaxBb) === preset.max;
        return `<button class="${selected ? "is-selected" : ""}" type="button" data-start-stack-preset="${escapeHtml(preset.key)}" data-start-stack-min="${preset.min}" data-start-stack-max="${preset.max}" aria-pressed="${selected ? "true" : "false"}">${escapeHtml(preset.label)}</button>`;
      }).join("");
    }

    function renderStartTimerPresetButtons(settings, escapeHtml) {
      return startTimerPresets.map((preset) => {
        const selected = Number(settings.actionTimerSeconds) === Number(preset.seconds);
        return `
          <button class="start-timebank-button ${selected ? "is-selected" : ""}" type="button" data-start-timer-preset="${preset.seconds}" aria-pressed="${selected ? "true" : "false"}">
            <strong>${escapeHtml(preset.label)}</strong>
            <span>${escapeHtml(preset.hint)}</span>
          </button>
        `;
      }).join("");
    }

    function renderStartTournamentPresetButtons(settings, escapeHtml) {
      return startTournamentPresets.map((preset) => {
        const selected = startTournamentPresetMatches(settings, preset);
        const levelCount = blindLevelArray(preset.levels).length;
        return `
          <button class="start-blind-card ${selected ? "is-selected" : ""}" type="button" data-start-mtt-preset="${escapeHtml(preset.key)}" data-start-mtt-stack="${preset.stack}" data-start-mtt-hands="${preset.hands}" data-start-mtt-levels="${escapeHtml(preset.levels)}" aria-pressed="${selected ? "true" : "false"}">
            <span class="start-blind-card-head">
              <strong>${escapeHtml(preset.label)}</strong>
              <b>${escapeHtml(`${levelCount} ур.`)}</b>
            </span>
            <small>${escapeHtml(preset.hint)}</small>
          </button>
        `;
      }).join("");
    }

    function blindLevelArray(value, fallback = defaultTournamentBlindLevels) {
      return sanitizeBlindLevels(value, fallback)
        .split(",")
        .map((level) => Number(level))
        .filter((level) => Number.isFinite(level) && level > 0);
    }

    function renderStartBlindLevelPills(value, escapeHtml) {
      return blindLevelArray(value)
        .map((level) => `<span>${escapeHtml(`${level} BB`)}</span>`)
        .join("");
    }

    function renderStartPlayerCountButtons(selected) {
      return playerCounts.map((count) => `
          <button class="${count === selected ? "is-selected" : ""}" type="button" data-start-player-count-option="${count}" aria-pressed="${count === selected ? "true" : "false"}">${count}</button>
        `).join("");
    }

    function startAdvancedSummary(settings) {
      const safeSettings = sanitizeStartSettings(settings);
      const pack = safeSettings.botPack === "hidden-archetypes" ? "" : `${botPackLabel(safeSettings.botPack)} / `;
      if (safeSettings.simulationMode === "tournament") {
        if (!pack) return "Стек, блайнды, размер стола";
        return `${pack}Стек, блайнды, размер стола`;
      }
      if (!pack) return "Стеки, размер стола, темп";
      return `${pack}Стеки, размер стола, темп`;
    }

    function setValue(node, value) {
      if (!node) return;
      if (typeof options.setValueIfChanged === "function") options.setValueIfChanged(node, value);
      else if (node.value !== value) node.value = value;
    }

    function setText(node, value) {
      if (!node) return;
      if (typeof options.setTextIfChanged === "function") options.setTextIfChanged(node, value);
      else if (node.textContent !== value) node.textContent = value;
    }

    function setHtml(node, value) {
      if (!node) return;
      if (node.innerHTML !== value) node.innerHTML = value;
    }

    function htmlEscaper(escapeHtml) {
      if (typeof escapeHtml === "function") return escapeHtml;
      return (value) => String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    }

    return {
      defaultPreflopPresetConfig,
      defaultPostflopBetPercents,
      startRandomStackPresets,
      startTimerPresets,
      startTournamentPresets,
      startSessionTemplates,
      startDifficultyPresets,
      startBotPackPresets,
      defaultSettings,
      sanitizeSimulationMode,
      sanitizeHandTempo,
      sanitizeDifficulty,
      sanitizeBotLineup,
      sanitizeBotStrategyPool,
      sanitizeBotPack,
      botPackLabel,
      sanitizeStakesLevel,
      simulationModeLabel,
      sanitizeBbNumber,
      sanitizeInteger,
      sanitizeRandomStackRange,
      sanitizeBlindLevels,
      normalizeBlindLevelsInput,
      isBlindLevelsInput,
      shouldNormalizeBlindLevelsOnInput,
      sanitizeTableCount,
      sanitizePlayerCount,
      sanitizePresetConfig,
      sanitizePostflopBetPercents,
      formatBbRange,
      sanitizeStartSettings,
      startPanelSettingsFromElement,
      renderStartPanel,
      setStartPanelModeUi,
      setStartPanelTableCountUi,
      setStartPanelHandTempoUi,
      setStartPanelPlayerCountUi,
      setStartPanelDifficultyUi,
      setStartPanelBotPackUi,
      applyStartSessionTemplate,
      applyStartDifficultyPreset,
      applyStartBotPackPreset,
      applyStartStackPreset,
      applyStartTimerPreset,
      applyStartTournamentStackStep,
      applyStartTournamentHandsStep,
      applyStartTournamentPreset,
      updateStartPanelSummary,
      reconcileStartPanelInputs,
      syncStartPanelPresetStates,
      startDifficultyPresetMatches,
      startBotPackPresetMatches,
      startTournamentPresetMatches,
      startSessionTemplateMatches,
      renderStartTableCountButtons,
      renderStartHandTempoButtons,
      renderStartDifficultyButtons,
      renderStartSessionTemplateButtons,
      renderStartBotPackButtons,
      renderStartStackPresetButtons,
      renderStartTimerPresetButtons,
      renderStartTournamentPresetButtons,
      renderStartBlindLevelPills,
      renderStartPlayerCountButtons,
      startAdvancedSummary
    };
  }

  root.PokerSimulatorStart = {
    defaultPreflopPresetConfig,
    defaultPostflopBetPercents,
    startRandomStackPresets,
    handTempoOptions,
    startTimerPresets,
    startTournamentPresets,
    startSessionTemplates,
    startDifficultyPresets,
    startBotPackPresets,
    model
  };
})();
