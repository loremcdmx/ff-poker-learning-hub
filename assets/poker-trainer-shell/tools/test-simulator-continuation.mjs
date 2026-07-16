import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Script, createContext } from "node:vm";
import { fileURLToPath } from "node:url";

const repo = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const source = readFileSync(resolve(repo, "assets/poker-trainer-shell/simulator-continuation.js"), "utf8");

class FakeElement {
  constructor(tagName = "div", ownerDocument = null) {
    this.tagName = tagName.toUpperCase();
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.parentNode = null;
    this.dataset = {};
    this.attributes = {};
    this.className = "";
    this.textContent = "";
    this.listeners = {};
    this.focused = false;
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  append(...children) {
    children.forEach((child) => this.appendChild(child));
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
    if (name.startsWith("data-")) {
      const key = name.slice(5).replace(/-([a-z])/g, (_match, letter) => letter.toUpperCase());
      this.dataset[key] = String(value);
    }
  }

  matches(selector) {
    if (selector.startsWith(".")) return this.className.split(/\s+/).includes(selector.slice(1));
    const dataMatch = selector.match(/^\[data-([a-z-]+)\]$/);
    return dataMatch ? Object.hasOwn(this.attributes, `data-${dataMatch[1]}`) : false;
  }

  closest(selector) {
    let current = this;
    while (current) {
      if (current.matches(selector)) return current;
      current = current.parentNode;
    }
    return null;
  }

  querySelector(selector) {
    for (const child of this.children) {
      if (child.matches(selector)) return child;
      const nested = child.querySelector(selector);
      if (nested) return nested;
    }
    return null;
  }

  contains(element) {
    return element === this || this.children.some((child) => child.contains(element));
  }

  addEventListener(type, listener) {
    this.listeners[type] = listener;
  }

  removeEventListener(type, listener) {
    if (this.listeners[type] === listener) delete this.listeners[type];
  }

  focus() {
    this.ownerDocument.activeElement = this;
    this.focused = true;
  }

  replaceChildren(...children) {
    this.children = [];
    this.append(...children);
  }
}

const document = {
  activeElement: null,
  createElement(tagName) { return new FakeElement(tagName, document); },
  querySelector() { return null; }
};
const renderCalls = [];
const simulator = {
  renderDecision(host, spot, state) {
    host.replaceChildren();
    const table = document.createElement("div");
    table.className = "ff-shell-simulator-snapshot";
    const controls = document.createElement("div");
    controls.className = "client-controls";
    if (!state.finished) {
      const action = document.createElement("button");
      action.className = "table-action";
      action.setAttribute("data-option-key", spot.options[0].key);
      controls.appendChild(action);
    }
    table.appendChild(controls);
    host.appendChild(table);
    renderCalls.push({ spot, state: { ...state } });
    return host;
  }
};
const window = {
  document,
  FFTrainerSimulator: simulator,
  requestAnimationFrame(callback) { callback(); }
};
const module = { exports: {} };
const context = createContext({ window, globalThis: window, module, console });
new Script(source, { filename: "simulator-continuation.js" }).runInContext(context);
const api = window.FFTrainerSimulatorContinuation;

const showdown = {
  id: "showdown",
  terminal: true,
  title: "Шоудаун",
  question: "Раздача завершена",
  table: {
    street: "showdown",
    heroCards: ["Th", "9h"],
    boardCards: ["Kc", "8h", "2s", "7h", "3c"],
    seats: [
      { label: "BB", state: "hero" },
      { label: "BTN", state: "waiting", cards: ["Kd", "Qs"], revealCardsAfterAnswer: true }
    ]
  },
  result: { winner: "villain", summary: "BTN выигрывает с парой королей." }
};
const rootSpot = {
  id: "xr-t9-backdoors",
  table: { street: "flop" },
  options: [
    { key: "fold", label: "Пас" },
    { key: "checkraise", label: "Чек-рейз до 5,5 BB", correct: true, next: "turn" }
  ],
  continuation: {
    schemaVersion: 1,
    start: "turn",
    nodes: {
      turn: {
        id: "turn",
        question: "Как продолжаем на тёрне?",
        table: { street: "turn", boardCards: ["Kc", "8h", "2s", "7h"] },
        options: [
          { key: "check", label: "Чек", correct: false, feedback: "Слишком пассивно.", next: "river" },
          { key: "bet", label: "Ставка 10 BB", correct: true, feedback: "Верно.", next: "river", advanceLabel: "BTN коллирует — открыть ривер" }
        ]
      },
      river: {
        id: "river",
        question: "Как играем ривер?",
        table: { street: "river", boardCards: ["Kc", "8h", "2s", "7h", "3c"] },
        options: [
          { key: "check", label: "Чек", correct: true, feedback: "Верно.", next: "showdown" },
          { key: "jam", label: "Олл-ин 24,5 BB", correct: false, feedback: "Не лучший блеф.", next: "showdown" }
        ]
      },
      showdown
    }
  }
};

assert.equal(api.version, "1.0.0");
assert.equal(window.FFTrainerSimulator.mountContinuation, api.mountContinuation, "API augments the shared simulator facade");
assert.equal(window.FFTrainerSimulator.continuationVersion, "1.0.0");
assert.deepEqual(Array.from(api.validateContinuation(rootSpot).errors), []);
assert.throws(
  () => api.createContinuationSession({ id: "legacy" }),
  /explicit graph is required/,
  "legacy spots never receive a generated fallback"
);

const invalid = structuredClone(rootSpot);
invalid.continuation.nodes.turn.options[0].next = "missing";
const invalidResult = api.validateContinuation(invalid);
assert.equal(invalidResult.ok, false);
assert(invalidResult.errors.some((error) => /unknown node "missing"/.test(error)));

const session = api.createContinuationSession(rootSpot, { rootOptionKey: "checkraise" });
assert.deepEqual(
  { nodeId: session.getState().nodeId, answered: session.getState().answered, finished: session.getState().finished },
  { nodeId: "turn", answered: false, finished: false }
);
assert.equal(session.choose("unknown").reason, "unknown-option");
const turnDecision = session.choose("bet");
assert.equal(turnDecision.ok, true);
assert.equal(turnDecision.decision.correct, true);
assert.equal(session.getState().pendingNext, "river");
assert.equal(session.choose("check").reason, "answered", "one answer is accepted per node");
assert.equal(session.advance().nodeId, "river");
assert.equal(session.getState().answered, false);
session.choose("check");
const terminalAdvance = session.advance();
assert.equal(terminalAdvance.terminal, true);
assert.equal(session.getState().nodeId, "showdown");
assert.equal(session.getState().answered, true, "terminal snapshot reveals authored opponent cards");
assert.equal(session.getState().finished, true);
assert.equal(session.getState().history.length, 2);
session.reset();
assert.equal(session.getState().nodeId, "turn");
assert.equal(session.getState().history.length, 0);

const host = new FakeElement("div", document);
const callbacks = { decisions: [], complete: [], exits: [] };
const mounted = api.mountContinuation(host, rootSpot, {
  completeLabel: "Следующая раздача",
  onDecision(payload) { callbacks.decisions.push(payload); },
  onComplete(payload) { callbacks.complete.push(payload); },
  onExit(payload) { callbacks.exits.push(payload); }
});
assert(document.activeElement.matches(".table-action"), "mount focuses the first discrete action");

mounted.choose("bet");
const advanceButton = host.querySelector("[data-continuation-next]");
assert(advanceButton, "answered node renders its own advance control");
assert.equal(document.activeElement, advanceButton, "answer moves focus to the advance control");
assert(host.querySelector("[data-continuation-feedback]"), "answer renders accessible feedback");
assert.equal(callbacks.decisions.length, 1);

mounted.advance();
assert(document.activeElement.matches(".table-action"), "street advance focuses the next action");
mounted.choose("check");
mounted.advance();
const terminalRender = renderCalls.at(-1);
assert.equal(terminalRender.spot, showdown);
assert.deepEqual(terminalRender.state, { answered: true, selectedKey: "", finished: true });
const result = host.querySelector("[data-continuation-result]");
const completeButton = host.querySelector("[data-continuation-complete]");
assert(result && completeButton, "terminal renders result and completion control");
assert.equal(document.activeElement, result, "terminal moves focus to the announced result");
assert.equal(callbacks.complete.length, 1, "terminal lifecycle callback fires once");
mounted.complete();
assert.equal(callbacks.exits.length, 1);
mounted.destroy();
assert.equal(host.listeners.click, undefined);

assert.doesNotMatch(source, /data-practice-next/, "continuation never hijacks the legacy next-hand event");
assert.doesNotMatch(source, /FFTrainerEvents|FFPlayerProgress|trainer_decision|trainer_session/, "controller owns no telemetry or progress persistence");

console.log("Simulator continuation controller: ok");
