(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  function embedAllowedOrigins(windowRef = root) {
    const configured = Array.isArray(windowRef.PokerSimulatorEmbedOrigins)
      ? windowRef.PokerSimulatorEmbedOrigins.map((value) => String(value))
      : [];
    const origins = [windowRef.location?.origin, ...configured]
      .filter((origin) => origin && origin !== "null");
    return [...new Set(origins)];
  }

  function isAllowedEmbedOrigin(windowRef, origin) {
    return Boolean(origin) && origin !== "null" && embedAllowedOrigins(windowRef).includes(origin);
  }

  function postEmbedMessage(windowRef, source, origin, payload) {
    if (!source?.postMessage || !isAllowedEmbedOrigin(windowRef, origin)) return;
    source.postMessage(payload, origin);
  }

  function model(options = {}) {
    const windowRef = options.windowRef || root;
    const embeddedMode = Boolean(options.embeddedMode);
    const commands = options.commands || {};

    function runCommand(command, payload = {}) {
      const handler = commands[String(command || "")];
      if (typeof handler !== "function") {
        throw new Error(`Unknown simulator embed command: ${command}`);
      }
      return handler(payload || {});
    }

    function handleMessage(event) {
      if (event.source !== windowRef.parent) return;
      if (!isAllowedEmbedOrigin(windowRef, event.origin)) return;
      const data = event.data && typeof event.data === "object" ? event.data : null;
      if (data?.type !== "poker-simulator:command") return;
      try {
        const result = runCommand(data.command, data.payload || {});
        postEmbedMessage(windowRef, event.source, event.origin, {
          type: "poker-simulator:response",
          id: data.id || "",
          ok: true,
          result
        });
      } catch (error) {
        postEmbedMessage(windowRef, event.source, event.origin, {
          type: "poker-simulator:response",
          id: data.id || "",
          ok: false,
          error: error?.message || "Simulator command failed"
        });
      }
    }

    function notifyReady() {
      if (!embeddedMode || windowRef.parent === windowRef) return;
      for (const origin of embedAllowedOrigins(windowRef)) {
        try {
          windowRef.parent.postMessage({ type: "poker-simulator:event", name: "ready" }, origin);
        } catch (error) {
          // postMessage only delivers when the parent origin matches; ignore mismatches.
        }
      }
    }

    return {
      embedAllowedOrigins: () => embedAllowedOrigins(windowRef),
      isAllowedEmbedOrigin: (origin) => isAllowedEmbedOrigin(windowRef, origin),
      runCommand,
      handleMessage,
      notifyReady
    };
  }

  root.PokerSimulatorEmbedApi = {
    embedAllowedOrigins,
    isAllowedEmbedOrigin: (origin, windowRef = root) => isAllowedEmbedOrigin(windowRef, origin),
    model
  };
  if (typeof module !== "undefined" && module.exports) module.exports = root.PokerSimulatorEmbedApi;
})();
