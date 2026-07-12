(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  function model(options = {}) {
    const windowRef = options.windowRef || root;
    const state = options.state || {};
    const perfModel = options.perfModel || {};
    const addPerfCount = typeof options.addPerfCount === "function"
      ? options.addPerfCount
      : typeof perfModel.addPerfCount === "function"
        ? perfModel.addPerfCount
        : () => {};
    const addRenderReason = typeof options.addRenderReason === "function"
      ? options.addRenderReason
      : typeof perfModel.addRenderReason === "function"
        ? perfModel.addRenderReason
        : () => {};
    const renderNow = typeof options.renderNow === "function" ? options.renderNow : () => {};

    function dirtyTableIds() {
      if (!(state.renderScheduler.dirtyTableIds instanceof Set)) state.renderScheduler.dirtyTableIds = new Set();
      return state.renderScheduler.dirtyTableIds;
    }

    function pendingRenderReasons() {
      if (!(state.renderScheduler.pendingRenderReasons instanceof Set)) state.renderScheduler.pendingRenderReasons = new Set();
      return state.renderScheduler.pendingRenderReasons;
    }

    function cleanReason(reason, fallback) {
      return String(reason || fallback).slice(0, 80);
    }

    function markTableDirty(tableId) {
      const id = Number(tableId);
      if (!Number.isFinite(id) || id <= 0) return;
      dirtyTableIds().add(id);
    }

    function markAllTablesDirty() {
      state.renderScheduler.forceAllTableRender = true;
      dirtyTableIds().clear();
    }

    function setActiveTable(tableId, options = {}) {
      const nextId = Number(tableId);
      if (!Number.isFinite(nextId) || nextId <= 0) return state.activeTableId;
      const previousId = Number(state.activeTableId || 0);
      state.activeTableId = nextId;
      // Skip the redundant dirty when the active table did not actually change.
      // Re-selecting the already-active table used to mark both the "old" and
      // "new" (identical) table dirty, forcing a needless re-render.
      if (options.dirty !== false && nextId !== previousId) {
        markTableDirty(previousId);
        markTableDirty(nextId);
      }
      return previousId;
    }

    function scheduleRender(reason = "legacy") {
      addPerfCount("scheduleRenderCalls");
      addRenderReason(reason);
      pendingRenderReasons().add(cleanReason(reason, "legacy"));
      if (state.renderScheduler.renderRaf) {
        addPerfCount("pendingRenderSkips");
        return;
      }
      state.renderScheduler.renderRaf = windowRef.requestAnimationFrame(() => {
        state.renderScheduler.renderRaf = 0;
        const reasons = Array.from(pendingRenderReasons()).join(",") || "raf";
        pendingRenderReasons().clear();
        renderNow(reasons);
      });
    }

    function flushRender(reason = "flush") {
      if (state.renderScheduler.renderRaf) {
        windowRef.cancelAnimationFrame(state.renderScheduler.renderRaf);
        state.renderScheduler.renderRaf = 0;
      }
      pendingRenderReasons().add(cleanReason(reason, "flush"));
      const reasons = Array.from(pendingRenderReasons()).join(",") || "flush";
      pendingRenderReasons().clear();
      renderNow(reasons);
    }

    function render(reason = "legacy") {
      scheduleRender(reason);
    }

    return {
      markTableDirty,
      markAllTablesDirty,
      setActiveTable,
      scheduleRender,
      flushRender,
      render
    };
  }

  root.PokerSimulatorRenderLoop = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = { model };
})();
