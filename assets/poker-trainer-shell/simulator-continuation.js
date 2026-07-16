(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;
  const VERSION = "1.0.0";

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  function asObject(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : null;
  }

  function cleanText(value) {
    return String(value == null ? "" : value).trim();
  }

  function resolveElement(target) {
    const element = typeof target === "string" ? root.document?.querySelector(target) : target;
    if (!element) throw new Error("FFTrainerSimulator continuation target was not found");
    return element;
  }

  function validateContinuation(rootSpot) {
    const errors = [];
    const continuation = asObject(rootSpot?.continuation);
    if (!continuation) {
      return { ok: false, errors: ["continuation: explicit graph is required"] };
    }
    if (continuation.schemaVersion !== 1) errors.push("continuation.schemaVersion: expected 1");

    const nodes = asObject(continuation.nodes);
    const nodeIds = nodes ? Object.keys(nodes) : [];
    if (!nodeIds.length) errors.push("continuation.nodes: at least one node is required");

    const start = cleanText(continuation.start);
    if (!start) errors.push("continuation.start: node id is required");
    else if (nodes && !nodes[start]) errors.push(`continuation.start: unknown node "${start}"`);

    const nextByNode = new Map();
    nodeIds.forEach((nodeId) => {
      const node = asObject(nodes[nodeId]);
      const label = `continuation.nodes.${nodeId}`;
      if (!node) {
        errors.push(`${label}: node must be an object`);
        nextByNode.set(nodeId, []);
        return;
      }
      if (!asObject(node.table)) errors.push(`${label}.table: full snapshot table is required`);

      const options = asArray(node.options);
      if (node.terminal === true) {
        if (options.length) errors.push(`${label}.options: terminal node must not have decisions`);
        if (!asObject(node.result) || !cleanText(node.result.summary)) {
          errors.push(`${label}.result.summary: terminal result text is required`);
        }
        const revealSeat = asArray(node.table?.seats).some((seat) => (
          seat?.revealCardsAfterAnswer === true && asArray(seat.cards).length === 2
        ));
        if (!revealSeat) errors.push(`${label}.table.seats: terminal node must reveal one two-card opponent hand`);
        nextByNode.set(nodeId, []);
        return;
      }

      if (options.length < 2 || options.length > 4) {
        errors.push(`${label}.options: decision node must contain 2 to 4 discrete actions`);
      }
      const keys = options.map((option) => cleanText(option?.key));
      if (keys.some((key) => !key)) errors.push(`${label}.options: every action needs a key`);
      if (new Set(keys).size !== keys.length) errors.push(`${label}.options: action keys must be unique`);
      if (options.filter((option) => option?.correct === true).length !== 1) {
        errors.push(`${label}.options: exactly one action must be correct`);
      }

      const nextIds = options.map((option, optionIndex) => {
        const nextId = cleanText(option?.next);
        if (!nextId) errors.push(`${label}.options[${optionIndex}].next: target node is required`);
        else if (nodes && !nodes[nextId]) errors.push(`${label}.options[${optionIndex}].next: unknown node "${nextId}"`);
        return nextId;
      }).filter(Boolean);
      nextByNode.set(nodeId, nextIds);
    });

    asArray(rootSpot?.options).forEach((option, optionIndex) => {
      const nextId = cleanText(option?.next);
      if (nextId && nodes && !nodes[nextId]) {
        errors.push(`options[${optionIndex}].next: unknown continuation node "${nextId}"`);
      }
    });

    if (nodes && nodeIds.length) {
      const memo = new Map();
      const cycleReports = new Set();
      function reachesTerminal(nodeId, trail = []) {
        if (memo.has(nodeId)) return memo.get(nodeId);
        const cycleIndex = trail.indexOf(nodeId);
        if (cycleIndex !== -1) {
          const cycle = [...trail.slice(cycleIndex), nodeId].join(" -> ");
          if (!cycleReports.has(cycle)) {
            cycleReports.add(cycle);
            errors.push(`continuation.nodes: cycle without terminal (${cycle})`);
          }
          return false;
        }
        const node = asObject(nodes[nodeId]);
        if (!node) return false;
        if (node.terminal === true) {
          memo.set(nodeId, true);
          return true;
        }
        const nextIds = nextByNode.get(nodeId) || [];
        const result = nextIds.length > 0
          && nextIds.every((nextId) => nodes[nextId] && reachesTerminal(nextId, [...trail, nodeId]));
        memo.set(nodeId, result);
        return result;
      }
      nodeIds.forEach((nodeId) => {
        if (!reachesTerminal(nodeId)) errors.push(`continuation.nodes.${nodeId}: every branch must reach a terminal node`);
      });
    }

    return { ok: errors.length === 0, errors };
  }

  function createContinuationSession(rootSpot, options = {}) {
    const validation = validateContinuation(rootSpot);
    if (!validation.ok) {
      throw new Error(`Invalid simulator continuation: ${validation.errors.join("; ")}`);
    }

    const continuation = rootSpot.continuation;
    const rootOption = asArray(rootSpot.options).find((option) => option?.key === options.rootOptionKey);
    const initialNodeId = cleanText(options.startNodeId || rootOption?.next || continuation.start);
    if (!continuation.nodes[initialNodeId]) {
      throw new Error(`Invalid simulator continuation start node: "${initialNodeId}"`);
    }

    const state = {
      nodeId: initialNodeId,
      selectedKey: "",
      answered: false,
      finished: false,
      pendingNext: "",
      history: []
    };

    function currentNode() {
      return continuation.nodes[state.nodeId];
    }

    function enterNode(nodeId) {
      const node = continuation.nodes[nodeId];
      state.nodeId = nodeId;
      state.selectedKey = "";
      state.pendingNext = "";
      state.finished = node.terminal === true;
      // The snapshot renderer uses answered=true to reveal authored opponent cards.
      state.answered = state.finished;
      return node;
    }

    function getState() {
      return {
        nodeId: state.nodeId,
        selectedKey: state.selectedKey,
        answered: state.answered,
        finished: state.finished,
        pendingNext: state.pendingNext,
        history: state.history.map((item) => ({ ...item }))
      };
    }

    function choose(optionKey) {
      const node = currentNode();
      if (state.finished) return { ok: false, reason: "finished", state: getState() };
      if (state.answered) return { ok: false, reason: "answered", state: getState() };
      const option = asArray(node.options).find((item) => item?.key === optionKey);
      if (!option) return { ok: false, reason: "unknown-option", state: getState() };
      const expected = asArray(node.options).find((item) => item?.correct === true);
      const decision = {
        nodeId: state.nodeId,
        choice: option.key,
        choiceLabel: cleanText(option.label || option.key),
        expected: expected.key,
        expectedLabel: cleanText(expected.label || expected.key),
        correct: option.key === expected.key,
        nextNodeId: cleanText(option.next)
      };
      state.selectedKey = option.key;
      state.answered = true;
      state.pendingNext = decision.nextNodeId;
      state.history.push(decision);
      return { ok: true, decision: { ...decision }, option, expected, state: getState() };
    }

    function advance() {
      if (state.finished) return { ok: false, reason: "finished", state: getState() };
      if (!state.answered) return { ok: false, reason: "unanswered", state: getState() };
      const nextNodeId = state.pendingNext;
      if (!nextNodeId || !continuation.nodes[nextNodeId]) {
        return { ok: false, reason: "missing-next", state: getState() };
      }
      const node = enterNode(nextNodeId);
      return { ok: true, nodeId: nextNodeId, node, terminal: state.finished, state: getState() };
    }

    function reset() {
      state.history = [];
      enterNode(initialNodeId);
      return getState();
    }

    enterNode(initialNodeId);
    return Object.freeze({
      rootSpot,
      getNode: currentNode,
      getState,
      choose,
      advance,
      reset
    });
  }

  function mountContinuation(target, rootSpot, options = {}) {
    const host = resolveElement(target);
    const document = host.ownerDocument || root.document;
    const simulator = root.FFTrainerSimulator;
    if (!document?.createElement || typeof simulator?.renderDecision !== "function") {
      throw new Error("FFTrainerSimulator.renderDecision is required before mounting a continuation");
    }

    const session = createContinuationSession(rootSpot, options);
    let destroyed = false;
    let notifiedTerminalNodeId = "";

    function scheduleFocus(selector) {
      const schedule = typeof root.requestAnimationFrame === "function"
        ? root.requestAnimationFrame.bind(root)
        : (callback) => callback();
      schedule(() => {
        if (destroyed) return;
        const element = host.querySelector?.(selector);
        if (!element?.focus) return;
        try { element.focus({ preventScroll: true }); } catch (_error) { element.focus(); }
      });
    }

    function appendText(parent, tagName, className, value) {
      const element = document.createElement(tagName);
      if (className) element.className = className;
      element.textContent = cleanText(value);
      parent.appendChild(element);
      return element;
    }

    function appendAnsweredFeedback(node, state) {
      if (!state.answered || state.finished) return;
      const selected = asArray(node.options).find((option) => option?.key === state.selectedKey);
      const expected = asArray(node.options).find((option) => option?.correct === true);
      if (!selected || !expected) return;
      const correct = selected.key === expected.key;
      const feedback = document.createElement("section");
      feedback.className = `continuation-feedback decision-feedback ${correct ? "is-correct" : "is-wrong"}`;
      feedback.setAttribute("data-continuation-feedback", "");
      feedback.setAttribute("role", "status");
      feedback.setAttribute("aria-live", "polite");
      feedback.setAttribute("aria-atomic", "true");
      appendText(feedback, "strong", "continuation-feedback-title", correct ? "Верно" : `Лучше: ${expected.label || expected.key}`);
      appendText(feedback, "p", "continuation-feedback-copy", selected.feedback || node.answer || "Сравни решение с базовой линией.");
      host.appendChild(feedback);
    }

    function appendAdvanceControl(node, state) {
      if (!state.answered || state.finished || !state.pendingNext) return;
      const selected = asArray(node.options).find((option) => option?.key === state.selectedKey) || {};
      const nextNode = rootSpot.continuation.nodes[state.pendingNext];
      const row = document.createElement("div");
      row.className = "practice-next-row continuation-next-row";
      const button = document.createElement("button");
      button.className = "practice-next-button continuation-next-button";
      button.type = "button";
      button.setAttribute("data-continuation-next", "");
      const defaultLabel = nextNode?.terminal === true ? "Показать шоудаун" : "Продолжить раздачу";
      appendText(button, "span", "", selected.advanceLabel || defaultLabel);
      row.appendChild(button);
      const controls = host.querySelector?.(".client-controls") || host;
      controls.appendChild(row);
    }

    function terminalPayload() {
      const node = session.getNode();
      return {
        rootSpotId: cleanText(rootSpot.id),
        nodeId: session.getState().nodeId,
        result: node.result,
        history: session.getState().history,
        state: session.getState()
      };
    }

    function appendTerminalResult(node) {
      const result = document.createElement("section");
      result.className = "continuation-result decision-feedback is-neutral";
      result.setAttribute("data-continuation-result", "");
      result.setAttribute("role", "status");
      result.setAttribute("aria-live", "polite");
      result.setAttribute("aria-atomic", "true");
      result.tabIndex = -1;
      appendText(result, "p", "eyebrow", node.result?.winner ? `Результат: ${node.result.winner}` : "Шоудаун");
      appendText(result, "h3", "", node.title || "Шоудаун");
      appendText(result, "p", "continuation-result-copy", node.result?.summary || "Раздача завершена.");

      const button = document.createElement("button");
      button.className = "practice-next-button continuation-complete-button";
      button.type = "button";
      button.setAttribute("data-continuation-complete", "");
      appendText(button, "span", "", options.completeLabel || "Завершить раздачу");
      result.appendChild(button);
      host.appendChild(result);
    }

    function notifyTerminal() {
      const state = session.getState();
      if (!state.finished || notifiedTerminalNodeId === state.nodeId) return;
      notifiedTerminalNodeId = state.nodeId;
      if (typeof options.onComplete === "function") options.onComplete(terminalPayload());
    }

    function render(focusTarget) {
      if (destroyed) return null;
      const node = session.getNode();
      const state = session.getState();
      simulator.renderDecision(host, node, {
        answered: state.answered,
        selectedKey: state.selectedKey,
        finished: state.finished
      }, {
        positionLabels: options.positionLabels,
        decimalComma: options.decimalComma,
        hideActionStatus: options.hideActionStatus
      });

      if (state.finished) {
        appendTerminalResult(node);
        notifyTerminal();
      } else {
        appendAnsweredFeedback(node, state);
        appendAdvanceControl(node, state);
      }

      if (focusTarget === "action") scheduleFocus(".table-action");
      if (focusTarget === "next") scheduleFocus("[data-continuation-next]");
      if (focusTarget === "terminal") scheduleFocus("[data-continuation-result]");
      return host;
    }

    function choose(optionKey) {
      const result = session.choose(optionKey);
      if (!result.ok) return result;
      render("next");
      if (typeof options.onDecision === "function") {
        options.onDecision({
          rootSpotId: cleanText(rootSpot.id),
          ...result.decision,
          state: session.getState()
        });
      }
      return result;
    }

    function advance() {
      const result = session.advance();
      if (!result.ok) return result;
      render(result.terminal ? "terminal" : "action");
      if (typeof options.onNodeChange === "function") {
        options.onNodeChange({
          rootSpotId: cleanText(rootSpot.id),
          nodeId: result.nodeId,
          terminal: result.terminal,
          state: session.getState()
        });
      }
      return result;
    }

    function complete() {
      const state = session.getState();
      if (!state.finished) return { ok: false, reason: "not-finished", state };
      const payload = terminalPayload();
      if (typeof options.onExit === "function") options.onExit(payload);
      return { ok: true, ...payload };
    }

    function reset() {
      notifiedTerminalNodeId = "";
      const state = session.reset();
      render(state.finished ? "terminal" : "action");
      return state;
    }

    function handleClick(event) {
      const action = event.target?.closest?.("[data-option-key]");
      if (action && host.contains(action)) {
        choose(action.dataset.optionKey);
        return;
      }
      const next = event.target?.closest?.("[data-continuation-next]");
      if (next && host.contains(next)) {
        event.preventDefault?.();
        advance();
        return;
      }
      const finish = event.target?.closest?.("[data-continuation-complete]");
      if (finish && host.contains(finish)) {
        event.preventDefault?.();
        complete();
      }
    }

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      host.removeEventListener("click", handleClick);
    }

    host.addEventListener("click", handleClick);
    render(options.autoFocus === false ? "" : (session.getState().finished ? "terminal" : "action"));

    return Object.freeze({
      choose,
      advance,
      complete,
      reset,
      destroy,
      getNode: session.getNode,
      getState: session.getState
    });
  }

  const api = Object.freeze({
    version: VERSION,
    validateContinuation,
    createContinuationSession,
    mountContinuation
  });
  root.FFTrainerSimulatorContinuation = api;
  if (root.FFTrainerSimulator && typeof root.FFTrainerSimulator === "object") {
    Object.assign(root.FFTrainerSimulator, {
      continuationVersion: VERSION,
      validateContinuation,
      createContinuationSession,
      mountContinuation
    });
  }
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
