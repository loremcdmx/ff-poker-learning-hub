(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.PokerBbCallEngine = Object.freeze(api);
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  "use strict";

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || 0));
  }

  function potModel(openSize) {
    var open = Number(openSize);
    var toCall = Math.max(0, open - 1);
    var potBeforeCall = open + 0.5 + 1 + 1;
    var finalPot = potBeforeCall + toCall;
    var potOdds = finalPot > 0 ? toCall / finalPot : 0;
    return {
      openSize: open,
      toCall: toCall,
      potBeforeCall: potBeforeCall,
      finalPot: finalPot,
      potOdds: potOdds,
      potOddsPct: potOdds * 100
    };
  }

  function equityRealization(rawEquityPct, realizedEquityPct) {
    var raw = Math.max(0, Number(rawEquityPct) || 0);
    var realized = clamp(realizedEquityPct, 0, raw || 0);
    var realizationPct = raw > 0 ? realized / raw * 100 : 0;
    return {
      rawEquityPct: raw,
      realizedEquityPct: realized,
      realizationPct: realizationPct,
      unrealizedSharePct: 100 - realizationPct,
      lostEquityPoints: raw - realized
    };
  }

  function defenseSummary(foldPct, threeBetPct) {
    var fold = clamp(foldPct, 0, 100);
    var continuePct = 100 - fold;
    var hasSplit = Number.isFinite(Number(threeBetPct));
    var threeBet = hasSplit ? clamp(threeBetPct, 0, continuePct) : null;
    return {
      foldPct: fold,
      continuePct: continuePct,
      threeBetPct: threeBet,
      coldCallPct: hasSplit ? continuePct - threeBet : null
    };
  }

  return {
    clamp: clamp,
    potModel: potModel,
    equityRealization: equityRealization,
    defenseSummary: defenseSummary
  };
});
