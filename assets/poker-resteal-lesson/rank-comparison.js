(function () {
  "use strict";

  var Data = window.PokerRestealRankData;
  var LOW_N_ESTIMATE_BELOW = 5;
  var LOW_N_PRIOR_STRENGTH = 16;

  function dataChartFor(data, cohort, position, size, depth) {
    var cohortCharts = data && data.charts && data.charts[cohort];
    var positionCharts = cohortCharts && cohortCharts[position];
    var sizeCharts = positionCharts && positionCharts[size];
    return sizeCharts && sizeCharts[depth] || null;
  }

  function addCellCounts(target, cell) {
    if (!cell) return;
    target.opportunities += Number(cell[0] || 0);
    target.jams += Number(cell[4] || 0);
  }

  function otherCohorts(data, cohort) {
    return (data && data.meta && data.meta.cohortOrder || []).filter(function (candidate) {
      return candidate !== cohort;
    });
  }

  function priorFromSameSpotHand(data, cohort, position, size, depth, handIndex) {
    var counts = { opportunities: 0, jams: 0 };
    otherCohorts(data, cohort).forEach(function (candidate) {
      var chart = dataChartFor(data, candidate, position, size, depth);
      addCellCounts(counts, chart && chart.cells[handIndex]);
    });
    return counts;
  }

  function priorFromSameSpot(data, cohort, position, size, depth) {
    var counts = { opportunities: 0, jams: 0 };
    otherCohorts(data, cohort).forEach(function (candidate) {
      var chart = dataChartFor(data, candidate, position, size, depth);
      (chart && chart.cells || []).forEach(function (cell) { addCellCounts(counts, cell); });
    });
    return counts;
  }

  function priorFromSamePositionSizeHand(data, cohort, position, size, handIndex) {
    var counts = { opportunities: 0, jams: 0 };
    var depths = data && data.meta && data.meta.sourceDepthOrder || ["25-30", "30-35", "35-40"];
    otherCohorts(data, cohort).forEach(function (candidate) {
      depths.forEach(function (depth) {
        var chart = dataChartFor(data, candidate, position, size, depth);
        addCellCounts(counts, chart && chart.cells[handIndex]);
      });
    });
    return counts;
  }

  function priorFromComparablePool(data, cohort) {
    var counts = { opportunities: 0, jams: 0 };
    var positions = data && data.meta && data.meta.positionOrder || ["CO", "BTN"];
    var sizes = data && data.meta && data.meta.sizeOrder || ["2.0", "2.5", "3.0"];
    var depths = data && data.meta && data.meta.sourceDepthOrder || ["25-30", "30-35", "35-40"];
    otherCohorts(data, cohort).forEach(function (candidate) {
      positions.forEach(function (position) {
        sizes.forEach(function (size) {
          depths.forEach(function (depth) {
            var chart = dataChartFor(data, candidate, position, size, depth);
            (chart && chart.cells || []).forEach(function (cell) { addCellCounts(counts, cell); });
          });
        });
      });
    });
    return counts;
  }

  function priorForCell(data, cohort, position, size, depth, handIndex) {
    var candidates = [
      ["same-spot-hand", function () { return priorFromSameSpotHand(data, cohort, position, size, depth, handIndex); }],
      ["same-spot-all-hands", function () { return priorFromSameSpot(data, cohort, position, size, depth); }],
      ["same-position-size-hand", function () { return priorFromSamePositionSizeHand(data, cohort, position, size, handIndex); }],
      ["comparable-pool", function () { return priorFromComparablePool(data, cohort); }]
    ];
    for (var index = 0; index < candidates.length; index += 1) {
      var counts = candidates[index][1]();
      if (counts.opportunities > 0) {
        return {
          source: candidates[index][0],
          opportunities: counts.opportunities,
          rate: counts.jams / counts.opportunities * 100
        };
      }
    }
    return { source: "neutral-fallback", opportunities: 0, rate: 0 };
  }

  function lowNDisplayCell(data, cohort, position, size, depth, handIndex, cell) {
    var opportunities = Number(cell && cell[0] || 0);
    var jams = Number(cell && cell[4] || 0);
    if (!opportunities) return { available: false, estimated: false, rate: 0, opportunities: 0, prior: null };
    if (opportunities >= LOW_N_ESTIMATE_BELOW) {
      return { available: true, estimated: false, rate: jams / opportunities * 100, opportunities: opportunities, prior: null };
    }
    var prior = priorForCell(data, cohort, position, size, depth, handIndex);
    var estimatedRate = (jams + LOW_N_PRIOR_STRENGTH * prior.rate / 100) /
      (opportunities + LOW_N_PRIOR_STRENGTH) * 100;
    return {
      available: true,
      estimated: true,
      rate: estimatedRate,
      opportunities: opportunities,
      prior: prior
    };
  }

  window.PokerRestealRankLowN = Object.freeze({
    estimateBelow: LOW_N_ESTIMATE_BELOW,
    priorStrength: LOW_N_PRIOR_STRENGTH,
    displayCell: lowNDisplayCell,
    priorForCell: priorForCell
  });

  var root = document.getElementById("rankEvidenceSlide");
  if (!root) return;

  if (!Data) {
    var missing = document.getElementById("rankGrowthStrip");
    if (missing) missing.innerHTML = '<p class="rank-data-missing">Срез по лигам пока не загрузился.</p>';
    return;
  }

  var state = {
    position: "BTN",
    size: "2.0",
    depth: "25-40",
    league: "league3",
    hand: "QJo"
  };
  var cohortLabels = {
    novice: "Ранги 15–17",
    league3: "3 лига",
    league2: "2 лига",
    league1: "1 лига"
  };
  var sizeLabels = { "2.0": "2 BB", "2.5": "2,5 BB", "3.0": "3 BB" };
  var depthLabels = { "25-40": "25–40", "25-30": "25–30", "30-35": "30–35", "35-40": "35–40" };
  var integer = new Intl.NumberFormat("ru-RU");
  var actionItems = [
    ["folds", "Пас", "is-fold"],
    ["calls", "Колл", "is-call"],
    ["small3bets", "3-бет", "is-small-raise"],
    ["jams", "Олл-ин", "is-jam"]
  ];
  var gradientStops = [
    [0, [17, 21, 26]],
    [1, [27, 48, 55]],
    [5, [36, 68, 77]],
    [15, [23, 94, 97]],
    [30, [15, 115, 95]],
    [50, [8, 127, 96]]
  ];

  function byId(id) { return document.getElementById(id); }

  function percent(value, digits) {
    if (!Number.isFinite(Number(value))) return "—";
    return Number(value).toFixed(digits == null ? 1 : digits).replace(".", ",") + "%";
  }

  function money(value) {
    if (!Number.isFinite(Number(value))) return "—";
    return "$" + Number(value).toFixed(2).replace(".", ",");
  }

  function signed(value) {
    if (!Number.isFinite(Number(value))) return "—";
    return (value > 0 ? "+" : "") + percent(value, 1);
  }

  function chartFor(cohort, position, size, depth) {
    var cohortCharts = Data.charts && Data.charts[cohort];
    var positionCharts = cohortCharts && cohortCharts[position || state.position];
    var sizeCharts = positionCharts && positionCharts[size || state.size];
    return sizeCharts && sizeCharts[depth || state.depth] || null;
  }

  function totalFor(chart, key) {
    return Number(chart && chart.totals && chart.totals[key] || 0);
  }

  function jamRate(chart) {
    var opportunities = totalFor(chart, "opportunities");
    return opportunities ? totalFor(chart, "jams") / opportunities * 100 : 0;
  }

  function cellFor(cohort, hand) {
    var chart = chartFor(cohort);
    var index = Data.meta.handOrder.indexOf(hand);
    return chart && index >= 0 ? chart.cells[index] : null;
  }

  function displayCellFor(cohort, hand, cell) {
    var index = Data.meta.handOrder.indexOf(hand);
    return lowNDisplayCell(Data, cohort, state.position, state.size, state.depth, index, cell || cellFor(cohort, hand));
  }

  function actionRate(chart, key) {
    var opportunities = totalFor(chart, "opportunities");
    return opportunities ? totalFor(chart, key) / opportunities * 100 : 0;
  }

  function gradientColor(value) {
    var rate = Math.max(0, Math.min(50, Number(value) || 0));
    var left = gradientStops[0];
    var right = gradientStops[gradientStops.length - 1];
    for (var index = 1; index < gradientStops.length; index += 1) {
      if (rate <= gradientStops[index][0]) {
        left = gradientStops[index - 1];
        right = gradientStops[index];
        break;
      }
    }
    var span = Math.max(1, right[0] - left[0]);
    var mix = Math.max(0, Math.min(1, (rate - left[0]) / span));
    var rgb = left[1].map(function (channel, channelIndex) {
      return Math.round(channel + (right[1][channelIndex] - channel) * mix);
    });
    return "rgb(" + rgb.join(", ") + ")";
  }

  function cohortRankLabel(cohort) {
    var ranks = Data.meta && Data.meta.cohorts && Data.meta.cohorts[cohort] && Data.meta.cohorts[cohort].ranks || [];
    if (!ranks.length) return "";
    return "R" + Math.min.apply(null, ranks) + "–" + Math.max.apply(null, ranks);
  }

  function createTabs(rootNode, items, selected, controls, onSelect) {
    if (!rootNode) return;
    rootNode.innerHTML = "";
    items.forEach(function (item, index) {
      var button = document.createElement("button");
      var active = item.key === selected;
      button.type = "button";
      button.className = active ? "is-active" : "";
      button.textContent = item.label;
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", active ? "true" : "false");
      button.setAttribute("aria-controls", controls);
      button.tabIndex = active ? 0 : -1;
      button.addEventListener("click", function () { onSelect(item.key); });
      button.addEventListener("keydown", function (event) {
        var next = index;
        if (event.key === "ArrowRight") next = (index + 1) % items.length;
        else if (event.key === "ArrowLeft") next = (index - 1 + items.length) % items.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = items.length - 1;
        else return;
        event.preventDefault();
        onSelect(items[next].key);
        var buttons = rootNode.querySelectorAll("button");
        if (buttons[next]) buttons[next].focus();
      });
      rootNode.appendChild(button);
    });
  }

  function renderControls() {
    var positions = (Data.meta.positionOrder || ["CO", "BTN"]).map(function (key) {
      return { key: key, label: key };
    });
    var sizes = (Data.meta.sizeOrder || ["2.0", "2.5", "3.0"]).map(function (key) {
      return { key: key, label: sizeLabels[key] || String(key).replace(".", ",") + " BB" };
    });
    var depths = (Data.meta.depthOrder || ["25-40", "25-30", "30-35", "35-40"]).map(function (key) {
      return { key: key, label: (depthLabels[key] || key.replace("-", "–")) + " BB" };
    });

    createTabs(byId("rankPositionTabs"), positions, state.position, "rankNoviceMatrix rankLeagueMatrix", function (key) {
      state.position = key;
      render();
    });
    createTabs(byId("rankSizeTabs"), sizes, state.size, "rankNoviceMatrix rankLeagueMatrix", function (key) {
      state.size = key;
      render();
    });
    createTabs(byId("rankDepthTabs"), depths, state.depth, "rankNoviceMatrix rankLeagueMatrix", function (key) {
      state.depth = key;
      render();
    });
    createTabs(byId("rankLeagueTabs"), [
      { key: "league3", label: "3 лига" },
      { key: "league2", label: "2 лига" },
      { key: "league1", label: "1 лига" }
    ], state.league, "rankLeagueMatrix", function (key) {
      state.league = key;
      render();
    });
  }

  function actionBarMarkup(chart) {
    var opportunities = totalFor(chart, "opportunities");
    if (!opportunities) return "";
    return actionItems.map(function (action) {
      var count = totalFor(chart, action[0]);
      var rate = count / opportunities * 100;
      return '<span class="' + action[2] + '" style="width:' + rate.toFixed(3) + '%" title="' + action[1] + ': ' + percent(rate, 1) + '"></span>';
    }).join("");
  }

  function renderSpotSummary() {
    var order = Data.meta.cohortOrder || ["novice", "league3", "league2", "league1"];
    var spot = state.position + " · " + sizeLabels[state.size] + " · " + depthLabels[state.depth] + " BB";
    var cards = order.map(function (cohort) {
      var chart = chartFor(cohort);
      var summary = Data.summaries[cohort] || {};
      var opportunities = totalFor(chart, "opportunities");
      var known = Number(chart && (chart.knownOpportunities != null ? chart.knownOpportunities : chart.totals && chart.totals.knownOpportunities) || 0);
      var coverage = opportunities ? known / opportunities * 100 : 0;
      var actionRows = actionItems.map(function (action) {
        return '<span class="' + action[2] + '"><i></i><small>' + action[1] + '</small><b>' + percent(actionRate(chart, action[0]), 1) + '</b></span>';
      }).join("");
      return '<article class="rank-spot-card' + (cohort === state.league ? ' is-selected' : '') + '">' +
        '<header><span><strong>' + (summary.label || cohortLabels[cohort]) + '</strong><small>' + cohortRankLabel(cohort) + ' · ABI ' + money(summary.abiUsd) + '</small></span><b>' + percent(jamRate(chart), 1) + '<small>пуш</small></b></header>' +
        '<div class="rank-spot-actions">' + actionRows + '</div>' +
        '<footer>N ' + integer.format(opportunities) + ' · карты ' + percent(coverage, 0) + '</footer>' +
      '</article>';
    }).join("");
    byId("rankSpotSummary").innerHTML = '<div class="rank-spot-summary-head"><strong>Текущий срез · все уровни</strong><span>' + spot + '</span></div><div class="rank-spot-cards">' + cards + '</div>';
  }

  function statsMarkup(chart, delta) {
    var opportunities = totalFor(chart, "opportunities");
    var known = Number(chart && (chart.knownOpportunities != null ? chart.knownOpportunities : chart.totals && chart.totals.knownOpportunities) || 0);
    var coverage = opportunities ? known / opportunities * 100 : 0;
    return '<small>Рестил-пуш</small><strong>' + percent(jamRate(chart), 1) + '</strong>' +
      '<span>N ' + integer.format(opportunities) + ' · карты ' + percent(coverage, 0) + '</span>' +
      (delta == null ? '' : '<em class="' + (delta > 0 ? 'is-up' : delta < 0 ? 'is-down' : 'is-flat') + '">' + signed(delta) + ' п.п.</em>');
  }

  function focusCell(rootNode, index) {
    var cells = rootNode.querySelectorAll("button");
    if (cells[index]) cells[index].focus();
  }

  function renderMatrix(rootNode, cohort) {
    var chart = chartFor(cohort);
    rootNode.innerHTML = "";
    if (!chart) {
      rootNode.innerHTML = '<p class="rank-chart-empty">Для этого среза нет данных.</p>';
      return;
    }
    Data.meta.handOrder.forEach(function (hand, index) {
      var cell = chart.cells[index] || [0, 0, 0, 0, 0];
      var display = lowNDisplayCell(Data, cohort, state.position, state.size, state.depth, index, cell);
      var rate = display.rate;
      var button = document.createElement("button");
      button.type = "button";
      button.className = "rank-cell" +
        (!display.available ? " is-empty" : display.estimated ? " is-estimated" : cell[0] < 20 ? " is-thin" : "") +
        (cell[0] >= 50 ? " is-reliable" : "") +
        (hand === state.hand ? " is-selected" : "");
      button.style.setProperty("--jam-color", display.available ? gradientColor(rate) : "#15171b");
      button.dataset.hand = hand;
      button.dataset.index = String(index);
      button.dataset.rateKind = display.estimated ? "estimate" : display.available ? "observed" : "none";
      button.setAttribute("role", "gridcell");
      var rateLabel = display.estimated ? "сглаженная оценка рестил-пуша " : "рестил-пуш ";
      button.setAttribute("aria-label", hand + ": " + (display.available ? rateLabel + percent(rate, 1) + ", выборка " + integer.format(cell[0]) : "нет данных"));
      button.title = display.available
        ? hand + " · " + (display.estimated ? "оценка пуша ≈ " : "пуш ") + percent(rate, 1) + " · N " + integer.format(cell[0])
        : hand + " · нет данных";
      button.innerHTML = "<b>" + hand + "</b><small>" + (!display.available ? "—" : (display.estimated ? "≈" : "") + percent(rate, 0)) + "</small>";
      button.addEventListener("click", function () {
        state.hand = hand;
        render();
      });
      button.addEventListener("keydown", function (event) {
        var row = Math.floor(index / 13);
        var col = index % 13;
        var next = index;
        if (event.key === "ArrowRight") next = row * 13 + (col + 1) % 13;
        else if (event.key === "ArrowLeft") next = row * 13 + (col + 12) % 13;
        else if (event.key === "ArrowDown") next = ((row + 1) % 13) * 13 + col;
        else if (event.key === "ArrowUp") next = ((row + 12) % 13) * 13 + col;
        else return;
        event.preventDefault();
        focusCell(rootNode, next);
      });
      rootNode.appendChild(button);
    });
  }

  function renderReadout() {
    var novice = cellFor("novice", state.hand) || [0, 0, 0, 0, 0];
    var league = cellFor(state.league, state.hand) || [0, 0, 0, 0, 0];
    var noviceDisplay = displayCellFor("novice", state.hand, novice);
    var leagueDisplay = displayCellFor(state.league, state.hand, league);
    var noviceRate = noviceDisplay.rate;
    var leagueRate = leagueDisplay.rate;
    var delta = noviceDisplay.available && leagueDisplay.available ? leagueRate - noviceRate : null;
    byId("rankHandReadout").innerHTML =
      '<div><span>Выбранная рука</span><strong>' + state.hand + '</strong><small>' + state.position + ' · ' + sizeLabels[state.size] + ' · ' + depthLabels[state.depth] + ' BB</small></div>' +
      '<div><span>Ранги 15–17</span><strong>' + (noviceDisplay.available ? (noviceDisplay.estimated ? "≈" : "") + percent(noviceRate, 1) : "—") + '</strong><small>' + (noviceDisplay.estimated ? "оценка · " : "") + 'N ' + integer.format(novice[0]) + '</small></div>' +
      '<div><span>' + cohortLabels[state.league] + '</span><strong>' + (leagueDisplay.available ? (leagueDisplay.estimated ? "≈" : "") + percent(leagueRate, 1) : "—") + '</strong><small>' + (leagueDisplay.estimated ? "оценка · " : "") + 'N ' + integer.format(league[0]) + '</small></div>' +
      '<div class="' + (delta > 0 ? 'is-up' : delta < 0 ? 'is-down' : 'is-flat') + '"><span>Разница</span><strong>' + (delta == null ? "—" : signed(delta)) + '</strong><small>' + (delta == null ? "нет сравнения" : "процентных пункта") + '</small></div>';
  }

  function summaryJamRate(cohort) {
    var summary = Data.summaries[cohort] || {};
    if (Number.isFinite(Number(summary.standardizedJamPct))) return Number(summary.standardizedJamPct);
    if (Number.isFinite(Number(summary.defaultJamPct))) return Number(summary.defaultJamPct);
    return jamRate(chartFor(cohort, "BTN", "2.0", "25-40"));
  }

  function renderGrowth() {
    var order = Data.meta.cohortOrder || ["novice", "league3", "league2", "league1"];
    var topRate = Math.max.apply(null, order.map(summaryJamRate).concat([1]));
    var rows = order.map(function (cohort) {
      var summary = Data.summaries[cohort] || {};
      var rate = summaryJamRate(cohort);
      return '<div class="rank-growth-item">' +
        '<span><strong>' + (summary.label || cohortLabels[cohort]) + '</strong><small>ABI ' + money(summary.abiUsd) + '</small></span>' +
        '<b>' + percent(rate, 1) + '<small>пуш</small></b>' +
        '<i><em style="width:' + Math.max(3, rate / topRate * 100).toFixed(1) + '%"></em></i>' +
      '</div>';
    }).join("");
    var correlation = Data.correlation || Data.correlations || {};
    var r = Number(correlation.abiVsStandardizedJamPearson != null ? correlation.abiVsStandardizedJamPearson : correlation.pearsonR);
    var association = Number.isFinite(r)
      ? 'По четырём когортам частота растёт вместе с уровнем: r = ' + r.toFixed(2).replace(".", ",")
      : "Сравнение одинаковых спотов";
    byId("rankGrowthStrip").innerHTML = rows + '<p><strong>' + association + '.</strong> BTN 2 BB · стек 25–40 BB, глубина выровнена. ABI дан для контекста; четыре агрегата не доказывают причинность.</p>';
  }

  function renderSource(noviceChart, leagueChart) {
    var meta = Data.meta || {};
    var start = String(meta.windowStartInclusive || "2026-01-01").slice(0, 10);
    var end = String(meta.windowEndExclusive || "2026-07-14").slice(0, 10);
    byId("rankEvidenceSource").innerHTML = '<strong>Как читать:</strong> цвет показывает частоту прямого рестил-пуша. Янтарный угол — малая выборка N 5–19; фиолетовый угол и знак ≈ — сглаженная оценка при N 1–4. К редкой ячейке добавлены 16 условных рук: сначала та же рука и спот в других когортах, затем более широкий сопоставимый срез. Тире означает N 0. Матрицы построены только по раздачам с известными картами. ' +
      'Текущий срез: BB против одного ' + state.position + ', опен ' + sizeLabels[state.size] + ', стек ' + depthLabels[state.depth] + ' BB; ' +
      'N ' + integer.format(totalFor(noviceChart, "opportunities")) + ' против N ' + integer.format(totalFor(leagueChart, "opportunities")) + '. ' +
      '<span>FF, ' + start + '—' + end + '; лига присвоена на момент раздачи.</span>';
  }

  function render() {
    var noviceChart = chartFor("novice");
    var leagueChart = chartFor(state.league);
    if (!noviceChart || !leagueChart) return;
    renderControls();
    renderSpotSummary();
    byId("rankLeagueTitle").textContent = cohortLabels[state.league];
    byId("rankNoviceStats").innerHTML = statsMarkup(noviceChart, null);
    byId("rankLeagueStats").innerHTML = statsMarkup(leagueChart, jamRate(leagueChart) - jamRate(noviceChart));
    byId("rankNoviceActionBar").innerHTML = actionBarMarkup(noviceChart);
    byId("rankLeagueActionBar").innerHTML = actionBarMarkup(leagueChart);
    renderMatrix(byId("rankNoviceMatrix"), "novice");
    renderMatrix(byId("rankLeagueMatrix"), state.league);
    renderReadout();
    renderSource(noviceChart, leagueChart);
  }

  renderGrowth();
  render();
  window.PokerRestealRankView = Object.freeze({ state: state, render: render });
})();
