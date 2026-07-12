(function () {
  const root = typeof window !== "undefined" ? window : globalThis;
  let graphRenderSeq = 0;
  const graphRenderData = new Map();
  const maxGraphRenderData = 12;

  function finiteNumber(value, fallback = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function roundBbMetric(value) {
    return Math.round(finiteNumber(value, 0) * 10) / 10;
  }

  function ratio(part, total) {
    return total ? Number(part || 0) / Number(total || 0) : 0;
  }

  function clampRate(value) {
    return Math.max(0, Math.min(1, Number(value || 0)));
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  function signed(value) {
    const number = Number(value || 0);
    return `${number > 0 ? "+" : ""}${number}`;
  }

  function signedBb(value) {
    return `${signed(roundBbMetric(value))} BB`;
  }

  function formatGraphRate(value) {
    return `${Math.round(clampRate(value) * 100)}%`;
  }

  function graphHandsLabel(count) {
    const value = Math.max(0, Math.round(Number(count || 0)));
    const mod10 = value % 10;
    const mod100 = value % 100;
    const word = mod10 === 1 && mod100 !== 11
      ? "рука"
      : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
      ? "руки"
      : "рук";
    return `${value} ${word}`;
  }

  function handEvResultForAggregate(entry, actualResult = handResultForAggregate(entry)) {
    const equity = heroAllInRunoutEquityForAggregate(entry);
    if (equity === null) {
      // Cross-device chart points arrive without the runout payload but with a
      // pre-computed EV (server mirrors this same math) — trust it over the
      // fact-only fallback.
      const externalEvNetBb = Number(entry?.evNetBb ?? entry?.result?.evNetBb);
      return {
        netBb: Number.isFinite(externalEvNetBb) ? roundBbMetric(externalEvNetBb) : roundBbMetric(actualResult.netBb),
        winShare: heroRealizedShareForAggregate(entry, actualResult)
      };
    }
    const realizedShare = heroRealizedShareForAggregate(entry, actualResult);
    const pot = allInRunoutPotForAggregate(entry, actualResult);
    return {
      netBb: pot > 0
        ? roundBbMetric(actualResult.netBb + ((equity - realizedShare) * pot))
        : roundBbMetric(actualResult.netBb),
      winShare: equity
    };
  }

  function heroAllInRunoutEquityForAggregate(entry) {
    const runout = allInRunoutForAggregate(entry);
    const stages = Array.isArray(runout?.stages) ? runout.stages : [];
    const firstStage = stages.find((stage) => Array.isArray(stage?.equities) && stage.equities.length);
    const heroEquity = firstStage?.equities?.find((equity) => equity?.isHero || Number(equity?.seatId) === 0);
    const raw = Number(heroEquity?.equity);
    if (!Number.isFinite(raw)) return null;
    return clampRate(raw > 1 ? raw / 100 : raw);
  }

  function allInRunoutForAggregate(entry) {
    if (entry?.allInRunout && typeof entry.allInRunout === "object") return entry.allInRunout;
    if (entry?.handHistory?.allInRunout && typeof entry.handHistory.allInRunout === "object") return entry.handHistory.allInRunout;
    return null;
  }

  function showdownForAggregate(entry) {
    if (entry?.showdown && typeof entry.showdown === "object") return entry.showdown;
    if (entry?.handHistory?.showdown && typeof entry.handHistory.showdown === "object") return entry.handHistory.showdown;
    return null;
  }

  function heroRealizedShareForAggregate(entry, actualResult = handResultForAggregate(entry)) {
    const runout = allInRunoutForAggregate(entry);
    const realizedShares = Array.isArray(runout?.realizedShares) ? runout.realizedShares : [];
    const heroShare = realizedShares.find((share) => share?.isHero || Number(share?.seatId) === 0);
    const rawShare = Number(heroShare?.share);
    if (Number.isFinite(rawShare)) return clampRate(rawShare > 1 ? rawShare / 100 : rawShare);

    const showdown = showdownForAggregate(entry);
    // Authoritative: a side-pot win is recorded in potWinners/potAwards, not in
    // showdown.winners (which lists only the best-hand main-pot winner). So Hero
    // winning ONLY a side pot used to score a 0 EV win-share. Use the real awards.
    const potAwards = Array.isArray(showdown?.potAwards) ? showdown.potAwards : [];
    const potWinners = Array.isArray(showdown?.potWinners) ? showdown.potWinners : [];
    if (potAwards.length || potWinners.length) {
      const amountOf = (item) => Number(item?.amount || 0);
      const totalAwarded = (potAwards.length ? potAwards : potWinners).reduce((sum, item) => sum + amountOf(item), 0);
      const heroAward = amountOf(potWinners.find((winner) => winner?.isHero || Number(winner?.seatId) === 0))
        || amountOf(potAwards.find((award) => Number(award?.seatId) === 0));
      if (totalAwarded > 0) return clampRate(heroAward / totalAwarded);
    }

    const winners = Array.isArray(showdown?.winners) ? showdown.winners : [];
    if (winners.length) {
      return winners.some((winner) => winner?.isHero || Number(winner?.seatId) === 0)
        ? 1 / winners.length
        : 0;
    }
    return actualResult.won ? 1 : 0;
  }

  function allInRunoutPotForAggregate(entry, actualResult = handResultForAggregate(entry)) {
    const result = entry?.result && typeof entry.result === "object" ? entry.result : entry || {};
    const runout = allInRunoutForAggregate(entry);
    const showdown = showdownForAggregate(entry);
    const raw = runout?.pot ?? result.pot ?? entry?.pot ?? entry?.handHistory?.pot ?? showdown?.pot ?? actualResult.pot;
    return Math.max(0, roundBbMetric(raw));
  }

  function handResultForAggregate(entry) {
    const result = entry?.result && typeof entry.result === "object" ? entry.result : entry || {};
    const handHistory = entry?.handHistory || null;
    const heroSeatSnapshot = handHistory?.seats?.find((seat) => seat?.isHero) || null;
    const startStack = finiteNumber(handHistory?.stackDepth, 0);
    const finalStack = finiteNumber(heroSeatSnapshot?.stack, startStack);
    const netBb = Number.isFinite(Number(result.netBb))
      ? Number(result.netBb)
      : startStack || finalStack
      ? finalStack - startStack
      : 0;
    return {
      won: Boolean(result.won || entry?.outcome === "win"),
      folded: Boolean(result.folded || entry?.fold),
      showdown: Boolean(result.showdown || entry?.showdown),
      pot: roundBbMetric(result.pot ?? entry?.pot ?? handHistory?.pot),
      netBb: roundBbMetric(netBb)
    };
  }

  function orderedSessionGraphEntries(entries) {
    const source = (Array.isArray(entries) ? entries : []).filter(Boolean);
    const dated = source.filter((entry) => typeof entry.playedAt === "string" && entry.playedAt);
    if (dated.length >= Math.max(2, Math.floor(source.length * 0.7))) {
      return source.slice().sort((left, right) => {
        const byDate = String(left.playedAt || "").localeCompare(String(right.playedAt || ""));
        if (byDate) return byDate;
        return Number(left.handNo || left.no || 0) - Number(right.handNo || right.no || 0)
          || Number(left.tableId || 0) - Number(right.tableId || 0);
      });
    }
    return source.slice().reverse();
  }

  function buildSessionGraph(entries) {
    const ordered = orderedSessionGraphEntries(entries);
    const points = [{
      hand: 0,
      factBb: 0,
      evBb: 0,
      showdownBb: 0,
      nonShowdownBb: 0,
      actualWins: 0,
      evWins: 0,
      factBb100: 0,
      evBb100: 0,
      factWinRate: 0,
      evWinRate: 0
    }];
    let factBb = 0;
    let evBb = 0;
    let showdownBb = 0;
    let nonShowdownBb = 0;
    let evWins = 0;
    let actualWins = 0;

    ordered.forEach((entry, index) => {
      const result = handResultForAggregate(entry);
      const evResult = handEvResultForAggregate(entry, result);
      factBb = roundBbMetric(factBb + result.netBb);
      evBb = roundBbMetric(evBb + evResult.netBb);
      evWins = Math.round((evWins + evResult.winShare) * 1000) / 1000;
      if (result.won) actualWins += 1;
      if (result.showdown) showdownBb = roundBbMetric(showdownBb + result.netBb);
      else nonShowdownBb = roundBbMetric(nonShowdownBb + result.netBb);
      points.push({
        hand: index + 1,
        factBb,
        evBb,
        showdownBb,
        nonShowdownBb,
        actualWins,
        evWins,
        factBb100: roundBbMetric((factBb / (index + 1)) * 100),
        evBb100: roundBbMetric((evBb / (index + 1)) * 100),
        factWinRate: ratio(actualWins, index + 1),
        evWinRate: ratio(evWins, index + 1)
      });
    });

    const hands = ordered.length;
    const values = points.flatMap((point) => [point.factBb, point.evBb, 0]);
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const rawRange = maxValue - minValue;
    const padding = Math.max(1, rawRange * 0.08);
    const yMin = rawRange ? Math.floor((minValue - padding) * 10) / 10 : minValue - 1;
    const yMax = rawRange ? Math.ceil((maxValue + padding) * 10) / 10 : maxValue + 1;

    return {
      hands,
      points,
      yMin,
      yMax,
      last: points[points.length - 1],
      factBb100: hands ? roundBbMetric((factBb / hands) * 100) : 0,
      evBb100: hands ? roundBbMetric((evBb / hands) * 100) : 0,
      factWinRate: ratio(actualWins, hands),
      evWinRate: ratio(evWins, hands)
    };
  }

  // minGap tracks the painted end-label height plus stroke; keep enough room
  // for Fact/EV labels when both lines finish on nearly the same value.
  function decollideEndLabels(labels, plotTop, plotHeight, minGap = 15) {
    const list = labels.map((entry, index) => ({ ...entry, index, y: entry.rawY }));
    const lowEdge = plotTop + 6;
    const highEdge = plotTop + plotHeight;
    const sorted = list.slice().sort((left, right) => left.rawY - right.rawY);
    let prevY = -Infinity;
    sorted.forEach((entry) => {
      entry.y = Math.max(entry.rawY, prevY + minGap);
      prevY = entry.y;
    });
    const overflow = sorted.length ? sorted[sorted.length - 1].y - highEdge : 0;
    if (overflow > 0) {
      sorted.forEach((entry) => {
        entry.y = Math.max(lowEdge, entry.y - overflow);
      });
      let floorY = -Infinity;
      sorted.forEach((entry) => {
        entry.y = Math.max(entry.y, floorY);
        floorY = entry.y + minGap;
      });
    }
    return list;
  }

  function renderSessionGraphSvg(graph) {
    const width = 820;
    const height = 284;
    const pad = { left: 48, right: 22, top: 24, bottom: 38 };
    const plotWidth = width - pad.left - pad.right;
    const plotHeight = height - pad.top - pad.bottom;
    const xMax = Math.max(1, Math.round(Number(graph.hands || 0)));
    const xFor = (hand) => pad.left + (plotWidth * (Number(hand || 0) / Math.max(1, xMax)));
    const yRange = Math.max(1, Number(graph.yMax || 0) - Number(graph.yMin || 0));
    const yFor = (value) => pad.top + plotHeight - (plotHeight * ((Number(value || 0) - graph.yMin) / yRange));
    const renderId = rememberGraphRenderData({
      width,
      height,
      pad,
      plotWidth,
      plotHeight,
      points: graph.points
        .filter((point) => Number(point.hand || 0) > 0)
        .map((point) => graphHoverPoint(point, xFor, yFor))
    });
    const factLineId = `${renderId}-fact-line`;
    const evLineId = `${renderId}-ev-line`;
    const factAreaId = `${renderId}-fact-area`;
    const series = [
      { key: "factBb", className: "is-fact", label: "Факт", value: graph.last.factBb },
      { key: "evBb", className: "is-ev", label: "EV", value: graph.last.evBb }
    ];
    const yTicks = graphAxisTicks(graph.yMin, graph.yMax, 4);
    const xTicks = graphHandAxisTicks(xMax, xMax <= 100 || xMax === 500 ? 6 : 5);
    const line = (item) => graphSmoothPath(graphVisualPathPoints(graph.points.map((point) => ({
      x: xFor(point.hand),
      y: yFor(point[item.key])
    }))));
    const zeroY = yFor(0);
    const area = (item) => {
      const linePath = line(item);
      const first = graph.points[0] || { hand: 0 };
      const last = graph.points[graph.points.length - 1] || first;
      return `M ${formatGraphCoord(xFor(first.hand))} ${formatGraphCoord(zeroY)} L ${formatGraphCoord(xFor(first.hand))} ${formatGraphCoord(yFor(first[item.key]))} ${linePath.replace(/^M\s+[-0-9.]+\s+[-0-9.]+/, "")} L ${formatGraphCoord(xFor(last.hand))} ${formatGraphCoord(zeroY)} Z`;
    };
    return `
      <div class="leaderboard-graph-stage" data-session-graph data-graph-id="${renderId}" tabindex="0" role="img" aria-label="${escapeHtml(graphTooltipText(graph.points[graph.points.length - 1] || graph.points[0]))}">
        <svg class="leaderboard-graph-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="График выигрыша: факт и EV">
          <defs>
            <linearGradient id="${factLineId}" x1="${pad.left}" y1="0" x2="${width - pad.right}" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0" stop-color="#7dd3fc"></stop>
              <stop offset="0.48" stop-color="#b58aff"></stop>
              <stop offset="1" stop-color="#f0abfc"></stop>
            </linearGradient>
            <linearGradient id="${evLineId}" x1="${pad.left}" y1="0" x2="${width - pad.right}" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0" stop-color="#facc15"></stop>
              <stop offset="0.52" stop-color="#f9d554"></stop>
              <stop offset="1" stop-color="#86efac"></stop>
            </linearGradient>
            <linearGradient id="${factAreaId}" x1="0" y1="${pad.top}" x2="0" y2="${height - pad.bottom}" gradientUnits="userSpaceOnUse">
              <stop offset="0" stop-color="#b58aff" stop-opacity="0.22"></stop>
              <stop offset="1" stop-color="#7dd3fc" stop-opacity="0.02"></stop>
            </linearGradient>
          </defs>
          <rect class="graph-bg" x="${pad.left}" y="${pad.top}" width="${plotWidth}" height="${plotHeight}" rx="10"></rect>
          ${yTicks.map((tick) => `
            <line class="graph-grid-line" x1="${pad.left}" y1="${formatGraphCoord(yFor(tick))}" x2="${width - pad.right}" y2="${formatGraphCoord(yFor(tick))}"></line>
            <text class="graph-axis-label" x="${pad.left - 8}" y="${formatGraphCoord(yFor(tick) + 4)}" text-anchor="end">${escapeHtml(formatGraphAxisValue(tick))}</text>
          `).join("")}
          ${xTicks.map((tick) => `
            <line class="graph-grid-line is-vertical" x1="${formatGraphCoord(xFor(tick))}" y1="${pad.top}" x2="${formatGraphCoord(xFor(tick))}" y2="${height - pad.bottom}"></line>
            <text class="graph-axis-label" x="${formatGraphCoord(xFor(tick))}" y="${height - 12}" text-anchor="middle">${tick}</text>
          `).join("")}
          <line class="graph-zero-line" x1="${pad.left}" y1="${formatGraphCoord(yFor(0))}" x2="${width - pad.right}" y2="${formatGraphCoord(yFor(0))}"></line>
          <path class="graph-area is-fact" style="--graph-area-fill:url(#${factAreaId})" d="${area(series[0])}"></path>
          ${series.map((item) => `<path class="graph-line-glow ${item.className}" style="--graph-line-stroke:url(#${item.key === "factBb" ? factLineId : evLineId})" d="${line(item)}"></path>`).join("")}
          ${series.map((item) => `<path class="graph-line ${item.className}" style="--graph-line-stroke:url(#${item.key === "factBb" ? factLineId : evLineId})" d="${line(item)}"></path>`).join("")}
          ${series.map((item) => `<circle class="graph-end-dot ${item.className}" cx="${formatGraphCoord(xFor(graph.last.hand))}" cy="${formatGraphCoord(yFor(item.value))}" r="${item.key === "factBb" ? "3.1" : "2.8"}"></circle>`).join("")}
          ${decollideEndLabels(series.map((item) => ({ item, rawY: yFor(item.value) })), pad.top, plotHeight)
            .map(({ item, y }) => `
            <g class="graph-end-label ${item.className}" transform="translate(${formatGraphCoord(width - pad.right - 4)} ${formatGraphCoord(y)})">
              <text x="0" y="-5" text-anchor="end">${escapeHtml(item.label)}</text>
            </g>
          `).join("")}
          <line class="graph-hover-line" data-graph-hover-line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${height - pad.bottom}" hidden></line>
          <circle class="graph-hover-dot is-fact" data-graph-hover-fact r="3.4" cx="${pad.left}" cy="${yFor(0)}" hidden></circle>
          <circle class="graph-hover-dot is-ev" data-graph-hover-ev r="3" cx="${pad.left}" cy="${yFor(0)}" hidden></circle>
          <rect class="graph-hit-zone" x="${pad.left}" y="${pad.top}" width="${plotWidth}" height="${plotHeight}" aria-hidden="true"></rect>
        </svg>
        <div class="graph-tooltip" data-graph-tooltip role="status" hidden></div>
      </div>
    `;
  }

  function rememberGraphRenderData(data) {
    const id = `session-graph-${++graphRenderSeq}`;
    graphRenderData.set(id, data);
    while (graphRenderData.size > maxGraphRenderData) {
      graphRenderData.delete(graphRenderData.keys().next().value);
    }
    return id;
  }

  function graphHoverPoint(point, xFor, yFor) {
    return {
      hand: Number(point.hand || 0),
      x: roundGraphCoord(xFor(point.hand)),
      factY: roundGraphCoord(yFor(point.factBb)),
      evY: roundGraphCoord(yFor(point.evBb)),
      factBb: roundBbMetric(point.factBb),
      evBb: roundBbMetric(point.evBb),
      factBb100: roundBbMetric(point.factBb100),
      evBb100: roundBbMetric(point.evBb100),
      factWinRate: clampRate(point.factWinRate),
      evWinRate: clampRate(point.evWinRate)
    };
  }

  function roundGraphCoord(value) {
    return Math.round(Number(value || 0) * 100) / 100;
  }

  function graphSmoothPath(points) {
    const rows = (Array.isArray(points) ? points : []).filter((point) => Number.isFinite(point?.x) && Number.isFinite(point?.y));
    if (!rows.length) return "";
    if (rows.length === 1) return `M ${formatGraphCoord(rows[0].x)} ${formatGraphCoord(rows[0].y)}`;
    let path = `M ${formatGraphCoord(rows[0].x)} ${formatGraphCoord(rows[0].y)}`;
    for (let index = 0; index < rows.length - 1; index += 1) {
      const p0 = rows[index - 1] || rows[index];
      const p1 = rows[index];
      const p2 = rows[index + 1];
      const p3 = rows[index + 2] || p2;
      const cp1 = {
        x: p1.x + ((p2.x - p0.x) / 6),
        y: clampGraphControlY(p1.y + ((p2.y - p0.y) / 6), p1.y, p2.y)
      };
      const cp2 = {
        x: p2.x - ((p3.x - p1.x) / 6),
        y: clampGraphControlY(p2.y - ((p3.y - p1.y) / 6), p1.y, p2.y)
      };
      path += ` C ${formatGraphCoord(cp1.x)} ${formatGraphCoord(cp1.y)} ${formatGraphCoord(cp2.x)} ${formatGraphCoord(cp2.y)} ${formatGraphCoord(p2.x)} ${formatGraphCoord(p2.y)}`;
    }
    return path;
  }

  function graphVisualPathPoints(points) {
    const rows = (Array.isArray(points) ? points : []).filter((point) => Number.isFinite(point?.x) && Number.isFinite(point?.y));
    if (rows.length <= 48) return rows;
    const targetCount = rows.length <= 120 ? 48 : rows.length <= 420 ? 76 : 96;
    const first = rows[0];
    const last = rows[rows.length - 1];
    const inner = rows.slice(1, -1);
    const bucketSize = Math.max(1, Math.ceil(inner.length / Math.max(1, targetCount - 2)));
    const bucketed = [first];
    for (let index = 0; index < inner.length; index += bucketSize) {
      const bucket = inner.slice(index, index + bucketSize);
      const sum = bucket.reduce((acc, point) => {
        acc.x += point.x;
        acc.y += point.y;
        return acc;
      }, { x: 0, y: 0 });
      bucketed.push({
        x: sum.x / bucket.length,
        y: sum.y / bucket.length
      });
    }
    bucketed.push(last);
    return graphSoftenPathPoints(bucketed);
  }

  function graphSoftenPathPoints(points) {
    if (!Array.isArray(points) || points.length < 5) return points;
    const radius = points.length > 64 ? 2 : 1;
    return points.map((point, index) => {
      if (index === 0 || index === points.length - 1) return point;
      let totalWeight = 0;
      let y = 0;
      for (let offset = -radius; offset <= radius; offset += 1) {
        const neighbor = points[index + offset];
        if (!neighbor) continue;
        const weight = radius + 1 - Math.abs(offset);
        totalWeight += weight;
        y += neighbor.y * weight;
      }
      return {
        x: point.x,
        y: totalWeight ? y / totalWeight : point.y
      };
    });
  }

  function clampGraphControlY(value, fromY, toY) {
    const min = Math.min(fromY, toY);
    const max = Math.max(fromY, toY);
    const padding = Math.max(1.5, (max - min) * 0.16);
    return Math.max(min - padding, Math.min(max + padding, Number(value || 0)));
  }

  function graphTooltipText(point = {}) {
    const hand = Math.max(0, Number(point.hand || 0));
    const factBb100 = Number.isFinite(Number(point.factBb100))
      ? point.factBb100
      : hand ? roundBbMetric((Number(point.factBb || 0) / hand) * 100) : 0;
    const evBb100 = Number.isFinite(Number(point.evBb100))
      ? point.evBb100
      : hand ? roundBbMetric((Number(point.evBb || 0) / hand) * 100) : 0;
    return `${graphHandsLabel(hand)}. Winrate ${formatGraphRate(point.factWinRate)}. Факт ${signedBb(point.factBb)} (${signed(factBb100)} BB/100). EV ${signedBb(point.evBb)} (${signed(evBb100)} BB/100).`;
  }

  function graphTooltipHtml(point = {}) {
    return `
      <strong>${escapeHtml(graphHandsLabel(point.hand))}</strong>
      <span><b>Winrate</b><em>${escapeHtml(formatGraphRate(point.factWinRate))}</em></span>
      <span><b>Факт</b><em>${escapeHtml(`${signedBb(point.factBb)} · ${signed(point.factBb100)} BB/100`)}</em></span>
      <span><b>EV</b><em>${escapeHtml(`${signedBb(point.evBb)} · ${signed(point.evBb100)} BB/100`)}</em></span>
    `;
  }

  function bindSessionGraphInteractions(container, options = {}) {
    const documentRef = options.documentRef || root.document;
    if (!documentRef) return;
    const scope = container || documentRef;
    const stages = scope.matches?.("[data-session-graph]")
      ? [scope]
      : Array.from(scope.querySelectorAll?.("[data-session-graph]") || []);
    stages.forEach((stage) => bindSessionGraphStage(stage));
  }

  function bindSessionGraphStage(stage) {
    if (!stage || stage.dataset.graphBound === "1") return;
    const data = graphRenderData.get(stage.dataset.graphId || "");
    if (!data || !Array.isArray(data.points) || !data.points.length) return;
    const svg = stage.querySelector(".leaderboard-graph-svg");
    const tooltip = stage.querySelector("[data-graph-tooltip]");
    const hoverLine = stage.querySelector("[data-graph-hover-line]");
    const factDot = stage.querySelector("[data-graph-hover-fact]");
    const evDot = stage.querySelector("[data-graph-hover-ev]");
    if (!svg || !tooltip || !hoverLine || !factDot || !evDot) return;
    stage.dataset.graphBound = "1";

    const setActivePoint = (point) => {
      if (!point) return;
      stage.dataset.graphActiveHand = String(point.hand);
      stage.setAttribute("aria-label", graphTooltipText(point));
      hoverLine.removeAttribute("hidden");
      factDot.removeAttribute("hidden");
      evDot.removeAttribute("hidden");
      hoverLine.setAttribute("x1", formatGraphCoord(point.x));
      hoverLine.setAttribute("x2", formatGraphCoord(point.x));
      factDot.setAttribute("cx", formatGraphCoord(point.x));
      factDot.setAttribute("cy", formatGraphCoord(point.factY));
      evDot.setAttribute("cx", formatGraphCoord(point.x));
      evDot.setAttribute("cy", formatGraphCoord(point.evY));
      tooltip.innerHTML = graphTooltipHtml(point);
      tooltip.hidden = false;
      tooltip.classList.toggle("is-right", point.x < data.width * 0.24);
      tooltip.classList.toggle("is-left", point.x > data.width * 0.76);
      tooltip.style.left = `${(point.x / data.width) * 100}%`;
      stage.classList.add("is-hovering");
    };
    const clearActivePoint = () => {
      stage.classList.remove("is-hovering");
      hoverLine.setAttribute("hidden", "");
      factDot.setAttribute("hidden", "");
      evDot.setAttribute("hidden", "");
      tooltip.hidden = true;
    };
    const updateFromClientX = (clientX) => {
      const rect = svg.getBoundingClientRect();
      if (!rect.width) return;
      const x = Math.max(data.pad.left, Math.min(data.width - data.pad.right, ((clientX - rect.left) / rect.width) * data.width));
      setActivePoint(nearestGraphPoint(data.points, x));
    };
    stage.addEventListener("pointermove", (event) => updateFromClientX(event.clientX));
    stage.addEventListener("pointerdown", (event) => updateFromClientX(event.clientX));
    stage.addEventListener("pointerleave", clearActivePoint);
    stage.addEventListener("blur", clearActivePoint);
    stage.addEventListener("focus", () => {
      const currentHand = Number(stage.dataset.graphActiveHand || 0);
      const current = data.points.find((point) => point.hand === currentHand);
      setActivePoint(current || data.points[data.points.length - 1]);
    });
    stage.addEventListener("keydown", (event) => {
      const currentHand = Number(stage.dataset.graphActiveHand || data.points[data.points.length - 1]?.hand || 0);
      const currentIndex = Math.max(0, data.points.findIndex((point) => point.hand === currentHand));
      let nextIndex = currentIndex;
      if (event.key === "ArrowLeft") nextIndex = Math.max(0, currentIndex - 1);
      else if (event.key === "ArrowRight") nextIndex = Math.min(data.points.length - 1, currentIndex + 1);
      else if (event.key === "Home") nextIndex = 0;
      else if (event.key === "End") nextIndex = data.points.length - 1;
      else return;
      event.preventDefault();
      setActivePoint(data.points[nextIndex]);
    });
  }

  function nearestGraphPoint(points, x) {
    let low = 0;
    let high = points.length - 1;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (points[mid].x < x) low = mid + 1;
      else high = mid;
    }
    const right = points[low];
    const left = points[Math.max(0, low - 1)];
    if (!left) return right;
    if (!right) return left;
    return Math.abs(right.x - x) < Math.abs(x - left.x) ? right : left;
  }

  function graphAxisTicks(min, max, count = 5) {
    const safeCount = Math.max(2, Math.round(Number(count || 5)));
    const range = Math.max(1, Number(max || 0) - Number(min || 0));
    const step = range / (safeCount - 1);
    return Array.from({ length: safeCount }, (_, index) => roundBbMetric(Number(min || 0) + (step * index)));
  }

  function graphHandAxisTicks(max, count = 5) {
    const end = Math.max(1, Math.round(Number(max || 0)));
    const safeCount = Math.min(end + 1, Math.max(2, Math.round(Number(count || 5))));
    const ticks = graphAxisTicks(0, end, safeCount)
      .map((tick) => Math.max(0, Math.min(end, Math.round(Number(tick || 0)))));
    ticks[0] = 0;
    ticks[ticks.length - 1] = end;
    return [...new Set(ticks)];
  }

  function formatGraphCoord(value) {
    return Number(value || 0).toFixed(2).replace(/\.?0+$/, "");
  }

  function formatGraphAxisValue(value) {
    const rounded = roundBbMetric(value);
    if (Math.abs(rounded) >= 100) return `${Math.round(rounded)}`;
    return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  }

  function renderSessionGraphLegend(graph) {
    const items = [
      { className: "is-fact is-plotted", label: "Факт", value: signedBb(graph.last.factBb) },
      { className: "is-ev is-plotted", label: "EV (Chip EV)", value: signedBb(graph.last.evBb) }
    ];
    return `
      <div class="leaderboard-graph-legend">
        ${items.map((item) => `
          <span class="${escapeHtml(item.className)}">
            <i></i>
            <b>${escapeHtml(item.label)}</b>
            <strong>${escapeHtml(item.value)}</strong>
          </span>
        `).join("")}
      </div>
    `;
  }

  root.PokerSimulatorSessionGraph = {
    finiteNumber,
    roundBbMetric,
    ratio,
    clampRate,
    signed,
    signedBb,
    handEvResultForAggregate,
    heroAllInRunoutEquityForAggregate,
    allInRunoutForAggregate,
    showdownForAggregate,
    heroRealizedShareForAggregate,
    allInRunoutPotForAggregate,
    handResultForAggregate,
    orderedSessionGraphEntries,
    buildSessionGraph,
    renderSessionGraphSvg,
    graphAxisTicks,
    formatGraphCoord,
    formatGraphAxisValue,
    formatGraphRate,
    graphHandsLabel,
    renderSessionGraphLegend,
    graphTooltipText,
    graphTooltipHtml,
    bindSessionGraphInteractions
  };
})();
