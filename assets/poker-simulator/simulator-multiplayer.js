// Client transport for the poker-simulator multiplayer foundation.
//
// Talks to the same-origin REST surface (api/rooms.js) for room lifecycle and
// subscribes to the realtime stream (api/rooms-events.js) over EventSource.
// Guests are tracked by an HMAC-signed player token the server mints on first
// contact; we persist it in localStorage so a refresh / reconnect reclaims the
// same seat. Authenticated players (Google session cookie) ignore the token.
//
// Scope: this is the same-origin wire layer. The start-screen online lobby and
// server-mode runtime both use it for room lifecycle, presence, SSE, protected
// room access, authoritative hand actions, and server-owned pre-actions. The
// separate adapter/runtime layer maps room snapshots into the simulator table
// renderer; this file never forks in-hand UI or runs local poker logic.

(function attachMultiplayer(global) {
  const TOKEN_KEY = "ff-simulator-player-token";
  const REQUEST_KEY_PREFIX = "ff-simulator-mp-request:";
  // EventSource fires only "message" for unnamed events, so we register a
  // listener per server event type (api/_rooms.js makeEvent `type`).
  const STREAM_EVENT_TYPES = [
    "hello", "bye", "error", "room-created", "room-closed", "seat", "presence",
    "chat", "action", "hand-started", "hand-action", "street", "showdown"
  ];

  function createMultiplayerClient(options = {}) {
    const baseUrl = (options.baseUrl || "/api").replace(/\/+$/, "");
    const storage = options.storage || safeLocalStorage();
    let playerToken = readToken();
    const memoryRequestIds = new Map();

    function safeLocalStorage() {
      try {
        return global.localStorage || null;
      } catch {
        return null;
      }
    }

    function readToken() {
      try {
        return storage?.getItem(TOKEN_KEY) || "";
      } catch {
        return "";
      }
    }

    function rememberToken(token) {
      if (!token || token === playerToken) return;
      playerToken = token;
      try {
        storage?.setItem(TOKEN_KEY, token);
      } catch {
        // private mode / blocked storage: keep the token in memory only
      }
    }

    function randomId() {
      try {
        if (global.crypto?.randomUUID) return global.crypto.randomUUID();
        const bytes = new Uint8Array(12);
        global.crypto?.getRandomValues?.(bytes);
        if (bytes.some(Boolean)) return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
      } catch {
        // Fall through to the timestamp fallback below.
      }
      return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    }

    function pendingRequestId(kind, roomId) {
      const key = REQUEST_KEY_PREFIX + String(kind || "op") + ":" + String(roomId || "");
      try {
        const existing = storage?.getItem(key) || "";
        if (existing) return existing;
      } catch {
        const existing = memoryRequestIds.get(key);
        if (existing) return existing;
        const created = `${kind}:${randomId()}`;
        memoryRequestIds.set(key, created);
        return created;
      }
      const remembered = memoryRequestIds.get(key);
      if (remembered) return remembered;
      const created = `${kind}:${randomId()}`;
      if (!storage) {
        memoryRequestIds.set(key, created);
        return created;
      }
      try {
        storage.setItem(key, created);
      } catch {
        memoryRequestIds.set(key, created);
      }
      return created;
    }

    function clearPendingRequestId(kind, roomId, requestId) {
      const key = REQUEST_KEY_PREFIX + String(kind || "op") + ":" + String(roomId || "");
      try {
        if (!requestId || storage?.getItem(key) === requestId) storage?.removeItem(key);
      } catch {
        const existing = memoryRequestIds.get(key);
        if (!requestId || existing === requestId) memoryRequestIds.delete(key);
        return;
      }
      const existing = memoryRequestIds.get(key);
      if (!requestId || existing === requestId) memoryRequestIds.delete(key);
    }

    function isSettledLeaveError(err) {
      return /room_not_found|room_closed|not_seated/i.test(String(err?.message || err || ""));
    }

    async function api(method, path, { body, query, keepalive = false } = {}) {
      const origin = (global.location && global.location.origin) || "http://localhost";
      const url = new URL(`${baseUrl}${path}`, origin);
      if (query) {
        Object.entries(query).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, String(value));
        });
      }
      const headers = { Accept: "application/json" };
      if (body !== undefined) headers["Content-Type"] = "application/json";
      if (playerToken) headers["x-ff-player-token"] = playerToken;
      const payload = body !== undefined ? JSON.stringify(body) : undefined;
      const response = await global.fetch(url.toString(), {
        method,
        headers,
        credentials: "same-origin",
        cache: "no-store",
        keepalive: Boolean(keepalive && payload && payload.length < 60000),
        body: payload
      });
      let data = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }
      if (data?.playerToken) rememberToken(data.playerToken);
      if (!response.ok || data?.ok === false) {
        const error = new Error(data?.error || `http_${response.status}`);
        error.status = response.status;
        error.data = data;
        throw error;
      }
      return data;
    }

    function subscribe(roomId, handlers = {}) {
      if (!roomId || typeof global.EventSource !== "function") {
        return { close() {} };
      }
      const origin = (global.location && global.location.origin) || "http://localhost";
      const url = new URL(`${baseUrl}/rooms-events`, origin);
      url.searchParams.set("id", roomId);
      if (handlers.since) url.searchParams.set("since", String(handlers.since));
      if (handlers.accessCode) url.searchParams.set("accessCode", String(handlers.accessCode));
      if (handlers.streamToken) url.searchParams.set("streamToken", String(handlers.streamToken));
      // SSE cannot carry custom headers. Protected rooms use either the room
      // access code or a room-scoped read-only stream token minted by REST.
      const source = new global.EventSource(url.toString(), { withCredentials: true });
      const dispatch = (type) => (messageEvent) => {
        let payload = null;
        try {
          payload = messageEvent.data ? JSON.parse(messageEvent.data) : null;
        } catch {
          payload = null;
        }
        if (typeof handlers.onEvent === "function") handlers.onEvent({ type, payload });
        const named = handlers[`on${type.replace(/(^|-)(\w)/g, (_, __, ch) => ch.toUpperCase())}`];
        if (typeof named === "function") named(payload);
      };
      STREAM_EVENT_TYPES.forEach((type) => source.addEventListener(type, dispatch(type)));
      source.addEventListener("message", dispatch("message"));
      source.onerror = (err) => {
        if (typeof handlers.onStreamError === "function") handlers.onStreamError(err);
      };
      source.onopen = () => {
        if (typeof handlers.onOpen === "function") handlers.onOpen();
      };
      return { close() { source.close(); }, source };
    }

    // Keep our seat alive: a periodic heartbeat refreshes presence and revives
    // a seat the server reaped to "disconnected" while we were briefly idle.
    function startHeartbeat(roomId, intervalMs = 5000, handlers = {}) {
      const hooks = handlers && typeof handlers === "object" ? handlers : {};
      const timer = global.setInterval(() => {
        heartbeat(roomId).catch((err) => {
          const code = String(err?.message || err || "");
          if (/not_seated/i.test(code) && typeof hooks.onNotSeated === "function") {
            hooks.onNotSeated(err);
          } else if (typeof hooks.onError === "function") {
            hooks.onError(err);
          }
        });
      }, Math.max(2000, intervalMs));
      return () => global.clearInterval(timer);
    }

    const listRooms = () => api("GET", "/rooms");
    const getRoom = (id, accessCode) => api("GET", "/rooms", { query: { id, accessCode } });
    const createRoom = ({ name, settings, displayName, accessCode } = {}) =>
      api("POST", "/rooms", { body: { op: "create", name, settings, displayName, accessCode } });
    async function join(id, seatIndex, displayName, accessCode) {
      const requestId = pendingRequestId("join", id);
      const data = await api("POST", "/rooms", { body: { op: "join", id, seatIndex, displayName, accessCode, requestId } });
      clearPendingRequestId("leave", id);
      clearPendingRequestId("join", id, requestId);
      return data;
    }
    async function leave(id) {
      const requestId = pendingRequestId("leave", id);
      try {
        const data = await api("POST", "/rooms", { body: { op: "leave", id, requestId }, keepalive: true });
        clearPendingRequestId("leave", id, requestId);
        clearPendingRequestId("join", id);
        return data;
      } catch (err) {
        if (isSettledLeaveError(err)) {
          clearPendingRequestId("leave", id, requestId);
          clearPendingRequestId("join", id);
        }
        throw err;
      }
    }
    const sitOut = (id) => api("POST", "/rooms", { body: { op: "sit-out", id } });
    const sitIn = (id) => api("POST", "/rooms", { body: { op: "sit-in", id } });
    const heartbeat = (id) => api("POST", "/rooms", { body: { op: "heartbeat", id } });
    const startHand = (id) => api("POST", "/rooms", { body: { op: "start-hand", id } });
    const sendAction = (id, action) => api("POST", "/rooms", { body: { op: "action", id, action } });
    const setPreAction = (id, preAction) => api("POST", "/rooms", { body: { op: "pre-action", id, preAction } });
    const closeRoom = (id) => api("DELETE", "/rooms", { query: { id } });

    return {
      get playerToken() { return playerToken; },
      hasToken: () => Boolean(playerToken),
      listRooms,
      getRoom,
      createRoom,
      join,
      leave,
      sitOut,
      sitIn,
      heartbeat,
      startHand,
      sendAction,
      setPreAction,
      closeRoom,
      subscribe,
      startHeartbeat
    };
  }

  // Engine seam: translate a serialized room view (api/_rooms.js
  // serializeRoomForViewer) into a setSeatLobbyState plan. Occupied seats carry
  // their LobbyState for real players; empty seats are owned by a bot. The
  // runtime maps room seat index -> engine seat id (Hero = 0) when it wires the
  // authoritative engine in a later pass.
  function seatLobbyPlan(roomView) {
    return (roomView?.seats || []).map((seat) => {
      const isBot = Boolean(seat.isBot) && !seat.occupied;
      const isHuman = Boolean(seat.occupied) && !isBot;
      return {
        seatIndex: seat.index,
        occupied: Boolean(seat.occupied),
        isHuman,
        isBot,
        isYou: Boolean(seat.isYou),
        name: isHuman ? (seat.playerName || "") : "",
        lobbyState: isHuman ? seat.state : null,
        stackBb: Number(seat.stackBb || 0)
      };
    });
  }

  // Match the repo's universal-module convention: attach to the global first,
  // then mirror to module.exports for Node/test consumers.
  global.FFSimulatorMultiplayer = { createMultiplayerClient, seatLobbyPlan };
  if (typeof module !== "undefined" && module.exports) module.exports = global.FFSimulatorMultiplayer;
  return global.FFSimulatorMultiplayer;
})(typeof window !== "undefined" ? window : globalThis);
