(function (root) {
  "use strict";

  const VERSION = "ff-path-practice-context-v1";

  function readParams() {
    const params = new URLSearchParams(root.location?.search || "");
    if (params.get("source") !== "player-path") return null;
    const packId = clean(params.get("pack"));
    const skillKey = clean(params.get("skill"));
    const tags = splitTags(params.get("tags"));
    if (!packId && !skillKey && !tags.length) return null;
    return { packId, skillKey, tags };
  }

  function splitTags(value) {
    return String(value || "")
      .split(",")
      .map(clean)
      .filter(Boolean)
      .slice(0, 4);
  }

  function clean(value) {
    return String(value || "")
      .replace(/[^a-zA-Z0-9_.,:-]+/g, " ")
      .trim()
      .slice(0, 90);
  }

  function labelForSkill(skillKey) {
    const labels = {
      open_first: "RFI",
      isolation: "Isolation",
      bb_defense: "BB defense",
      vs_3bet: "Versus 3-bet",
      short: "Short stack",
      flop: "Postflop aggressor",
      tournament: "Tournament navigator",
      range_call: "Ranges and calls",
      math: "Outs and price",
      icm_short: "ICM short stack",
      exam: "Mixed exam"
    };
    return labels[skillKey] || skillKey || "Practice";
  }

  function packFromGenerator(packId, skillKey) {
    const generator = root.FFThirdLeaguePackGenerator;
    if (!generator || typeof generator.generateStaticPacks !== "function") return null;
    const packs = generator.generateStaticPacks(skillKey ? { onlySkills: [skillKey] } : {});
    return packs.find((pack) => pack.id === packId) || packs.find((pack) => pack.skillKey === skillKey) || null;
  }

  function tagLabel(tag) {
    return String(tag || "").replace(/_/g, " ");
  }

  function uniqueValues(values) {
    return [...new Set((Array.isArray(values) ? values : [])
      .map((value) => clean(value))
      .filter(Boolean))];
  }

  function tagsForSpot(spot) {
    const tags = [];
    if (!spot || typeof spot !== "object") return tags;
    tags.push(spot.errorTag);
    if (Array.isArray(spot.errorTags)) tags.push(...spot.errorTags);
    else if (spot.errorTags && typeof spot.errorTags === "object") tags.push(...Object.values(spot.errorTags));
    if (Array.isArray(spot.tags)) tags.push(...spot.tags);
    if (Array.isArray(spot.targetTags)) tags.push(...spot.targetTags);
    return uniqueValues(tags);
  }

  function targetTagsForContext(context = readParams()) {
    if (!context) return [];
    if (context.tags.length) return context.tags;
    const pack = packFromGenerator(context.packId, context.skillKey);
    return uniqueValues(pack?.targetTags || []);
  }

  function defaultSpotKey(spot, index) {
    return spot?.id || spot?.spotId || spot?.sourceTaskId || `${spot?.sourceRowId || "spot"}-${index}`;
  }

  function resolveFallbackQueue(fallbackQueue) {
    const queue = typeof fallbackQueue === "function" ? fallbackQueue() : fallbackQueue;
    return Array.isArray(queue) ? queue : [];
  }

  function roundRobin(items, bucketKey) {
    if (!bucketKey) return items;
    const buckets = new Map();
    items.forEach((item) => {
      const key = typeof bucketKey === "function" ? bucketKey(item) : item?.[bucketKey];
      const safeKey = key || "mixed";
      if (!buckets.has(safeKey)) buckets.set(safeKey, []);
      buckets.get(safeKey).push(item);
    });
    const keys = [...buckets.keys()];
    const ordered = [];
    let cursor = 0;
    while ([...buckets.values()].some((bucket) => bucket.length)) {
      const bucket = buckets.get(keys[cursor % keys.length]) || [];
      if (bucket.length) ordered.push(bucket.shift());
      cursor += 1;
    }
    return ordered;
  }

  function buildPackQueue(spots, options = {}) {
    const fallbackQueue = resolveFallbackQueue(options.fallbackQueue);
    const context = options.context || readParams();
    const targetTags = uniqueValues(options.targetTags || targetTagsForContext(context));
    if (!context || !targetTags.length) return fallbackQueue;

    const source = Array.isArray(spots) ? spots : [];
    const limit = Math.max(0, Number(options.sessionLength || fallbackQueue.length || source.length || 0));
    if (!source.length || !limit) return fallbackQueue;

    const targetSet = new Set(targetTags);
    const prepareSpot = typeof options.prepareSpot === "function" ? options.prepareSpot : (spot) => spot;
    const matched = source.filter((spot) => tagsForSpot(spot).some((tag) => targetSet.has(tag)));
    if (!matched.length) return fallbackQueue;

    const keyForSpot = typeof options.keyForSpot === "function" ? options.keyForSpot : defaultSpotKey;
    const seen = new Set();
    const queue = [];
    const push = (spot, prepared = false) => {
      if (!spot || queue.length >= limit) return;
      const key = keyForSpot(spot, queue.length);
      if (seen.has(key)) return;
      seen.add(key);
      queue.push(prepared ? spot : prepareSpot(spot));
    };

    roundRobin(matched, options.bucketKey).forEach((spot) => push(spot));
    fallbackQueue.forEach((spot, index) => {
      const key = keyForSpot(spot, index);
      if (!seen.has(key)) {
        seen.add(key);
        if (queue.length < limit) queue.push(spot);
      }
    });
    source.forEach((spot) => push(spot));
    return queue.slice(0, limit);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function createContextCard(context) {
    const pack = packFromGenerator(context.packId, context.skillKey);
    const title = pack ? `${pack.module} · ${pack.step}` : labelForSkill(context.skillKey);
    const detail = pack?.material?.practiceTask || context.packId || "source-backed drill";
    const meta = [
      pack?.material?.estimatedMinutes ? `${pack.material.estimatedMinutes} min` : "",
      pack?.spotCount ? `${pack.spotCount} spots` : "",
      pack?.material?.trainerStopper ? `stopper: ${pack.material.trainerStopper}` : ""
    ].filter(Boolean);
    const tags = context.tags.length ? context.tags : (Array.isArray(pack?.targetTags) ? pack.targetTags.slice(0, 4) : []);
    const card = document.createElement("aside");
    card.className = "path-practice-context";
    card.setAttribute("aria-label", "Player Path practice context");
    card.innerHTML = `
      <span class="path-context-kicker">Player Path pack</span>
      <strong>${escapeHtml(title)}</strong>
      <small>${escapeHtml(detail)}</small>
      ${meta.length ? `<div class="path-context-meta">${meta.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>` : ""}
      ${tags.length ? `<div class="path-context-tags">${tags.map((tag) => `<span>${escapeHtml(tagLabel(tag))}</span>`).join("")}</div>` : ""}
    `;
    return card;
  }

  function mount() {
    const context = readParams();
    if (!context || !document.body || document.querySelector(".path-practice-context")) return null;
    const card = createContextCard(context);
    document.body.prepend(card);
    return card;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mount, { once: true });
  } else {
    mount();
  }

  root.FFPathPracticeContext = Object.freeze({
    VERSION,
    readParams,
    splitTags,
    labelForSkill,
    packFromGenerator,
    targetTagsForContext,
    tagsForSpot,
    buildPackQueue,
    tagLabel,
    mount
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
