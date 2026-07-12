// Pure bot-lab analytics: expected frequency bands and first-pass warnings.
//
// Extracted from simulator.js so the band/warning policy is a single source of truth that can be
// unit-tested headlessly (scripts/bot-lab-regression-smoke.mjs) instead of only running in-browser.
// This layer is intentionally pure: it takes emitted action events plus normalized difficulty/lineup,
// and never touches the DOM, the engine, or the live sim loop. simulator.js owns running the sample;
// aggregation, classification, rendering, and band/warning math stay here as the single source.
(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  function ratio(part, total) {
    return total ? Number(part || 0) / Number(total || 0) : 0;
  }

  function percent(value) {
    return `${Math.round(Number(value || 0) * 100)}%`;
  }

  function clampRate(value) {
    return Math.max(0, Math.min(1, Number(value || 0)));
  }

  function fallbackEscapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // opportunities/successes are keyed maps; fall back to the flat bucket counter for the broad keys
  // (open/defense/...) that are also stored directly on the bucket.
  function opportunity(bucket, key) {
    return Number(bucket?.opportunities?.[key] ?? bucket?.[key] ?? 0);
  }

  function success(bucket, key) {
    return Number(bucket?.successes?.[key] ?? bucket?.[key] ?? 0);
  }

  // Expected frequency bands by difficulty + lineup. Soft tables tolerate lower aggression, tough
  // tables a bit higher, and mixed tables get wider bands to absorb composition variance. The bands
  // are intentionally generous: this is a shape gate (catch gross drift), not a solver check.
  function expectedBands(options = {}) {
    const difficulty = String(options.difficulty || "standard");
    const lineup = String(options.lineup || "single");
    const easy = difficulty === "easy";
    const pro = difficulty === "pro";
    const aggressionShift = { single: 0, mixed: 0.01, soft: -0.06, tough: 0.05 }[lineup] || 0;
    const widen = lineup === "mixed" ? 0.04 : 0.02;
    const band = (key, label, min, low, high, shift = aggressionShift) => ({
      key,
      label,
      min,
      low: clampRate(low + shift - widen),
      high: clampRate(high + shift + widen)
    });
    const bands = [
      band("threeBet", "3bet", 80, easy ? 0.015 : 0.03, pro ? 0.18 : 0.14, aggressionShift * 0.45),
      band("cbetFlop", "flop c-bet", 50, easy ? 0.25 : 0.35, pro ? 0.9 : 0.86),
      // OOP donk is a rare, noisy spot — often only ~30-40 opportunities per run, so each single
      // donk is worth ~3% and a 5/34 sample reads as 15%. This is a generous shape gate (catch gross
      // drift), not a solver check, and ~15% OOP donk is acceptable play (coach call 2026-06-23): the
      // band clears 15% with small-sample margin and only flags gross over-donking (~20%+). Soft
      // lineups still tolerate more donk (exploit) than tough, preserving the lineup ordering.
      band("donkOop", "OOP donk", 30, 0, lineup === "soft" ? 0.2 : 0.18, 0),
      band("probeTurn", "turn probe", 30, easy ? 0.14 : 0.2, pro ? 0.86 : 0.8),
      band("probeRiver", "river probe", 24, easy ? 0.12 : 0.18, pro ? 0.82 : 0.76),
      // C8 lifted turn/river barrel SIZE (0.75), not frequency, so the barrel-rate bands are unchanged.
      band("barrelTurn", "turn barrel", 45, easy ? 0.18 : 0.28, pro ? 0.9 : 0.86),
      band("barrelRiver", "river barrel", 45, easy ? 0.14 : 0.24, pro ? 0.88 : 0.84)
    ];
    // Fish open-limp (C5) only exists on soft/mixed tables (and easy difficulty). It is an upper-bound
    // sanity band: a fish layer that limps essentially every hand is a regression. No lower floor — a
    // table with no fish simply produces too few limp opportunities to evaluate (min guard).
    if (easy || lineup === "soft" || lineup === "mixed") {
      bands.push(band("limp", "fish limp", 40, 0, easy ? 0.5 : 0.34, 0));
    }
    return bands;
  }

  // First-pass shape warnings (max 5). Pure function of the aggregated `lab` + normalized settings.
  function warnings(lab, options = {}) {
    const out = [];
    const counts = (lab && lab.counts) || {};
    const byPosition = (lab && lab.byPosition) || {};
    const foldRate = counts.actions ? counts.fold / counts.actions : 0;
    if (foldRate > 0.82) out.push(`overall overfold ${Math.round(foldRate * 100)}%`);
    expectedBands(options).forEach((b) => {
      const opportunities = opportunity(counts, b.key);
      if (opportunities < b.min) return;
      const rate = ratio(success(counts, b.key), opportunities);
      if (rate < b.low) out.push(`${b.label} low ${percent(rate)} (${success(counts, b.key)}/${opportunities})`);
      if (rate > b.high) out.push(`${b.label} high ${percent(rate)} (${success(counts, b.key)}/${opportunities})`);
    });
    Object.entries(byPosition).forEach(([position, item]) => {
      const actions = Number(item.actions || 0);
      if (!actions) return;
      const posFoldRate = Number(item.fold || 0) / actions;
      const posOpenOpportunities = opportunity(item, "open");
      const posOpenRate = posOpenOpportunities ? success(item, "open") / posOpenOpportunities : 0;
      if (["CO", "BTN"].includes(position) && posOpenOpportunities >= 20 && posOpenRate < 0.35) {
        out.push(`${position} low open ${Math.round(posOpenRate * 100)}%`);
      }
      if (posFoldRate > 0.9 && actions >= 30) {
        out.push(`${position} overfold ${Math.round(posFoldRate * 100)}%`);
      }
    });
    return out.slice(0, 5);
  }

  function createBucket() {
    return {
      actions: 0,
      opportunities: {},
      successes: {},
      open: 0,
      defense: 0,
      threeBet: 0,
      fourBet: 0,
      cbet: 0,
      donk: 0,
      probe: 0,
      barrel: 0,
      limp: 0,
      bet: 0,
      raise: 0,
      call: 0,
      fold: 0,
      check: 0
    };
  }

  function createAccumulator() {
    return {
      counts: createBucket(),
      byPosition: {},
      byProfile: {},
      byStreet: {},
      bySpot: {}
    };
  }

  function opponentLabel(seat) {
    return `${seat?.name || "Opponent"} ${seat?.position ? `(${seat.position})` : ""}`.trim();
  }

  function recordProfiles(profiles, seats) {
    const target = profiles && typeof profiles === "object" ? profiles : {};
    (seats || []).filter((seat) => !seat?.isHero).forEach((seat) => {
      const profile = opponentLabel(seat);
      target[profile] = (target[profile] || 0) + 1;
    });
    return target;
  }

  function recordTimeline(lab, table, afterSeq = 0) {
    (table?.actionTimeline || [])
      .filter((event) => event?.phase === "action" && Number(event.seq || 0) > Number(afterSeq || 0))
      .forEach((event) => {
        const seat = (table?.seats || []).find((item) => Number(item?.id) === Number(event.seatId));
        if (!seat || seat.isHero) return;
        recordEvent(lab, event, seat?.position || "NA", opponentLabel(seat));
      });
    return lab;
  }

  function recordEvent(lab, event, position, profile = "unknown") {
    if (!lab) return null;
    const classification = classifyEvent(event);
    incrementBucket(lab.counts || (lab.counts = createBucket()), classification);
    incrementBucket(lab.byPosition[position] || (lab.byPosition[position] = createBucket()), classification);
    incrementBucket(lab.byProfile[profile] || (lab.byProfile[profile] = createBucket()), classification);
    incrementBucket(lab.byStreet[event?.street || "unknown"] || (lab.byStreet[event?.street || "unknown"] = createBucket()), classification);
    classification.spots.forEach((spot) => {
      lab.bySpot[spot] = (lab.bySpot[spot] || 0) + 1;
    });
    return classification;
  }

  function incrementBucket(bucket, classification) {
    if (!bucket || !classification) return bucket;
    bucket.actions += 1;
    bucket[classification.action] = (bucket[classification.action] || 0) + 1;
    classification.spots.forEach((spot) => {
      bucket.opportunities[spot] = (bucket.opportunities[spot] || 0) + 1;
      if (spotSucceeded(spot, classification.action)) {
        bucket.successes[spot] = (bucket.successes[spot] || 0) + 1;
      }
    });
    return bucket;
  }

  function classifyEvent(event) {
    const label = String(event?.label || "").toLowerCase();
    const reason = String(event?.botReason || "").toLowerCase();
    const labSpot = String(event?.labSpot || "").trim();
    const tone = String(event?.tone || "").trim();
    let action = classifyAction(label, "") || classifyAction(reason, "fold");
    // An open-limp wears a real-client "Call X" bubble; the limp intent lives
    // only in botReason. Without this, limps count as missed opens (C5).
    if (action === "call" && classifyAction(reason, "") === "limp") action = "limp";
    const isPreflopOpen = labSpot === "open" && tone === "aggressive";
    if (isPreflopOpen && action === "raise") action = "open";
    let spot = labSpot || action;
    const eventSpots = Array.isArray(event?.labSpots)
      ? event.labSpots.map((item) => String(item || "").trim()).filter(Boolean)
      : [];
    // A preflop re-raise made while facing a 3-bet is a 4-bet+. The engine tags
    // every non-open re-raise with labSpots ['defense','threeBet'] regardless of
    // depth, but records the depth in botReason ("… 4bet chart …", emitted only
    // when facingThreeBet — see engine-preflop-policy.js). Promote threeBet→fourBet
    // so the bot-lab 4B cell populates instead of collapsing every 4-bet into the
    // 3-bet bucket (fourBet is already a tracked spot in isTrackedSpot/spotSucceeded).
    const isFourBet = event?.street === "preflop" && action === "raise" && reason.includes("4bet");
    if (isFourBet) {
      for (let i = 0; i < eventSpots.length; i += 1) {
        if (eventSpots[i] === "threeBet") eventSpots[i] = "fourBet";
      }
    }
    if (event?.street === "preflop") {
      if (labSpot === "limp" || action === "limp") {
        spot = "limp";
      } else if (isPreflopOpen || action === "open") {
        spot = "open";
      } else if (action === "raise") {
        spot = isFourBet ? "fourBet" : "threeBet";
      } else if ((action === "call" || action === "fold") && heroContributed(event) > 1) {
        spot = "defense";
      }
    } else if (action === "bet") {
      if (reason.includes("donk")) spot = "donk";
      else if (reason.includes("probe")) spot = "probe";
      else if (reason.includes("c-bet")) spot = "cbet";
      else if (event?.street === "turn" || event?.street === "river") spot = "barrel";
      else spot = labSpot || "bet";
    }
    const spots = detailedSpots(uniqueSpots(eventSpots.length ? eventSpots : [spot]), event);
    return { action, spot, spots };
  }

  function classifyAction(label, fallback = "fold") {
    const value = String(label || "").toLowerCase();
    if (value.includes("limp")) return "limp";
    if (value.includes("open")) return "open";
    if (value.includes("raise") || value.includes("3bet") || value.includes("4bet") || value.includes("rejam") || value.includes("all-in") || value.includes("jam")) return "raise";
    if (value.includes("bet")) return "bet";
    if (value.includes("call") || value.includes("complete")) return "call";
    if (value.includes("check")) return "check";
    if (value.includes("fold")) return "fold";
    return fallback;
  }

  function detailedSpots(spots, event) {
    const street = typeof event === "string" ? event : event?.street;
    const next = [...spots];
    if (spots.includes("cbet") && street === "flop") next.push("cbetFlop");
    if (spots.includes("donk")) next.push("donkOop");
    if (spots.includes("probe") && street === "turn") next.push("probeTurn");
    if (spots.includes("probe") && street === "river") next.push("probeRiver");
    if (spots.includes("barrel") && street === "turn") next.push("barrelTurn");
    if (spots.includes("barrel") && street === "river") next.push("barrelRiver");
    return uniqueSpots(next);
  }

  function uniqueSpots(spots) {
    const seen = new Set();
    return (spots || [])
      .filter((spot) => isTrackedSpot(spot))
      .filter((spot) => {
        if (seen.has(spot)) return false;
        seen.add(spot);
        return true;
      });
  }

  function isTrackedSpot(spot) {
    return ["open", "defense", "threeBet", "fourBet", "cbet", "donk", "probe", "barrel", "limp", "cbetFlop", "donkOop", "probeTurn", "probeRiver", "barrelTurn", "barrelRiver"].includes(spot);
  }

  function spotSucceeded(spot, action) {
    if (spot === "open") return action === "open" || action === "limp";
    if (spot === "limp") return action === "limp";
    if (spot === "defense") return action === "call" || action === "raise";
    if (spot === "threeBet") return action === "raise";
    if (spot === "fourBet") return action === "call" || action === "raise";
    if (["cbet", "donk", "probe", "barrel", "cbetFlop", "donkOop", "probeTurn", "probeRiver", "barrelTurn", "barrelRiver"].includes(spot)) return action === "bet";
    return false;
  }

  function heroContributed(event) {
    const heroSeat = event?.state?.seats?.find((seat) => seat.isHero);
    return Number(heroSeat?.contribution || 0);
  }

  function spotLabel(key) {
    const labels = {
      open: "Open",
      defense: "Defense",
      threeBet: "3bet",
      fourBet: "4bet",
      cbet: "C-bet",
      donk: "Donk",
      probe: "Probe",
      barrel: "Barrel",
      limp: "Limp",
      cbetFlop: "Flop c-bet",
      donkOop: "OOP donk",
      probeTurn: "Turn probe",
      probeRiver: "River probe",
      barrelTurn: "Turn barrel",
      barrelRiver: "River barrel"
    };
    return labels[key] || key;
  }

  function exactSpotKeys() {
    return ["cbetFlop", "donkOop", "probeTurn", "probeRiver", "barrelTurn", "barrelRiver"];
  }

  function positionSort(position) {
    const index = ["UTG", "HJ", "CO", "BTN", "SB", "BB", "NA"].indexOf(position);
    return index >= 0 ? index : 99;
  }

  function streetSort(street) {
    const index = ["preflop", "flop", "turn", "river", "showdown", "unknown"].indexOf(street);
    return index >= 0 ? index : 99;
  }

  function frequencyText(bucket, key) {
    const opportunities = opportunity(bucket, key);
    const successes = success(bucket, key);
    if (!opportunities) return "0/0";
    return `${successes}/${opportunities} · ${percent(ratio(successes, opportunities))}`;
  }

  function compactFrequency(bucket, key) {
    const opportunities = opportunity(bucket, key);
    if (!opportunities) return "n/a";
    return percent(ratio(success(bucket, key), opportunities));
  }

  function renderOutputHtml(botLab, options = {}) {
    const escapeHtml = typeof options.escapeHtml === "function" ? options.escapeHtml : fallbackEscapeHtml;
    if (!botLab) return escapeHtml("Bot lab еще не запускался.");
    const { sampleSize, baseSampleSize, targetedProbeSize, counts = {}, profiles = {}, byPosition = {}, warnings = [], createdAt = "" } = botLab;
    const profileText = Object.entries(profiles)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([label, count]) => `${label}: ${count}`)
      .join(" · ");
    const positionText = Object.entries(byPosition)
      .sort((a, b) => positionSort(a[0]) - positionSort(b[0]))
      .map(([position, item]) => `${position}: O${compactFrequency(item, "open")}/D${compactFrequency(item, "defense")}/3B${compactFrequency(item, "threeBet")}/4B${compactFrequency(item, "fourBet")}/CB${compactFrequency(item, "cbet")}/F${item.fold || 0}`)
      .join(" · ");
    const spotText = ["open", "defense", "threeBet", "fourBet", "cbet", "donk", "probe", "barrel", "limp"]
      .map((key) => `${spotLabel(key)} ${frequencyText(counts, key)}`)
      .join(" · ");
    return `
      <strong>${Number(sampleSize || 0)} spots · ${escapeHtml(createdAt)}</strong><br>
      ${baseSampleSize ? `Base ${Number(baseSampleSize || 0)} · Target probes ${Number(targetedProbeSize || 0)}<br>` : ""}
      Actions: ${Number(counts.actions || 0)}. Open ${Number(counts.open || 0)}, Raise ${Number(counts.raise || 0)}, Bet ${Number(counts.bet || 0)}, Call ${Number(counts.call || 0)}, Fold ${Number(counts.fold || 0)}, Check ${Number(counts.check || 0)}, Limp ${Number(counts.limp || 0)}.<br>
      ${escapeHtml(spotText)}<br>
      ${escapeHtml(positionText)}<br>
      ${warnings.length ? `Warnings: ${escapeHtml(warnings.join(" · "))}<br>` : ""}
      ${escapeHtml(profileText)}
    `;
  }

  function renderAnalytics(botLab, options = {}) {
    const escapeHtml = typeof options.escapeHtml === "function" ? options.escapeHtml : fallbackEscapeHtml;
    const streetLabel = typeof options.streetLabel === "function" ? options.streetLabel : (street) => String(street || "");
    const bandSettings = options.bandSettings || {};
    if (!botLab) {
      return '<div class="analytics-list">Bot lab еще не запускался. Это главный быстрый тест того, насколько боты похожи на реальный стол.</div>';
    }
    const counts = botLab.counts || {};
    const actions = Number(counts.actions || 0);
    const actionRows = ["open", "raise", "bet", "call", "fold", "check", "limp"].map((key) => `
      <div class="analytics-row">
        <b>${escapeHtml(key)}</b>
        <span>${Number(counts[key] || 0)} · ${percent(ratio(counts[key] || 0, actions))}</span>
      </div>
    `).join("");
    const spotRows = ["open", "defense", "threeBet", "fourBet", "cbet", "donk", "probe", "barrel", "limp"].map((key) => `
      <div class="analytics-row">
        <b>${escapeHtml(spotLabel(key))}</b>
        <span>${escapeHtml(frequencyText(counts, key))}</span>
      </div>
    `).join("");
    const exactRows = exactSpotKeys().map((key) => `
      <div class="analytics-row">
        <b>${escapeHtml(spotLabel(key))}</b>
        <span>${escapeHtml(frequencyText(counts, key))}</span>
      </div>
    `).join("");
    const positionRows = Object.entries(botLab.byPosition || {})
      .sort((a, b) => positionSort(a[0]) - positionSort(b[0]))
      .slice(0, 9)
      .map(([position, item]) => {
        const total = Number(item.actions || 0);
        return `
          <div class="analytics-row">
            <b>${escapeHtml(position)}</b>
            <span>O ${escapeHtml(compactFrequency(item, "open"))} · D ${escapeHtml(compactFrequency(item, "defense"))} · 3B ${escapeHtml(compactFrequency(item, "threeBet"))} · 4B ${escapeHtml(compactFrequency(item, "fourBet"))} · CB ${escapeHtml(compactFrequency(item, "cbet"))} · LP ${escapeHtml(compactFrequency(item, "limp"))} · F ${percent(ratio(item.fold || 0, total))}</span>
          </div>
        `;
      }).join("");
    const profileRows = Object.entries(botLab.byProfile || {})
      .sort((a, b) => Number(b[1]?.actions || 0) - Number(a[1]?.actions || 0))
      .slice(0, 6)
      .map(([profile, item]) => `
        <div class="analytics-row">
          <b>${escapeHtml(profile)}</b>
          <span>3B ${escapeHtml(compactFrequency(item, "threeBet"))} · 4B ${escapeHtml(compactFrequency(item, "fourBet"))} · CB ${escapeHtml(compactFrequency(item, "cbet"))} · DK ${escapeHtml(compactFrequency(item, "donk"))} · PR ${escapeHtml(compactFrequency(item, "probe"))} · BR ${escapeHtml(compactFrequency(item, "barrel"))} · LP ${escapeHtml(compactFrequency(item, "limp"))}</span>
        </div>
      `).join("");
    const streetRows = Object.entries(botLab.byStreet || {})
      .sort((a, b) => streetSort(a[0]) - streetSort(b[0]))
      .map(([street, item]) => {
        const total = Number(item.actions || 0);
        return `
          <div class="analytics-row">
            <b>${escapeHtml(streetLabel(street))}</b>
            <span>Bet ${percent(ratio(item.bet || 0, total))} · CB ${escapeHtml(compactFrequency(item, "cbet"))} · DK ${escapeHtml(compactFrequency(item, "donk"))} · PR ${escapeHtml(compactFrequency(item, "probe"))} · BR ${escapeHtml(compactFrequency(item, "barrel"))} · LP ${escapeHtml(compactFrequency(item, "limp"))}</span>
          </div>
        `;
      }).join("");
    const bandRows = expectedBands(bandSettings).map((band) => `
      <div class="analytics-row">
        <b>${escapeHtml(band.label)}</b>
        <span>${percent(band.low)}-${percent(band.high)} · min ${band.min}</span>
      </div>
    `).join("");
    return `
      <div class="analytics-subgrid">
        <div class="analytics-subpanel">
          <h4>Actions</h4>
          <div class="analytics-table">${actionRows}</div>
        </div>
        <div class="analytics-subpanel">
          <h4>Frequencies</h4>
          <div class="analytics-table">${spotRows}</div>
        </div>
        <div class="analytics-subpanel">
          <h4>Exact Spots</h4>
          <div class="analytics-table">${exactRows}</div>
        </div>
        <div class="analytics-subpanel">
          <h4>Positions</h4>
          <div class="analytics-table">${positionRows || '<div class="analytics-row"><b>Нет позиций</b><span></span></div>'}</div>
        </div>
        <div class="analytics-subpanel">
          <h4>Opponents</h4>
          <div class="analytics-table">${profileRows || '<div class="analytics-row"><b>Нет профилей</b><span></span></div>'}</div>
        </div>
        <div class="analytics-subpanel">
          <h4>Streets</h4>
          <div class="analytics-table">${streetRows || '<div class="analytics-row"><b>Нет улиц</b><span></span></div>'}</div>
        </div>
        <div class="analytics-subpanel">
          <h4>Bands</h4>
          <div class="analytics-table">${bandRows}</div>
        </div>
        <div class="analytics-subpanel">
          <h4>Warnings</h4>
          <div class="analytics-list">${(botLab.warnings || []).length ? escapeHtml(botLab.warnings.join(" · ")) : "Грубых красных флагов нет."}</div>
        </div>
      </div>
    `;
  }

  const api = {
    expectedBands,
    warnings,
    opportunity,
    success,
    ratio,
    percent,
    clampRate,
    createBucket,
    createAccumulator,
    opponentLabel,
    recordProfiles,
    recordTimeline,
    recordEvent,
    incrementBucket,
    classifyEvent,
    classifyAction,
    detailedSpots,
    uniqueSpots,
    isTrackedSpot,
    spotSucceeded,
    heroContributed,
    spotLabel,
    exactSpotKeys,
    frequencyText,
    compactFrequency,
    renderOutputHtml,
    renderAnalytics
  };
  root.PokerSimulatorBotLab = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
