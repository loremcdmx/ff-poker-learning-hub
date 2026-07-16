(function () {
  "use strict";

  var ranks = "AKQJT98765432";
  var rankIndex = {};
  ranks.split("").forEach(function (rank, index) { rankIndex[rank] = index; });

  var stackBands = [
    { key: "40+", label: "40+", note: "глубокий стек", mode: "raise" },
    { key: "15-20", label: "15–20", note: "рейз + поле", mode: "raise-field" },
    { key: "12-15", label: "12–15", note: "чарт 15 BB", mode: "pushfold", sourceStack: 15 },
    { key: "10-12", label: "10–12", note: "чарт 10 BB", mode: "pushfold", sourceStack: 10 },
    { key: "8-10", label: "8–10", note: "чарт 10 BB", mode: "pushfold", sourceStack: 10 },
    { key: "6-8", label: "6–8", note: "чарт 10 BB", mode: "pushfold", sourceStack: 10 },
    { key: "<6", label: "<6", note: "чарт 10 BB", mode: "pushfold", sourceStack: 10 }
  ];

  // FFStart source: "Префлоп моделька" / "Репуши", medium (0.2) column.
  // The sheet has no standalone HJ row; HJ intentionally inherits the
  // conservative MP row and the UI exposes that approximation.
  var pushRangeText = {
    15: {
      EP: "88+, AQ+",
      MP: "77+, AJs+, AQo+",
      HJ: "77+, AJs+, AQo+",
      CO: "66+, AJ+",
      BTN: "66+, ATs+, AJo+, KQs"
    },
    10: {
      EP: "77+, AJ+",
      MP: "77+, ATs+, AJo+",
      HJ: "77+, ATs+, AJo+",
      CO: "66+, ATs+, AJo+",
      BTN: "55+, AT+, KQs"
    }
  };

  // Observed first-in open-shove counts. These are population descriptions,
  // not solver targets. Rank pools were built in exact-overlap studies, so the
  // UI keeps the covered ranks visible instead of pretending each row is a
  // complete league estimate.
  var fieldCohorts = [
    {
      key: "r15-17",
      league: "Лига 3",
      ranks: "R15–17",
      label: "старт",
      counts: {
        "<6": [11505, 48743], "6-8": [8397, 42104], "8-10": [9674, 56629],
        "10-12": [10208, 70103], "12-15": [13891, 121573], "15-20": [12733, 223673]
      }
    },
    {
      key: "r11-13",
      league: "Лига 3",
      ranks: "R11–13",
      label: "переход",
      counts: {
        "<6": [4755, 17002], "6-8": [3611, 15771], "8-10": [4326, 21961],
        "10-12": [4665, 27379], "12-15": [6535, 50222], "15-20": [5921, 94245]
      }
    },
    {
      key: "r8-10",
      league: "Лига 2",
      ranks: "R8–10",
      label: "середина",
      counts: {
        "<6": [20987, 67469], "6-8": [17206, 66589], "8-10": [21878, 98337],
        "10-12": [25162, 130443], "12-15": [35963, 242213], "15-20": [31191, 480074]
      }
    },
    {
      key: "r5-7",
      league: "Лиги 1–2",
      ranks: "R5–7",
      label: "верх",
      counts: {
        "<6": [16358, 48726], "6-8": [13306, 48783], "8-10": [16636, 71338],
        "10-12": [19599, 94267], "12-15": [27871, 177149], "15-20": [24655, 351613]
      }
    }
  ];

  function parseHandToken(token) {
    var match = token.match(/^([AKQJT98765432])([AKQJT98765432])([so])?$/);
    return match ? { first: match[1], second: match[2], modifier: match[3] || "" } : null;
  }

  function addNonPair(set, first, second, modifier) {
    if (!first || !second || first === second) return;
    var high = rankIndex[first] < rankIndex[second] ? first : second;
    var low = rankIndex[first] < rankIndex[second] ? second : first;
    if (modifier === "s" || modifier === "o") {
      set.add(high + low + modifier);
      return;
    }
    set.add(high + low + "s");
    set.add(high + low + "o");
  }

  function addPairPlus(set, rank) {
    for (var index = 0; index <= rankIndex[rank]; index += 1) {
      set.add(ranks[index] + ranks[index]);
    }
  }

  function addNonPairPlus(set, first, second, modifier) {
    var start = Math.min(rankIndex[first] + 1, rankIndex[second]);
    var end = Math.max(rankIndex[first] + 1, rankIndex[second]);
    for (var index = start; index <= end; index += 1) addNonPair(set, first, ranks[index], modifier);
  }

  function addToken(set, rawToken) {
    var token = rawToken.trim().replace(/\s+/g, "");
    if (!token) return;
    var plus = token.endsWith("+");
    var clean = plus ? token.slice(0, -1) : token;
    var hand = parseHandToken(clean);
    if (!hand) return;
    if (hand.first === hand.second) {
      if (plus) addPairPlus(set, hand.first);
      else set.add(hand.first + hand.second);
      return;
    }
    if (plus) addNonPairPlus(set, hand.first, hand.second, hand.modifier);
    else addNonPair(set, hand.first, hand.second, hand.modifier);
  }

  var rangeCache = {};
  function rangeSet(rangeText) {
    if (!rangeCache[rangeText]) {
      var set = new Set();
      rangeText.split(",").forEach(function (token) { addToken(set, token); });
      rangeCache[rangeText] = set;
    }
    return rangeCache[rangeText];
  }

  function band(stackKey) {
    return stackBands.find(function (item) { return item.key === stackKey; }) || stackBands[0];
  }

  function isJam(stackKey, position, hand) {
    var selected = band(stackKey);
    if (selected.mode !== "pushfold") return false;
    var text = pushRangeText[selected.sourceStack][position] || "";
    return rangeSet(text).has(hand);
  }

  function rangeText(stackKey, position) {
    var selected = band(stackKey);
    if (selected.mode !== "pushfold") return "";
    return pushRangeText[selected.sourceStack][position] || "";
  }

  function fieldRows(stackKey) {
    if (stackKey === "40+") return [];
    return fieldCohorts.map(function (cohort) {
      var counts = cohort.counts[stackKey] || [0, 0];
      return {
        key: cohort.key,
        league: cohort.league,
        ranks: cohort.ranks,
        label: cohort.label,
        jams: counts[0],
        opportunities: counts[1],
        pct: counts[1] ? Math.round(counts[0] / counts[1] * 1000) / 10 : 0
      };
    });
  }

  window.PokerRfiStackData = Object.freeze({
    version: "rfi-stack-splits-20260716-v1",
    stackBands: Object.freeze(stackBands),
    fieldCohorts: Object.freeze(fieldCohorts),
    band: band,
    isJam: isJam,
    rangeText: rangeText,
    fieldRows: fieldRows,
    hjProxy: "MP"
  });
})();
