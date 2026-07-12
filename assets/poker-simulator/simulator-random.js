(function () {
  const root = typeof window !== "undefined" ? window : globalThis;
  const UINT32_RANGE = 0x100000000;

  function cryptoObject() {
    return root.crypto && typeof root.crypto.getRandomValues === "function"
      ? root.crypto
      : null;
  }

  function randomUint32() {
    const crypto = cryptoObject();
    if (crypto) {
      const buffer = new Uint32Array(1);
      crypto.getRandomValues(buffer);
      return buffer[0] >>> 0;
    }
    return Math.floor(Math.random() * UINT32_RANGE) >>> 0;
  }

  function randomInt(maxExclusive) {
    const max = Math.floor(Number(maxExclusive));
    if (!(max > 0)) return 0;
    if (!cryptoObject()) return Math.floor(Math.random() * max);
    const limit = Math.floor(UINT32_RANGE / max) * max;
    let value = randomUint32();
    while (value >= limit) value = randomUint32();
    return value % max;
  }

  function randomUnit() {
    return randomUint32() / UINT32_RANGE;
  }

  function randomChance(probability) {
    return randomUnit() < Math.max(0, Math.min(1, Number(probability || 0)));
  }

  function randomToken(length = 10) {
    const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
    return Array.from({ length }, () => alphabet[randomInt(alphabet.length)]).join("");
  }

  root.PokerSimulatorRandom = {
    UINT32_RANGE,
    randomUint32,
    randomInt,
    randomUnit,
    randomChance,
    randomToken
  };
})();
