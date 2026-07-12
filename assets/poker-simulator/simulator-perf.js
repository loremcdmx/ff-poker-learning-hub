(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  function model(options = {}) {
    const getState = typeof options.getState === "function" ? options.getState : () => null;
    const getTableGrid = typeof options.getTableGrid === "function" ? options.getTableGrid : () => null;
    const windowRef = options.windowRef || root;

    function currentState() {
      return getState() || null;
    }

    function perfNow() {
      return windowRef.performance?.now ? windowRef.performance.now() : Date.now();
    }

    function createPerfCounters() {
      return {
        version: 1,
        resetAt: new Date().toISOString(),
        scheduleRenderCalls: 0,
        pendingRenderSkips: 0,
        renderNowCalls: 0,
        renderReasons: {},
        renderFrames: [],
        tableHtmlBuilds: 0,
        skippedTableBuilds: 0,
        generatedHtmlBytes: 0,
        sameHtmlHits: 0,
        patchTableShellCalls: 0,
        patchInnerHtmlBytes: 0,
        maxInnerHtmlBytesPerRender: 0,
        countdownTicks: 0,
        countdownScannedNodes: 0,
        countdownLabelUpdates: 0,
        actionClockTicks: 0,
        actionClockSyncPasses: 0,
        actionClockScannedNodes: 0,
        actionClockLabelUpdates: 0,
        domMutationBatches: 0,
        domMutations: 0,
        domAddedNodes: 0,
        domRemovedNodes: 0,
        lastRender: null
      };
    }

    function addPerfCount(key, amount = 1) {
      const state = currentState();
      if (!state?.perf) return;
      state.perf[key] = Number(state.perf[key] || 0) + amount;
    }

    function addRenderReason(reason) {
      const state = currentState();
      if (!state?.perf) return;
      const key = String(reason || "unknown").slice(0, 80);
      state.perf.renderReasons[key] = Number(state.perf.renderReasons[key] || 0) + 1;
    }

    function setupPerfMutationObserver() {
      const state = currentState();
      const tableGrid = getTableGrid();
      const MutationObserverCtor = windowRef.MutationObserver || root.MutationObserver;
      if (!state || !tableGrid || !MutationObserverCtor) return;
      if (state.perfMutationObserver) return;
      state.perfMutationObserver = new MutationObserverCtor((mutations) => {
        addPerfCount("domMutationBatches");
        addPerfCount("domMutations", mutations.length);
        mutations.forEach((mutation) => {
          addPerfCount("domAddedNodes", mutation.addedNodes?.length || 0);
          addPerfCount("domRemovedNodes", mutation.removedNodes?.length || 0);
        });
      });
      state.perfMutationObserver.observe(tableGrid, {
        childList: true,
        subtree: true,
        characterData: true
      });
    }

    function stopPerfMutationObserver() {
      const state = currentState();
      if (!state) return;
      state.perfMutationObserver?.disconnect?.();
      state.perfMutationObserver = null;
      if (state.perfMutationObserverStopTimer) {
        windowRef.clearTimeout(state.perfMutationObserverStopTimer);
        state.perfMutationObserverStopTimer = null;
      }
    }

    function schedulePerfMutationObserverStop() {
      const state = currentState();
      if (!state) return;
      if (state.perfMutationObserverStopTimer) {
        windowRef.clearTimeout(state.perfMutationObserverStopTimer);
      }
      state.perfMutationObserverStopTimer = windowRef.setTimeout(stopPerfMutationObserver, 12000);
    }

    function recordRenderMetrics(reason, startedAt) {
      const state = currentState();
      if (!state?.perf) return;
      const metrics = state.renderScheduler?.currentRenderMetrics || {};
      const entry = {
        at: new Date().toISOString(),
        reason,
        durationMs: Math.round((perfNow() - startedAt) * 10) / 10,
        tableHtmlBuilds: Number(metrics.tableHtmlBuilds || 0),
        skippedTableBuilds: Number(metrics.skippedTableBuilds || 0),
        generatedHtmlBytes: Number(metrics.generatedHtmlBytes || 0),
        patches: Number(metrics.patches || 0),
        patchInnerHtmlBytes: Number(metrics.patchInnerHtmlBytes || 0),
        sameHtmlHits: Number(metrics.sameHtmlHits || 0)
      };
      state.perf.lastRender = entry;
      state.perf.maxInnerHtmlBytesPerRender = Math.max(
        Number(state.perf.maxInnerHtmlBytesPerRender || 0),
        entry.patchInnerHtmlBytes
      );
      state.perf.renderFrames = [entry, ...state.perf.renderFrames].slice(0, 80);
    }

    function perfSnapshot() {
      const state = currentState();
      const tableGrid = getTableGrid();
      if (!state?.perf) return createPerfCounters();
      return {
        ...state.perf,
        pendingRender: Boolean(state.renderScheduler?.renderRaf),
        pendingReasons: Array.from(state.renderScheduler?.pendingRenderReasons || []),
        tableCount: state.settings?.tableCount,
        tableNodes: tableGrid?.querySelectorAll("*").length || 0,
        autoDealTickerActive: Boolean(state.autoDealCountdownTimer),
        perfMutationObserverActive: Boolean(state.perfMutationObserver)
      };
    }

    function resetPerfCounters() {
      const state = currentState();
      if (!state) return createPerfCounters();
      state.perf = createPerfCounters();
      setupPerfMutationObserver();
      schedulePerfMutationObserverStop();
      return perfSnapshot();
    }

    function publicApi() {
      return {
        snapshot: perfSnapshot,
        reset: resetPerfCounters,
        stop: stopPerfMutationObserver
      };
    }

    return {
      perfNow,
      createPerfCounters,
      addPerfCount,
      addRenderReason,
      setupPerfMutationObserver,
      stopPerfMutationObserver,
      schedulePerfMutationObserverStop,
      recordRenderMetrics,
      perfSnapshot,
      resetPerfCounters,
      publicApi
    };
  }

  root.PokerSimulatorPerfKit = { model };
})();
