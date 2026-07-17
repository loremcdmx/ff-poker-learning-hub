(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  function model(options = {}) {
    const windowRef = options.windowRef || root;
    const state = options.state || {};
    const replayDialog = options.replayDialog || null;
    const replayBody = options.replayBody || null;
    const replayUi = options.replayUi || {};
    const replayModel = options.replayModel || {};
    const replayAutoplayMs = Number(options.autoplayMs || 850);
    const replayEntries = typeof options.replayEntries === "function" ? options.replayEntries : () => [];
    const replayVisibleEvents = typeof options.replayVisibleEvents === "function"
      ? options.replayVisibleEvents
      : typeof replayModel.replayVisibleEvents === "function"
        ? replayModel.replayVisibleEvents
        : () => [];
    const clampIndex = typeof options.clampIndex === "function"
      ? options.clampIndex
      : typeof replayModel.clampIndex === "function"
        ? replayModel.clampIndex
        : fallbackClampIndex;

    function fallbackClampIndex(index, length) {
      if (!length) return 0;
      return Math.max(0, Math.min(length - 1, Number(index) || 0));
    }

    // The replay dialog is scoped to ONE table: every entry carries its
    // tableId, and the hand list / default entry only see that table's hands.
    function scopedReplayEntries() {
      const scope = Number(state.replayScopeTableId);
      const entries = replayEntries();
      if (!Number.isFinite(scope) || state.replayScopeTableId === null) return entries;
      return entries.filter((entry) => Number(entry?.tableId) === scope);
    }

    function showReplay(entry = scopedReplayEntries()[0]) {
      stopReplayAutoplay(false);
      if (typeof replayUi.clearReplayFlights === "function") replayUi.clearReplayFlights(replayDialog, replayBody);
      if (!entry?.handHistory) {
        // Table without finished hands yet: open the dialog with an honest
        // empty state instead of silently doing nothing.
        state.replayHand = null;
        state.replayRenderedIndex = null;
        if (replayBody) {
          replayBody.innerHTML = '<div class="replay-empty">Раздач на этом столе ещё нет — доиграйте первую руку, и повтор появится здесь.</div>';
        }
        if (replayDialog && !replayDialog.open && typeof replayDialog.showModal === "function") replayDialog.showModal();
        return;
      }
      if (Number.isFinite(Number(entry.tableId))) state.replayScopeTableId = Number(entry.tableId);
      state.replayHand = entry.handHistory;
      state.replayIndex = Math.max(0, replayVisibleEvents(entry.handHistory).length - 1);
      state.replayRenderedIndex = null;
      renderReplayDialog();
      if (replayDialog && !replayDialog.open && typeof replayDialog.showModal === "function") replayDialog.showModal();
    }

    function renderReplayDialog() {
      if (!state.replayHand || !replayBody || typeof replayUi.renderReplay !== "function") return;
      const prevIndex = state.replayRenderedIndex;
      if (typeof replayUi.prepareReplayAnimations === "function") {
        replayUi.prepareReplayAnimations(replayBody, replayDialog, state.replayHand);
      }
      replayBody.innerHTML = replayUi.renderReplay(state.replayHand, {
        replayIndex: state.replayIndex,
        replayPlaying: state.replayPlaying,
        entries: scopedReplayEntries()
      });
      state.replayRenderedIndex = state.replayIndex;
      if (typeof windowRef.requestAnimationFrame === "function" && typeof replayUi.syncReplayTimelineScroll === "function") {
        windowRef.requestAnimationFrame(() => replayUi.syncReplayTimelineScroll(replayBody));
      }
      // Smooth one-step forward scrubbing; backward and multi-step jumps render instantly.
      if (typeof prevIndex === "number" && state.replayIndex === prevIndex + 1 && typeof replayUi.animateReplayAdvance === "function") {
        replayUi.animateReplayAdvance(replayBody, replayDialog, state.replayHand, state.replayIndex);
      }
    }

    function startReplayAutoplay() {
      const length = replayVisibleEvents(state.replayHand).length;
      if (length <= 1 || typeof windowRef.setTimeout !== "function") return;
      stopReplayAutoplay(false);
      if (state.replayIndex >= length - 1) state.replayIndex = 0;
      state.replayPlaying = true;
      renderReplayDialog();
      scheduleReplayAutoplayTick();
    }

    function scheduleReplayAutoplayTick() {
      if (!state.replayPlaying || typeof windowRef.setTimeout !== "function") return;
      state.replayTimer = windowRef.setTimeout(() => {
        state.replayTimer = null;
        if (!state.replayPlaying) return;
        const nextLength = replayVisibleEvents(state.replayHand).length;
        if (!nextLength || state.replayIndex >= nextLength - 1) {
          stopReplayAutoplay();
          renderReplayDialog();
          return;
        }
        state.replayIndex = clampIndex(state.replayIndex + 1, nextLength);
        renderReplayDialog();
        scheduleReplayAutoplayTick();
      }, replayAutoplayMs);
    }

    function clearReplayAutoplayTimer() {
      if (state.replayTimer == null) return;
      if (typeof windowRef.clearTimeout === "function") {
        windowRef.clearTimeout(state.replayTimer);
      } else if (typeof windowRef.clearInterval === "function") {
        windowRef.clearInterval(state.replayTimer);
      }
      state.replayTimer = null;
    }

    function stopReplayAutoplay(renderNow = true) {
      clearReplayAutoplayTimer();
      state.replayPlaying = false;
      if (renderNow && replayDialog?.open) renderReplayDialog();
      if (!replayDialog?.open && typeof replayUi.clearReplayFlights === "function") {
        replayUi.clearReplayFlights(replayDialog, replayBody);
      }
    }

    function setReplayIndex(index, options = {}) {
      if (!state.replayHand) return;
      if (options.stopAutoplay !== false) stopReplayAutoplay(false);
      state.replayIndex = clampIndex(index, replayVisibleEvents(state.replayHand).length);
      renderReplayDialog();
    }

    function toggleReplayAutoplay() {
      if (state.replayPlaying) {
        stopReplayAutoplay(false);
        renderReplayDialog();
        return;
      }
      startReplayAutoplay();
    }

    function handleReplayKeydown(event) {
      if (!replayDialog?.open || !state.replayHand || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" || target?.isContentEditable) return;
      const length = replayVisibleEvents(state.replayHand).length;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setReplayIndex(state.replayIndex - 1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        setReplayIndex(state.replayIndex + 1);
      } else if (event.key === "Home") {
        event.preventDefault();
        setReplayIndex(0);
      } else if (event.key === "End") {
        event.preventDefault();
        setReplayIndex(length - 1);
      } else if (event.key === " " || event.key === "Spacebar") {
        event.preventDefault();
        toggleReplayAutoplay();
      }
    }

    return {
      showReplay,
      renderReplayDialog,
      startReplayAutoplay,
      stopReplayAutoplay,
      setReplayIndex,
      toggleReplayAutoplay,
      handleReplayKeydown
    };
  }

  root.PokerSimulatorReplayController = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = { model };
})();
