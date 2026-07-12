(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  function domPatch(options = {}) {
    const perfModel = options.perfModel || {};
    const addPerfCount = typeof options.addPerfCount === "function"
      ? options.addPerfCount
      : typeof perfModel.addPerfCount === "function"
        ? perfModel.addPerfCount
        : () => {};
    const getCurrentRenderMetrics = typeof options.getCurrentRenderMetrics === "function"
      ? options.getCurrentRenderMetrics
      : () => null;

    function patchTableShell(current, nextShell, patchByteLength = 0) {
      Array.from(current.attributes).forEach((attribute) => {
        if (!nextShell.hasAttribute(attribute.name)) current.removeAttribute(attribute.name);
      });
      Array.from(nextShell.attributes).forEach((attribute) => {
        if (current.getAttribute(attribute.name) !== attribute.value) {
          current.setAttribute(attribute.name, attribute.value);
        }
      });
      const patchBytes = Math.max(0, Number(patchByteLength || 0));
      addPerfCount("patchTableShellCalls");
      addPerfCount("patchInnerHtmlBytes", patchBytes);
      const metrics = getCurrentRenderMetrics();
      if (metrics) {
        metrics.patches += 1;
        metrics.patchInnerHtmlBytes += patchBytes;
      }
      morphChildren(current, nextShell);
      pruneStaleTransientNodes(current, nextShell);
    }

    return {
      patchTableShell,
      pruneStaleTransientNodes,
      morphChildren,
      morphNode,
      canUseEqualNodeFastPath,
      shouldPreserveAnimationStyle,
      shouldPreserveAnimationNodePosition,
      pruneIgnorableGapBefore,
      isIgnorablePatchGap,
      syncAttributes,
      syncElementState,
      nodePatchKey,
      setTextIfChanged,
      setValueIfChanged,
      setCheckedIfChanged,
      setDisabledIfChanged,
      setAttributeIfChanged,
      setHtmlIfChanged
    };
  }

  function pruneStaleTransientNodes(current, nextShell) {
    [".deal-card", ".deck-shoe", ".bet-flight", ".muck-card", ".pot-award"].forEach((selector) => {
      if (nextShell.querySelector(selector)) return;
      current.querySelectorAll(selector).forEach((node) => node.remove());
    });
  }

  function morphChildren(current, next) {
    const currentChildren = Array.from(current.childNodes);
    const keyedCurrent = new Map();
    const preservedOutOfOrder = new Set();
    currentChildren.forEach((child) => {
      const key = nodePatchKey(child);
      if (key && !keyedCurrent.has(key)) keyedCurrent.set(key, child);
    });

    let cursor = current.firstChild;
    Array.from(next.childNodes).forEach((nextChild) => {
      const key = nodePatchKey(nextChild);
      // Never let an unkeyed whitespace/text sibling consume the keyed node at
      // the cursor. Insert the unkeyed node before it and leave that keyed node
      // mounted for its own keyed pass below. Replacing the cursor here detached
      // the last SB/BB marker, restarted its CSS entrance when reinserted, and in
      // the stale-map path could drop it from the DOM altogether.
      let currentChild = key
        ? keyedCurrent.get(key) || null
        : (cursor && nodePatchKey(cursor) ? null : cursor);
      if (!currentChild) {
        current.insertBefore(nextChild.cloneNode(true), cursor);
        return;
      }
      if (currentChild !== cursor) {
        // keyedCurrent is a snapshot of the children from BEFORE this patch.
        // An earlier unkeyed text/sibling diff can replace one of those keyed
        // nodes, leaving the map entry detached. Only preserve a node in place
        // while it is still mounted under this parent; a detached keyed node
        // must fall through to insertBefore below so it is reinserted instead
        // of being patched off-DOM and silently lost (notably the final SB/BB
        // marker at the end of the deal/action-unlock render).
        if (currentChild.parentNode === current && shouldPreserveAnimationNodePosition(currentChild, nextChild)) {
          cursor = pruneIgnorableGapBefore(current, cursor, currentChild);
          // Moving an existing keyed transient with insertBefore() restarts its
          // CSS animation in browsers even though node identity and inline
          // timing style are preserved. Sibling effects (muck cards, flights,
          // awards) mount/unmount throughout the same reveal, so leave this
          // absolute-positioned node where it is and patch it in place. The
          // cleanup pass below removes stale siblings without touching it.
          if (currentChild !== cursor) {
            morphNode(currentChild, nextChild);
            preservedOutOfOrder.add(currentChild);
            return;
          }
        }
        if (currentChild !== cursor) current.insertBefore(currentChild, cursor);
      }
      const patchedChild = morphNode(currentChild, nextChild) || currentChild;
      cursor = patchedChild.nextSibling;
    });

    while (cursor) {
      const nextCursor = cursor.nextSibling;
      if (!preservedOutOfOrder.has(cursor)) current.removeChild(cursor);
      cursor = nextCursor;
    }
  }

  function morphNode(current, next) {
    if (current.nodeType !== next.nodeType || current.nodeName !== next.nodeName) {
      const replacement = next.cloneNode(true);
      current.replaceWith(replacement);
      return replacement;
    }
    if (current.nodeType === Node.TEXT_NODE || current.nodeType === Node.COMMENT_NODE) {
      if (current.nodeValue !== next.nodeValue) current.nodeValue = next.nodeValue;
      return current;
    }
    if (current.nodeType !== Node.ELEMENT_NODE) return null;
    if (canUseEqualNodeFastPath(current, next) && current.isEqualNode(next)) {
      return current;
    }

    syncAttributes(current, next);
    morphChildren(current, next);
    return current;
  }

  function canUseEqualNodeFastPath(current, next) {
    if (typeof current.isEqualNode !== "function") return false;
    if (current.nodeType !== Node.ELEMENT_NODE || next.nodeType !== Node.ELEMENT_NODE) return false;
    const className = String(current.getAttribute("class") || "");
    if (/\b(table-shell|felt|action-bar)\b/.test(className)) return false;
    const currentChildCount = Number(current.childElementCount || 0);
    const nextChildCount = Number(next.childElementCount || 0);
    const stableVisualBlock = /\b(seat|seat-panel|seat-cards|pot|pot-total|pot-text|pot-values|board-row)\b/.test(className);
    const childLimit = stableVisualBlock ? 10 : 3;
    return currentChildCount <= childLimit && nextChildCount <= childLimit;
  }

  function shouldPreserveAnimationStyle(current, next) {
    if (!current || !next) return false;
    if (!current.hasAttribute("style") || !next.hasAttribute("style")) return false;
    const currentKey = current.getAttribute("data-animation-key") || "";
    if (!currentKey || currentKey !== (next.getAttribute("data-animation-key") || "")) return false;
    return isTransientAnimationElement(current, next);
  }

  function shouldPreserveAnimationNodePosition(current, next) {
    if (!current || !next) return false;
    const currentKey = current.getAttribute("data-animation-key") || "";
    if (!currentKey || currentKey !== (next.getAttribute("data-animation-key") || "")) return false;
    // Keyed bet markers keep node identity/position UNCONDITIONALLY: moving a
    // live node via insertBefore restarts its CSS entrance (pop) animation, and
    // a delay-0 marker never satisfies the --marker-delay style gate below —
    // so without this branch every sibling reorder re-popped it. Style
    // preservation stays delay-gated (shouldPreserveAnimationStyle): a marker
    // must still RECEIVE --marker-delay stamped by a later render.
    const className = `${current.getAttribute("class") || ""} ${next.getAttribute("class") || ""}`;
    if (/\bbet-marker\b/.test(className)) return true;
    return isTransientAnimationElement(current, next);
  }

  function isTransientAnimationElement(current, next) {
    const className = `${current.getAttribute("class") || ""} ${next.getAttribute("class") || ""}`;
    if (/\bbet-marker\b/.test(className)) {
      return /--marker-delay\b/.test(current.getAttribute("style") || "");
    }
    return /\b(deal-card|deck-shoe|bet-flight|muck-card|pot-award|action-bubble|river-resolution-cue)\b/.test(className);
  }

  function pruneIgnorableGapBefore(parent, cursor, target) {
    let current = cursor;
    while (current && current !== target && isIgnorablePatchGap(current)) {
      const next = current.nextSibling;
      parent.removeChild(current);
      current = next;
    }
    return current;
  }

  function isIgnorablePatchGap(node) {
    if (!node) return false;
    if (node.nodeType === Node.COMMENT_NODE) return true;
    return node.nodeType === Node.TEXT_NODE && !String(node.nodeValue || "").trim();
  }

  function syncAttributes(current, next) {
    const preserveAnimationStyle = shouldPreserveAnimationStyle(current, next);
    Array.from(current.attributes).forEach((attribute) => {
      if (preserveAnimationStyle && attribute.name === "style") return;
      if (!next.hasAttribute(attribute.name)) current.removeAttribute(attribute.name);
    });
    Array.from(next.attributes).forEach((attribute) => {
      if (preserveAnimationStyle && attribute.name === "style") return;
      if (current.getAttribute(attribute.name) !== attribute.value) {
        current.setAttribute(attribute.name, attribute.value);
      }
    });
    syncElementState(current, next);
  }

  function isActiveElement(element) {
    return typeof document !== "undefined" && document.activeElement === element;
  }

  function syncElementState(current, next) {
    if (current instanceof HTMLInputElement && next instanceof HTMLInputElement) {
      // Never clobber an input the user is actively interacting with (focused):
      // a re-render mid-drag/mid-toggle would yank checkbox/radio/range state out
      // from under them. Mirror the range guard for checkbox/radio too.
      if (isActiveElement(current)) return;
      if (current.type === "checkbox" || current.type === "radio") {
        current.checked = next.checked;
      }
      if (current.value !== next.value) current.value = next.value;
      return;
    }
    if (current instanceof HTMLTextAreaElement && next instanceof HTMLTextAreaElement) {
      if (isActiveElement(current)) return;
      if (current.value !== next.value) current.value = next.value;
      return;
    }
    if (current instanceof HTMLSelectElement && next instanceof HTMLSelectElement) {
      if (isActiveElement(current)) return;
      if (current.value !== next.value) current.value = next.value;
    }
  }

  function nodePatchKey(node) {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return "";
    const element = node;
    const explicit = element.getAttribute("data-patch-key") || element.getAttribute("data-animation-key");
    if (explicit) return `${element.tagName}:${explicit}`;
    const tableId = element.getAttribute("data-table-id");
    if (tableId) return `${element.tagName}:table-${tableId}`;
    const autoTableId = element.getAttribute("data-auto-table-id");
    if (autoTableId && element.hasAttribute("data-auto-countdown")) return `${element.tagName}:auto-${autoTableId}`;
    for (const className of element.classList || []) {
      if (/^(seat|bet-marker|bet-flight)--\d+$/.test(className)) return `${element.tagName}:${className}`;
      if (/^(pot|pot-total|felt|board-row|action-bar|action-buttons|seat-panel|seat-cards|pot-award|action-status)$/.test(className)) return `${element.tagName}:${className}`;
    }
    return "";
  }

  function setTextIfChanged(node, value) {
    if (!node) return;
    const next = String(value);
    if (node.textContent !== next) node.textContent = next;
  }

  function setValueIfChanged(node, value) {
    if (!node) return;
    const next = String(value);
    if (node.value !== next) node.value = next;
  }

  function setCheckedIfChanged(node, value) {
    if (!node) return;
    const next = Boolean(value);
    if (node.checked !== next) node.checked = next;
  }

  function setDisabledIfChanged(node, value) {
    if (!node) return;
    const next = Boolean(value);
    if (node.disabled !== next) node.disabled = next;
  }

  function setAttributeIfChanged(node, name, value) {
    if (!node) return;
    const next = String(value);
    if (node.getAttribute(name) !== next) node.setAttribute(name, next);
  }

  function setHtmlIfChanged(node, html) {
    if (!node) return;
    const next = String(html || "");
    if (node.innerHTML !== next) node.innerHTML = next;
  }

  root.PokerSimulatorDom = {
    domPatch,
    pruneStaleTransientNodes,
    morphChildren,
    morphNode,
    canUseEqualNodeFastPath,
    shouldPreserveAnimationStyle,
    shouldPreserveAnimationNodePosition,
    pruneIgnorableGapBefore,
    isIgnorablePatchGap,
    syncAttributes,
    syncElementState,
    nodePatchKey,
    setTextIfChanged,
    setValueIfChanged,
    setCheckedIfChanged,
    setDisabledIfChanged,
    setAttributeIfChanged,
    setHtmlIfChanged
  };
})();
