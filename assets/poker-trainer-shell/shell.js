(function () {
  "use strict";

  const SHELL_VERSION = "ff-trainer-shell-v1";
  const DEFAULT_PASS_SCORE = 80;
  const DEFAULT_SESSION_LENGTH = 8;
  const CARD_BASE = "assets/poker-kit/decks/classic-english";

  const seatPositions = [
    [50, 91],
    [21, 75],
    [13, 42],
    [31, 17],
    [69, 17],
    [87, 42],
    [79, 75]
  ];

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "\"": "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function cleanLine(value) {
    return String(value ?? "").replace(/\s+/g, " ").trim();
  }

  function isDenseEnglishText(value) {
    const text = cleanLine(value);
    if (!text || /[А-Яа-яЁё]/.test(text)) return false;
    const words = text.match(/[A-Za-z][A-Za-z'-]{2,}/g) || [];
    return words.length >= 4;
  }

  function safeClass(value, fallback = "neutral") {
    const text = String(value || fallback).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
    return text || fallback;
  }

  function clamp(value, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return min;
    return Math.min(max, Math.max(min, number));
  }

  function percent(value) {
    return `${Math.round(clamp(value, 0, 100))}%`;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function sessionIdFor(pack) {
    const key = pack?.trainer?.key || "trainer_shell";
    return `${safeClass(key)}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function score(state) {
    return state.attempts ? Math.round((state.correct / state.attempts) * 100) : 0;
  }

  function currentSpot(state) {
    return state.queue[state.index] || state.queue[state.queue.length - 1] || state.pack.spots[0] || null;
  }

  function isSimulatorSpot(spot) {
    return Boolean(spot?.table && asArray(spot.table.seats).length);
  }

  function isConceptSimulatorSpot(spot) {
    return isSimulatorSpot(spot) && !asArray(spot?.table?.heroCards).length;
  }

  function correctOption(spot) {
    return asArray(spot?.options).find((option) => option.correct) || asArray(spot?.options)[0] || null;
  }

  function normalizeCardCode(code) {
    const text = String(code || "").trim();
    if (!text) return "";
    const rankRaw = text.length === 3 ? text.slice(0, 2) : text.slice(0, -1);
    const suitRaw = text.slice(text.length === 3 ? 2 : -1);
    const rank = rankRaw.toUpperCase() === "10" ? "T" : rankRaw.toUpperCase();
    const suit = suitRaw.toLowerCase();
    return `${rank}${suit}`;
  }

  function cardMarkup(code, index = 0, extraClass = "") {
    const normalized = normalizeCardCode(code);
    if (!normalized) return "";
    const tilt = index % 2 === 0 ? "-3deg" : "4deg";
    return `
      <span class="ff-shell-card ${escapeHtml(extraClass)}" style="--tilt:${tilt}" aria-label="${escapeHtml(normalized.toUpperCase())}">
        <img src="${CARD_BASE}/${escapeHtml(normalized)}.svg" alt="">
      </span>
      `;
  }

  function normalizeSeatKey(value) {
    const text = cleanLine(value).toUpperCase();
    if (!text) return "";
    if (text === "HERO" || text === "ГЕРОЙ") return "HERO";
    return text.replace(/\s+/g, "");
  }

  function streetLabel(value, boardCards = []) {
    const text = cleanLine(value).toLowerCase();
    if (/preflop|префлоп/.test(text)) return "префлоп";
    if (/river|ривер/.test(text)) return "ривер";
    if (/turn|терн|тёрн/.test(text)) return "тёрн";
    if (/flop|флоп/.test(text)) return "флоп";
    if (boardCards.length >= 5) return "ривер";
    if (boardCards.length >= 4) return "тёрн";
    if (boardCards.length >= 3) return "флоп";
    return "префлоп";
  }

  function actionLabelFromText(value) {
    const text = cleanLine(value);
    const lower = text.toLowerCase();
    if (/all[-\s]?in|олл|пуш|jam/.test(lower)) return "олл-ин";
    if (/squeeze|сквиз/.test(lower)) return "сквиз";
    if (/3[-\s]?bet|three.?bet|три.?бет|3-бет/.test(lower)) return "3-бет";
    if (/open|откр|рейз|raise/.test(lower)) return /limp|лимп/.test(lower) ? "лимп" : "рейз";
    if (/bet|barrel|став/.test(lower)) return "ставка";
    if (/call|колл|защит/.test(lower)) return "колл";
    if (/check|чек/.test(lower)) return "чек";
    if (/fold|пас|выкин|сброс/.test(lower)) return "пас";
    if (/limp|лимп/.test(lower)) return "лимп";
    return text.slice(0, 24);
  }

  function actionTone(label) {
    const text = cleanLine(label).toLowerCase();
    if (/пас|fold/.test(text)) return "fold";
    if (/чек|check/.test(text)) return "check";
    if (/колл|call/.test(text)) return "call";
    if (/олл|пуш|сквиз|3-бет|рейз|став/.test(text)) return "aggressive";
    return "neutral";
  }

  function actionAmountFromText(value) {
    const text = cleanLine(value).replace(",", ".");
    const match = text.match(/(\d+(?:\.\d+)?)\s*(BB|ББ|%)/i);
    return match ? `${match[1]} ${match[2].toUpperCase().replace("ББ", "BB")}` : "";
  }

  function actionAmountFromRow(row) {
    const raw = row?.amount ?? row?.amountBb ?? row?.toBb ?? row?.sizeBb ?? row?.size;
    const text = cleanLine(raw).replace("ББ", "BB");
    if (!text) return "";
    const number = Number(text.replace(",", "."));
    return Number.isFinite(number) && number > 0 ? `${Math.round(number * 10) / 10} BB` : text;
  }

  function stripStreetPrefix(value) {
    return cleanLine(value).replace(/^(?:preflop|flop|turn|river|префлоп|флоп|терн|тёрн|ривер)\s*[:/.-]\s*/i, "");
  }

  function actionSegmentsFromText(value) {
    const text = stripStreetPrefix(value);
    if (!text) return [];
    return text
      .replace(/\s+and\s+/gi, ", ")
      .split(/[,;]\s*(?=(?:UTG(?:\+1)?|MP|LJ|HJ|CO|BTN|SB|BB|Hero|Герой)\b)/i)
      .map(cleanLine)
      .filter(Boolean);
  }

  function actionRowsFromLine(raw, index, table) {
    const row = raw && typeof raw === "object" ? raw : { text: raw };
    const explicitSeat = cleanLine(row.seat || row.position || row.actor || row.player);
    const explicitAction = cleanLine(row.action || row.type || row.kind);
    const explicitAmount = actionAmountFromRow(row);
    const text = cleanLine(row.text || row.line || row.label || row.title || [explicitSeat, explicitAction, explicitAmount].filter(Boolean).join(" "));
    if (!text) return [];
    const street = cleanLine(row.street) || streetLabel(text, asArray(table.boardCards));
    if (!explicitSeat && /(?:all\s+folded|everyone\s+folds|все\s+(?:выкинули|пас|сбросили)|до\s+героя\s+все\s+(?:выкинули|пас|сбросили))/i.test(text)) {
      return asArray(table.seats)
        .filter((seat) => safeClass(seat?.state || "") === "folded")
        .map((seat) => ({
          index,
          street,
          seat: cleanLine(seat.label),
          seatKey: normalizeSeatKey(seat.label),
          label: "пас",
          tone: "fold",
          amount: "",
          text: `${cleanLine(seat.label)} fold`
        }));
    }
    const segments = explicitSeat ? [text] : actionSegmentsFromText(text);
    return (segments.length ? segments : [text]).map((segment) => {
      const seatMatch = segment.match(/\b(UTG(?:\+1)?|MP|LJ|HJ|CO|BTN|SB|BB|Hero|Герой)\b/i);
      const seat = explicitSeat || seatMatch?.[1] || "";
      const seatKey = normalizeSeatKey(seat === "Hero" || seat === "Герой" ? table.heroPosition : seat);
      const label = actionLabelFromText(row.action || row.type || segment);
      const amount = /пас|fold|чек|check/i.test(label) ? "" : (explicitAmount || actionAmountFromText(segment));
      return {
        index,
        street,
        seat,
        seatKey,
        label,
        tone: actionTone(label),
        amount,
        text: segment
      };
    });
  }

  function normalizeActionRows(table) {
    const rows = [
      ...asArray(table.actionLine),
      ...asArray(table.actions),
      ...asArray(table.flowSteps)
    ].flatMap((line, index) => actionRowsFromLine(line, index, table));
    if (rows.length) return rows.slice(0, 8);
    const fallback = cleanLine(table.line);
    return fallback ? actionRowsFromLine(fallback, 0, table).slice(0, 4) : [];
  }

  function latestActionBySeat(actions) {
    const map = new Map();
    asArray(actions).forEach((action) => {
      if (action.seatKey) map.set(action.seatKey, action);
    });
    return map;
  }

  function tableStateSummary(table, boardCards, actions) {
    const parts = [
      table.toCall ? `к коллу ${table.toCall}` : "",
      table.currentBet ? `ставка ${table.currentBet}` : "",
      actions.length ? `${actions.length} действ.` : ""
    ].filter(Boolean);
    return parts.join(" · ") || cleanLine(table.line) || streetLabel(table.street || table.potLabel, boardCards);
  }

  function normalizeTeaching(spot) {
    const teaching = spot?.teaching && typeof spot.teaching === "object" ? spot.teaching : {};
    const fallbackFactors = [
      ...asArray(spot?.metrics),
      ...asArray(spot?.actionMap).slice(0, 3)
    ];
    const rawFactors = asArray(teaching.factors).length ? asArray(teaching.factors) : fallbackFactors;
    return {
      target: cleanLine(teaching.target || spot?.correctLabel || spot?.target),
      notes: asArray(teaching.notes)
        .map(playerFacingText)
        .filter(Boolean)
        .slice(0, 8),
      factors: rawFactors
        .map((factor) => {
          const row = factor && typeof factor === "object" ? factor : { value: factor };
          return {
            label: cleanLine(row.label || row.key),
            value: cleanLine(row.value || row.text),
            detail: cleanLine(row.detail)
          };
        })
        .filter((row) => row.label && row.value)
        .slice(0, 8),
      options: asArray(teaching.options)
        .map((option) => {
          const row = option && typeof option === "object" ? option : { key: option };
          return {
            key: cleanLine(row.key),
            label: cleanLine(row.label),
            note: playerFacingText(row.note || row.reason || row.detail || row.verdict),
            correct: Boolean(row.correct)
          };
        })
        .filter((row) => row.key || row.label || row.note)
        .slice(0, 8)
    };
  }

  function playerFacingText(value) {
    let text = cleanLine(value);
    if (!text) return "";
    if (/^reject lines that skip the .+ checkpoint\.?$/i.test(text)) {
      return "Сначала учти давление выплат, потом выбирай линию.";
    }
    if (/^choose an? .+ line before the source target opens\.?$/i.test(text)) {
      return "Сначала выбери линию, потом откроется разбор.";
    }
    if (/\b(json|runtime|telemetry|schema|contract|qualitybar|sourcerow|sourcepack|fftrainer|localstorage)\b/i.test(text)) return "";
    if (/(^|\s)[a-z0-9]+_[a-z0-9_]{3,}/i.test(text)) return "";
    if (/\bdo not\b/i.test(text)) return "";
    if (/\b(?:source|format|quality|answer|summary|checkpoint|canvas|live|price)\s+gate\b/i.test(text)) return "";
    if (/\bcheckpoint\b/i.test(text)) return "";
    if (isDenseEnglishText(text)) return "";
    text = text
      .replace(/диапазон[^.!?]*иконк[а-яё\s-]*(?:слева|навед)[^.!?]*[.!?]?/gi, "Проверь диапазон в логике спота.")
      .replace(/[^.!?]*иконк[а-яё\s-]*(?:слева|навед)[^.!?]*[.!?]?/gi, "")
      .replace(/^(молодец|правильно|верно|отлично|correct)[.!:\s]+/i, "")
      .replace(/\s{2,}/g, " ")
      .replace(/^мы хотим/i, "Нужно")
      .trim();
    if (!text || /иконк[а-яё\s-]*(слева|навед)/i.test(text)) return "";
    return text;
  }

  function firstClean(values, fallback = "") {
    for (const value of asArray(values)) {
      const text = playerFacingText(value);
      if (text) return text;
    }
    return fallback;
  }

  function normalizeToolFactor(row) {
    const item = row && typeof row === "object" ? row : { value: row };
    const label = cleanLine(item.label || item.key || item.name || item.title);
    const value = cleanLine(item.value || item.text || item.detail || item.note);
    const detail = cleanLine(item.detail && item.detail !== value ? item.detail : "");
    if (!label || !value) return null;
    return { label, value, detail };
  }

  function normalizeRangeTool(range) {
    const rows = asArray(range.rows)
      .map((row) => {
        const item = row && typeof row === "object" ? row : {};
        const count = Number(item.count);
        return {
          key: cleanLine(item.key || item.label),
          label: cleanLine(item.label || item.key),
          count: Number.isFinite(count) ? count : null,
          current: Boolean(item.current),
          target: Boolean(item.target),
          detail: cleanLine(item.detail || item.note)
        };
      })
      .filter((row) => row.label && (row.count !== null || row.current || row.target))
      .slice(0, 8);
    if (!rows.length) return null;
    return {
      label: cleanLine(range.label || "диапазон"),
      title: cleanLine(range.title),
      hand: cleanLine(range.hand),
      target: cleanLine(range.target),
      activePct: cleanLine(range.activePct),
      totalCombos: cleanLine(range.totalCombos),
      purpose: firstClean([range.purpose, range.summary]),
      note: playerFacingText(range.note),
      rows
    };
  }

  function normalizeLogicTool(spot, range) {
    const tools = spot?.tools && typeof spot.tools === "object" ? spot.tools : {};
    const explicit = tools.logic && typeof tools.logic === "object" ? tools.logic : {};
    const teaching = normalizeTeaching(spot);
    const expected = correctOption(spot) || {};
    const expectedKey = cleanLine(expected.key);
    const expectedLabel = cleanLine(expected.label || expectedKey);
    const expectedTeaching = asArray(teaching.options).find((row) =>
      (expectedKey && row.key === expectedKey) ||
      (expectedLabel && row.label === expectedLabel)
    ) || null;
    const model = spot?.model && typeof spot.model === "object" ? spot.model : {};
    const source = spot?.source && typeof spot.source === "object" ? spot.source : {};
    const table = spot?.table && typeof spot.table === "object" ? spot.table : {};
    const board = asArray(table.boardCards).map(normalizeCardCode).filter(Boolean).join(" ").toUpperCase();
    const heroCards = asArray(table.heroCards).map(normalizeCardCode).filter(Boolean).join(" ").toUpperCase();
    const objective = firstClean([
      explicit.objective,
      explicit.target,
      teaching.target,
      expectedLabel,
      range?.target
    ], "выбрать лучшую линию");
    const objectiveNote = firstClean([
      explicit.objectiveNote,
      explicit.note,
      expectedTeaching?.note,
      expected.feedback,
      model.primaryRule,
      model.primary,
      asArray(teaching.notes)[0],
      spot?.reason
    ], "Сначала привяжи решение к признакам спота, потом выбирай кнопку.");
    const warning = firstClean([
      explicit.warning,
      explicit.trap,
      model.rejectRule,
      model.reject,
      asArray(teaching.notes).find((note) => note !== objectiveNote)
    ]);
    const fallbackFactors = [
      { label: "позиция", value: table.heroPosition || spot?.heroPosition || spot?.position },
      { label: "рука", value: spot?.hand || heroCards },
      { label: board ? "борд" : "банк", value: board || table.pot || spot?.potBb },
      { label: "линия", value: objective },
      { label: "источник", value: source.detail || source.row }
    ];
    const sourceFactors = asArray(explicit.factors).length ? asArray(explicit.factors) : asArray(teaching.factors);
    const factorKeys = new Set();
    const factors = [...sourceFactors, ...fallbackFactors]
      .map(normalizeToolFactor)
      .filter(Boolean)
      .filter((factor) => {
        const key = `${factor.label}::${factor.value}`.toLowerCase();
        if (factorKeys.has(key)) return false;
        factorKeys.add(key);
        return true;
      })
      .slice(0, 5);
    const title = firstClean([
      explicit.title,
      spot?.title,
      model.label,
      source.detail
    ], "Логика спота");
    if (!title && !objective && !objectiveNote && !warning && !factors.length && !range) return null;
    return {
      label: cleanLine(explicit.label || "логика"),
      title,
      objective,
      objectiveNote,
      warning,
      factors,
      range
    };
  }

  function normalizeTools(spot) {
    const tools = spot?.tools && typeof spot.tools === "object" ? spot.tools : {};
    const range = tools.range && typeof tools.range === "object" ? normalizeRangeTool(tools.range) : null;
    const logic = normalizeLogicTool(spot, range);
    const result = {};
    if (logic) result.logic = logic;
    if (range) result.range = range;
    return result;
  }

  function normalizePack(input) {
    const pack = input && typeof input === "object" ? input : {};
    const trainer = pack.trainer && typeof pack.trainer === "object" ? pack.trainer : {};
    const key = trainer.key || pack.skillKey || pack.id || "trainer_shell_lab";
    const spots = asArray(pack.spots).map((spot, index) => ({
      id: spot.id || `${safeClass(key)}_spot_${index + 1}`,
      title: spot.title || `Спот ${index + 1}`,
      question: spot.question || "Выбери лучшее решение.",
      source: spot.source || null,
      table: spot.table || {},
      metrics: asArray(spot.metrics),
      gates: asArray(spot.gates),
      model: spot.model || {},
      actionMap: asArray(spot.actionMap),
      teaching: normalizeTeaching(spot),
      tools: normalizeTools(spot),
      options: asArray(spot.options),
      errorTag: spot.errorTag || "",
      tags: asArray(spot.tags)
    }));
    const normalized = {
      schema: pack.schema || "ff-trainer-shell-pack-v1",
      id: pack.id || safeClass(key),
      title: pack.title || trainer.title || "Скелет тренажёра",
      subtitle: pack.subtitle || "",
      trainer: {
        key,
        title: trainer.title || pack.title || "Скелет тренажёра",
        version: trainer.version || pack.version || SHELL_VERSION
      },
      theme: pack.theme || {},
      qualityBar: pack.qualityBar || { id: "trainer_shell_skeleton_v1", label: "Скелет v1" },
      sourceRows: asArray(pack.sourceRows),
      sessionLength: Math.max(1, Number(pack.sessionLength || DEFAULT_SESSION_LENGTH)),
      passScore: Math.max(1, Number(pack.passScore || DEFAULT_PASS_SCORE)),
      nextRecommendation: pack.nextRecommendation || `${key}.repeat`,
      reviewRoutes: asArray(pack.reviewRoutes),
      spots
    };
    normalized.sessionLength = Math.min(normalized.sessionLength, Math.max(1, normalized.spots.length));
    return normalized;
  }

  function validatePack(pack) {
    const errors = [];
    if (!pack || typeof pack !== "object") errors.push("pack должен быть объектом");
    if (!pack?.trainer?.key) errors.push("нужен trainer.key");
    if (!asArray(pack?.spots).length) errors.push("нужен хотя бы один spots[]");
    asArray(pack?.spots).forEach((spot, index) => {
      const label = spot?.id || `спот ${index + 1}`;
      if (!asArray(spot?.options).length) errors.push(`${label}: нужны варианты ответа`);
      const correctCount = asArray(spot?.options).filter((option) => option.correct).length;
      if (correctCount !== 1) errors.push(`${label}: ровно один option.correct`);
    });
    return {
      ok: errors.length === 0,
      errors
    };
  }

  function buildQueue(pack) {
    return pack.spots.slice(0, pack.sessionLength);
  }

  function activeProfile() {
    return window.FFPlayerProgress?.getActiveProfile?.() || null;
  }

  function trainerMeta(pack) {
    return {
      key: pack.trainer.key,
      title: pack.trainer.title,
      version: pack.trainer.version
    };
  }

  function sendTrainerEvent(state, kind, payload) {
    return window.FFTrainerEvents?.send?.({
      kind,
      trainer: trainerMeta(state.pack),
      profile: activeProfile(),
      client: {
        source: "trainer-shell-lab",
        shellVersion: SHELL_VERSION,
        packId: state.pack.id
      },
      ...payload
    }) || null;
  }

  function weakErrorTags(state) {
    return Object.entries(state.errorCounts)
      .sort((left, right) => Number(right[1]) - Number(left[1]))
      .map(([tag]) => tag);
  }

  function summaryRowsForResult(result) {
    const passed = result.status === "passed";
    return [
      {
        state: passed ? "passed" : "repeat",
        label: "точность",
        value: `${result.score}%`,
        detail: `${result.correct}/${result.attempts} правильно`
      },
      {
        state: "passed",
        label: "прогресс",
        value: "сохранён",
        detail: "результат учтён в маршруте"
      },
      {
        state: passed ? "passed" : "repeat",
        label: "дальше",
        value: passed ? "следующая тема" : "повторить",
        detail: passed ? "пак закрыт" : "закрепи слабые места"
      }
    ];
  }

  function weakSummaryLabel(result) {
    const count = asArray(result.weakErrorTags).length;
    if (!count) return "без ликов";
    return count === 1 ? "1 зона повтора" : `${count} зоны повтора`;
  }

  function routeReasonText(route, result) {
    return playerFacingText(route?.reason) || (asArray(result.weakErrorTags).length ? "повторить слабые места" : "");
  }

  function sourceCounts(state) {
    return state.history.reduce((counts, decision) => {
      const key = decision.source?.row || decision.source?.label || "shell";
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {});
  }

  function summarySourceGateSnapshot(state, status = "open") {
    const rows = state.pack.sourceRows;
    const covered = new Set(state.history.map((decision) => decision.source?.row).filter(Boolean));
    const coveredCount = rows.filter((row) => covered.has(row)).length;
    return [
      {
        gate: "источник",
        state: rows.length && coveredCount < rows.length ? status : "passed",
        value: rows.length ? `${coveredCount}/${rows.length}` : "pack",
        detail: rows.length ? rows.join(", ") : state.pack.id
      },
      {
        gate: "качество",
        state: "passed",
        value: state.pack.qualityBar?.id || "trainer_shell_skeleton_v1",
        detail: state.pack.qualityBar?.label || "общий скелет"
      },
      {
        gate: "телеметрия",
        state: "passed",
        value: "ff-trainer-event-v1",
        detail: "общий прогресс + события"
      }
    ];
  }

  function reviewRoutes(state, passed) {
    if (passed) return [];
    const tags = weakErrorTags(state);
    if (state.pack.reviewRoutes.length) {
      return state.pack.reviewRoutes.map((route) => ({
        ...route,
        weakTags: tags.slice(0, 4)
      }));
    }
    return [{
      label: "Повторить пак",
      href: `trainer-shell-lab.html?pack=${encodeURIComponent(state.pack.id)}`,
      reason: tags.length ? `слабые теги: ${tags.slice(0, 3).join(", ")}` : "повторить текущий пак",
      targetTags: tags.slice(0, 4),
      weakTags: tags.slice(0, 4)
    }];
  }

  function resultForState(state) {
    const finalScore = score(state);
    const passed = finalScore >= state.pack.passScore;
    const tags = weakErrorTags(state);
    return {
      schema: "ff-trainer-result-v1",
      skillKey: state.pack.trainer.key,
      trainerKey: state.pack.trainer.key,
      trainerTitle: state.pack.trainer.title,
      shellVersion: SHELL_VERSION,
      packId: state.pack.id,
      version: state.pack.trainer.version,
      status: passed ? "passed" : "repeat",
      score: finalScore,
      bestScore: finalScore,
      passScore: state.pack.passScore,
      attempts: state.attempts,
      correct: state.correct,
      total: state.queue.length,
      startedAt: state.startedAt,
      completedAt: nowIso(),
      sourceRows: state.pack.sourceRows,
      sourceCounts: sourceCounts(state),
      qualityBar: state.pack.qualityBar,
      weakErrorTags: tags,
      errorCounts: state.errorCounts,
      summarySourceGate: summarySourceGateSnapshot(state, passed ? "passed" : "repeat"),
      reviewRoutes: reviewRoutes(state, passed),
      nextRecommendation: passed ? state.pack.nextRecommendation : `${state.pack.trainer.key}.repeat`
    };
  }

  function finishSession(state) {
    if (state.finished) return;
    state.finished = true;
    const result = resultForState(state);
    state.result = result;

    window.FFPlayerProgress?.setResult?.(state.pack.trainer.key, result);

    sendTrainerEvent(state, "trainer_session", {
      session: {
        id: state.sessionId,
        type: "trainer_shell_pack",
        packId: state.pack.id,
        startedAt: state.startedAt,
        completedAt: result.completedAt,
        total: state.queue.length,
        attempts: state.attempts,
        correct: state.correct,
        accuracy: result.score,
        status: result.status,
        answers: state.history
      },
      result,
      answers: state.history,
      summarySourceGate: result.summarySourceGate
    });

    renderAnsweredSpot(state);
  }

  function answer(state, optionKey) {
    if (state.answered || state.finished) return;
    const spot = currentSpot(state);
    const option = asArray(spot?.options).find((item) => item.key === optionKey);
    const expected = correctOption(spot);
    if (!spot || !option || !expected) return;

    const isCorrect = option.key === expected.key;
    const elapsedMs = Math.max(0, Math.round(performance.now() - state.spotStartedAt));
    const errorTag = isCorrect ? "" : (option.errorTag || spot.errorTag || "trainer_shell_misread");
    state.answered = true;
    state.selectedKey = option.key;
    state.attempts += 1;
    if (isCorrect) state.correct += 1;
    if (errorTag) state.errorCounts[errorTag] = (state.errorCounts[errorTag] || 0) + 1;

    const answerAudit = answerAuditRows(spot, option, expected, isCorrect);
    const decision = {
      sessionId: state.sessionId,
      spotId: spot.id,
      packId: state.pack.id,
      source: spot.source || null,
      choice: option.key,
      choiceLabel: option.label,
      expected: expected.key,
      expectedLabel: expected.label,
      correct: isCorrect,
      isCorrect,
      errorTag,
      tags: errorTag ? [errorTag] : [],
      elapsedMs,
      table: spot.table,
      gates: spot.gates,
      model: spot.model,
      actionMap: spot.actionMap,
      answerAudit
    };
    state.history.push(decision);

    sendTrainerEvent(state, "trainer_decision", {
      session: {
        id: state.sessionId,
        startedAt: state.startedAt,
        packId: state.pack.id
      },
      decision,
      result: {
        attempts: state.attempts,
        correct: state.correct,
        score: score(state),
        isCorrect
      },
      answerAudit,
      summarySourceGate: summarySourceGateSnapshot(state, "open")
    });

    renderAnsweredSpot(state);
  }

  function next(state) {
    if (!state.answered) return;
    if (state.index >= state.queue.length - 1) {
      finishSession(state);
      return;
    }
    state.index += 1;
    state.answered = false;
    state.selectedKey = "";
    state.spotStartedAt = performance.now();
    render(state);
  }

  function startSession(state) {
    state.queue = buildQueue(state.pack);
    state.index = 0;
    state.attempts = 0;
    state.correct = 0;
    state.startedAt = nowIso();
    state.spotStartedAt = performance.now();
    state.sessionId = sessionIdFor(state.pack);
    state.history = [];
    state.errorCounts = {};
    state.answered = false;
    state.selectedKey = "";
    state.finished = false;
    state.result = null;
    state.editorText = JSON.stringify(state.pack, null, 2);
    state.editorError = "";
    render(state);
  }

  function setPack(state, packId) {
    const pack = state.packs.find((item) => item.id === packId) || state.packs[0] || state.pack;
    state.pack = normalizePack(pack);
    startSession(state);
  }

  function applyEditorPack(state) {
    const textarea = state.root.querySelector("[data-shell-pack-editor]");
    const source = textarea?.value || state.editorText || "";
    state.editorText = source;
    try {
      const parsed = JSON.parse(source);
      const pack = normalizePack(parsed);
      const validation = validatePack(pack);
      if (!validation.ok) {
        state.editorError = validation.errors.join(" / ");
        render(state);
        return;
      }
      state.pack = pack;
      if (!state.packs.some((item) => item.id === pack.id)) state.packs = [pack, ...state.packs];
      startSession(state);
    } catch (error) {
      state.editorError = error.message;
      render(state);
    }
  }

  function resetEditorPack(state) {
    const base = state.packs.find((item) => item.id === state.pack.id) || state.packs[0] || state.pack;
    state.pack = normalizePack(base);
    startSession(state);
  }

  function answerAuditRows(spot, option, expected, isCorrect) {
    const gateRows = asArray(spot.gates).slice(0, 3).map((gate) => ({
      label: gate.label || "Gate",
      value: gate.value || "-",
      state: gate.state || "open",
      detail: gate.detail || ""
    }));
    return [
      {
        label: "Выбрано",
        value: option.label || option.key,
        state: isCorrect ? "passed" : "failed",
        detail: option.feedback || ""
      },
      {
        label: "Цель",
        value: expected.label || expected.key,
        state: "passed",
        detail: expected.feedback || ""
      },
      ...gateRows
    ];
  }

  function teachingOptionFor(spot, option) {
    const key = cleanLine(option?.key);
    const label = cleanLine(option?.label);
    return asArray(spot?.teaching?.options).find((row) =>
      (key && row.key === key) ||
      (label && row.label === label)
    ) || null;
  }

  function teachingFactorSummary(spot) {
    const rows = asArray(spot?.teaching?.factors)
      .map((factor) => {
        const label = cleanLine(factor.label);
        const value = cleanLine(factor.value);
        const detail = cleanLine(factor.detail);
        if (!label || !value) return "";
        return `${label}: ${value}${detail ? ` (${detail})` : ""}`;
      })
      .filter(Boolean)
      .slice(0, 4);
    return rows.join("; ");
  }

  function optionTeachingNote(row, option) {
    const note = playerFacingText(row?.note);
    if (!note) return "";
    const label = cleanLine(row?.label || option?.label);
    const key = cleanLine(row?.key || option?.key);
    const feedback = playerFacingText(option?.feedback);
    if (note === label || note === key || note.length < 12) return "";
    if (feedback && (note === feedback || note.startsWith(feedback) || feedback.startsWith(note))) return "";
    return note;
  }

  function neutralTargetFeedback(text) {
    const value = playerFacingText(text)
      .replace(/^(молодец|правильно|верно|отлично|correct)[.!:\s]+/i, "")
      .replace(/^мы хотим/i, "Нужно")
      .trim();
    if (value === "Проверь диапазон в логике спота.") return "";
    return value;
  }

  function answerNotes(spot, option, expected, isCorrect) {
    const technicalPattern = /\b(json|runtime|telemetry|schema|contract|qualitybar|sourcerow|sourcepack|fftrainer|localstorage)\b|(?:^|\s)[a-z0-9]+_[a-z0-9_]{3,}/i;
    const notes = [];
    const quietSimulator = isSimulatorSpot(spot);
    const add = (text) => {
      const value = playerFacingText(text);
      if (!value || technicalPattern.test(value) || notes.includes(value)) return;
      notes.push(value.length > 240 ? `${value.slice(0, 237)}...` : value);
    };
    const selectedTeaching = teachingOptionFor(spot, option);
    const expectedTeaching = teachingOptionFor(spot, expected);
    const model = spot?.model || {};
    const factorSummary = teachingFactorSummary(spot);
    const bareLabels = new Set(asArray(spot?.options).flatMap((item) => [
      cleanLine(item.key),
      cleanLine(item.label)
    ]).filter(Boolean));
    const addKnowledge = (text) => {
      const value = playerFacingText(text);
      if (!value || bareLabels.has(value) || value.length < 12) return;
      add(value);
    };

    if (isCorrect) {
      add(expected.feedback || option.feedback);
    } else {
      add(option.feedback);
      const selectedNote = optionTeachingNote(selectedTeaching, option);
      if (selectedNote) add(`Почему это хуже: ${selectedNote}`);
      const targetFeedback = neutralTargetFeedback(expected.feedback);
      if (targetFeedback) add(`Целевая линия: ${targetFeedback}`);
    }
    if (factorSummary && !quietSimulator) add(`Опорные признаки: ${factorSummary}.`);
    const expectedNote = optionTeachingNote(expectedTeaching, expected);
    if (expectedNote) add(isCorrect ? expectedNote : `Почему цель: ${expectedNote}`);
    if (!quietSimulator) {
      asArray(spot?.teaching?.notes).forEach(addKnowledge);
      addKnowledge(model.primary);
      addKnowledge(isCorrect ? model.exploit : model.reject);
    }
    add(isCorrect
      ? "Линия выбрана верно. Перед следующим спотом зафиксируй один признак, который решил выбор."
      : "Сравни выбранную линию с целевой и проговори, какой признак перевесил.");
    return notes.slice(0, 4);
  }

  function formatClock(ms) {
    const seconds = Math.max(0, Math.floor(Number(ms || 0) / 1000));
    const minutes = Math.floor(seconds / 60);
    return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
  }

  function renderTrainingPips(state) {
    return Array.from({ length: state.queue.length }, (_, index) => {
      const decision = state.history[index];
      const className = [
        decision ? (decision.correct ? "is-good" : "is-bad") : "",
        index === state.index && !state.answered ? "is-current" : "",
        !decision && index !== state.index ? "is-open" : ""
      ].filter(Boolean).join(" ");
      return `<span class="${className}" aria-hidden="true"></span>`;
    }).join("");
  }

  function renderAnsweredSpot(state) {
    const spot = currentSpot(state);
    if (!spot) {
      render(state);
      return;
    }
    if (state.root.querySelector(".ff-shell-simulator-snapshot")) {
      render(state);
      return;
    }
    const shell = state.root.querySelector(".ff-shell");
    if (shell) shell.dataset.shellState = "answered";

    const scoreNode = state.root.querySelector(".ff-shell-score strong");
    if (scoreNode) scoreNode.textContent = `${score(state)}%`;

    const optionsNode = state.root.querySelector(".ff-shell-table-actions .ff-shell-options");
    if (optionsNode) optionsNode.outerHTML = renderOptions(state, spot);

    const tableActions = state.root.querySelector(".ff-shell-table-actions");
    const inlineFeedback = tableActions?.querySelector(".ff-shell-feedback");
    if (inlineFeedback) inlineFeedback.remove();
    if (tableActions) tableActions.insertAdjacentHTML("beforeend", renderFeedback(state, spot));

    const trainingDock = state.root.querySelector(".ff-shell-training-dock");
    if (trainingDock) {
      trainingDock.outerHTML = renderTrainingDock(state, spot);
    } else if (tableActions) {
      tableActions.insertAdjacentHTML("afterend", renderTrainingDock(state, spot));
    } else {
      render(state);
    }

    const dockHiddenForViewport = window.matchMedia?.("(max-height: 760px), (max-width: 620px)")?.matches;
    const decisionPanel = state.root.querySelector(".ff-shell-decision");
    if (dockHiddenForViewport && decisionPanel) decisionPanel.outerHTML = renderSideFeedbackPanel(state, spot);
  }

  function render(state) {
    const spot = currentSpot(state);
    const progress = state.queue.length ? (state.index / state.queue.length) * 100 : 0;
    const theme = safeClass(state.pack.theme?.tone || "command");
    const accent = safeClass(state.pack.theme?.accent || "mint");
    const density = safeClass(state.previewDensity || "lab");
    const shellState = state.finished ? "done" : (state.answered ? "answered" : "live");
    const simulatorSpot = isSimulatorSpot(spot);
    const liveClean = simulatorSpot && !state.answered && !state.finished;
    const gridClass = [
      "ff-shell-grid",
      state.lab ? "has-lab" : "",
      state.lab && state.showTech ? "has-tech-open" : "",
      simulatorSpot ? "has-sim-snapshot" : "",
      liveClean ? "is-live-clean" : ""
    ].filter(Boolean).join(" ");
    state.root.innerHTML = `
      <section class="ff-shell ff-shell-theme-${theme} ff-shell-accent-${accent}" data-shell-density="${density}" data-shell-state="${shellState}">
        <div class="${gridClass}">
          ${state.lab ? renderLabBar(state) : ""}
          ${renderBoardPanel(state, spot, progress)}
          ${renderDecisionPanel(state, spot)}
          ${state.lab && state.showTech ? renderTechPanel(state) : ""}
        </div>
      </section>
    `;
  }

  function renderLabBar(state) {
    return `
      <div class="ff-shell-lab-bar">
        <div class="ff-shell-pack-switch" aria-label="Pack switch">
          ${state.packs.map((pack) => `
            <button type="button" class="${pack.id === state.pack.id ? "is-active" : ""}" data-shell-action="pack" data-pack-id="${escapeHtml(pack.id)}">
              <span>${escapeHtml(pack.title || pack.id)}</span>
            </button>
          `).join("")}
        </div>
        <button type="button" class="ff-shell-tech-toggle ${state.showTech ? "is-active" : ""}" data-shell-action="toggle-tech" aria-expanded="${state.showTech ? "true" : "false"}">
          ${escapeHtml(state.showTech ? "Скрыть настройки" : "Под капотом")}
        </button>
      </div>
    `;
  }

  function renderBoardPanel(state, spot, progress) {
    const simulatorTable = renderSimulatorTable(state, spot);
    // In the simulator path the right decision panel is empty during the live
    // decision, so surface the concrete spot question in the header — it is the
    // "what am I solving" cue of the learning pipeline. Non-sim trainers already
    // show the question in the decision panel, so keep their pack subtitle.
    const headSub = isSimulatorSpot(spot)
      ? (isConceptSimulatorSpot(spot)
        ? (playerFacingText(spot?.title) || state.pack.subtitle || state.pack.trainer.title)
        : (playerFacingText(spot?.question) || state.pack.subtitle || state.pack.trainer.title))
      : (state.pack.subtitle || state.pack.trainer.title);
    const accuracy = state.history.length || state.finished ? `${score(state)}%` : "";
    return `
      <section class="ff-shell-board" aria-label="Стол тренажёра">
        <header class="ff-shell-head">
          <div>
            <span class="ff-shell-kicker">Тренажер</span>
            <h1>${escapeHtml(state.pack.title)}</h1>
            <p>${escapeHtml(headSub)}</p>
          </div>
          <div class="ff-shell-score" aria-live="polite">
            <span>${escapeHtml(state.finished ? "готово" : `${Math.min(state.index + 1, state.queue.length)}/${state.queue.length}`)}</span>
            <strong>${accuracy}</strong>
          </div>
        </header>
        <div class="ff-shell-progress" aria-hidden="true"><span style="width:${state.finished ? "100%" : percent(progress)}"></span></div>
        ${simulatorTable || renderTable(spot)}
        ${simulatorTable ? "" : renderTableActions(state, spot)}
        ${renderTrainingDock(state, spot)}
      </section>
    `;
  }

  function renderSimulatorTable(state, spot) {
    if (!spot || !window.FFTrainerSimulatorSnapshot?.renderTable) return "";
    return window.FFTrainerSimulatorSnapshot.renderTable(spot, state) || "";
  }

  function renderTable(spot) {
    const table = spot?.table || {};
    const allSeats = asArray(table.seats);
    const heroOnRail = Boolean(table.heroSeatOnRail);
    const actionRows = normalizeActionRows(table);
    const seatActions = latestActionBySeat(actionRows);
    const railSeats = heroOnRail
      ? allSeats
      : allSeats.filter((seat) => safeClass(seat?.state || "") !== "hero");
    const coords = railSeatCoordinates(railSeats.length, heroOnRail);
    const heroCards = asArray(table.heroCards);
    const boardCards = asArray(table.boardCards);
    const street = streetLabel(table.street || table.potLabel, boardCards);
    return `
      <div class="ff-shell-table" data-table-tone="${safeClass(table.tone || "default")}" data-street="${safeClass(street)}">
        ${renderTableTools(spot)}
        <div class="ff-shell-street-badge" aria-label="Состояние раздачи">
          <span>${escapeHtml(street)}</span>
          <strong>${escapeHtml(tableStateSummary(table, boardCards, actionRows))}</strong>
        </div>
        <div class="ff-shell-seat-track">
          ${railSeats.map((seat, index) => renderSeat(seat, index, railSeats.length, coords[index], seatActions)).join("")}
        </div>
        <div class="ff-shell-pot">
          <span>${escapeHtml(table.potLabel || "банк")}</span>
          <strong>${escapeHtml(table.pot || "-")}</strong>
        </div>
        <div class="ff-shell-board-cards ${boardCards.length ? "" : "is-empty"}">
          ${boardCards.map((card, index) => cardMarkup(card, index, "is-board")).join("") || "<span>префлоп</span>"}
        </div>
        <div class="ff-shell-hero">
          <div class="ff-shell-hero-cards">
            ${heroCards.map((card, index) => cardMarkup(card, index, "is-hero")).join("")}
          </div>
          <div class="ff-shell-hero-meta">
            <span>${escapeHtml(table.heroPosition || "Герой")}</span>
            <strong>${escapeHtml(heroCards.map(normalizeCardCode).join(" ").toUpperCase() || "карты")}</strong>
            <small>${escapeHtml(table.heroStack || "-")}</small>
          </div>
        </div>
        ${renderActionLine(table, actionRows)}
        ${renderHeroDecisionCue(table, spot, seatActions)}
      </div>
    `;
  }

  function renderActionLine(table, actionRows) {
    const rows = asArray(actionRows).slice(-4);
    if (!rows.length) return "";
    return `
      <div class="ff-shell-action-line" aria-label="Уже выставленный экшен">
        ${rows.map((action) => `
          <span class="is-${safeClass(action.tone)}">
            <b>${escapeHtml(cleanLine(action.seat || action.street || table.heroPosition || "стол"))}</b>
            <strong>${escapeHtml(action.label || action.text)}</strong>
            ${action.amount ? `<em>${escapeHtml(action.amount)}</em>` : ""}
          </span>
        `).join("")}
      </div>
    `;
  }

  function renderHeroDecisionCue(table, spot, seatActions) {
    const heroKey = normalizeSeatKey(table.heroPosition || "Hero");
    const previous = seatActions.get(heroKey);
    const label = cleanLine(table.decisionLabel || correctOption(spot)?.label || "выбрать линию");
    const context = [
      previous?.label ? `было: ${previous.label}` : "",
      table.toCall ? `к коллу ${table.toCall}` : "",
      table.currentBet ? `ставка ${table.currentBet}` : ""
    ].filter(Boolean).join(" · ");
    return `
      <div class="ff-shell-hero-cue" aria-label="Текущее решение Героя">
        <span>ход героя</span>
        <strong>${escapeHtml(label)}</strong>
        ${context ? `<small>${escapeHtml(context)}</small>` : ""}
      </div>
    `;
  }

  function renderLogicFactors(logic) {
    const factors = asArray(logic?.factors)
      .map((factor) => ({
        label: playerFacingText(factor?.label),
        value: playerFacingText(factor?.value),
        detail: playerFacingText(factor?.detail)
      }))
      .filter((factor) => factor.label && factor.value)
      .slice(0, 5);
    if (!factors.length) return "";
    return `
      <section class="ff-shell-logic-section ff-shell-logic-checklist">
        <span>перед кликом</span>
        <div class="ff-shell-logic-factors">
          ${factors.map((factor) => `
            <small>
              <b>${escapeHtml(factor.label)}</b>
              <strong>${escapeHtml(factor.value)}</strong>
              ${factor.detail ? `<em>${escapeHtml(factor.detail)}</em>` : ""}
            </small>
          `).join("")}
        </div>
      </section>
    `;
  }

  function rangeSourceRow(range, target) {
    const currentRows = asArray(range?.rows).filter((row) => row.current);
    return currentRows.find((row) => row.key && row.key !== target?.key) || currentRows[0] || null;
  }

  function rangeDecisionMode(source, target) {
    if (source && target && source.key && target.key && source.key !== target.key) return "проверь фильтр";
    if (source && target && source.label === target.label) return "ветка совпала";
    if (target) return "держи цель";
    return "смотри факторы";
  }

  function rangePurposeText(range, source, target) {
    if (source && target && source.key && target.key && source.key !== target.key) {
      return "Диапазон здесь нужен не для выбора по самому большому числу. Он показывает ветку источника и целевую кнопку после фильтров позиции, стека и формата.";
    }
    if (source && target && source.label === target.label) {
      return "Диапазон подтверждает целевую ветку. Осталось сверить признаки спота и нажать действие этой ветки.";
    }
    return firstClean([
      range?.purpose,
      "Диапазон связывает руку с веткой решения: сначала найди ветку, затем проверь, совпадает ли она с целью спота."
    ]);
  }

  function renderRangeDecision(range, source, target) {
    const cards = [
      {
        label: "рука в источнике",
        value: source?.label || "по факторам",
        tone: source && target && source.key === target.key ? "good" : "neutral"
      },
      {
        label: "целевая кнопка",
        value: target?.label || range?.target || "выбери линию",
        tone: "target"
      },
      {
        label: "контроль",
        value: rangeDecisionMode(source, target),
        tone: source && target && source.key !== target.key ? "warn" : "good"
      }
    ];
    return `
      <div class="ff-shell-range-decision" aria-label="Разбор диапазона">
        ${cards.map((card) => `
          <small class="is-${safeClass(card.tone)}">
            <em>${escapeHtml(card.label)}</em>
            <strong>${escapeHtml(card.value)}</strong>
          </small>
        `).join("")}
      </div>
    `;
  }

  function renderLogicRange(range) {
    if (!range || !asArray(range.rows).length) return "";
    const target = asArray(range.rows).find((row) => row.target);
    const current = rangeSourceRow(range, target);
    const route = [
      range.hand ? `рука: ${range.hand}` : "",
      current ? `сейчас: ${current.label}` : "",
      target ? `цель: ${target.label}` : "",
      range.activePct ? `${range.activePct}% активных` : ""
    ].filter(Boolean).join(" · ");
    const purpose = rangePurposeText(range, current, target);
    return `
      <section class="ff-shell-logic-section ff-shell-logic-range">
        <span>диапазон</span>
        <b>${escapeHtml(range.title || "Срез решения")}</b>
        ${route ? `<p>${escapeHtml(route)}</p>` : ""}
        ${renderRangeDecision(range, current, target)}
        <p>${escapeHtml(purpose)}</p>
        <div class="ff-shell-range-rows">
          ${asArray(range.rows).map((row) => {
            const count = Number(row.count);
            const pct = Number.isFinite(count) ? clamp((count / 169) * 100, 2, 100) : 2;
            const detail = [
              row.detail,
              row.current && row.target ? "рука и цель" : "",
              row.current && !row.target ? "ветка источника" : "",
              row.target && !row.current ? "кнопка ответа" : ""
            ].filter(Boolean).join(" · ");
            const className = [
              row.target ? "is-target" : "",
              row.current ? "is-current" : ""
            ].filter(Boolean).join(" ");
            return `
              <span class="${className}" style="--range-pct:${pct}%">
                <i aria-hidden="true"></i>
                <em>${escapeHtml(row.label)}</em>
                <strong>${escapeHtml(Number.isFinite(count) ? `${count} комбо` : "-")}</strong>
                ${detail ? `<b>${escapeHtml(detail)}</b>` : ""}
              </span>
            `;
          }).join("")}
        </div>
        ${range.note ? `<p>${escapeHtml(range.note)}</p>` : ""}
      </section>
    `;
  }

  function renderTableTools(spot) {
    const logic = spot?.tools?.logic;
    if (!logic) return "";
    const range = logic.range || spot?.tools?.range;
    const objective = playerFacingText(logic.objective);
    const objectiveNote = playerFacingText(logic.objectiveNote);
    const warning = playerFacingText(logic.warning);
    const meta = [
      objective ? `цель: ${objective}` : "",
      range?.hand ? `рука: ${range.hand}` : ""
    ].filter(Boolean).join(" · ");
    return `
      <div class="ff-shell-table-tools" aria-label="Инструменты стола">
        <details class="ff-shell-logic-tool ff-shell-range-tool">
          <summary aria-label="Показать логику спота" title="Логика спота">
            <span aria-hidden="true">▦</span>
          </summary>
          <div class="ff-shell-logic-popover ff-shell-range-popover" role="group" aria-label="Логика текущего спота">
            <header>
              <span>${escapeHtml(playerFacingText(logic.label) || "логика")}</span>
              <b>${escapeHtml(playerFacingText(logic.title) || "Как думать здесь")}</b>
              ${meta ? `<small>${escapeHtml(meta)}</small>` : ""}
            </header>
            <section class="ff-shell-logic-section ff-shell-logic-objective">
              <span>цель решения</span>
              <b>${escapeHtml(objective || "выбрать лучшую линию")}</b>
              <p>${escapeHtml(objectiveNote || "Сначала проверь признаки спота, потом выбирай кнопку.")}</p>
            </section>
            ${renderLogicFactors(logic)}
            ${renderLogicRange(range)}
            ${warning ? `
              <section class="ff-shell-logic-section ff-shell-logic-warning">
                <span>ловушка</span>
                <p>${escapeHtml(warning)}</p>
              </section>
            ` : ""}
          </div>
        </details>
      </div>
    `;
  }

  function arcSeats(count) {
    // Opponents fan across the top arc of the oval. The bottom sector is left
    // free for the hero anchor (.ff-shell-hero) and the action buttons that sit
    // just below the felt, so seats never ride into the controls.
    const n = Math.max(1, Number(count) || 1);
    const cx = 50;
    const cy = 48;
    const rx = 40;
    const ry = 40;
    const startDeg = 53;
    const endDeg = 307;
    if (n === 1) {
      // Lone opponent — only reachable from a hypothetical hero+1 heads-up spot
      // with heroSeatOnRail off (no current trainer produces this). Seat it dead
      // centre across from the hero anchor but a touch below the felt top, rather
      // than the raw deg=180 arc point (50, 8) which would crowd the board cards.
      return [[cx, 18]];
    }
    const points = [];
    for (let i = 0; i < n; i += 1) {
      const deg = startDeg + (i * (endDeg - startDeg)) / (n - 1);
      const theta = (deg * Math.PI) / 180;
      points.push([
        clamp(cx - rx * Math.sin(theta), 5, 95),
        clamp(cy + ry * Math.cos(theta), 7, 74)
      ]);
    }
    return points;
  }

  function railSeatCoordinates(count, heroOnRail) {
    if (count <= 0) return [];
    // Hero on the rail (e.g. the position-zones trainer) keeps the legacy ring;
    // otherwise the hero owns the bottom anchor and opponents fan across the top.
    if (heroOnRail) {
      return count <= seatPositions.length ? seatPositions.slice(0, count) : arcSeats(count);
    }
    return arcSeats(count);
  }

  // railSeatCount is the number of seats rendered on the rail track, which in the
  // arc layout excludes the hero (the hero owns the bottom anchor). It is exposed
  // as data-rail-seat-count — deliberately NOT data-seat-total, which would imply
  // full table size and mislead a future per-count CSS transform / analytics.
  function renderSeat(seat, index, railSeatCount, coord, seatActions) {
    const fallback = coord || seatPositions[index % seatPositions.length];
    const x = Number.isFinite(Number(seat.x)) ? Number(seat.x) : fallback[0];
    const y = Number.isFinite(Number(seat.y)) ? Number(seat.y) : fallback[1];
    const action = seatActions?.get?.(normalizeSeatKey(seat.label)) || null;
    const className = [
      `is-${safeClass(seat.state || "waiting")}`,
      action ? "has-action" : "",
      action ? `has-${safeClass(action.tone)}` : ""
    ].filter(Boolean).join(" ");
    return `
      <span class="ff-shell-seat ${className}" style="--x:${clamp(x, 0, 100)}%; --y:${clamp(y, 0, 100)}%;" data-seat-index="${index}" data-rail-seat-count="${railSeatCount}">
        <strong>${escapeHtml(seat.label || `S${index + 1}`)}</strong>
        ${action ? `<em class="ff-shell-seat-action">${escapeHtml([action.label, action.amount].filter(Boolean).join(" "))}</em>` : ""}
      </span>
    `;
  }

  function renderMetrics(spot) {
    return `
      <div class="ff-shell-metrics" aria-label="Метрики спота">
        ${asArray(spot?.metrics).map((metric) => `
          <span class="ff-shell-metric is-${safeClass(metric.tone)}">
            <small>${escapeHtml(metric.label)}</small>
            <b>${escapeHtml(metric.value)}</b>
          </span>
        `).join("")}
      </div>
    `;
  }

  function renderGates(spot) {
    return `
      <div class="ff-shell-gates" aria-label="Проверки решения">
        ${asArray(spot?.gates).map((gate) => `
          <article class="ff-shell-gate is-${safeClass(gate.state)}">
            <span>${escapeHtml(gate.label)}</span>
            <b>${escapeHtml(gate.value)}</b>
            <small>${escapeHtml(gate.detail || "")}</small>
          </article>
        `).join("")}
      </div>
    `;
  }

  function renderDecisionPanel(state, spot) {
    if (state.finished) return renderSummaryPanel(state);
    if (isSimulatorSpot(spot)) return state.answered ? renderSideFeedbackPanel(state, spot) : "";
    const model = spot?.model || {};
    const modelLabel = playerFacingText(model.label) || "Модель решения";
    const modelPrimary = playerFacingText(model.primary);
    const modelReject = playerFacingText(model.reject);
    const modelExploit = playerFacingText(model.exploit);
    const spotTitle = playerFacingText(spot?.title) || "Спот";
    const spotQuestion = playerFacingText(spot?.question);
    return `
      <aside class="ff-shell-decision" aria-live="polite">
        <section class="ff-shell-card-panel">
          <div class="ff-shell-decision-top">
            <span>Решение</span>
            <b>${escapeHtml(`${Math.min(state.index + 1, state.queue.length)}/${state.queue.length}`)}</b>
          </div>
          <h2>${escapeHtml(spotTitle)}</h2>
          <p>${escapeHtml(spotQuestion)}</p>
          <div class="ff-shell-model">
            <span>${escapeHtml(modelLabel)}</span>
            ${modelPrimary ? `<b>${escapeHtml(modelPrimary)}</b>` : ""}
            ${modelReject ? `<small>${escapeHtml(modelReject)}</small>` : ""}
            ${modelExploit ? `<em>${escapeHtml(modelExploit)}</em>` : ""}
          </div>
          ${renderActionMap(spot)}
        </section>
      </aside>
    `;
  }

  function renderSideFeedbackPanel(state, spot) {
    // Single progress source: the header already shows position (n/N), so the
    // review panel drops the duplicate counter and just labels the section.
    return `
      <aside class="ff-shell-decision" aria-live="polite">
        <section class="ff-shell-card-panel">
          <div class="ff-shell-decision-top">
            <span>Разбор</span>
          </div>
          ${renderFeedback(state, spot)}
        </section>
      </aside>
    `;
  }

  function renderTableActions(state, spot) {
    if (state.finished || !spot) return "";
    return `
      <div class="ff-shell-table-actions" aria-label="Варианты решения">
        ${renderOptions(state, spot)}
        ${renderFeedback(state, spot)}
      </div>
    `;
  }

  function renderTrainingDock(state, spot) {
    if (state.finished || !spot) return "";
    // The simulator path carries the learning surface elsewhere: the spot
    // question sits in the header and the answered review is the side feedback
    // panel. The board-level dock is CSS-hidden here, so building it is dead
    // work that also duplicates the "next" button — skip it for sim spots.
    if (isSimulatorSpot(spot)) return "";
    return state.answered ? renderAnsweredTrainingDock(state, spot) : renderLiveTrainingDock(state, spot);
  }

  function shortCoachText(value, maxLength = 130) {
    const text = playerFacingText(value);
    if (!text) return "";
    return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
  }

  function logicFactorByLabel(logic, labels) {
    const wanted = new Set(asArray(labels).map((label) => cleanLine(label).toLowerCase()).filter(Boolean));
    return asArray(logic?.factors).find((factor) => wanted.has(cleanLine(factor.label).toLowerCase())) || null;
  }

  function compactFactor(factor) {
    if (!factor) return "";
    const label = playerFacingText(factor.label);
    const value = playerFacingText(factor.value);
    if (!label || !value) return "";
    return `${label}: ${value}`;
  }

  function liveDecisionSteps(spot) {
    const logic = spot?.tools?.logic || {};
    const range = logic.range || spot?.tools?.range || null;
    const currentRange = asArray(range?.rows).find((row) => row.current);
    const targetRange = asArray(range?.rows).find((row) => row.target);
    const position = logicFactorByLabel(logic, ["позиция"]);
    const hand = logicFactorByLabel(logic, ["рука"]);
    const board = logicFactorByLabel(logic, ["борд"]);
    const stack = logicFactorByLabel(logic, ["стек"]);
    const decisive = asArray(logic.factors).find((factor) =>
      !["позиция", "рука", "источник", "линия"].includes(cleanLine(factor.label).toLowerCase())
    ) || board || stack || asArray(logic.factors)[0] || null;
    const context = [compactFactor(position), compactFactor(hand), compactFactor(board || stack)]
      .filter(Boolean)
      .slice(0, 3)
      .join(" · ");
    const rangeDetail = range
      ? [
        currentRange ? `рука в ветке: ${currentRange.label}` : "",
        targetRange ? `цель: ${targetRange.label}` : ""
      ].filter(Boolean).join(" · ")
      : "";
    return [
      {
        label: "1. Контекст",
        value: context || shortCoachText(spot?.question || spot?.title, 92),
        detail: "Сначала читаем ситуацию, а не силу руки в вакууме."
      },
      {
        label: "2. Фильтр",
        value: compactFactor(decisive) || "найди главный признак",
        detail: shortCoachText(decisive?.detail || logic.objectiveNote, 108)
      },
      {
        label: "3. Линия",
        value: playerFacingText(logic.objective) || correctOption(spot)?.label || "выбрать действие",
        detail: shortCoachText(rangeDetail || logic.warning || "После фильтра выбирай кнопку, которая совпадает с планом.", 108)
      }
    ];
  }

  function renderDecisionSteps(spot) {
    return `
      <ol class="ff-shell-thinking-steps">
        ${liveDecisionSteps(spot).map((step) => `
          <li>
            <span>${escapeHtml(step.label)}</span>
            <b>${escapeHtml(step.value)}</b>
            <small>${escapeHtml(step.detail)}</small>
          </li>
        `).join("")}
      </ol>
    `;
  }

  function liveControlForSpot(spot) {
    const logic = spot?.tools?.logic || {};
    const range = logic.range || spot?.tools?.range || null;
    if (range) {
      const current = asArray(range.rows).find((row) => row.current);
      const target = asArray(range.rows).find((row) => row.target);
      const same = current && target && current.label === target.label;
      return {
        label: "Контроль",
        value: same ? "ветка совпала" : "проверь ветку",
        detail: shortCoachText([
          current ? `текущая: ${current.label}` : "",
          target ? `цель: ${target.label}` : "",
          range.hand ? `рука ${range.hand}` : ""
        ].filter(Boolean).join(" · "), 118)
      };
    }
    return {
      label: "Ловушка",
      value: "не автопилот",
      detail: shortCoachText(logic.warning || logic.objectiveNote || "Перед кликом проговори причину выбранной линии.", 118)
    };
  }

  function renderLiveTrainingDock(state, spot) {
    const logic = spot?.tools?.logic || {};
    const control = liveControlForSpot(spot);
    const objective = playerFacingText(logic.objective) || correctOption(spot)?.label || "выбрать лучшую линию";
    return `
      <section class="ff-shell-training-dock" aria-label="Тренировочный прогресс">
        <article class="ff-shell-practice-card is-mission">
          <span>Задача спота</span>
          <b>${escapeHtml(objective)}</b>
          <p>${escapeHtml(shortCoachText(logic.objectiveNote || "Сначала найди решающий признак, потом выбирай действие.", 150))}</p>
        </article>
        <article class="ff-shell-practice-card is-thinking">
          <span>Порядок мысли</span>
          ${renderDecisionSteps(spot)}
        </article>
        <article class="ff-shell-practice-card is-control">
          <span>${escapeHtml(control.label)}</span>
          <b>${escapeHtml(control.value)}</b>
          <p>${escapeHtml(control.detail || "Проговори один признак перед кликом.")}</p>
          <div class="ff-shell-training-pips" aria-label="Ход сессии">${renderTrainingPips(state)}</div>
        </article>
      </section>
    `;
  }

  function renderAnsweredTrainingDock(state, spot) {
    const option = asArray(spot?.options).find((item) => item.key === state.selectedKey) || {};
    const expected = correctOption(spot) || {};
    const latest = state.history[state.history.length - 1] || {};
    const isCorrect = option.key === expected.key;
    const notes = answerNotes(spot, option, expected, isCorrect);
    const nextLabel = state.index >= state.queue.length - 1 ? "Показать результат" : "Следующий спот";
    return `
      <section class="ff-shell-training-dock is-answered" aria-label="Разбор ответа">
        <article class="ff-shell-practice-card is-result">
          <span>${escapeHtml(isCorrect ? "Верно" : "Разбор")}</span>
          <b>${escapeHtml(isCorrect ? "Линия выбрана правильно" : `Лучше: ${expected.label || expected.key || "-"}`)}</b>
          <div class="ff-shell-answer-choice">
            <small><em>выбрано</em><strong>${escapeHtml(option.label || option.key || "-")}</strong></small>
            <small><em>цель</em><strong>${escapeHtml(expected.label || expected.key || "-")}</strong></small>
          </div>
        </article>
        <article class="ff-shell-practice-card is-explain">
          <span>Комментарий</span>
          <div class="ff-shell-teaching-notes">
            ${notes.map((note) => `<p>${escapeHtml(note)}</p>`).join("")}
          </div>
        </article>
        <article class="ff-shell-practice-card is-next">
          <span>Дальше</span>
          <b>${escapeHtml(formatClock(latest.elapsedMs || 0))}</b>
          <p>${escapeHtml(isCorrect ? "Закрепи причину и переходи к следующей раздаче." : "Перед следующим спотом коротко проговори правильную линию.")}</p>
          <button class="ff-shell-next" type="button" data-shell-action="next">${escapeHtml(nextLabel)}</button>
        </article>
      </section>
    `;
  }

  function renderActionMap(spot) {
    const rows = asArray(spot?.actionMap).map((item) => ({
      state: item.state,
      label: playerFacingText(item.label),
      value: playerFacingText(item.value)
    })).filter((item) => item.label && item.value);
    if (!rows.length) return "";
    return `
      <div class="ff-shell-action-map" aria-label="Карта решения">
        ${rows.map((item) => `
          <span class="is-${safeClass(item.state)}">
            <small>${escapeHtml(item.label)}</small>
            <b>${escapeHtml(item.value)}</b>
          </span>
        `).join("")}
      </div>
    `;
  }

  function renderOptions(state, spot) {
    const expected = correctOption(spot);
    return `
      <div class="ff-shell-options">
        ${asArray(spot?.options).map((option) => {
          const picked = state.selectedKey === option.key;
          const correct = expected?.key === option.key;
          const cue = option.cue || "";
          const className = [
            "ff-shell-option",
            `is-${safeClass(option.tone || "neutral")}`,
            state.answered && picked ? "is-picked" : "",
            state.answered && correct ? "is-correct" : "",
            state.answered && picked && !correct ? "is-wrong" : ""
          ].filter(Boolean).join(" ");
          return `
            <button class="${className}" type="button" data-shell-action="choose" data-option-key="${escapeHtml(option.key)}" ${state.answered ? "disabled" : ""}>
              <b>${escapeHtml(option.label || option.key)}</b>
              ${cue ? `<span>${escapeHtml(cue)}</span>` : ""}
            </button>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderFeedback(state, spot) {
    if (!state.answered) return "";
    const option = asArray(spot?.options).find((item) => item.key === state.selectedKey);
    const expected = correctOption(spot);
    const isCorrect = option?.key === expected?.key;
    const notes = answerNotes(spot, option || {}, expected || {}, isCorrect);
    return `
      <div class="ff-shell-feedback is-${isCorrect ? "good" : "bad"}">
        <span>${escapeHtml(isCorrect ? "Верно" : `Цель: ${expected?.label || expected?.key || "-"}`)}</span>
        <div class="ff-shell-teaching-notes">
          ${notes.map((note) => `<p>${escapeHtml(note)}</p>`).join("")}
        </div>
        <button class="ff-shell-next" type="button" data-shell-action="next">${escapeHtml(state.index >= state.queue.length - 1 ? "Показать результат" : "Следующий спот")}</button>
      </div>
    `;
  }

  function renderSummaryPanel(state) {
    const result = state.result || resultForState(state);
    const summaryRows = summaryRowsForResult(result);
    const weakLabel = weakSummaryLabel(result);
    return `
      <aside class="ff-shell-decision" aria-live="polite">
        <section class="ff-shell-card-panel ff-shell-summary">
          <div class="ff-shell-decision-top">
            <span>${escapeHtml(result.status === "passed" ? "пройдено" : "повтор")}</span>
            <b>${escapeHtml(state.pack.title)}</b>
          </div>
          <h2>${escapeHtml(result.status === "passed" ? "Пак пройден" : "Пак нужно повторить")}</h2>
          <p>${escapeHtml(`${result.correct}/${result.attempts} правильно / ${result.score}%. Результат сохранен.`)}</p>
          <div class="ff-shell-summary-gate">
            ${summaryRows.map((row) => `
              <span class="is-${safeClass(row.state)}">
                <small>${escapeHtml(row.label)}</small>
                <b>${escapeHtml(row.value)}</b>
                <em>${escapeHtml(row.detail)}</em>
              </span>
            `).join("")}
          </div>
          <div class="ff-shell-weak-tags">
            <span>${escapeHtml(weakLabel)}</span>
          </div>
          <div class="ff-shell-review-routes">
            ${asArray(result.reviewRoutes).map((route) => `
              <a href="${escapeHtml(route.href || `trainer-shell-lab.html?pack=${encodeURIComponent(state.pack.id)}`)}">
                <b>${escapeHtml(route.label || "Повторить")}</b>
                <span>${escapeHtml(routeReasonText(route, result))}</span>
              </a>
            `).join("") || "<span>Повтор не нужен</span>"}
          </div>
          <button class="ff-shell-next" type="button" data-shell-action="restart">Начать заново</button>
        </section>
      </aside>
    `;
  }

  function renderTechPanel(state) {
    const validation = validatePack(state.pack);
    const spot = currentSpot(state);
    const contractRows = [
      ["движок", "FFTrainerShell.mount"],
      ["ключ", state.pack.trainer.key],
      ["пак", state.pack.id],
      ["споты", `${state.pack.spots.length}`],
      ["телеметрия", "ff-trainer-event-v1"],
      ["статус", validation.ok ? "валиден" : "ошибка"]
    ];
    return `
      <aside class="ff-shell-tech" aria-label="Настройки скелета тренажёра">
        <div class="ff-shell-tech-head">
          <span>Под капотом</span>
          <button type="button" data-shell-action="toggle-tech">Закрыть</button>
        </div>
        <div class="ff-shell-contract">
          ${contractRows.map(([label, value]) => `
            <span>
              <small>${escapeHtml(label)}</small>
              <b>${escapeHtml(value)}</b>
            </span>
          `).join("")}
        </div>
        ${renderSourceAudit(spot)}
        <div class="ff-shell-editor-head">
          <span>JSON пака</span>
          <b class="${state.editorError ? "is-error" : "is-ok"}">${escapeHtml(state.editorError || "готово")}</b>
        </div>
        <textarea class="ff-shell-pack-editor" data-shell-pack-editor spellcheck="false">${escapeHtml(state.editorText || JSON.stringify(state.pack, null, 2))}</textarea>
        <div class="ff-shell-editor-actions">
          <button type="button" data-shell-action="apply-pack">Применить</button>
          <button type="button" data-shell-action="reset-pack">Сбросить</button>
        </div>
      </aside>
    `;
  }

  function renderSourceAudit(spot) {
    if (!spot) return "";
    return `
      <details class="ff-shell-source-audit">
        <summary>Источник и проверки</summary>
        <div class="ff-shell-line">
          <span>${escapeHtml(spot?.source?.row || spot?.source?.label || "shell")}</span>
          <strong>${escapeHtml(spot?.table?.line || spot?.question || "")}</strong>
        </div>
        ${renderMetrics(spot)}
        ${renderGates(spot)}
      </details>
    `;
  }

  function mount(rootOrSelector, options = {}) {
    const root = typeof rootOrSelector === "string" ? document.querySelector(rootOrSelector) : rootOrSelector;
    if (!root) throw new Error("FFTrainerShell.mount: нужен root");
    if (typeof root.__ffTrainerShellDestroy === "function") root.__ffTrainerShellDestroy();

    const library = window.FFTrainerShellPacks || {};
    const rawPacks = asArray(options.packs || library.packs);
    const packs = rawPacks.map(normalizePack);
    const selectedPack = normalizePack(options.pack || packs.find((pack) => pack.id === options.packId) || packs[0]);
    const state = {
      root,
      packs: packs.length ? packs : [selectedPack],
      pack: selectedPack,
      lab: Boolean(options.lab),
      previewDensity: options.previewDensity || "lab",
      queue: [],
      index: 0,
      attempts: 0,
      correct: 0,
      startedAt: "",
      spotStartedAt: 0,
      sessionId: "",
      history: [],
      errorCounts: {},
      answered: false,
      selectedKey: "",
      finished: false,
      result: null,
      editorText: "",
      editorError: "",
      showTech: Boolean(options.showTech)
    };

    function handleClick(event) {
      const action = event.target.closest("[data-shell-action]");
      if (!action || !root.contains(action)) return;
      const type = action.dataset.shellAction;
      if (type === "choose") answer(state, action.dataset.optionKey);
      if (type === "next") next(state);
      if (type === "restart") startSession(state);
      if (type === "pack") setPack(state, action.dataset.packId);
      if (type === "toggle-tech") {
        state.showTech = !state.showTech;
        render(state);
      }
      if (type === "apply-pack") applyEditorPack(state);
      if (type === "reset-pack") resetEditorPack(state);
    }

    function handleInput(event) {
      if (event.target.matches("[data-shell-pack-editor]")) {
        state.editorText = event.target.value;
        state.editorError = "";
      }
    }

    root.addEventListener("click", handleClick);
    root.addEventListener("input", handleInput);
    root.__ffTrainerShellDestroy = () => {
      root.removeEventListener("click", handleClick);
      root.removeEventListener("input", handleInput);
      root.innerHTML = "";
      root.__ffTrainerShellDestroy = null;
    };

    startSession(state);

    return {
      getState: () => ({ ...state, queue: [...state.queue], history: [...state.history] }),
      setPack: (packId) => setPack(state, packId),
      updatePack: (pack) => {
        state.pack = normalizePack(pack);
        startSession(state);
      },
      destroy: root.__ffTrainerShellDestroy
    };
  }

  window.FFTrainerShell = {
    version: SHELL_VERSION,
    mount,
    normalizePack,
    validatePack
  };
}());
