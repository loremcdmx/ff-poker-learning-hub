(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  // Cooperative multi-tab session status. Live session/hand-log keys are scoped
  // per browser tab by the app foundation, so tabs no longer need an exclusive
  // Web Lock or a read-only takeover path.
  function model(ctx = {}) {
    const keys = ctx.keys || {};
    const warn = typeof ctx.warn === "function" ? ctx.warn : () => {};
    const currentState = typeof ctx.currentState === "function" ? ctx.currentState : () => null;
    const clearSessionOwnershipWarning = typeof ctx.clearSessionOwnershipWarning === "function" ? ctx.clearSessionOwnershipWarning : () => {};
    const clearPersistenceWarningAfterCleanSave = typeof ctx.clearPersistenceWarningAfterCleanSave === "function" ? ctx.clearPersistenceWarningAfterCleanSave : () => {};

    function sessionLocksApi() {
      return null;
    }

    function sessionLocksSupported() {
      return false;
    }

    function lockAcquiredMessage() {
      return "Каждая вкладка сохраняет свою live-сессию.";
    }

    function sessionLockState() {
      const current = currentState();
      const saved = current?.sessionStorageLock && typeof current.sessionStorageLock === "object"
        ? current.sessionStorageLock
        : {};
      return {
        ...saved,
        supported: false,
        mode: "tab-scoped",
        owner: true,
        readOnly: false,
        takeoverPending: false,
        message: lockAcquiredMessage(),
        updatedAt: Number(saved.updatedAt || 0)
      };
    }

    function updateSessionLockState(patch = {}) {
      const current = currentState();
      if (!current) return sessionLockState();
      current.sessionStorageLock = {
        ...sessionLockState(),
        ...patch,
        supported: false,
        mode: "tab-scoped",
        owner: true,
        readOnly: false,
        takeoverPending: false,
        updatedAt: Date.now()
      };
      return current.sessionStorageLock;
    }

    function isSessionReadOnly() {
      return false;
    }

    function markSessionReadOnly(message = lockAcquiredMessage()) {
      const current = currentState();
      if (!current) return;
      updateSessionLockState({ message });
      clearSessionOwnershipWarning(current);
    }

    function releaseSessionLock() {
      updateSessionLockState({ message: lockAcquiredMessage() });
    }

    async function acquireSessionLock() {
      updateSessionLockState({ message: lockAcquiredMessage() });
      clearSessionOwnershipWarning(currentState());
      clearPersistenceWarningAfterCleanSave(currentState());
      return true;
    }

    async function requestSessionTakeover() {
      return acquireSessionLock();
    }

    // Legacy conflict detector. With tab-scoped keys this should be unreachable
    // except for stale builds or duplicated tabs that kept an old scoped key.
    function handleForeignSessionStorageWrite(event) {
      if (!event || event.key !== keys.session || !event.newValue) return false;
      const state = currentState();
      if (!state || !state.sessionId) return false;
      let foreignSessionId = "";
      try {
        foreignSessionId = String(JSON.parse(event.newValue)?.sessionId || "");
      } catch {
        return false;
      }
      if (!foreignSessionId || foreignSessionId === state.sessionId) return false;
      state.foreignTabDetectedAt = Date.now();
      warn("Another simulator tab wrote the same scoped session key.");
      return true;
    }

    return {
      sessionLocksApi,
      sessionLocksSupported,
      sessionLockState,
      updateSessionLockState,
      isSessionReadOnly,
      markSessionReadOnly,
      releaseSessionLock,
      lockAcquiredMessage,
      acquireSessionLock,
      requestSessionTakeover,
      handleForeignSessionStorageWrite
    };
  }

  root.PokerSimulatorSessionLock = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorSessionLock;
})();
