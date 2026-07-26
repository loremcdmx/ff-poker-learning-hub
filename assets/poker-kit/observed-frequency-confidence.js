(function (root, factory) {
  "use strict";

  const api = factory();
  if (root) root.FFObservedFrequencyConfidence = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const MIN_EXACT_DENOMINATOR = 50;

  function integerCounter(value) {
    const numeric = Number(value);
    return Number.isSafeInteger(numeric) && numeric >= 0 ? numeric : null;
  }

  function canRenderExact(denominator) {
    const total = integerCounter(denominator);
    return total !== null && total >= MIN_EXACT_DENOMINATOR;
  }

  function rate(numerator, denominator) {
    const made = integerCounter(numerator);
    const total = integerCounter(denominator);
    if (made === null || total === null || made > total || !canRenderExact(total)) return null;
    return made / total * 100;
  }

  function availability(denominator) {
    return canRenderExact(denominator) ? "measured" : "unavailable";
  }

  return Object.freeze({
    version: 1,
    MIN_EXACT_DENOMINATOR,
    canRenderExact,
    rate,
    availability
  });
});
