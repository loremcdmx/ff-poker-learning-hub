(function () {
  "use strict";

  var fieldData = window.PokerRfiFieldActionData;
  if (!fieldData) throw new Error("PokerRfiFieldActionData is required");

  var stackGroups = [
    { key: "deep", label: "Глубокие", bands: ["70+", "30-70"] },
    { key: "short", label: "Короткие", bands: ["20-30", "15-20"] },
    { key: "pushfold", label: "Пуш-фолд", bands: ["12-15", "10-12", "8-10", "6-8", "<6"] }
  ];

  var stackBands = [
    { key: "70+", label: "70+", group: "deep", mode: "deep", note: "текущий чарт" },
    { key: "30-70", label: "30–70", group: "deep", mode: "deep", note: "текущий чарт" },
    { key: "20-30", label: "20–30", group: "short", mode: "empirical", note: "рейз / пуш" },
    { key: "15-20", label: "15–20", group: "short", mode: "empirical", note: "рейз / пуш" },
    { key: "12-15", label: "12–15", group: "pushfold", mode: "empirical", note: "рейз / пуш" },
    { key: "10-12", label: "10–12", group: "pushfold", mode: "empirical", note: "push/fold" },
    { key: "8-10", label: "8–10", group: "pushfold", mode: "empirical", note: "push/fold" },
    { key: "6-8", label: "6–8", group: "pushfold", mode: "empirical", note: "push/fold" },
    { key: "<6", label: "<6", group: "pushfold", mode: "empirical", note: "push/fold" }
  ];

  var bandByKey = Object.fromEntries(stackBands.map(function (item) { return [item.key, item]; }));
  var handIndex = Object.fromEntries(fieldData.handOrder.map(function (hand, index) { return [hand, index]; }));
  var decodedFieldCache = {};

  function band(stackKey) {
    return bandByKey[stackKey] || stackBands[0];
  }

  function recommendation(stackKey, position) {
    var byStack = fieldData.recommendations.charts[stackKey];
    return byStack ? byStack[position] || null : null;
  }

  function recommendationAction(stackKey, position, hand) {
    var chart = recommendation(stackKey, position);
    if (!chart) return "fold";
    var code = chart.mask[handIndex[hand]];
    return code === "r" ? "open" : code === "j" ? "shove" : code === "m" ? "mix" : "fold";
  }

  function decodeBase64(value) {
    var binary = window.atob(value);
    var bytes = new Uint8Array(binary.length);
    for (var index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }

  function decodeU16(value) {
    var bytes = decodeBase64(value);
    var output = new Uint16Array(bytes.length / 2);
    for (var index = 0; index < output.length; index += 1) output[index] = bytes[index * 2] | (bytes[index * 2 + 1] << 8);
    return output;
  }

  function decodeU8(value) {
    return value ? decodeBase64(value) : new Uint8Array(fieldData.handOrder.length);
  }

  function decodeU32(value) {
    var bytes = decodeBase64(value);
    var output = new Uint32Array(bytes.length / 4);
    for (var index = 0; index < output.length; index += 1) {
      output[index] = (
        bytes[index * 4] |
        (bytes[index * 4 + 1] << 8) |
        (bytes[index * 4 + 2] << 16) |
        (bytes[index * 4 + 3] << 24)
      ) >>> 0;
    }
    return output;
  }

  function fieldChart(cohortKey, stackKey, position) {
    var cacheKey = cohortKey + "|" + stackKey + "|" + position;
    if (decodedFieldCache[cacheKey]) return decodedFieldCache[cacheKey];
    var cohort = fieldData.cohorts[cohortKey] || fieldData.cohorts.l3top;
    var packed = cohort.charts[stackKey] && cohort.charts[stackKey][position];
    if (!packed) return null;
    var chart = Object.assign({}, packed, {
      cohort: cohort,
      sample: decodeU32(packed.n),
      raise: decodeU16(packed.r),
      shove: decodeU16(packed.j),
      limp: decodeU16(packed.l),
      players: packed.p ? decodeU16(packed.p) : new Uint16Array(fieldData.handOrder.length),
      months: decodeU8(packed.m)
    });
    decodedFieldCache[cacheKey] = chart;
    return chart;
  }

  window.PokerRfiStackData = Object.freeze({
    version: "rfi-reference-20260717-v1",
    stackGroups: Object.freeze(stackGroups),
    stackBands: Object.freeze(stackBands),
    cohortOrder: Object.freeze(fieldData.cohortOrder || ["l3top", "l3", "l2", "l1"]),
    cohorts: fieldData.cohorts,
    methodology: fieldData.methodology,
    handOrder: fieldData.handOrder,
    fieldPositions: Object.freeze(fieldData.positions || ["EP", "MP", "HJ", "CO", "BTN", "SB"]),
    band: band,
    recommendation: recommendation,
    recommendationAction: recommendationAction,
    fieldChart: fieldChart
  });
})();
