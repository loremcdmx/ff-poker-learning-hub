(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;
  const SUIT_KEYS = {
    "♥": "h",
    "♦": "d",
    "♣": "c",
    "♠": "s"
  };
  const SUIT_PATTERN = /[♥♦♣♠]/;
  const SUIT_SPLIT_PATTERN = /([♥♦♣♠])/g;
  const SKIP_SELECTOR = [
    "script",
    "style",
    "textarea",
    "input",
    "select",
    "option",
    "code",
    "pre",
    "svg",
    "math",
    ".poker-deck-card",
    ".poker-suit-text",
    "[data-poker-suit-text='off']"
  ].join(",");

  let observer = null;

  function parts(value) {
    return String(value ?? "")
      .split(SUIT_SPLIT_PATTERN)
      .filter(Boolean)
      .map((text) => {
        const suit = SUIT_KEYS[text];
        return suit
          ? { type: "suit", suit, text }
          : { type: "text", text };
      });
  }

  function canColorizeTextNode(node) {
    const parent = node?.parentElement;
    return Boolean(
      node?.nodeType === 3
      && parent
      && SUIT_PATTERN.test(node.nodeValue || "")
      && !parent.closest(SKIP_SELECTOR)
    );
  }

  function colorizeTextNode(node) {
    if (!canColorizeTextNode(node)) return 0;
    const document = node.ownerDocument;
    const fragment = document.createDocumentFragment();
    let suitCount = 0;

    for (const part of parts(node.nodeValue)) {
      if (part.type === "text") {
        fragment.append(document.createTextNode(part.text));
        continue;
      }
      const span = document.createElement("span");
      span.className = `poker-suit-text poker-suit-text--${part.suit}`;
      span.dataset.pokerSuit = part.suit;
      span.textContent = part.text;
      fragment.append(span);
      suitCount += 1;
    }

    node.replaceWith(fragment);
    return suitCount;
  }

  function colorize(target) {
    if (!target) return 0;
    if (target.nodeType === 3) return colorizeTextNode(target);
    const document = target.ownerDocument || root.document;
    if (!document?.createTreeWalker) return 0;

    const textNodes = [];
    const showText = root.NodeFilter?.SHOW_TEXT || 4;
    const walker = document.createTreeWalker(target, showText);
    let current = walker.nextNode();
    while (current) {
      if (canColorizeTextNode(current)) textNodes.push(current);
      current = walker.nextNode();
    }

    return textNodes.reduce((total, node) => total + colorizeTextNode(node), 0);
  }

  function observe(target = root.document?.body) {
    if (!target || typeof root.MutationObserver !== "function") return null;
    observer?.disconnect();
    observer = new root.MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          colorizeTextNode(mutation.target);
          continue;
        }
        for (const node of mutation.addedNodes) colorize(node);
      }
    });
    observer.observe(target, { childList: true, subtree: true, characterData: true });
    return observer;
  }

  function stop() {
    observer?.disconnect();
    observer = null;
  }

  function boot() {
    const document = root.document;
    if (!document?.body || document.body.dataset.pokerSuitText === "off") return;
    colorize(document.body);
    observe(document.body);
    document.documentElement.dataset.pokerSuitText = "ready";
  }

  const api = {
    SUIT_KEYS,
    parts,
    colorize,
    observe,
    stop
  };

  root.PokerSuitText = api;

  if (root.document) {
    if (root.document.readyState === "loading") {
      root.document.addEventListener("DOMContentLoaded", boot, { once: true });
    } else {
      boot();
    }
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})();
