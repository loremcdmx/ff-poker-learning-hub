(function () {
  "use strict";

  var root = window;
  var data = root.PokerPreflopBenchmarkData;
  var evData = root.PokerPreflopBenchmarkEvData;
  var configRoot = root.PokerPreflopBenchmarkConfig;
  var trainerKey = document.body.dataset.trainer;
  var cfg = configRoot && configRoot.trainers[trainerKey];
  var trainer = data && data.trainers[trainerKey];
  if (!cfg || !trainer) throw new Error("PokerPreflopBenchmark data/config is required for " + trainerKey);

  var RANKS = "AKQJT98765432".split("");
  var STACK_ORDER = trainerKey === "vs_raise_free"
    ? ["70+", "40-70", "40", "35", "30", "25", "20", "15-18", "12-15", "10-12", "8-10", "6-8", "<6"]
    : ["70+", "40-70", "25-40", "18-25", "15-18", "12-15", "10-12", "8-10", "6-8", "<6"];
  var FILTERS = [
    { key: "hero", label: "Твоя позиция", prop: "hero_position" },
    { key: "opener", label: "Опенер", prop: "opener_position" },
    { key: "size", label: "Сайзинг", prop: "open_size" },
    { key: "stack", label: "Стек", prop: "stack_bucket" },
  ];
  var chartReadyCache = new WeakMap();
  var state = {
    screen: "hand",
    slide: 0,
    filters: Object.assign({}, cfg.defaults),
    selectedHand: "",
    introAnswered: false,
    introSpot: null,
    queue: [],
    index: 0,
    handNo: 0,
    score: 0,
    misses: 0,
    answered: false,
    choice: "",
    courseReported: false,
    sessionId: "",
  };

  function $(selector) { return document.querySelector(selector); }
  function $$(selector) { return Array.from(document.querySelectorAll(selector)); }
  function pct(value) { return Math.round(Number(value || 0)) + "%"; }
  function pp(value) { var n = Math.round(Number(value || 0)); return (n > 0 ? "+" : "") + n + " п.п."; }
  function signedBb(value, digits) {
    var number = Number(value || 0);
    var sign = number > 0 ? "+" : number < 0 ? "−" : "";
    return sign + Math.abs(number).toFixed(digits == null ? 1 : digits).replace(".", ",") + " BB";
  }
  function escapeHtml(value) { return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]; }); }
  function shuffle(items) {
    var result = items.slice();
    for (var index = result.length - 1; index > 0; index -= 1) {
      var swap = Math.floor(Math.random() * (index + 1));
      var hold = result[index]; result[index] = result[swap]; result[swap] = hold;
    }
    return result;
  }
  function actionLabel(action) { return cfg.actionLabels[action] || action; }
  function actionClass(action) { return action === "jam" ? "shove" : action; }
  function displayStack(stack) {
    var stackWindow = data.source && data.source.stackWindows && data.source.stackWindows[trainerKey] && data.source.stackWindows[trainerKey][stack];
    if (stackWindow && stackWindow.label) return stackWindow.label;
    return String(stack || "").replace(/(\d)-(\d)/g, "$1–$2");
  }
  function dominant(rates) {
    var ordered = cfg.actions.map(function (key) { return { key: key, value: Number(rates && rates[key] || 0) }; }).sort(function (a, b) { return b.value - a.value; });
    return { key: ordered[0].key, value: ordered[0].value, lead: ordered[0].value - ordered[1].value };
  }
  function isClearPlan(result) { return result.value >= 50 && result.lead >= 12; }
  function vpip(rates) { return 100 - Number(rates && rates.fold || 0); }
  function continueRate(rates) { return 100 - Number(rates && rates.fold || 0); }
  function safeRate(value) { return Math.max(0, Math.min(100, Math.round(Number(value || 0)))); }
  function cohortBars(rows) {
    return '<div class="wisdom-proof-rows">' + rows.map(function (row) {
      var value = safeRate(row.value);
      return '<div class="wisdom-proof-row"><div><span>' + escapeHtml(row.label) + '</span><strong>' + pct(value) + '</strong></div><i><b class="is-' + actionClass(row.action || "raise") + '" style="width:' + value + '%"></b></i></div>';
    }).join("") + '</div>';
  }
  function actionMix(rates) {
    return '<div class="stack-action-bar" aria-hidden="true">' + cfg.actions.map(function (action) {
      return '<i class="is-' + actionClass(action) + '" style="width:' + safeRate(rates[action]) + '%"></i>';
    }).join("") + '</div>';
  }
  function handAt(row, col) { var a = RANKS[row], b = RANKS[col]; return row === col ? a + a : row < col ? a + b + "s" : b + a + "o"; }
  function filterValue(slice, key) { var def = FILTERS.find(function (item) { return item.key === key; }); return slice[def.prop]; }
  function sameSpot(a, b) {
    return ["hero_position", "opener_position", "open_size", "stack_bucket"].every(function (key) { return a[key] === b[key]; });
  }
  function comparisonCohorts() { return cfg.comparisonCohorts || ["league1", "r15_18"]; }
  function completeSlice(slice) { return Boolean(slice) && Object.keys(slice.cells || {}).length === 169; }
  function chartReadySlice(slice) {
    if (chartReadyCache.has(slice)) return chartReadyCache.get(slice);
    if (!completeSlice(slice)) { chartReadyCache.set(slice, false); return false; }
    var ready = comparisonCohorts().every(function (cohort) {
      return cohort === slice.cohort || trainer.slices.some(function (candidate) { return candidate.cohort === cohort && sameSpot(candidate, slice) && completeSlice(candidate); });
    });
    chartReadyCache.set(slice, ready);
    return ready;
  }
  function sliceMatches(slice, filters) {
    return FILTERS.every(function (def) { return cfg.hideFilters.includes(def.key) || slice[def.prop] === filters[def.key]; });
  }
  function findSlice(cohort, filters) { return trainer.slices.find(function (slice) { return slice.cohort === cohort && chartReadySlice(slice) && sliceMatches(slice, filters || state.filters); }) || null; }
  function availableValues(key) {
    var def = FILTERS.find(function (item) { return item.key === key; });
    var values = trainer.slices.filter(function (slice) { return slice.cohort === "league1" && chartReadySlice(slice); }).map(function (slice) { return slice[def.prop]; });
    return Array.from(new Set(values)).filter(Boolean).sort(function (a, b) {
      if (key === "stack") return STACK_ORDER.indexOf(a) - STACK_ORDER.indexOf(b);
      var order = ["EP", "MP", "HJ", "CO", "BTN", "SB", "2x", "2.5x", "3x", "other", "—"];
      return order.indexOf(a) - order.indexOf(b);
    });
  }
  function reconcileFilters(requiredKey) {
    if (findSlice("league1")) return;
    var candidates = trainer.slices.filter(function (slice) {
      return slice.cohort === "league1" && chartReadySlice(slice) && (!requiredKey || filterValue(slice, requiredKey) === state.filters[requiredKey]);
    });
    candidates.sort(function (a, b) {
      var scoreA = FILTERS.reduce(function (sum, def) { return sum + (filterValue(a, def.key) === state.filters[def.key] ? 1 : 0); }, 0);
      var scoreB = FILTERS.reduce(function (sum, def) { return sum + (filterValue(b, def.key) === state.filters[def.key] ? 1 : 0); }, 0);
      return scoreB - scoreA;
    });
    var chosen = candidates[0] || trainer.slices.find(function (slice) { return slice.cohort === "league1" && chartReadySlice(slice); });
    if (!chosen) return;
    FILTERS.forEach(function (def) { state.filters[def.key] = chosen[def.prop]; });
  }

  function renderFilters() {
    $$('[data-filter-host]').forEach(function (host) {
      host.innerHTML = FILTERS.filter(function (def) { return !cfg.hideFilters.includes(def.key); }).map(function (def) {
        var buttons = availableValues(def.key).map(function (value) {
          var active = state.filters[def.key] === value;
          var label = value === "other" ? "Другой" : def.key === "stack" ? displayStack(value) : value;
          return '<button class="ff-chart-filter' + (active ? ' is-active' : '') + '" type="button" data-filter="' + def.key + '" data-value="' + escapeHtml(value) + '" aria-pressed="' + String(active) + '">' + escapeHtml(label) + '</button>';
        }).join("");
        return '<div class="filter-row is-' + def.key + '-filter"><strong>' + def.label + '</strong><div class="ff-chart-filter-group">' + buttons + '</div></div>';
      }).join("");
    });
  }

  function legendMarkup() {
    return cfg.actions.map(function (action) { return '<span><i class="is-' + actionClass(action) + '"></i>' + actionLabel(action) + '</span>'; }).join("");
  }
  function ratesMarkup(rates) {
    return '<div class="action-rate-row">' + cfg.actions.map(function (action) {
      return '<div class="action-rate ff-chart-action is-' + actionClass(action) + '"><span>' + actionLabel(action) + '</span><strong>' + pct(rates[action]) + '</strong></div>';
    }).join("") + '</div>';
  }
  function contextLabel(filters) {
    var bits = [];
    if (!cfg.hideFilters.includes("hero")) bits.push(filters.hero);
    if (!cfg.hideFilters.includes("opener")) bits.push("против " + filters.opener);
    if (!cfg.hideFilters.includes("size")) bits.push(filters.size);
    bits.push(displayStack(filters.stack) + " BB");
    return bits.join(" · ");
  }

  function rangeCellsMarkup(slice, interactive, compareSlice) {
    var cells = [];
    RANKS.forEach(function (_, row) {
      RANKS.forEach(function (_, col) {
        var hand = handAt(row, col);
        var cell = slice.cells[hand];
        if (!cell) {
          cells.push('<span class="ff-range-cell is-unavailable" role="gridcell" aria-label="' + hand + ': пока вне тренировки"><b>' + hand + '</b></span>');
          return;
        }
        var d = dominant(cell);
        var compareCell = compareSlice && compareSlice.cells[hand];
        var differs = compareCell && dominant(compareCell).key !== d.key;
        var foldEnd = cell.fold;
        var callEnd = foldEnd + cell.call;
        var raiseEnd = callEnd + cell.raise;
        var selected = interactive && state.selectedHand === hand;
        var label = cfg.actions.map(function (action) { return actionLabel(action) + " " + pct(cell[action]); }).join(", ");
        var className = 'ff-range-cell is-' + actionClass(d.key) + (selected ? ' is-selected' : '') + (differs ? ' is-cohort-difference' : '');
        var style = '--fold-end:' + foldEnd + '%;--call-end:' + callEnd + '%;--raise-end:' + raiseEnd + '%';
        if (interactive) cells.push('<button class="' + className + '" type="button" role="gridcell" data-hand="' + hand + '" style="' + style + '" aria-label="' + hand + ': ' + escapeHtml(label) + '"><b>' + hand + '</b></button>');
        else cells.push('<span class="' + className + '" role="gridcell" style="' + style + '" aria-label="' + hand + ': ' + escapeHtml(label) + (differs ? '; основное действие отличается' : '') + '"><b>' + hand + '</b></span>');
      });
    });
    return cells.join("");
  }

  function pushComparisonCellsMarkup(league, novice) {
    var cells = [];
    RANKS.forEach(function (_, row) {
      RANKS.forEach(function (_, col) {
        var hand = handAt(row, col);
        var leagueCell = league.cells[hand];
        var noviceCell = novice.cells[hand];
        if (!leagueCell || !noviceCell) {
          cells.push('<span class="ff-range-cell is-unavailable" role="gridcell" aria-label="' + hand + ': сравнение недоступно"><b>' + hand + '</b></span>');
          return;
        }
        var leagueJam = safeRate(leagueCell.jam);
        var noviceJam = safeRate(noviceCell.jam);
        var gap = leagueJam - noviceJam;
        var gapClass = gap >= 10 ? ' is-league-gap' : gap <= -10 ? ' is-novice-gap' : '';
        cells.push('<span class="ff-range-cell wisdom-push-cell' + gapClass + '" role="gridcell" style="--league-jam:' + leagueJam + '%;--novice-jam:' + noviceJam + '%" aria-label="' + hand + ': первая лига пуш ' + pct(leagueJam) + ', ранги 15–18 пуш ' + pct(noviceJam) + '"><i class="wisdom-push-band is-league" aria-hidden="true"></i><i class="wisdom-push-band is-novice" aria-hidden="true"></i><b>' + hand + '</b></span>');
      });
    });
    return cells.join("");
  }

  function actionComparisonCellsMarkup(league, novice, action) {
    var cells = [];
    RANKS.forEach(function (_, row) {
      RANKS.forEach(function (_, col) {
        var hand = handAt(row, col);
        var leagueCell = league.cells[hand];
        var noviceCell = novice.cells[hand];
        if (!leagueCell || !noviceCell) {
          cells.push('<span class="ff-range-cell is-unavailable" role="gridcell" aria-label="' + hand + ': сравнение недоступно"><b>' + hand + '</b></span>');
          return;
        }
        var leagueRate = safeRate(leagueCell[action]);
        var noviceRate = safeRate(noviceCell[action]);
        var gap = noviceRate - leagueRate;
        var gapClass = gap >= 10 ? ' is-novice-gap' : gap <= -10 ? ' is-league-gap' : '';
        var label = actionLabel(action).toLowerCase();
        cells.push('<span class="ff-range-cell wisdom-action-cell' + gapClass + '" role="gridcell" style="--league-action:' + leagueRate + '%;--novice-action:' + noviceRate + '%" aria-label="' + hand + ': первая лига ' + label + ' ' + pct(leagueRate) + ', ранги 15–18 ' + label + ' ' + pct(noviceRate) + '"><i class="wisdom-action-band is-league" aria-hidden="true"></i><i class="wisdom-action-band is-novice" aria-hidden="true"></i><b>' + hand + '</b></span>');
      });
    });
    return cells.join("");
  }

  function renderChart() {
    var slice = findSlice("league1");
    var novice = findSlice("r15_18");
    var host = $("#benchmarkRange");
    if (!slice) {
      host.innerHTML = "";
      $("#chartSummary").textContent = "Нет подтверждённого среза";
      $("#benchmarkHandDetail").innerHTML = "<p>Выбери соседний стек или позицию.</p>";
      return;
    }
    $("#chartContext").textContent = contextLabel(state.filters);
    var focus = trainerKey === "sb_unopened" ? "VPIP " + pct(vpip(slice.rates)) : "Продолжение " + pct(100 - slice.rates.fold);
    $("#chartSummary").textContent = focus;
    $$('[data-action-legend]').forEach(function (node) { node.innerHTML = legendMarkup(); });
    host.innerHTML = rangeCellsMarkup(slice, true);
    if (!state.selectedHand || !slice.cells[state.selectedHand]) state.selectedHand = slice.cells[cfg.introHand] ? cfg.introHand : Object.keys(slice.cells)[0] || "";
    renderHandDetail(slice, novice);
  }

  function renderHandDetail(slice, novice) {
    var host = $("#benchmarkHandDetail");
    var hand = state.selectedHand;
    var leagueCell = hand && slice.cells[hand];
    var noviceCell = hand && novice && novice.cells[hand];
    $$("#benchmarkRange [data-hand]").forEach(function (cell) { cell.classList.toggle("is-selected", cell.dataset.hand === hand); });
    if (!leagueCell) { host.innerHTML = "<p>Нажми на подсвеченную руку, чтобы увидеть её план.</p>"; return; }
    var main = dominant(leagueCell);
    var clear = isClearPlan(main);
    var compare = noviceCell
      ? '<div class="hand-compare-note"><span>Ранги 15–18 выбирают «' + actionLabel(main.key).toLowerCase() + '» в ' + pct(noviceCell[main.key]) + ' случаев</span><strong>Первая лига — ' + pct(leagueCell[main.key]) + '</strong></div>'
      : '<div class="hand-compare-note"><span>Для этой руки сравнение слишком шумное</span><strong>Ориентируйся на план первой лиги</strong></div>';
    var eyebrow = clear ? "Ясный план" : "Смешанная граница";
    var title = clear ? hand + " · " + actionLabel(main.key) : hand + " · нет одной обязательной кнопки";
    var ruleTitle = clear ? "Запомни" : "Не зубри";
    var rule = clear ? cfg.actionRules[main.key] : "Ни одно действие не набрало уверенного большинства. Сравни частоты и соседние окна стека — в практику эта рука как однозначный ответ не попадёт.";
    host.innerHTML = '<div class="hand-detail-head"><div><p class="eyebrow">' + eyebrow + '</p><h3>' + title + '</h3></div><span>' + contextLabel(state.filters) + '</span></div>' + ratesMarkup(leagueCell) + '<div class="hand-rule' + (clear ? '' : ' is-mixed') + '"><strong>' + ruleTitle + '</strong><span>' + escapeHtml(rule) + '</span></div>' + compare;
  }

  function differingHandCount(benchmark, slice) {
    if (!benchmark || !slice) return 0;
    return Object.keys(benchmark.cells).reduce(function (count, hand) {
      return count + (slice.cells[hand] && dominant(benchmark.cells[hand]).key !== dominant(slice.cells[hand]).key ? 1 : 0);
    }, 0);
  }
  function largestActionDelta(benchmark, slice) {
    return cfg.actions.map(function (action) {
      return { action: action, delta: Number(slice.rates[action] || 0) - Number(benchmark.rates[action] || 0) };
    }).sort(function (a, b) { return Math.abs(b.delta) - Math.abs(a.delta); })[0];
  }
  function cohortCard(cohort, slice, benchmarkSlice) {
    if (!slice) return "";
    var titleMetric = trainerKey === "sb_unopened" ? "VPIP " + pct(vpip(slice.rates)) : "Продолжение " + pct(100 - slice.rates.fold);
    var metricDelta = benchmarkSlice ? (trainerKey === "sb_unopened" ? vpip(slice.rates) - vpip(benchmarkSlice.rates) : continueRate(slice.rates) - continueRate(benchmarkSlice.rates)) : 0;
    var badge = cohort === "league1" ? "Ориентир" : cohort === "leagues2_3" ? "Переход" : "Новички";
    var delta = benchmarkSlice ? '<small class="cohort-metric-delta">' + pp(metricDelta) + ' к первой лиге</small>' : '<small class="cohort-metric-delta">База сравнения</small>';
    return '<article class="cohort-card cohort-' + cohort + (cohort === "league1" ? ' is-benchmark' : '') + '"><div class="cohort-card-head"><div><p class="eyebrow">' + escapeHtml(configRoot.shared.cohorts[cohort]) + '</p><h3>' + titleMetric + '</h3>' + delta + '</div><span>' + badge + '</span></div><p>' + contextLabel(state.filters) + '</p><div class="ff-range-grid benchmark-range-grid comparison-range-grid" role="grid" aria-label="Диапазон ' + escapeHtml(configRoot.shared.cohorts[cohort]) + ' · ' + escapeHtml(contextLabel(state.filters)) + '">' + rangeCellsMarkup(slice, false, benchmarkSlice) + '</div><div class="cohort-stats">' + cfg.actions.map(function (action) { return '<div><span>' + actionLabel(action) + '</span><strong>' + pct(slice.rates[action]) + '</strong>' + (benchmarkSlice ? '<small>' + pp(slice.rates[action] - benchmarkSlice.rates[action]) + '</small>' : '<small>база</small>') + '</div>'; }).join("") + '</div></article>';
  }
  function renderComparison() {
    var cohorts = comparisonCohorts();
    var slices = Object.fromEntries(cohorts.map(function (cohort) { return [cohort, findSlice(cohort)]; }));
    var league = slices.league1;
    var missing = cohorts.some(function (cohort) { return !slices[cohort]; });
    var differences = cohorts.filter(function (cohort) { return cohort !== "league1"; }).map(function (cohort) {
      return { cohort: cohort, count: differingHandCount(league, slices[cohort]) };
    });
    var rangeKey = !missing ? '<div class="comparison-range-key"><div class="ff-chart-legend">' + legendMarkup() + '</div><small><i aria-hidden="true"></i><span>Жёлтая рамка — другое основное действие</span>' + differences.map(function (item) { return '<b>' + escapeHtml(configRoot.shared.cohorts[item.cohort].split(" · ")[0]) + ': ' + item.count + ' рук</b>'; }).join("") + '</small></div>' : '';
    var grid = $("#comparisonGrid");
    grid.classList.toggle("is-three-cohort", cohorts.length === 3);
    grid.innerHTML = rangeKey + cohorts.map(function (cohort) { return cohortCard(cohort, slices[cohort], cohort === "league1" ? null : league); }).join("");
    var host = $("#comparisonGap");
    host.classList.toggle("is-three-cohort", cohorts.length === 3);
    if (missing) { host.innerHTML = "Выбери соседний стек или позицию — там все три чарта подтверждены данными."; return; }
    var gapRows = cohorts.filter(function (cohort) { return cohort !== "league1"; }).map(function (cohort) {
      var largest = largestActionDelta(league, slices[cohort]);
      var direction = largest.delta > 0 ? "чаще" : "реже";
      return '<div><span>' + escapeHtml(configRoot.shared.cohorts[cohort].split(" · ")[0]) + '</span><strong>«' + actionLabel(largest.action) + '» — на ' + Math.abs(Math.round(largest.delta)) + ' п.п. ' + direction + '</strong></div>';
    });
    var noviceLargest = largestActionDelta(league, slices[cohorts[cohorts.length - 1]]);
    host.innerHTML = gapRows.join("") + '<p>' + escapeHtml(cfg.actionRules[noviceLargest.action]) + '</p>';
  }

  function currentInsights() {
    var league = findSlice("league1"), novice = findSlice("r15_18");
    if (!league || !novice) return [
      { kicker: "Ситуация", title: "Выбери соседнюю настройку", value: "—", copy: "Здесь сравнение слишком шумное, чтобы превращать его в правило.", rule: "Сдвинь стек или позицию на один шаг и вернись к этой границе позже.", metricLabel: "Что делать", bars: [] },
      { kicker: "Диапазон", title: "Серые руки пока не учим", value: "—", copy: "Если рука не подсвечена, тренажёр не заставляет угадывать её линию.", rule: "Сначала закрепи цветные клетки с ясным планом.", metricLabel: "Что делать", bars: [] },
      { kicker: "Практика", title: "Тренируй решения, а не шум", value: "—", copy: "В тренировку попадают руки, где одно действие заметно опережает остальные.", rule: "На спорной границе сравни соседние руки, а не запоминай один процент.", metricLabel: "Что делать", bars: [] },
    ];
    var deltas = cfg.actions.map(function (action) { return { action: action, delta: novice.rates[action] - league.rates[action] }; }).sort(function (a, b) { return Math.abs(b.delta) - Math.abs(a.delta); });
    if (trainerKey === "sb_unopened") {
      var noviceVpip = vpip(novice.rates), leagueVpip = vpip(league.rates);
      var shortLeague = findSlice("league1", Object.assign({}, state.filters, { stack: "8-10" }));
      var shortNovice = findSlice("r15_18", Object.assign({}, state.filters, { stack: "8-10" }));
      var jamOnset = STACK_ORDER.find(function (stack) { var row = findSlice("league1", Object.assign({}, state.filters, { stack: stack })); return row && row.rates.jam >= 15; }) || state.filters.stack;
      var onsetLeague = findSlice("league1", Object.assign({}, state.filters, { stack: jamOnset })) || league;
      var onsetNovice = findSlice("r15_18", Object.assign({}, state.filters, { stack: jamOnset })) || novice;
      return [
        { kicker: "Ширина входа", title: "Не сужай SB до обычной позиции", value: "VPIP " + pct(leagueVpip), copy: "Первая лига входит в банк с " + pct(leagueVpip) + " рук, а ранги 15–18 — с " + pct(noviceVpip) + ". Главная потеря начинается ещё до выбора сайзинга.", rule: "Когда все выбросили до SB, сначала спроси не «входить ли», а «комплит, рейз или пуш».", metricLabel: "Как часто входят в банк", bars: [{ label: "Первая лига", value: leagueVpip, action: "call" }, { label: "Ранги 15–18", value: noviceVpip, action: "fold" }] },
        { kicker: "Разделение диапазона", title: "Комплит сохраняет широкую середину", value: pct(league.rates.call) + " / " + pct(league.rates.raise), copy: "На стеке " + displayStack(state.filters.stack) + " BB первая лига делит вход: комплит " + pct(league.rates.call) + ", рейз " + pct(league.rates.raise) + ", пуш " + pct(league.rates.jam) + ".", rule: "Не превращай весь широкий диапазон в один рейз: средняя часть сохраняет дешёвый вход через комплит.", metricLabel: "Комплит и рейз первой лиги", rangeSlice: league, rangeStack: state.filters.stack },
        { kicker: "Падение стека", title: "С " + displayStack(jamOnset) + " BB появляется слой пушей", value: pct(onsetLeague.rates.jam), copy: shortLeague && shortNovice ? "На " + displayStack(jamOnset) + " BB первая лига уже пушит " + pct(onsetLeague.rates.jam) + " рук против " + pct(onsetNovice.rates.jam) + " у рангов 15–18. К 8–10 BB слой вырастает до " + pct(shortLeague.rates.jam) + " против " + pct(shortNovice.rates.jam) + "." : "Оранжевый слой на лестнице ниже показывает, как часть рейзов превращается в пуши.", rule: cfg.actionRules.jam, hideGridRule: true, metricLabel: "Опен-пуш на " + displayStack(jamOnset) + " BB", pushComparison: { league: onsetLeague, novice: onsetNovice, stack: jamOnset } },
      ];
    }
    if (
      trainerKey === "vs_raise_sb" &&
      state.filters.opener === "BTN" &&
      state.filters.size === "2x" &&
      state.filters.stack === "18-25"
    ) {
      var exactEv = evData && evData.spots && evData.spots["SB|BTN|2x|18-25"];
      var leagueActions = exactEv && exactEv.league1.actions || league.rates;
      var noviceActions = exactEv && exactEv.r15_18.actions || novice.rates;
      var qjsSwap = exactEv && exactEv.jamToCallSwaps && exactEv.jamToCallSwaps.QJs;
      var qjsLeague = qjsSwap && qjsSwap.league1 || league.cells.QJs || { call: 0, jam: 0 };
      var qjsNovice = qjsSwap && qjsSwap.r15_18 || novice.cells.QJs || { call: 0, jam: 0 };
      return [
        {
          kicker: "Форма защиты",
          title: "Те же 26%, но колл съедает пуш",
          value: pp(noviceActions.call - leagueActions.call),
          copy: "Обе группы продолжают примерно четверть рук. Но первая лига коллирует " + pct(leagueActions.call) + " и пушит " + pct(leagueActions.jam) + ", а ранги 15–18 коллируют " + pct(noviceActions.call) + " и пушат только " + pct(noviceActions.jam) + ".",
          rule: "Сначала проверь, не должна ли сильная часть продолжения уйти в прямой пуш вместо пассивного колла.",
          valueNote: "На столько выросла доля пассивных коллов при той же общей ширине защиты.",
          metricLabel: "Колл и пуш в одном споте",
          bars: [
            { label: "Колл · Первая лига", value: leagueActions.call, action: "call" },
            { label: "Колл · Ранги 15–18", value: noviceActions.call, action: "call" },
            { label: "Пуш · Первая лига", value: leagueActions.jam, action: "jam" },
            { label: "Пуш · Ранги 15–18", value: noviceActions.jam, action: "jam" },
          ],
        },
        {
          kicker: "Цена спота",
          title: "Та же ширина — другой винрейт",
          value: exactEv ? "−" + Math.abs(exactEv.gapBb100).toFixed(1).replace(".", ",") + " BB" : "—",
          copy: exactEv
            ? "На 100 таких ситуаций первая лига получает " + signedBb(exactEv.league1.spotEvBb100, 1) + ", а ранги 15–18 — " + signedBb(exactEv.r15_18.spotEvBb100, 1) + ". Разница — " + Math.abs(exactEv.gapBb100).toFixed(1).replace(".", ",") + " BB."
            : "Для этого спота нужен подтверждённый срез результата.",
          rule: "Одинаковая ширина защиты не делает диапазоны одинаковыми: оценивай, какими действиями собраны эти 26%.",
          valueNote: "Столько ранги 15–18 недобирают относительно первой лиги на 100 повторений этого спота.",
          metricLabel: "Результат на 100 таких спотов",
          metrics: exactEv ? [
            { label: "Первая лига", value: signedBb(exactEv.league1.spotEvBb100, 1), tone: "positive" },
            { label: "Ранги 15–18", value: signedBb(exactEv.r15_18.spotEvBb100, 1), tone: "negative" },
          ] : [],
        },
        {
          kicker: "Где ломается",
          title: "Бродвеи и пары застревают в колле",
          value: "QJs · " + pct(qjsLeague.jam),
          copy: "На QJs первая лига пушит " + pct(qjsLeague.jam) + ", а ранги 15–18 — " + pct(qjsNovice.jam) + ": вместо пуша у них чаще появляется колл. Тот же сдвиг особенно заметен на QTs, KTs, 55 и JTs.",
          rule: "Отметь QJs, QTs, KTs, 55 и JTs как контрольные руки: на них первым делом проверяй, не заменил ли ты пуш коллом.",
          valueNote: "Так часто первая лига пушит контрольную руку QJs в этом споте.",
          metricLabel: "QJs · прямой пуш",
          bars: [
            { label: "Первая лига", value: qjsLeague.jam, action: "jam" },
            { label: "Ранги 15–18", value: qjsNovice.jam, action: "jam" },
          ],
        },
      ];
    }
    var largest = deltas[0];
    var continueLeague = continueRate(league.rates), continueNovice = continueRate(novice.rates);
    var shortFilters = Object.assign({}, state.filters, { stack: trainerKey === "vs_raise_free" ? "20" : "18-25" });
    var shortLeague = findSlice("league1", shortFilters) || league;
    var shortNovice = findSlice("r15_18", shortFilters) || novice;
    var shortStack = shortLeague.stack_bucket;
    var jamGap = shortNovice.rates.jam - shortLeague.rates.jam;
    var mainInsight = { kicker: "Главный перекос", title: "«" + actionLabel(largest.action) + "» уезжает сильнее всего", value: pp(largest.delta), copy: "В этом споте ранги 15–18 выбирают «" + actionLabel(largest.action).toLowerCase() + "» в " + pct(novice.rates[largest.action]) + " случаев, первая лига — в " + pct(league.rates[largest.action]) + ".", rule: cfg.actionRules[largest.action], metricLabel: actionLabel(largest.action) + " в выбранном споте", bars: [{ label: "Первая лига", value: league.rates[largest.action], action: largest.action }, { label: "Ранги 15–18", value: novice.rates[largest.action], action: largest.action }] };
    if (trainerKey === "vs_raise_free") mainInsight.actionComparison = {
      action: largest.action,
      league: league,
      novice: novice,
      context: contextLabel(state.filters),
    };
    var laterInsights = [];
    if (trainerKey !== "vs_raise_free") laterInsights.push(
      { kicker: "Первый фильтр", title: "Сначала реши: продолжать ли вообще", value: pct(continueLeague), copy: "Первая лига продолжает " + pct(continueLeague) + " рук, ранги 15–18 — " + pct(continueNovice) + ". Только после этого дели продолжение на колл, 3-бет и пуш.", rule: "Не начинай с любимой кнопки. Сначала отдели весь диапазон продолжения от паса.", metricLabel: "Все продолжения", bars: [{ label: "Первая лига", value: continueLeague, action: "call" }, { label: "Ранги 15–18", value: continueNovice, action: "call" }] }
    );
    var shortInsight = { kicker: "Короткий стек", title: trainerKey === "vs_raise_sb" ? "Не отдавай короткий стек коллам" : "Часть коллов должна стать пушами", value: pct(shortLeague.rates.jam), copy: "На " + displayStack(shortStack) + " BB первая лига пушит " + pct(shortLeague.rates.jam) + " рук, ранги 15–18 — " + pct(shortNovice.rates.jam) + ". Разница — " + Math.abs(Math.round(jamGap)) + " п.п.", rule: cfg.actionRules.jam, metricLabel: "Прямой пуш на " + displayStack(shortStack) + " BB", bars: [{ label: "Первая лига", value: shortLeague.rates.jam, action: "jam" }, { label: "Ранги 15–18", value: shortNovice.rates.jam, action: "jam" }] };
    if (trainerKey === "vs_raise_free") shortInsight.pushComparison = {
      league: shortLeague,
      novice: shortNovice,
      stack: shortStack,
    };
    laterInsights.push(shortInsight);
    return [mainInsight].concat(laterInsights);
  }

  function wisdomProofMarkup(item) {
    if (item.actionComparison) {
      var actionComparison = item.actionComparison;
      var actionName = actionLabel(actionComparison.action);
      return '<div class="proof-card wisdom-evidence wisdom-range-card wisdom-action-card is-' + actionClass(actionComparison.action) + '"><div class="wisdom-range-head"><div><span>' + escapeHtml(actionComparison.context) + ' · один чарт, две группы</span><strong>Какие руки уходят в «' + escapeHtml(actionName.toLowerCase()) + '»</strong></div></div><div class="wisdom-action-cohorts" aria-label="Легенда сравнения действия ' + escapeHtml(actionName) + '"><span class="is-league"><i></i><b>Первая лига · верх клетки</b><strong>' + pct(actionComparison.league.rates[actionComparison.action]) + '</strong></span><span class="is-novice"><i></i><b>Ранги 15–18 · низ клетки</b><strong>' + pct(actionComparison.novice.rates[actionComparison.action]) + '</strong></span></div><div class="ff-range-grid wisdom-range-grid wisdom-action-compare-grid" role="grid" aria-label="Сравнение действия ' + escapeHtml(actionName) + ' первой лиги и рангов 15–18 · ' + escapeHtml(actionComparison.context) + '">' + actionComparisonCellsMarkup(actionComparison.league, actionComparison.novice, actionComparison.action) + '</div><small class="wisdom-range-note">Длина полосы — частота действия с рукой. Яркая рамка — разница между группами не меньше 10 п.п.</small></div>';
    }
    if (item.pushComparison) {
      var comparison = item.pushComparison;
      return '<div class="proof-card wisdom-evidence wisdom-range-card wisdom-push-card"><div class="wisdom-range-head"><div><span>' + displayStack(comparison.stack) + ' BB · один чарт, две группы</span><strong>Кто пушит какие руки</strong></div></div><div class="wisdom-push-cohorts" aria-label="Легенда сравнения пушей"><span class="is-league"><i></i><b>Первая лига · верх клетки</b><strong>' + pct(comparison.league.rates.jam) + '</strong></span><span class="is-novice"><i></i><b>Ранги 15–18 · низ клетки</b><strong>' + pct(comparison.novice.rates.jam) + '</strong></span></div><div class="ff-range-grid wisdom-range-grid wisdom-push-compare-grid" role="grid" aria-label="Сравнение опен-пушей первой лиги и рангов 15–18 на ' + displayStack(comparison.stack) + ' BB">' + pushComparisonCellsMarkup(comparison.league, comparison.novice) + '</div><small class="wisdom-range-note">Длина цветной полосы внутри клетки — частота пуша с этой рукой.</small></div>';
    }
    if (item.rangeSlice) {
      var rangeTotals = cfg.actions.map(function (action) {
        return '<span class="wisdom-range-total is-' + actionClass(action) + '"><i></i><b>' + escapeHtml(actionLabel(action)) + '</b><strong>' + pct(item.rangeSlice.rates[action]) + '</strong></span>';
      }).join("");
      return '<div class="proof-card wisdom-evidence wisdom-range-card"><div class="wisdom-range-head"><div><span>Первая лига · ' + displayStack(item.rangeStack) + ' BB</span><strong>Как разделить VPIP ' + pct(vpip(item.rangeSlice.rates)) + '</strong></div><div class="ff-chart-legend">' + legendMarkup() + '</div></div><div class="ff-range-grid benchmark-range-grid wisdom-range-grid" role="grid" aria-label="Матрица разделения диапазона первой лиги на ' + displayStack(item.rangeStack) + ' BB">' + rangeCellsMarkup(item.rangeSlice, false) + '</div><div class="wisdom-range-totals">' + rangeTotals + '</div><small class="wisdom-range-note">Цвет внутри клетки показывает частоты действий именно с этой рукой.</small></div>';
    }
    var evidence = item.metrics && item.metrics.length
      ? '<div class="wisdom-metric-rows">' + item.metrics.map(function (metric) {
        return '<div class="wisdom-metric-row is-' + escapeHtml(metric.tone || "neutral") + '"><span>' + escapeHtml(metric.label) + '</span><strong>' + escapeHtml(metric.value) + '</strong></div>';
      }).join("") + '</div>'
      : item.bars && item.bars.length
        ? cohortBars(item.bars)
        : '<p>Выбери соседнюю настройку, чтобы увидеть ясную разницу.</p>';
    return '<div class="proof-card wisdom-evidence"><span>' + escapeHtml(item.metricLabel || "Сравнение") + '</span>' + evidence + '</div><div class="proof-card wisdom-rule-card"><span>Главная цифра</span><strong>' + item.value + '</strong><small>' + escapeHtml(item.valueNote || item.rule) + '</small></div>';
  }

  function renderWisdomCarousel() {
    var insights = currentInsights();
    var host = $("#wisdomSlides");
    host.innerHTML = insights.map(function (item, index) {
      return '<article class="slide' + (index === state.slide ? ' active' : '') + (item.rangeSlice || item.pushComparison || item.actionComparison ? ' has-range-chart' : '') + '" role="group" aria-roledescription="слайд" aria-label="' + (index + 1) + ' из ' + insights.length + '"><span class="slide-number" aria-hidden="true">0' + (index + 1) + '</span><div class="slide-copy"><p class="eyebrow">' + item.kicker + '</p><h2>' + item.title + '</h2><p>' + item.copy + '</p><strong class="slide-rule">' + escapeHtml(item.rule) + '</strong></div><div class="slide-proof">' + wisdomProofMarkup(item) + '</div></article>';
    }).join("");
    var dots = $("#wisdomDots");
    dots.innerHTML = insights.map(function (_, index) { return '<button type="button" class="' + (index === state.slide ? 'is-active' : '') + '" data-slide="' + index + '" aria-label="Мысль ' + (index + 1) + '"></button>'; }).join("");
    $("#wisdomCounter").textContent = (state.slide + 1) + " из " + insights.length;
    $("#wisdomRemaining").textContent = state.slide === insights.length - 1 ? "Последняя мысль" : "Ещё " + (insights.length - state.slide - 1);
    $("#wisdomPrev").disabled = state.slide === 0;
    $("#wisdomNext").disabled = state.slide === insights.length - 1;
  }

  function renderInsights() {
    var insights = currentInsights();
    $("#insightGrid").innerHTML = insights.map(function (item, index) {
      var rule = item.hideGridRule ? "" : '<div class="insight-rule"><strong>За столом</strong><span>' + escapeHtml(item.rule) + '</span></div>';
      return '<article class="panel insight-card"><span>0' + (index + 1) + ' · ' + item.kicker + '</span><h3>' + item.title + '</h3><strong class="insight-number">' + item.value + '</strong><p>' + item.copy + '</p>' + rule + '</article>';
    }).join("");
    var ladder = STACK_ORDER.map(function (stack) {
      var filters = Object.assign({}, state.filters, { stack: stack });
      var slice = findSlice("league1", filters), novice = findSlice("r15_18", filters);
      if (!slice) return "";
      var mainValue = trainerKey === "sb_unopened" ? vpip(slice.rates) : continueRate(slice.rates);
      var noviceValue = novice ? (trainerKey === "sb_unopened" ? vpip(novice.rates) : continueRate(novice.rates)) : 0;
      var noviceJam = novice ? novice.rates.jam : 0;
      var shortStackStart = trainerKey === "vs_raise_free" ? "25" : "18-25";
      var isShortStack = STACK_ORDER.indexOf(stack) >= STACK_ORDER.indexOf(shortStackStart);
      return '<article class="stack-step' + (stack === state.filters.stack ? ' is-selected' : '') + (isShortStack ? ' is-short-stack' : '') + '" data-stack="' + escapeHtml(stack) + '"><header><span class="stack-size-badge"><b>' + displayStack(stack) + '</b><small>BB</small></span><strong>' + (trainerKey === "sb_unopened" ? 'VPIP ' : 'Играют ') + pct(mainValue) + '</strong></header>' + actionMix(slice.rates) + '<div class="stack-step-meta"><span>Пуш ' + pct(slice.rates.jam) + ' → ' + pct(noviceJam) + '</span><span>15–18: ' + pct(noviceValue) + '</span></div></article>';
    }).join("");
    var storyTitle = trainerKey === "sb_unopened" ? "От комплита и рейза к прямому пушу" : "Как защита меняется вместе со стеком";
    var storyCopy = trainerKey === "sb_unopened" ? "Смотри не только на общий VPIP. Цветная полоса показывает комплит, рейз и пуш; внизу — пуш первой лиги → рангов 15–18." : "Ширина защиты меняется плавно, а её форма — резко. Внизу каждой карточки — пуш первой лиги → рангов 15–18.";
    $("#stackStory").innerHTML = '<div class="stack-story-head"><div><p class="eyebrow">Лестница стека</p><h2>' + storyTitle + '</h2></div><p>' + storyCopy + '</p></div><div class="stack-ladder">' + ladder + '</div>';
  }

  function renderAllDataViews() {
    renderFilters(); renderChart(); renderComparison(); renderWisdomCarousel(); renderInsights();
    $$('[data-source-note]').forEach(function (node) { node.textContent = configRoot.shared.learnerSourceLabel; });
  }

  function go(screen) {
    state.screen = screen;
    $$(".screen").forEach(function (section) { var active = section.dataset.screen === screen; section.classList.toggle("active", active); section.classList.toggle("is-active", active); });
    $$(".step-tabs [data-go]").forEach(function (tab) { var active = tab.dataset.go === screen; tab.classList.toggle("active", active); tab.setAttribute("aria-selected", String(active)); if (state.introAnswered) tab.disabled = false; });
    try { localStorage.setItem(cfg.progressKey, JSON.stringify({ screen: screen, unlocked: state.introAnswered })); } catch (error) {}
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cardCodes(hand) {
    if (/^([AKQJT98765432])\1$/.test(hand)) return [hand[0] + "s", hand[1] + "h"];
    return hand.slice(-1) === "s" ? [hand[0] + "s", hand[1] + "s"] : [hand[0] + "s", hand[1] + "h"];
  }
  function seatName(position) { return position === "EP" ? "UTG" : position === "MP" ? "LJ" : position; }
  function spotFor(item, prefix) {
    var hero = seatName(item.filters.hero), opener = seatName(item.filters.opener);
    var stack = Number(String(item.filters.stack).split("-")[0].replace("<", "")) || 20;
    if (item.filters.stack === "70+") stack = 80;
    if (item.filters.stack === "40-70") stack = 50;
    if (item.filters.stack === "25-40") stack = 32;
    if (item.filters.stack === "18-25") stack = 21;
    var unopened = trainerKey === "sb_unopened";
    var openAmounts = { "2x": 2, "2.5x": 2.5, "3x": 3 };
    var openAmount = unopened ? 0 : openAmounts[item.filters.size];
    if (!unopened && !openAmount) throw new Error("Unsupported preflop open size: " + item.filters.size);
    var tableOrder = ["UTG", "LJ", "HJ", "CO", "BTN", "SB", "BB"];
    var actionLine = [];
    if (unopened) actionLine = ["UTG fold", "LJ fold", "HJ fold", "CO fold", "BTN fold"];
    else {
      if (hero === opener) throw new Error("Invalid practice spot: Hero cannot be the preflop opener");
      var heroIndex = tableOrder.indexOf(hero);
      var openerIndex = tableOrder.indexOf(opener);
      if (heroIndex < 0 || openerIndex < 0 || openerIndex >= heroIndex) throw new Error("Invalid practice position order: " + opener + " before " + hero);
      actionLine = tableOrder.slice(0, heroIndex).map(function (label) {
        return label === opener ? label + " raise " + openAmount + " BB" : label + " fold";
      });
    }
    var options = cfg.actions.map(function (action) {
      var label = actionLabel(action);
      if (action === "raise") label += unopened ? " 3 BB" : " " + Math.max(6, Math.round(openAmount * 3)) + " BB";
      return { key: action, label: label, correct: action === item.expected };
    });
    return {
      id: prefix + "-" + item.hand + "-" + item.filters.hero + "-" + item.filters.stack,
      title: "Префлоп-решение",
      hand: item.hand,
      question: item.hand + " · " + contextLabel(item.filters),
      answer: "Ориентир первой лиги: " + actionLabel(item.expected),
      table: {
        seats: tableOrder.map(function (label) { return { label: label, state: label === hero ? "hero" : /SB|BB/.test(label) ? "blind" : "waiting", stackBb: stack }; }),
        heroPosition: hero,
        heroStack: stack + " BB",
        effectiveStack: stack + " BB",
        pot: unopened ? "2.5 BB" : (openAmount + 1.5) + " BB",
        anteBb: 1,
        heroCards: cardCodes(item.hand),
        boardCards: [],
        street: "preflop",
        actionLine: actionLine,
        historyLine: unopened ? "BB ante 1 BB · все до SB выбросили" : item.filters.opener + " открыл " + String(openAmount).replace(".", ",") + " BB · без коллеров",
        toCall: unopened ? .5 : Math.max(0, openAmount - (hero === "SB" ? .5 : 0)),
        currentBet: unopened ? 1 : openAmount,
        dealerPosition: "BTN",
      },
      options: options,
    };
  }
  function renderDecision(host, item, selected, prefix) {
    if (!host || !root.FFTrainerSimulator || !root.FFTrainerSimulator.renderDecision) return;
    root.FFTrainerSimulator.renderDecision(host, spotFor(item, prefix), { answered: Boolean(selected), selectedKey: selected || "", finished: false }, { positionLabels: { UTG: "EP", LJ: "MP" }, decimalComma: true });
  }

  function practiceSpots() {
    var candidates = [];
    trainer.slices.filter(function (slice) {
      return slice.cohort === "league1" && (trainerKey === "sb_unopened" || slice.hero_position !== slice.opener_position);
    }).forEach(function (slice) {
      var novice = trainer.slices.find(function (row) { return row.cohort === "r15_18" && row.hero_position === slice.hero_position && row.opener_position === slice.opener_position && row.open_size === slice.open_size && row.stack_bucket === slice.stack_bucket; });
      if (!novice) return;
      Object.keys(slice.cells).forEach(function (hand) {
        if (!novice.cells[hand]) return;
        var d = dominant(slice.cells[hand]);
        var fieldGap = cfg.actions.reduce(function (sum, action) { return sum + Math.abs(slice.cells[hand][action] - novice.cells[hand][action]); }, 0) / 2;
        if (!isClearPlan(d) || fieldGap < 8) return;
        candidates.push({ hand: hand, expected: d.key, league: slice.cells[hand], novice: novice.cells[hand], confidence: d.lead, fieldGap: fieldGap, filters: { hero: slice.hero_position, opener: slice.opener_position, size: slice.open_size, stack: slice.stack_bucket } });
      });
    });
    var groups = {};
    cfg.actions.forEach(function (action) { groups[action] = shuffle(candidates.filter(function (item) { return item.expected === action; }).sort(function (a, b) { return b.fieldGap - a.fieldGap || b.confidence - a.confidence; }).slice(0, 80)); });
    var balanced = [];
    for (var index = 0; index < 80; index += 1) cfg.actions.forEach(function (action) { if (groups[action][index]) balanced.push(groups[action][index]); });
    return shuffle(balanced.length >= 20 ? balanced : candidates);
  }
  function introItem() {
    var defaultLeague = findSlice("league1", cfg.defaults);
    var defaultNovice = findSlice("r15_18", cfg.defaults);
    if (defaultLeague && defaultNovice) {
      var defaultHands = Object.keys(defaultLeague.cells).filter(function (hand) { return defaultNovice.cells[hand]; });
      var chosenHand = defaultHands.includes(cfg.introHand) ? cfg.introHand : defaultHands.sort(function (a, b) { return dominant(defaultLeague.cells[b]).lead - dominant(defaultLeague.cells[a]).lead; })[0];
      if (chosenHand) {
        return {
          hand: chosenHand,
          expected: dominant(defaultLeague.cells[chosenHand]).key,
          league: defaultLeague.cells[chosenHand],
          novice: defaultNovice.cells[chosenHand],
          filters: { hero: defaultLeague.hero_position, opener: defaultLeague.opener_position, size: defaultLeague.open_size, stack: defaultLeague.stack_bucket },
        };
      }
    }
    var spots = practiceSpots();
    function matchesDefault(item) {
      return FILTERS.every(function (def) { return cfg.hideFilters.includes(def.key) || item.filters[def.key] === cfg.defaults[def.key]; });
    }
    var preferred = spots.find(function (item) { return item.hand === cfg.introHand && matchesDefault(item); });
    return preferred || spots.find(matchesDefault) || spots.find(function (item) { return item.filters.hero === cfg.defaults.hero && item.filters.stack === cfg.defaults.stack; }) || spots[0];
  }

  function setupIntro() {
    $("#introTitle").textContent = cfg.introTitle;
    $("#introLead").textContent = cfg.introLead;
    state.introSpot = introItem();
    if (!state.introSpot) { $("#introCoach").innerHTML = '<div class="answer-card is-wrong"><span class="answer-lamp"></span><div><strong>Эта настройка пока недоступна</strong><small>Выбери соседнюю позицию или стек.</small></div></div>'; return; }
    renderDecision($("#introTableHost"), state.introSpot, "", "intro");
  }
  function answerIntro(choice) {
    if (state.introAnswered || !state.introSpot) return;
    state.introAnswered = true;
    var correct = choice === state.introSpot.expected;
    renderDecision($("#introTableHost"), state.introSpot, choice, "intro");
    var coach = $("#introCoach");
    coach.innerHTML = '<div class="answer-card ' + (correct ? 'is-correct' : 'is-wrong') + '"><span class="answer-lamp"></span><div><strong>' + (correct ? 'Совпало с ориентиром: ' : 'Ориентир первой лиги: ') + actionLabel(state.introSpot.expected) + '</strong><small>' + escapeHtml(cfg.actionRules[state.introSpot.expected]) + '</small></div><button class="btn primary" id="openMain" type="button">Понять почему →</button></div>';
    $$(".step-tabs button").forEach(function (tab) { tab.disabled = false; });
    $("#openMain").onclick = function () { go("main"); };
  }
  function feedbackCohort(label, rates, expected, benchmark) {
    return '<div class="feedback-cohort' + (benchmark ? ' is-benchmark' : '') + '"><div><span>' + label + '</span><strong>«' + actionLabel(expected) + '» ' + pct(rates[expected]) + '</strong></div>' + actionMix(rates) + '</div>';
  }
  function practiceAdvice(item) {
    var gap = Number(item.novice[item.expected] || 0) - Number(item.league[item.expected] || 0);
    var direction = gap > 0 ? "чаще" : "реже";
    var comparison = Math.abs(gap) >= 3 ? " Ранги 15–18 выбирают эту линию на " + Math.abs(Math.round(gap)) + " п.п. " + direction + "." : " В этом споте обе группы близки по частоте этой линии.";
    return cfg.actionRules[item.expected] + comparison;
  }

  function renderPracticeSpot() {
    if (!state.queue.length) return;
    var item = state.queue[state.index];
    state.answered = false; state.choice = "";
    $("#handNo").textContent = state.handNo;
    $("#score").textContent = state.score;
    $("#misses").textContent = state.misses;
    $("#practiceFeedback").hidden = true;
    $("#practiceFeedback").innerHTML = "";
    renderDecision($("#practiceTable"), item, "", "practice");
    $("#practiceCoach").innerHTML = '<p class="eyebrow">' + contextLabel(item.filters) + '</p><h2>' + item.hand + ': твоё решение?</h2><p>Выбери действие под столом. После ответа получишь правило и увидишь, где расходятся две группы.</p>';
  }
  function startPractice() {
    state.queue = practiceSpots(); state.index = 0; state.handNo = 1; state.score = 0; state.misses = 0; state.courseReported = false; state.sessionId = trainerKey + "-" + Date.now().toString(36);
    $("#practiceLaunch").hidden = true; $("#practiceShell").hidden = false;
    document.body.classList.add("practice-is-running");
    renderPracticeSpot();
  }
  function stopPractice() {
    state.queue = []; $("#practiceShell").hidden = true; $("#practiceLaunch").hidden = false; document.body.classList.remove("practice-is-running");
  }
  function reportProgress() {
    var attempts = state.score + state.misses;
    if (state.courseReported || attempts < 25 || !root.FFPlayerProgress || typeof root.FFPlayerProgress.setResult !== "function") return;
    var score = Math.round(state.score / attempts * 100);
    try {
      root.FFPlayerProgress.setResult(cfg.resultKey, { attempts: attempts, correct: state.score, score: score, bestScore: score, status: score >= 80 ? "passed" : "repeat" }, { session: { id: state.sessionId, type: "lesson", mode: "msp-benchmark", total: attempts, correct: state.score, accuracy: score }, metadata: { trainer: trainerKey, source: "msp-rank-at-hand" } });
      state.courseReported = true;
    } catch (error) {}
  }
  function answerPractice(choice) {
    if (state.answered || !state.queue.length) return;
    var item = state.queue[state.index]; state.answered = true; state.choice = choice;
    var correct = choice === item.expected;
    if (correct) state.score += 1; else state.misses += 1;
    renderDecision($("#practiceTable"), item, choice, "practice");
    $("#score").textContent = state.score; $("#misses").textContent = state.misses;
    var feedback = $("#practiceFeedback"); feedback.hidden = false;
    feedback.innerHTML = '<div class="answer-card ' + (correct ? 'is-correct' : 'is-wrong') + '"><span class="answer-lamp"></span><div><strong>' + (correct ? 'Совпало с ориентиром: ' : 'Ориентир первой лиги: ') + actionLabel(item.expected) + '</strong><small>' + (correct ? 'Это самая частая линия первой лиги в этом подтверждённом срезе.' : 'Сравни свой выбор с частотами обеих групп ниже.') + '</small></div><button class="btn primary" id="nextPractice" type="button">Следующая рука →</button></div>';
    $("#practiceCoach").innerHTML = '<p class="eyebrow">' + (correct ? 'Совпало' : 'Разбор') + '</p><h2>' + item.hand + ' · ' + actionLabel(item.expected) + '</h2><p>' + escapeHtml(practiceAdvice(item)) + '</p><div class="feedback-compare">' + feedbackCohort("Первая лига", item.league, item.expected, true) + feedbackCohort("Ранги 15–18", item.novice, item.expected, false) + '</div>';
    reportProgress();
    $("#nextPractice").onclick = nextPractice;
  }
  function nextPractice() {
    state.index += 1; state.handNo += 1;
    if (state.index >= state.queue.length) { state.queue = practiceSpots(); state.index = 0; }
    renderPracticeSpot();
  }

  function bind() {
    document.addEventListener("click", function (event) {
      var goButton = event.target.closest("[data-go]");
      if (goButton && !goButton.disabled) { go(goButton.dataset.go); return; }
      var filter = event.target.closest("[data-filter]");
      if (filter) { state.filters[filter.dataset.filter] = filter.dataset.value; reconcileFilters(filter.dataset.filter); state.selectedHand = ""; state.slide = 0; renderAllDataViews(); return; }
      var hand = event.target.closest("#benchmarkRange [data-hand]");
      if (hand) { state.selectedHand = hand.dataset.hand; renderChart(); return; }
      var introAction = event.target.closest("#introTableHost [data-option-key]");
      if (introAction) { answerIntro(introAction.dataset.optionKey); return; }
      var practiceAction = event.target.closest("#practiceTable [data-option-key]");
      if (practiceAction) { answerPractice(practiceAction.dataset.optionKey); return; }
      var dot = event.target.closest("[data-slide]");
      if (dot) { state.slide = Number(dot.dataset.slide); renderWisdomCarousel(); }
    });
    $("#wisdomPrev").onclick = function () { state.slide = Math.max(0, state.slide - 1); renderWisdomCarousel(); };
    $("#wisdomNext").onclick = function () { state.slide = Math.min(currentInsights().length - 1, state.slide + 1); renderWisdomCarousel(); };
    $("#startPractice").onclick = startPractice;
    $("#stopPractice").onclick = stopPractice;
    var carousel = $("#wisdomCarousel"), startX = 0, startY = 0;
    carousel.addEventListener("pointerdown", function (event) { if (!event.target.closest("button")) { startX = event.clientX; startY = event.clientY; } });
    carousel.addEventListener("pointerup", function (event) { var dx = event.clientX - startX, dy = event.clientY - startY; if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.2) { state.slide = Math.max(0, Math.min(2, state.slide + (dx < 0 ? 1 : -1))); renderWisdomCarousel(); } });
  }

  $("#chartTitle").textContent = cfg.chartTitle;
  $("#chartCopy").textContent = cfg.chartCopy;
  $("#wisdomTitle").textContent = cfg.wisdomTitle;
  $("#wisdomLead").textContent = cfg.wisdomLead;
  $("#practiceTitle").textContent = cfg.practiceTitle;
  $("#practiceCopy").textContent = cfg.practiceCopy;
  reconcileFilters();
  renderAllDataViews();
  setupIntro();
  bind();
  try {
    var saved = JSON.parse(localStorage.getItem(cfg.progressKey) || "null");
    if (saved && saved.unlocked) { state.introAnswered = true; $$(".step-tabs button").forEach(function (tab) { tab.disabled = false; }); if (["hand", "main", "ranges", "field", "wisdom", "practice"].includes(saved.screen)) go(saved.screen); }
  } catch (error) {}
})();
