(function (root, factory) {
  "use strict";

  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.PokerPreflopBenchmarkReadiness = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var TRAINER_KEYS = ["vs_raise_free", "vs_raise_sb", "sb_unopened"];
  var COHORT_KEYS = ["league1", "leagues2_3", "r15_18"];
  var ACTION_KEYS = ["fold", "call", "raise", "jam"];
  var ANALYSIS_WINDOW = {
    startInclusive: "2023-09-01T00:00:00Z",
    endExclusive: "2026-07-22T00:00:00Z",
  };
  var MIN_HAND_OPPORTUNITIES = 50;
  var REQUIRED_HANDS = 169;
  var NEAR_FLOOR_EXCEPTION = {
    cohort: "league1",
    spot: "SB|—|—|<6",
    minimumHandOpportunities: 48,
    maximumHandsBelowStandard: 4,
  };
  var PUBLICATION_POLICY = "complete_common_169_all_cohorts_contextual_catalog_no_disabled";
  var SELECTOR_MODE = "contextual_catalog_only_available_no_disabled";

  function unique(values) {
    return Array.from(new Set(values));
  }

  function spotKey(hero, opener, size, stack) {
    return [hero, opener, size, stack].join("|");
  }

  var FREE_POSITION_PAIRS = [
    ["MP", "EP"],
    ["HJ", "EP"], ["HJ", "MP"],
    ["CO", "EP"], ["CO", "MP"], ["CO", "HJ"],
    ["BTN", "EP"], ["BTN", "MP"], ["BTN", "HJ"], ["BTN", "CO"],
  ];
  var OPEN_SIZES = ["2x", "2.5x", "3x"];
  var FREE_STACKS = ["70+", "40-70", "40", "35", "30", "25", "20", "15-18", "12-15", "10-12", "8-10", "6-8", "<6"];
  var SB_STACKS = ["70+", "40-70", "25-40", "18-25", "15-18", "12-15", "10-12", "8-10", "6-8", "<6"];
  var SB_OPENERS = ["EP", "MP", "HJ", "CO", "BTN"];

  var REQUIRED_SPOT_MATRIX = {
    vs_raise_free: FREE_POSITION_PAIRS.flatMap(function (pair) {
      return OPEN_SIZES.flatMap(function (size) {
        return FREE_STACKS.map(function (stack) { return spotKey(pair[0], pair[1], size, stack); });
      });
    }),
    vs_raise_sb: SB_OPENERS.flatMap(function (opener) {
      return OPEN_SIZES.flatMap(function (size) {
        return SB_STACKS.map(function (stack) { return spotKey("SB", opener, size, stack); });
      });
    }),
    sb_unopened: SB_STACKS.map(function (stack) { return spotKey("SB", "—", "—", stack); }),
  };
  var REQUIRED_PUBLICATION_ANCHORS = {
    vs_raise_free: ["20", "25", "30", "35"].map(function (stack) { return spotKey("CO", "HJ", "2x", stack); }),
    vs_raise_sb: ["70+", "40-70", "25-40", "18-25", "15-18", "12-15"].map(function (stack) { return spotKey("SB", "BTN", "2x", stack); }),
    sb_unopened: ["70+", "40-70", "25-40", "18-25", "15-18", "12-15", "10-12", "8-10", "6-8", "<6"]
      .map(function (stack) { return spotKey("SB", "—", "—", stack); }),
  };

  function handClasses() {
    var ranks = "AKQJT98765432".split("");
    var hands = [];
    ranks.forEach(function (first, firstIndex) {
      hands.push(first + first);
      ranks.slice(firstIndex + 1).forEach(function (second) {
        hands.push(first + second + "s", first + second + "o");
      });
    });
    return hands;
  }

  var HAND_CLASSES = handClasses();
  var HAND_CLASS_SET = new Set(HAND_CLASSES);
  var HAND_CLASS_INDEX = Object.fromEntries(HAND_CLASSES.map(function (hand, index) { return [hand, index]; }));

  function sameJson(left, right) {
    return JSON.stringify(left) === JSON.stringify(right);
  }

  function exactKeys(value, expected) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    var actual = Object.keys(value).sort();
    return sameJson(actual, expected.slice().sort());
  }

  function isSha256(value) {
    return /^[a-f0-9]{64}$/.test(String(value || ""));
  }

  function utf8Bytes(value) {
    var bytes = [];
    var text = String(value);
    for (var index = 0; index < text.length; index += 1) {
      var code = text.charCodeAt(index);
      if (code >= 0xd800 && code <= 0xdbff && index + 1 < text.length) {
        var next = text.charCodeAt(index + 1);
        if (next >= 0xdc00 && next <= 0xdfff) {
          code = 0x10000 + ((code - 0xd800) << 10) + (next - 0xdc00);
          index += 1;
        }
      }
      if (code < 0x80) bytes.push(code);
      else if (code < 0x800) bytes.push(0xc0 | (code >>> 6), 0x80 | (code & 0x3f));
      else if (code < 0x10000) bytes.push(0xe0 | (code >>> 12), 0x80 | ((code >>> 6) & 0x3f), 0x80 | (code & 0x3f));
      else bytes.push(0xf0 | (code >>> 18), 0x80 | ((code >>> 12) & 0x3f), 0x80 | ((code >>> 6) & 0x3f), 0x80 | (code & 0x3f));
    }
    return bytes;
  }

  function rotateRight(value, bits) {
    return (value >>> bits) | (value << (32 - bits));
  }

  function sha256(value) {
    var constants = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
    ];
    var hash = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var bytes = utf8Bytes(value);
    var bitLength = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    var high = Math.floor(bitLength / 0x100000000);
    var low = bitLength >>> 0;
    for (var shift = 24; shift >= 0; shift -= 8) bytes.push((high >>> shift) & 0xff);
    for (var lowShift = 24; lowShift >= 0; lowShift -= 8) bytes.push((low >>> lowShift) & 0xff);
    var words = new Array(64);
    for (var offset = 0; offset < bytes.length; offset += 64) {
      for (var word = 0; word < 16; word += 1) {
        var byte = offset + word * 4;
        words[word] = ((bytes[byte] << 24) | (bytes[byte + 1] << 16) | (bytes[byte + 2] << 8) | bytes[byte + 3]) >>> 0;
      }
      for (var expanded = 16; expanded < 64; expanded += 1) {
        var prior15 = words[expanded - 15];
        var prior2 = words[expanded - 2];
        var sigma0 = rotateRight(prior15, 7) ^ rotateRight(prior15, 18) ^ (prior15 >>> 3);
        var sigma1 = rotateRight(prior2, 17) ^ rotateRight(prior2, 19) ^ (prior2 >>> 10);
        words[expanded] = (words[expanded - 16] + sigma0 + words[expanded - 7] + sigma1) >>> 0;
      }
      var a = hash[0], b = hash[1], c = hash[2], d = hash[3], e = hash[4], f = hash[5], g = hash[6], h = hash[7];
      for (var round = 0; round < 64; round += 1) {
        var sum1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
        var choice = (e & f) ^ (~e & g);
        var temp1 = (h + sum1 + choice + constants[round] + words[round]) >>> 0;
        var sum0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
        var majority = (a & b) ^ (a & c) ^ (b & c);
        var temp2 = (sum0 + majority) >>> 0;
        h = g; g = f; f = e; e = (d + temp1) >>> 0; d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
      }
      hash[0] = (hash[0] + a) >>> 0; hash[1] = (hash[1] + b) >>> 0;
      hash[2] = (hash[2] + c) >>> 0; hash[3] = (hash[3] + d) >>> 0;
      hash[4] = (hash[4] + e) >>> 0; hash[5] = (hash[5] + f) >>> 0;
      hash[6] = (hash[6] + g) >>> 0; hash[7] = (hash[7] + h) >>> 0;
    }
    return hash.map(function (word) { return word.toString(16).padStart(8, "0"); }).join("");
  }

  function payloadSource(payload) {
    var source = Object.assign({}, payload && payload.source);
    delete source.payloadSha256;
    return source;
  }

  function compactCount(value) {
    return Number.isSafeInteger(value) && value >= 0 ? value.toString(36) : JSON.stringify(value);
  }

  function fieldPayloadCanonical(field) {
    var parts = [
      "field",
      String(field && field.schemaVersion),
      JSON.stringify(payloadSource(field)),
    ];
    TRAINER_KEYS.forEach(function (trainerKey) {
      var trainer = field && field.trainers && field.trainers[trainerKey];
      var slices = trainer && Array.isArray(trainer.slices) ? trainer.slices.slice() : [];
      slices.sort(function (left, right) {
        return (sliceSpotKey(left) + "|" + left.cohort).localeCompare(sliceSpotKey(right) + "|" + right.cohort);
      });
      parts.push(trainerKey, String(slices.length));
      slices.forEach(function (slice) {
        parts.push(JSON.stringify([
          slice && slice.cohort,
          slice && slice.hero_position,
          slice && slice.opener_position,
          slice && slice.open_size,
          slice && slice.stack_bucket,
        ]));
        var handActionCounts = slice && slice.handActionCounts;
        parts.push(Array.isArray(handActionCounts)
          ? handActionCounts.map(compactCount).join(",")
          : JSON.stringify(handActionCounts));
      });
    });
    return parts.join("|");
  }

  function fieldPayloadSha256(field) {
    // Rates, denominators, and aggregate counts are validated as exact
    // derivations of these hand-level counts. Hashing the compact source of
    // truth keeps the complete publishable charts browser-verifiable without
    // hashing a many-times-larger JSON rendering of the same numbers.
    return sha256(fieldPayloadCanonical(field));
  }

  function evPayloadSha256(ev) {
    return sha256(JSON.stringify({
      kind: "ev",
      schemaVersion: ev && ev.schemaVersion,
      source: payloadSource(ev),
      data: ev && ev.spots,
    }));
  }

  function validIso(value) {
    return typeof value === "string" && Number.isFinite(Date.parse(value));
  }

  function add(reasons, condition, reason) {
    if (!condition) reasons.push(reason);
  }

  function validateAnalysisWindow(reasons, source, label) {
    add(reasons, sameJson(source && source.analysisWindow, ANALYSIS_WINDOW), label + ": analysisWindow must match the frozen half-open window");
    if (!source || !source.analysisWindow) return;
    add(reasons, validIso(source.analysisWindow.startInclusive) && validIso(source.analysisWindow.endExclusive)
      && Date.parse(source.analysisWindow.startInclusive) < Date.parse(source.analysisWindow.endExclusive), label + ": analysisWindow must be a valid non-empty half-open window");
  }

  function validateShards(reasons, provenance, label) {
    var shards = provenance && provenance.shards;
    add(reasons, provenance && provenance.partitionAxis === "time", label + ": provenance must use time shards");
    if (!Array.isArray(shards) || shards.length < 2) {
      reasons.push(label + ": provenance must include every disjoint source shard");
      return;
    }
    var shardCount = shards[0] && shards[0].shardCount;
    add(reasons, Number.isSafeInteger(shardCount) && shardCount === shards.length, label + ": provenance shard count is incomplete");
    var indexes = new Set();
    var executions = new Set();
    shards.forEach(function (shard, index) {
      var prefix = label + ": shard " + index;
      add(reasons, Number.isSafeInteger(shard.shardIndex) && shard.shardIndex >= 0 && shard.shardIndex < shardCount, prefix + " has an invalid index");
      add(reasons, shard.shardCount === shardCount, prefix + " mixes shard counts");
      add(reasons, shard.executionMode === "sync" || shard.executionMode === "async", prefix + " has no execution mode");
      if (shard.executionMode === "sync") {
        add(reasons, shard.queryJobId === "sync:" + shard.querySha256, prefix + " sync execution id differs from querySha256");
      } else if (shard.executionMode === "async") {
        add(reasons, /^mcp_ch_job_[a-f0-9]+$/.test(String(shard.queryJobId || "")), prefix + " has no original ClickHouse job id");
      }
      add(reasons, !executions.has(shard.queryJobId), prefix + " repeats an execution id");
      add(reasons, isSha256(shard.querySha256) && isSha256(shard.resultSha256), prefix + " has invalid hashes");
      add(reasons, Number.isSafeInteger(shard.rowCount) && shard.rowCount > 0, prefix + " has no complete row count");
      add(reasons, Number.isSafeInteger(shard.byteSize) && shard.byteSize > 0, prefix + " has no byte size");
      add(reasons, Number.isSafeInteger(shard.durationMs) && shard.durationMs > 0, prefix + " has no runtime");
      add(reasons, shard.truncated === false, prefix + " is truncated");
      add(reasons, validIso(shard.windowStartInclusive) && validIso(shard.windowEndExclusive)
        && Date.parse(shard.windowStartInclusive) < Date.parse(shard.windowEndExclusive), prefix + " has an invalid half-open window");
      indexes.add(shard.shardIndex);
      executions.add(shard.queryJobId);
    });
    add(reasons, indexes.size === shardCount && Array.from({ length: shardCount }, function (_, index) { return index; }).every(function (index) { return indexes.has(index); }), label + ": provenance does not cover every shard exactly once");
    var windows = shards.slice().sort(function (left, right) { return Date.parse(left.windowStartInclusive) - Date.parse(right.windowStartInclusive); });
    add(reasons, windows[0].windowStartInclusive === ANALYSIS_WINDOW.startInclusive
      && windows[windows.length - 1].windowEndExclusive === ANALYSIS_WINDOW.endExclusive, label + ": shard windows do not cover the analysis bounds");
    for (var index = 1; index < windows.length; index += 1) {
      add(reasons, windows[index - 1].windowEndExclusive === windows[index].windowStartInclusive, label + ": shard windows overlap or leave a gap");
    }
  }

  function validateProvenance(reasons, source, kind) {
    var label = kind === "field" ? "field" : "EV";
    var provenance = source && source.provenance;
    var expectedSchema = kind === "field"
      ? "ff-preflop-benchmark-action-cube-source-v1"
      : "ff-preflop-benchmark-spot-ev-source-v1";
    var expectedQuery = kind === "field" ? "tools/msp-preflop-action-cube.sql" : "tools/msp-sb-vs-btn-ev.sql";
    if (!provenance || typeof provenance !== "object") {
      reasons.push(label + ": exact provenance is missing");
      return;
    }
    add(reasons, provenance.schema === expectedSchema, label + ": provenance schema differs");
    add(reasons, sameJson(provenance.analysisWindow, source.analysisWindow), label + ": provenance window differs from payload window");
    add(reasons, provenance.rankBridge
      && (provenance.rankBridge.executionMode === "sync" || provenance.rankBridge.executionMode === "async"), label + ": rank bridge execution mode is invalid");
    add(reasons, Number.isSafeInteger(provenance.rankBridge && provenance.rankBridge.rows) && provenance.rankBridge.rows > 0, label + ": rank bridge row count is missing");
    add(reasons, Number.isSafeInteger(provenance.rankBridge && provenance.rankBridge.usableRows)
      && provenance.rankBridge.usableRows > 0 && provenance.rankBridge.usableRows <= provenance.rankBridge.rows, label + ": rank bridge usable row count is invalid");
    add(reasons, Number.isSafeInteger(provenance.rankBridge && provenance.rankBridge.byteSize)
      && provenance.rankBridge.byteSize > 0 && provenance.rankBridge.truncated === false, label + ": rank bridge export is not explicitly complete");
    add(reasons, isSha256(provenance.rankBridge && provenance.rankBridge.sha256), label + ": rank bridge hash is invalid");
    add(reasons, provenance.rankBridge && provenance.rankBridge.queryTemplate
      && provenance.rankBridge.queryTemplate.file === "tools/msp-preflop-rank-bridge.sql"
      && isSha256(provenance.rankBridge.queryTemplate.sha256), label + ": canonical full-rank bridge template is missing");
    if (provenance.rankBridge && provenance.rankBridge.executionMode === "sync") {
      add(reasons, provenance.rankBridge.queryTemplate
        && provenance.rankBridge.queryJobId === "sync:" + provenance.rankBridge.queryTemplate.sha256, label + ": sync rank bridge execution id differs from the canonical query hash");
    } else if (provenance.rankBridge && provenance.rankBridge.executionMode === "async") {
      add(reasons, /^mcp_bq_job_[a-f0-9]+$/.test(String(provenance.rankBridge.queryJobId || "")), label + ": rank bridge has no original BigQuery job id");
    }
    add(reasons, provenance.queryTemplate && provenance.queryTemplate.file === expectedQuery, label + ": query template path differs");
    add(reasons, isSha256(provenance.queryTemplate && provenance.queryTemplate.sha256), label + ": query template hash is invalid");
    add(reasons, provenance.merged && isSha256(provenance.merged.sha256), label + ": merged source hash is invalid");
    add(reasons, Number.isSafeInteger(provenance.merged && provenance.merged.rows) && provenance.merged.rows > 0, label + ": merged row count is missing");
    add(reasons, Number.isSafeInteger(provenance.merged && provenance.merged.opportunities) && provenance.merged.opportunities > 0, label + ": merged opportunity count is missing");
    if (Array.isArray(provenance.shards) && provenance.merged) {
      var sourceRows = provenance.shards.reduce(function (sum, shard) {
        return sum + (Number.isSafeInteger(shard && shard.rowCount) && shard.rowCount > 0 ? shard.rowCount : 0);
      }, 0);
      add(reasons, provenance.merged.rows <= sourceRows, label + ": merged row count exceeds the source shards");
    }
    validateShards(reasons, provenance, label);
    if (kind === "field") {
      add(reasons, sameJson(provenance.coverage, {
        minimumHandOpportunities: MIN_HAND_OPPORTUNITIES,
        nearFloorException: NEAR_FLOOR_EXCEPTION,
        requiredHands: REQUIRED_HANDS,
        comparedCohorts: COHORT_KEYS,
      }), "field: provenance coverage policy differs");
      add(reasons, sameJson(provenance.ignoredNonAdditiveColumns, ["players", "months"]), "field: provenance does not declare ignored non-additive columns");
    } else {
      add(reasons, sameJson(provenance.playerCardinality, {
        method: "exact_union_private_user_ids",
        privateIdentifiersDiscarded: true,
      }), "EV: exact cross-window player cardinality is missing");
    }
    add(reasons, !JSON.stringify(provenance).includes("private_player_ids"), label + ": private player identifiers leaked into provenance");
  }

  function validateSource(reasons, source, kind) {
    var label = kind === "field" ? "field" : "EV";
    add(reasons, source && source.availability === "ready", label + ": source is not explicitly ready");
    add(reasons, source && source.system === "MSP", label + ": source system must be MSP");
    add(reasons, source && source.rankSemantics === "rank_at_hand", label + ": rank semantics must be rank_at_hand");
    validateAnalysisWindow(reasons, source, label);
    validateProvenance(reasons, source, kind);
  }

  function integerRates(counts) {
    var values = ACTION_KEYS.map(function (action) { return counts[action]; });
    var total = values.reduce(function (sum, count) { return sum + count; }, 0);
    if (!total) return { fold: 0, call: 0, raise: 0, jam: 0 };
    var exact = values.map(function (count) { return count * 100 / total; });
    var rounded = exact.map(Math.floor);
    var remaining = 100 - rounded.reduce(function (sum, value) { return sum + value; }, 0);
    exact.map(function (value, index) { return { index: index, fraction: value - Math.floor(value) }; })
      .sort(function (left, right) { return right.fraction - left.fraction || left.index - right.index; })
      .forEach(function (entry) {
        if (remaining > 0) { rounded[entry.index] += 1; remaining -= 1; }
      });
    return { fold: rounded[0], call: rounded[1], raise: rounded[2], jam: rounded[3] };
  }

  function sliceSpotKey(slice) {
    return spotKey(slice.hero_position, slice.opener_position, slice.open_size, slice.stack_bucket);
  }

  function isCompleteFieldSlice(slice) {
    if (!slice || !Array.isArray(slice.handActionCounts) || slice.handActionCounts.length !== REQUIRED_HANDS * ACTION_KEYS.length) return false;
    var identity = sliceSpotKey(slice);
    var allowsNearFloor = slice.cohort === NEAR_FLOOR_EXCEPTION.cohort && identity === NEAR_FLOOR_EXCEPTION.spot;
    var handsBelowStandard = 0;
    for (var handIndex = 0; handIndex < REQUIRED_HANDS; handIndex += 1) {
      var total = 0;
      for (var actionIndex = 0; actionIndex < ACTION_KEYS.length; actionIndex += 1) {
        var count = slice.handActionCounts[handIndex * ACTION_KEYS.length + actionIndex];
        if (!Number.isSafeInteger(count) || count < 0) return false;
        total += count;
      }
      if (total < MIN_HAND_OPPORTUNITIES) {
        if (!allowsNearFloor || total < NEAR_FLOOR_EXCEPTION.minimumHandOpportunities) return false;
        handsBelowStandard += 1;
        if (handsBelowStandard > NEAR_FLOOR_EXCEPTION.maximumHandsBelowStandard) return false;
      }
    }
    return true;
  }

  var materializedSliceCache = typeof WeakMap === "function" ? new WeakMap() : null;

  function materializeFieldSlice(slice) {
    if (!slice) return null;
    if (slice.cells && slice.rates) return slice;
    if (materializedSliceCache && materializedSliceCache.has(slice)) return materializedSliceCache.get(slice);
    if (!isCompleteFieldSlice(slice)) return null;
    var cells = {};
    var cellOpportunities = {};
    var cellActionCounts = {};
    var actionCounts = { fold: 0, call: 0, raise: 0, jam: 0 };
    var minimumCellOpportunities = Infinity;
    HAND_CLASSES.forEach(function (hand, handIndex) {
      var counts = {};
      var opportunities = 0;
      ACTION_KEYS.forEach(function (action, actionIndex) {
        var count = slice.handActionCounts[handIndex * ACTION_KEYS.length + actionIndex];
        counts[action] = count;
        actionCounts[action] += count;
        opportunities += count;
      });
      cells[hand] = integerRates(counts);
      cellOpportunities[hand] = opportunities;
      cellActionCounts[hand] = counts;
      minimumCellOpportunities = Math.min(minimumCellOpportunities, opportunities);
    });
    var materialized = Object.assign({}, slice, {
      rates: integerRates(actionCounts),
      actionCounts: actionCounts,
      cells: cells,
      cellOpportunities: cellOpportunities,
      cellActionCounts: cellActionCounts,
      minimumCellOpportunities: minimumCellOpportunities,
    });
    if (materializedSliceCache) materializedSliceCache.set(slice, materialized);
    return materialized;
  }

  function fieldHandRates(slice, hand) {
    if (!slice || !Object.prototype.hasOwnProperty.call(HAND_CLASS_INDEX, hand)) return null;
    if (slice.cells && slice.cells[hand]) return slice.cells[hand];
    if (!Array.isArray(slice.handActionCounts) || slice.handActionCounts.length !== REQUIRED_HANDS * ACTION_KEYS.length) return null;
    var handIndex = HAND_CLASS_INDEX[hand];
    var counts = {};
    var valid = true;
    ACTION_KEYS.forEach(function (action, actionIndex) {
      var count = slice.handActionCounts[handIndex * ACTION_KEYS.length + actionIndex];
      if (!Number.isSafeInteger(count) || count < 0) valid = false;
      counts[action] = count;
    });
    return valid ? integerRates(counts) : null;
  }

  function validateSlice(reasons, trainerKey, slice, expectedSpotSet, seen) {
    var key = sliceSpotKey(slice);
    var identity = key + "|" + slice.cohort;
    var allowsNearFloor = slice.cohort === NEAR_FLOOR_EXCEPTION.cohort && key === NEAR_FLOOR_EXCEPTION.spot;
    var handsBelowStandard = 0;
    add(reasons, expectedSpotSet.has(key), trainerKey + ": unexpected slice " + key);
    add(reasons, COHORT_KEYS.includes(slice.cohort), trainerKey + "/" + key + ": unexpected cohort " + String(slice.cohort));
    add(reasons, !seen.has(identity), trainerKey + "/" + identity + ": duplicate slice");
    seen.add(identity);
    add(reasons, exactKeys(slice, ["cohort", "hero_position", "opener_position", "open_size", "stack_bucket", "handActionCounts"]), trainerKey + "/" + identity + ": slice must use the compact count-only schema");
    var counts = slice.handActionCounts;
    add(reasons, Array.isArray(counts) && counts.length === REQUIRED_HANDS * ACTION_KEYS.length, trainerKey + "/" + identity + ": chart is not 169/169 canonical hands");
    if (!Array.isArray(counts) || counts.length !== REQUIRED_HANDS * ACTION_KEYS.length) return { rows: 0, opportunities: 0 };
    var publishedOpportunities = 0;
    HAND_CLASSES.forEach(function (hand, handIndex) {
      var handTotal = 0;
      var valid = true;
      ACTION_KEYS.forEach(function (_, actionIndex) {
        var count = counts[handIndex * ACTION_KEYS.length + actionIndex];
        if (!Number.isSafeInteger(count) || count < 0) valid = false;
        else handTotal += count;
      });
      add(reasons, valid, trainerKey + "/" + identity + "/" + hand + ": action counts are invalid");
      if (valid && handTotal < MIN_HAND_OPPORTUNITIES) handsBelowStandard += 1;
      add(reasons, valid && (
        handTotal >= MIN_HAND_OPPORTUNITIES
        || (allowsNearFloor && handTotal >= NEAR_FLOOR_EXCEPTION.minimumHandOpportunities)
      ), trainerKey + "/" + identity + "/" + hand + ": observed denominator is below the publication floor");
      if (valid) publishedOpportunities += handTotal;
    });
    add(reasons, !allowsNearFloor || handsBelowStandard <= NEAR_FLOOR_EXCEPTION.maximumHandsBelowStandard,
      trainerKey + "/" + identity + ": too many hands are below the standard N=" + MIN_HAND_OPPORTUNITIES + " floor");
    return { rows: REQUIRED_HANDS, opportunities: publishedOpportunities };
  }

  function validateFieldData(field) {
    var reasons = [];
    var publishedRows = 0;
    var publishedOpportunities = 0;
    add(reasons, field && field.schemaVersion === 3, "field: schemaVersion must be 3");
    validateSource(reasons, field && field.source, "field");
    var source = field && field.source;
    add(reasons, source && sameJson(source.cohorts, { league1: [1, 5], leagues2_3: [6, 14], r15_18: [15, 18] }), "field: cohort definitions differ");
    add(reasons, source && source.handMinimum === MIN_HAND_OPPORTUNITIES, "field: hand minimum differs");
    add(reasons, source && sameJson(source.nearFloorException, NEAR_FLOOR_EXCEPTION), "field: near-floor exception differs");
    add(reasons, source && source.requiredHandsPerChart === REQUIRED_HANDS, "field: required hand count differs");
    if (!source || source.availability !== "ready") {
      return { ready: false, reasons: unique(reasons), analysisWindow: source && source.analysisWindow };
    }
    add(reasons, source && source.sliceMinimum === 100, "field: slice minimum differs");
    add(reasons, source && isSha256(source.payloadSha256) && source.payloadSha256 === fieldPayloadSha256(field), "field: payload digest differs");
    add(reasons, source && sameJson(source.selectorUniverse, REQUIRED_SPOT_MATRIX), "field: selector universe differs");
    add(reasons, source && sameJson(source.requiredSpotAnchors, REQUIRED_PUBLICATION_ANCHORS), "field: required publication anchors differ");
    add(reasons, source && source.publicationPolicy === PUBLICATION_POLICY, "field: publication policy differs");
    add(reasons, source && source.selectorMode === SELECTOR_MODE, "field: selector mode must expose only complete choices without disabled states");
    add(reasons, source && source.publishedSpotMatrix && exactKeys(source.publishedSpotMatrix, TRAINER_KEYS), "field: published spot matrix differs");
    add(reasons, field && exactKeys(field.trainers, TRAINER_KEYS), "field: trainer keys differ");
    if (!field || !field.trainers) return { ready: false, reasons: unique(reasons) };
    TRAINER_KEYS.forEach(function (trainerKey) {
      var trainer = field.trainers[trainerKey];
      var expectedSpotSet = new Set(REQUIRED_SPOT_MATRIX[trainerKey]);
      var slices = trainer && trainer.slices;
      add(reasons, Array.isArray(slices), trainerKey + ": slices are missing");
      if (!Array.isArray(slices)) return;
      add(reasons, slices.length > 0, trainerKey + ": no complete common charts are published");
      var seen = new Set();
      slices.forEach(function (slice) {
        var stats = validateSlice(reasons, trainerKey, slice || {}, expectedSpotSet, seen);
        publishedRows += stats && stats.rows || 0;
        publishedOpportunities += stats && stats.opportunities || 0;
      });
      var publishedSpots = unique(slices.map(sliceSpotKey)).sort();
      add(reasons, sameJson(source && source.publishedSpotMatrix && source.publishedSpotMatrix[trainerKey], publishedSpots), trainerKey + ": published spot matrix does not match its slices");
      publishedSpots.forEach(function (key) {
        COHORT_KEYS.forEach(function (cohort) {
          add(reasons, seen.has(key + "|" + cohort), trainerKey + "/" + key + ": published chart is missing cohort " + cohort);
        });
      });
      REQUIRED_PUBLICATION_ANCHORS[trainerKey].forEach(function (key) {
        COHORT_KEYS.forEach(function (cohort) {
          add(reasons, seen.has(key + "|" + cohort), trainerKey + "/" + key + ": required teaching anchor is missing cohort " + cohort);
        });
      });
    });
    add(reasons, source && source.publishedRows === publishedRows, "field: published row count differs");
    add(reasons, source && source.publishedOpportunities === publishedOpportunities, "field: published opportunity count differs");
    add(reasons, source && source.provenance && source.provenance.merged
      && source.provenance.merged.rows >= publishedRows, "field: provenance has fewer rows than the published hand cells");
    add(reasons, source && source.provenance && source.provenance.merged
      && source.provenance.merged.opportunities >= publishedOpportunities, "field: provenance has fewer opportunities than the published denominators");
    return { ready: reasons.length === 0, reasons: unique(reasons), analysisWindow: source && source.analysisWindow };
  }

  function validateEvData(ev) {
    var reasons = [];
    add(reasons, ev && ev.schemaVersion === 3, "EV: schemaVersion must be 3");
    validateSource(reasons, ev && ev.source, "ev");
    add(reasons, ev && ev.source && ev.source.metric === "all_in_adjusted_net_ev_bb_per_100_spot_opportunities", "EV: metric differs");
    add(reasons, ev && ev.source && ev.source.actionSource === "PokerPreflopBenchmarkData", "EV: action source differs");
    if (!ev || !ev.source || ev.source.availability !== "ready") {
      return { ready: false, reasons: unique(reasons), analysisWindow: ev && ev.source && ev.source.analysisWindow };
    }
    add(reasons, ev && ev.source && isSha256(ev.source.payloadSha256) && ev.source.payloadSha256 === evPayloadSha256(ev), "EV: payload digest differs");
    var requiredKey = "SB|BTN|2x|18-25";
    add(reasons, ev && exactKeys(ev.spots, [requiredKey]), "EV: exact required spot differs");
    var spot = ev && ev.spots && ev.spots[requiredKey];
    add(reasons, spot && exactKeys(spot, ["league1", "r15_18", "gapBb100"]), "EV: required cohorts or gap are missing");
    if (spot) {
      ["league1", "r15_18"].forEach(function (cohort) {
        var row = spot[cohort];
        add(reasons, row && Number.isSafeInteger(row.opportunities) && row.opportunities >= MIN_HAND_OPPORTUNITIES, "EV/" + cohort + ": observed denominator is below N=" + MIN_HAND_OPPORTUNITIES);
        add(reasons, row && Number.isSafeInteger(row.players) && row.players > 0 && row.players <= row.opportunities, "EV/" + cohort + ": exact player count is invalid");
        add(reasons, row && Number.isFinite(row.spotEvBb100), "EV/" + cohort + ": spot EV is invalid");
      });
      if (spot.league1 && spot.r15_18) {
        var expectedGap = Math.round((spot.league1.spotEvBb100 - spot.r15_18.spotEvBb100) * 100) / 100;
        add(reasons, spot.gapBb100 === expectedGap, "EV: gapBb100 is inconsistent");
        var publishedOpportunities = spot.league1.opportunities + spot.r15_18.opportunities;
        add(reasons, ev.source && ev.source.provenance && ev.source.provenance.merged
          && ev.source.provenance.merged.rows === 2, "EV: provenance row count does not match the two published cohorts");
        add(reasons, ev.source && ev.source.provenance && ev.source.provenance.merged
          && ev.source.provenance.merged.opportunities === publishedOpportunities, "EV: provenance opportunities do not match the published denominators");
      }
    }
    return { ready: reasons.length === 0, reasons: unique(reasons), analysisWindow: ev && ev.source && ev.source.analysisWindow };
  }

  function validateBenchmarkData(field, ev) {
    var fieldResult = validateFieldData(field);
    var evResult = validateEvData(ev);
    var reasons = fieldResult.reasons.concat(evResult.reasons);
    add(reasons, sameJson(fieldResult.analysisWindow, evResult.analysisWindow), "field/EV analysis windows differ");
    add(reasons, sameJson(
      field && field.source && field.source.provenance && field.source.provenance.rankBridge,
      ev && ev.source && ev.source.provenance && ev.source.provenance.rankBridge
    ), "field/EV rank bridges differ");
    var sourcesReady = field && field.source && field.source.availability === "ready"
      && ev && ev.source && ev.source.availability === "ready";
    var fieldEvSpot = field && field.trainers && field.trainers.vs_raise_sb && field.trainers.vs_raise_sb.slices;
    if (sourcesReady && Array.isArray(fieldEvSpot)) {
      COHORT_KEYS.forEach(function (cohort) {
        add(reasons, fieldEvSpot.some(function (slice) { return slice.cohort === cohort && sliceSpotKey(slice) === "SB|BTN|2x|18-25"; }), "field/EV exact spot is missing cohort " + cohort);
      });
    }
    return { ready: reasons.length === 0, reasons: unique(reasons), field: fieldResult, ev: evResult };
  }

  return {
    ACTION_KEYS: ACTION_KEYS.slice(),
    ANALYSIS_WINDOW: Object.assign({}, ANALYSIS_WINDOW),
    COHORT_KEYS: COHORT_KEYS.slice(),
    HAND_CLASSES: HAND_CLASSES.slice(),
    isCompleteFieldSlice: isCompleteFieldSlice,
    materializeFieldSlice: materializeFieldSlice,
    MIN_HAND_OPPORTUNITIES: MIN_HAND_OPPORTUNITIES,
    NEAR_FLOOR_EXCEPTION: Object.assign({}, NEAR_FLOOR_EXCEPTION),
    PUBLICATION_POLICY: PUBLICATION_POLICY,
    REQUIRED_HANDS: REQUIRED_HANDS,
    REQUIRED_PUBLICATION_ANCHORS: Object.fromEntries(TRAINER_KEYS.map(function (key) { return [key, REQUIRED_PUBLICATION_ANCHORS[key].slice()]; })),
    REQUIRED_SPOT_MATRIX: Object.fromEntries(TRAINER_KEYS.map(function (key) { return [key, REQUIRED_SPOT_MATRIX[key].slice()]; })),
    SELECTOR_MODE: SELECTOR_MODE,
    TRAINER_KEYS: TRAINER_KEYS.slice(),
    evPayloadSha256: evPayloadSha256,
    fieldPayloadSha256: fieldPayloadSha256,
    fieldHandRates: fieldHandRates,
    sha256: sha256,
    sliceSpotKey: sliceSpotKey,
    validateBenchmarkData: validateBenchmarkData,
    validateEvData: validateEvData,
    validateFieldData: validateFieldData,
  };
});
