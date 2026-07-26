(function () {
  "use strict";

  var Data = window.PokerRestealRankData;
  var Confidence = window.FFObservedFrequencyConfidence;
  if (!Confidence) throw new Error("FFObservedFrequencyConfidence is required");

  function observedDisplayCell(cell) {
    var opportunities = Number(cell && cell[0] || 0);
    var jams = Number(cell && cell[4] || 0);
    var exactRate = Confidence.rate(jams, opportunities);
    return {
      available: exactRate !== null,
      rate: exactRate,
      opportunities: opportunities
    };
  }

  window.PokerRestealRankConfidence = Object.freeze({
    minimum: Confidence.MIN_EXACT_DENOMINATOR,
    displayCell: observedDisplayCell
  });

  function sameValues(actual, expected) {
    return Array.isArray(actual) && actual.length === expected.length && actual.every(function (value, index) {
      return value === expected[index];
    });
  }

  function validExecution(sourceRef, querySha256, executionMode) {
    if (executionMode === "sync") return sourceRef === "sync:" + querySha256;
    return executionMode === "async" && /^mcp_ch_job_[a-f0-9]+$/.test(String(sourceRef || ""));
  }

  function publishableDataError(data) {
    var meta = data && data.meta;
    if (!meta) return "missing payload metadata";
    if (!/^resteal-rank-cube-\d{8}-full-history-r15-r18-v\d+$/.test(String(data.version || ""))) return "not a full-history payload version";
    if (meta.windowStartInclusive !== "2023-09-01T00:00:00Z" || meta.windowEndExclusive !== "2026-07-22T00:00:00Z") return "wrong source window";
    if (!sameValues(meta.cohortOrder, ["novice", "league3", "league2", "league1"])) return "wrong cohort order";
    var expectedRanks = {
      novice: [15, 16, 17, 18],
      league3: [11, 12, 13, 14],
      league2: [6, 7, 8, 9, 10],
      league1: [1, 2, 3, 4, 5]
    };
    for (var cohort in expectedRanks) {
      if (!sameValues(meta.cohorts && meta.cohorts[cohort] && meta.cohorts[cohort].ranks, expectedRanks[cohort])) return "wrong rank cohorts";
    }
    if (Number(meta.sampleThresholds && meta.sampleThresholds.exactCellMinimum) !== Confidence.MIN_EXACT_DENOMINATOR) return "wrong exact denominator gate";
    if (!Array.isArray(meta.handOrder) || meta.handOrder.length !== 169 || new Set(meta.handOrder).size !== 169) return "incomplete hand order";
    if (!meta.actionContract || String(meta.actionContract.jam || "").indexOf("raise_and_blind_made_amount_bb - posted_blind_bb") === -1) return "wrong effective-shove action contract";
    var provenance = meta.provenance || {};
    var rankIntervals = provenance.rankIntervals || {};
    var handCube = provenance.handCube || {};
    if (!/^mcp_bq_(?:job_)?[a-f0-9]+$/.test(String(rankIntervals.queryJobId || ""))) return "missing rank bridge source ref";
    if (rankIntervals.sourceRows !== 19699 || rankIntervals.usableRows !== 19698 || rankIntervals.excludedZeroLength !== 1 || rankIntervals.users !== 3881) return "wrong rank bridge coverage";
    if (rankIntervals.sha256 !== "7510e40b42cad7bf6bce6dbca9c2ba0f5d157a8ff2df5b7f9f28ca37eafb1d9e") return "wrong rank bridge hash";
    var abi = provenance.abi || {};
    if (abi.queryJobId !== "mcp_bq_1aae14822e7542809baff5659212b349" || abi.formula !== "SUM(load_usd)/SUM(entries)" || abi.querySha256 !== "6b7bc7617193707d018961c25ea2f7710e590806e1cc168ecda5c7c4d867b809") return "wrong ABI provenance";
    if (handCube.classifier !== "effective-shove-v1" || handCube.mergeSchema !== "ff-resteal-rank-cube-merge-v1") return "wrong hand classifier";
    if (handCube.shardStrategy !== "immutable-user-id" && handCube.shardStrategy !== "contiguous-time") return "wrong hand-cube shard strategy";
    if (!/^[a-f0-9]{64}$/.test(String(handCube.templateSha256 || "")) || !/^[a-f0-9]{64}$/.test(String(handCube.sha256 || ""))) return "missing hand-cube hashes";
    var sourceRefs = handCube.queryJobIds;
    if (!Array.isArray(sourceRefs) || sourceRefs.length < 2 || new Set(sourceRefs).size !== sourceRefs.length) return "incomplete hand-cube provenance";
    var shards = handCube.shards;
    if (!Array.isArray(shards) || shards.length !== sourceRefs.length) return "missing hand-cube shards";
    for (var shardIndex = 0; shardIndex < shards.length; shardIndex += 1) {
      var shard = shards[shardIndex];
      var userShard = shard.userShard || {};
      if (shard.rankMin !== 1 || shard.rankMax !== 18) return "incomplete rank coverage";
      if (!/^[a-f0-9]{64}$/.test(String(shard.renderedSqlSha256 || "")) || !/^[a-f0-9]{64}$/.test(String(shard.exportSha256 || "")) || !/^[a-f0-9]{64}$/.test(String(userShard.userIdsSha256 || ""))) return "missing shard hashes";
      if (!validExecution(shard.queryJobId, shard.renderedSqlSha256, shard.executionMode) || sourceRefs.indexOf(shard.queryJobId) === -1) return "unbound shard source ref";
      if (!Number.isSafeInteger(shard.exportRows) || shard.exportRows <= 0 || !Number.isSafeInteger(shard.rankIntervals) || shard.rankIntervals <= 0) return "empty shard export";
      if (!Number.isSafeInteger(shard.rankUsers) || shard.rankUsers <= 0 || !Number.isSafeInteger(userShard.eligibleUsers) || userShard.eligibleUsers < shard.rankUsers) return "invalid shard users";
    }
    var orderedShards = shards.slice().sort(function (left, right) { return left.windowStartInclusive.localeCompare(right.windowStartInclusive); });
    if (handCube.shardStrategy === "contiguous-time") {
      if (orderedShards[0].windowStartInclusive !== meta.windowStartInclusive || orderedShards[orderedShards.length - 1].windowEndExclusive !== meta.windowEndExclusive) return "incomplete time-shard window";
      for (var timeIndex = 0; timeIndex < orderedShards.length; timeIndex += 1) {
        var timeShard = orderedShards[timeIndex];
        if (timeShard.userShard.index !== 0 || timeShard.userShard.count !== 1 || timeShard.rankUsers !== timeShard.userShard.eligibleUsers) return "partial time-shard users";
        if (timeIndex && orderedShards[timeIndex - 1].windowEndExclusive !== timeShard.windowStartInclusive) return "time-shard gap";
      }
    } else {
      var declaredShardCount = shards[0].userShard.count;
      var eligibleUsers = shards[0].userShard.eligibleUsers;
      if (declaredShardCount !== shards.length) return "incomplete user-shard set";
      if (new Set(shards.map(function (item) { return item.userShard.userIdsSha256; })).size !== shards.length) return "overlapping user-shard identity";
      if (new Set(shards.map(function (item) { return item.userShard.eligibleUsers; })).size !== 1) return "user population drift";
      if (shards.reduce(function (sum, item) { return sum + item.rankUsers; }, 0) !== eligibleUsers) return "user-shard reconciliation failure";
      if (shards.map(function (item) { return item.userShard.index; }).sort(function (left, right) { return left - right; }).join("|") !== Array.from({ length: declaredShardCount }, function (_, index) { return index; }).join("|")) return "incomplete user-shard indices";
      for (var userIndex = 0; userIndex < shards.length; userIndex += 1) {
        if (shards[userIndex].windowStartInclusive !== meta.windowStartInclusive || shards[userIndex].windowEndExclusive !== meta.windowEndExclusive) return "partial user-shard window";
      }
    }
    var expectedScenarios = ["2.0|25-30", "2.0|30-35", "2.0|35-40", "2.0|25-40", "2.5-3.0|25-40"];
    if (!sameValues(meta.positionOrder, ["CO", "BTN"])) return "wrong position presets";
    if (!sameValues(meta.scenarioOrder, expectedScenarios)) return "wrong scenario presets";
    if (!meta.scenarios || !sameValues(meta.sourceSizeOrder, ["2.0", "2.5", "3.0"])) return "missing source-size contract";
    var expectedPresets = meta.positionOrder.flatMap(function (position) {
      return expectedScenarios.map(function (scenario) { return position + "|" + scenario; });
    });
    if (!sameValues(meta.presetOrder, expectedPresets) || new Set(meta.presetOrder).size !== 10) return "incomplete preset catalog";
    var pooledScenario = meta.scenarios["2.5-3.0|25-40"];
    if (!pooledScenario || JSON.stringify(pooledScenario.sourceSlices) !== JSON.stringify([
      { size: "2.5", depth: "25-40" },
      { size: "3.0", depth: "25-40" }
    ])) return "wrong pooled-size contract";
    for (var keyIndex = 0; keyIndex < meta.presetOrder.length; keyIndex += 1) {
      var preset = meta.presetOrder[keyIndex];
      for (var cohortIndex = 0; cohortIndex < meta.cohortOrder.length; cohortIndex += 1) {
        var chart = data.charts && data.charts[meta.cohortOrder[cohortIndex]] && data.charts[meta.cohortOrder[cohortIndex]][preset];
        if (!chart || !Array.isArray(chart.cells) || chart.cells.length !== 169) return "incomplete comparison chart";
        for (var cellIndex = 0; cellIndex < chart.cells.length; cellIndex += 1) {
          var cell = chart.cells[cellIndex];
          if (!Array.isArray(cell) || cell.length !== 5 || cell.some(function (value) { return !Number.isSafeInteger(value) || value < 0; })) return "invalid exact cell";
          if (cell[0] < Confidence.MIN_EXACT_DENOMINATOR || cell[1] + cell[2] + cell[3] + cell[4] !== cell[0]) return "weak or unreconciled exact cell";
        }
      }
    }
    return "";
  }

  window.PokerRestealRankDataContract = Object.freeze({
    failure: publishableDataError,
    isPublishable: function (data) { return !publishableDataError(data); }
  });

  var root = document.getElementById("rankEvidenceSlide");
  if (!root) return;

  var dataError = publishableDataError(Data);
  if (dataError) {
    root.classList.add("is-data-unavailable");
    root.setAttribute("data-rank-data-state", "unavailable");
    root.innerHTML = '<div class="rank-publication-status" role="alert"><p class="eyebrow">Ошибка данных FF</p><h3>Пресеты не прошли обязательную сверку</h3><p>Этот релиз нельзя публиковать, пока источник, 169 рук и целые счётчики действий не сойдутся во всех четырёх группах.</p></div>';
    return;
  }

  var state = {
    position: "BTN",
    scenario: "2.0|25-40",
    league: "league3",
    hand: "QJo"
  };
  var cohortLabels = {
    novice: "Ранги 15–18",
    league3: "Лига 3",
    league2: "Лига 2",
    league1: "Первая лига"
  };
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
    if (value == null || value === "") return "—";
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

  function presetKey(position, scenario) {
    return (position || state.position) + "|" + (scenario || state.scenario);
  }

  function scenarioDefinition(scenario) {
    return Data.meta.scenarios[scenario || state.scenario];
  }

  function chartFor(cohort, position, scenario) {
    var resolvedPosition = position || state.position;
    var cohortCharts = Data.charts && Data.charts[cohort];
    return cohortCharts && cohortCharts[presetKey(resolvedPosition, scenario)] || null;
  }

  function totalFor(chart, key) {
    return Number(chart && chart.totals && chart.totals[key] || 0);
  }

  function jamRate(chart) {
    var opportunities = totalFor(chart, "opportunities");
    return Confidence.rate(totalFor(chart, "jams"), opportunities);
  }

  function cellFor(cohort, hand) {
    var chart = chartFor(cohort);
    var index = Data.meta.handOrder.indexOf(hand);
    return chart && index >= 0 ? chart.cells[index] : null;
  }

  function displayCellFor(cohort, hand, cell) {
    return observedDisplayCell(cell || cellFor(cohort, hand));
  }

  function actionRate(chart, key) {
    var opportunities = totalFor(chart, "opportunities");
    return Confidence.rate(totalFor(chart, key), opportunities);
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
        var direction = 0;
        if (event.key === "ArrowRight") direction = 1;
        else if (event.key === "ArrowLeft") direction = -1;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = items.length - 1;
        else return;
        if (direction) next = (next + direction + items.length) % items.length;
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
    var scenarios = Data.meta.scenarioOrder.map(function (key) {
      return { key: key, label: scenarioDefinition(key).label };
    });

    createTabs(byId("rankPositionTabs"), positions, state.position, "rankNoviceMatrix rankLeagueMatrix", function (key) {
      state.position = key;
      render();
    });
    createTabs(byId("rankScenarioTabs"), scenarios, state.scenario, "rankNoviceMatrix rankLeagueMatrix", function (key) {
      state.scenario = key;
      render();
    });
    createTabs(byId("rankLeagueTabs"), [
      { key: "league3", label: "Лига 3" },
      { key: "league2", label: "Лига 2" },
      { key: "league1", label: "Первая лига" }
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
    var spot = state.position + " · " + scenarioDefinition().label;
    var cards = order.map(function (cohort) {
      var chart = chartFor(cohort);
      var summary = Data.summaries[cohort] || {};
      var actionRows = actionItems.map(function (action) {
        return '<span class="' + action[2] + '"><i></i><small>' + action[1] + '</small><b>' + percent(actionRate(chart, action[0]), 1) + '</b></span>';
      }).join("");
      return '<article class="rank-spot-card' + (cohort === state.league ? ' is-selected' : '') + '">' +
        '<header><span><strong>' + (summary.label || cohortLabels[cohort]) + '</strong><small>' + cohortRankLabel(cohort) + ' · ABI ' + money(summary.abiUsd) + '</small></span><b>' + percent(jamRate(chart), 1) + '<small>пуш</small></b></header>' +
        '<div class="rank-spot-actions">' + actionRows + '</div>' +
      '</article>';
    }).join("");
    byId("rankSpotSummary").innerHTML = '<div class="rank-spot-summary-head"><strong>Текущий срез · все уровни</strong><span>' + spot + '</span></div><div class="rank-spot-cards">' + cards + '</div>';
  }

  function statsMarkup(chart, delta) {
    return '<small>Рестил-пуш</small><strong>' + percent(jamRate(chart), 1) + '</strong>' +
      (delta == null ? '' : '<em class="' + (delta > 0 ? 'is-up' : delta < 0 ? 'is-down' : 'is-flat') + '">' + signed(delta) + ' п.п.</em>');
  }

  function focusCell(rootNode, index) {
    var cells = rootNode.querySelectorAll("button");
    if (cells[index]) cells[index].focus();
  }

  function renderMatrix(rootNode, cohort) {
    var chart = chartFor(cohort);
    rootNode.innerHTML = "";
    Data.meta.handOrder.forEach(function (hand, index) {
      var cell = chart.cells[index];
      var display = observedDisplayCell(cell);
      var rate = display.rate;
      var button = document.createElement("button");
      button.type = "button";
      button.className = "rank-cell is-reliable" + (hand === state.hand ? " is-selected" : "");
      button.style.setProperty("--jam-color", gradientColor(rate));
      button.dataset.hand = hand;
      button.dataset.index = String(index);
      button.dataset.rateKind = "observed";
      button.setAttribute("role", "gridcell");
      button.setAttribute("aria-label", hand + ": рестил-пуш " + percent(rate, 1));
      button.title = hand + " · пуш " + percent(rate, 1);
      button.innerHTML = "<b>" + hand + "</b><small>" + percent(rate, 0) + "</small>";
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
    var novice = cellFor("novice", state.hand);
    var league = cellFor(state.league, state.hand);
    var noviceDisplay = displayCellFor("novice", state.hand, novice);
    var leagueDisplay = displayCellFor(state.league, state.hand, league);
    var noviceRate = noviceDisplay.rate;
    var leagueRate = leagueDisplay.rate;
    var delta = leagueRate - noviceRate;
    byId("rankHandReadout").innerHTML =
      '<div><span>Выбранная рука</span><strong>' + state.hand + '</strong><small>' + state.position + ' · ' + scenarioDefinition().label + '</small></div>' +
      '<div><span>Ранги 15–18</span><strong>' + percent(noviceRate, 1) + '</strong><small>N ' + noviceDisplay.opportunities + ' · наблюдаемая игра</small></div>' +
      '<div><span>' + cohortLabels[state.league] + '</span><strong>' + percent(leagueRate, 1) + '</strong><small>N ' + leagueDisplay.opportunities + ' · наблюдаемая игра</small></div>' +
      '<div class="' + (delta > 0 ? 'is-up' : delta < 0 ? 'is-down' : 'is-flat') + '"><span>Разница</span><strong>' + signed(delta) + '</strong><small>процентных пункта</small></div>';
  }

  function summaryJamRate(cohort) {
    var summary = Data.summaries[cohort] || {};
    if (Number.isFinite(Number(summary.standardizedJamPct))) return Number(summary.standardizedJamPct);
    if (Number.isFinite(Number(summary.defaultJamPct))) return Number(summary.defaultJamPct);
    return jamRate(chartFor(cohort, "BTN", "2.0|25-40"));
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
    var start = String(meta.windowStartInclusive || "2023-09-01").slice(0, 10);
    var end = String(meta.windowEndExclusive || "2026-07-22").slice(0, 10);
    var pooled = scenarioDefinition().sourceSlices.length > 1
      ? " Для пресета 2,5–3 BB целые счётчики 2,5x и 3x сначала складываются, и только потом рассчитываются частоты."
      : "";
    byId("rankEvidenceSource").innerHTML = '<strong>Как читать:</strong> цвет показывает точную наблюдаемую частоту прямого рестил-пуша. Каждый показанный пресет содержит 169 рук во всех четырёх группах, у каждой клетки N ≥ ' + Confidence.MIN_EXACT_DENOMINATOR + '. Матрицы построены только по раздачам с известными картами.' + pooled + ' ' +
      'Текущий срез: BB против одного ' + state.position + ', ' + scenarioDefinition().label + '; ' +
      '<span>FF, ' + start + '—' + end + '; лига присвоена на момент раздачи.</span>';
  }

  function render() {
    var noviceChart = chartFor("novice");
    var leagueChart = chartFor(state.league);
    if (!noviceChart || !leagueChart) throw new Error("Missing complete resteal preset: " + presetKey());
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
