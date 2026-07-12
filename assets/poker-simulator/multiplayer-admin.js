(function () {
  "use strict";

  const REQUEST_KEY_PREFIX = "ff-mp-admin-request:";
  const GATE_RETRY_KEY = "ff-mp-admin-gate-retry";

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, { once: true });
    else fn();
  }

  ready(function () {
    const root = document.querySelector(".mp-admin-app");
    if (!root) return;
    const $ = (key) => root.querySelector(`[data-admin="${key}"]`);
    const tokenState = $("token-state");
    const accessModeEl = $("access-mode");
    const roomsEl = $("rooms");
    const backendEl = $("backend");
    const roomStatsEl = $("room-stats");
    const opsSummaryEl = $("ops-summary");
    const roomFilterEl = $("room-filter");
    const roomSearchEl = $("room-search");
    const healthEl = $("health");
    const screenTabsEl = $("screen-tabs");
    const activityLogEl = $("activity-log");
    const leaderboardRefreshBtn = $("leaderboard-refresh");
    const leaderboardStateEl = $("leaderboard-state");
    const leaderboardUpdatedEl = $("leaderboard-updated");
    const leaderboardStatsEl = $("leaderboard-stats");
    const leaderboardEntriesEl = $("leaderboard-entries");
    const leaderboardSelectedEl = $("leaderboard-selected");
    const playerDetailEl = $("player-detail");
    const seasonPreviewEl = $("season-preview");
    const seasonStateEl = $("season-state");
    const seasonSubmitBtn = $("season-submit");
    const leaderboardRenameBtn = $("leaderboard-rename");
    const leaderboardDeleteBtn = $("leaderboard-delete");
    const leaderboardDeleteConfirmEl = $("leaderboard-delete-confirm");
    const leaderboardDeleteDetailEl = $("leaderboard-delete-detail");
    const leaderboardDeleteCancelBtn = $("leaderboard-delete-cancel");
    const leaderboardDeleteConfirmSubmitBtn = $("leaderboard-delete-confirm-submit");
    const walletStateEl = $("wallet-state");
    const walletHistoryEl = $("wallet-history");
    const walletListEl = $("wallet-list-output");
    const walletListBtn = $("wallet-list");
    const walletConfirmEl = $("wallet-confirm");
    const walletConfirmTitleEl = $("wallet-confirm-title");
    const walletConfirmDetailEl = $("wallet-confirm-detail");
    const walletConfirmNoteEl = $("wallet-confirm-note");
    const walletCancelBtn = $("wallet-cancel");
    const walletConfirmSubmitBtn = $("wallet-confirm-submit");
    const cashSubmitBtn = $("cash-submit");
    const tournamentSubmitBtn = $("tournament-submit");
    const toastEl = $("toast");
    const inviteEl = $("invite");
    const inviteTitleEl = $("invite-title");
    const inviteDetailEl = $("invite-detail");
    const inviteLinkEl = $("invite-link");
    const inviteCodeEl = $("invite-code");
    const copyLinkBtn = $("copy-link");
    const copyCodeBtn = $("copy-code");
    const copyInviteBtn = $("copy-invite");
    const closeConfirmEl = $("close-confirm");
    const closeConfirmTitleEl = $("close-confirm-title");
    const closeConfirmDetailEl = $("close-confirm-detail");
    const closeConfirmSettlementEl = $("close-confirm-settlement");
    const closeConfirmSeatsEl = $("close-confirm-seats");
    const closeCancelBtn = $("close-cancel");
    const closeConfirmSubmitBtn = $("close-confirm-submit");
    let currentInvite = null;
    let pendingCloseRoom = null;
    let pendingWalletAction = null;
    let pendingLeaderboardDelete = null;
    let currentRoomFilter = "all";
    let currentRoomSearch = "";
    let lastRoomsData = null;
    let lastRoomsLoadedAt = 0;
    let lastLeaderboardData = null;
    let leaderboardSearchTimer = 0;
    let closePreviewRequestId = 0;
    let adminReady = false;
    let lastAccessData = null;
    let lastAccessStatus = {};
    const localActivity = [];
    const LEADERBOARD_LIMIT = 250;
    const ERROR_COPY = {
      admin_only: "Нет доступа к кабинету: войди разрешённым Google-аккаунтом.",
      admin_not_configured: "Доступ к кабинету не настроен на backend.",
      bad_origin: "Запрос отклонён: страница открыта не с того origin.",
      display_name_required: "Укажи новый ник.",
      github_storage_required: "Центральное GitHub-хранилище не подключено.",
      name_rejected: "Название не прошло фильтр модерации.",
      not_tournament: "Это не турнирный стол.",
      player_key_required: "Укажи ключ игрока.",
      rate_limited: "Слишком много запросов. Подожди и повтори.",
      registration_state_required: "Не передано новое состояние регистрации.",
      room_id_required: "Не выбран стол.",
      room_id_unavailable: "Не удалось выдать id стола. Повтори создание.",
      room_not_found: "Стол уже закрыт или не найден.",
      season_dates_required: "Укажи старт и финиш сезона.",
      season_id_required: "Укажи ID сезона.",
      season_label_required: "Укажи название сезона.",
      season_range_invalid: "Финиш сезона должен быть позже старта.",
      wallet_action_unsupported: "Операция кошелька не поддерживается.",
      wallet_update_failed: "Кошелёк не обновлён.",
      wallet_user_required: "Укажи ID игрока для кошелька."
    };

    function callbackStatus(uri) {
      const value = String(uri || "").trim();
      if (!value) return "";
      try {
        const url = new URL(value, window.location?.origin || "https://ff-start-poker-hub.vercel.app");
        return ` Callback: ${url.pathname}.`;
      } catch {
        return " Callback настроен.";
      }
    }

    function adminReturnTo() {
      return `${window.location.pathname}${window.location.search}${window.location.hash || "#lobby"}`;
    }

    function adminLoginUrl() {
      return `/api/auth/google/start?returnTo=${encodeURIComponent(adminReturnTo())}`;
    }

    function redirectToAdminLogin() {
      window.location.href = adminLoginUrl();
    }

    function requestServerGateRefresh() {
      const target = adminReturnTo();
      try {
        if (window.sessionStorage.getItem(GATE_RETRY_KEY) === target) return false;
        window.sessionStorage.setItem(GATE_RETRY_KEY, target);
      } catch {
        return false;
      }
      window.location.replace(target);
      return true;
    }

    function clearServerGateRetry() {
      try { window.sessionStorage.removeItem(GATE_RETRY_KEY); } catch {}
    }

    function handleAdminGateBlocked(auth = {}) {
      const message = auth.authenticated === true
        ? "Этот Google-аккаунт не входит в allowlist кабинета. Доступ должен отсекаться серверным gate до загрузки страницы."
        : "Серверный gate не подтвердил кабинет. Перенаправляем на Google-вход.";
      setAdminReady(false);
      if (tokenState) tokenState.textContent = message;
      renderLeaderboardBlocked(message);
      renderRooms({ backend: "unavailable", durable: false, rooms: [] });
      if (auth.authenticated !== true && auth.configured !== false) {
        redirectToAdminLogin();
        return true;
      }
      if (auth.authenticated === true) return requestServerGateRefresh();
      return false;
    }

    function syncAccessChrome(data = lastAccessData, status = lastAccessStatus) {
      const auth = data?.auth || {};
      const googleAdmin = auth.admin === true;
      const adminOk = status?.adminReady === true || googleAdmin || adminReady;
      root.classList.toggle("is-google-admin", googleAdmin || adminOk);
      root.classList.toggle("is-access-ready", adminOk);
      root.classList.toggle("is-access-blocked", !adminOk);
      if (accessModeEl) {
        accessModeEl.textContent = adminOk ? "Кабинет открыт" : "Проверяем gate";
      }
    }

    function toast(message) {
      toastEl.textContent = message;
      toastEl.hidden = false;
      window.clearTimeout(toastEl._timer);
      toastEl._timer = window.setTimeout(() => { toastEl.hidden = true; }, 3200);
    }

    async function api(path, options = {}) {
      const headers = { Accept: "application/json", ...(options.headers || {}) };
      if (options.body !== undefined) headers["Content-Type"] = "application/json";
      const response = await window.fetch(path, {
        method: options.method || "GET",
        headers,
        credentials: "same-origin",
        cache: "no-store",
        body: options.body !== undefined ? JSON.stringify(options.body) : undefined
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || data?.ok === false) {
        const error = new Error(data?.error || `http_${response.status}`);
        error.status = response.status;
        throw error;
      }
      return data;
    }

    function readableError(error) {
      const raw = String(error?.message || error || "").trim();
      if (!raw) return "Неизвестная ошибка.";
      return ERROR_COPY[raw] || ERROR_COPY[raw.replace(/^http_/, "")] || raw.replace(/_/g, " ");
    }

    function activityTime(value = Date.now()) {
      return shortTime(value);
    }

    function renderActivity(adminEvents = []) {
      if (!activityLogEl) return;
      const remote = (Array.isArray(adminEvents) ? adminEvents : []).map((event) => ({
        at: Date.parse(event?.receivedAt || "") || 0,
        title: eventActionLabel(event?.action),
        detail: adminEventDetail(event),
        source: "audit"
      }));
      const entries = [...localActivity, ...remote]
        .sort((left, right) => Number(right.at || 0) - Number(left.at || 0))
        .slice(0, 8);
      activityLogEl.replaceChildren();
      if (!entries.length) {
        const li = document.createElement("li");
        const title = document.createElement("b");
        title.textContent = "Ожидаем действия";
        const detail = document.createElement("span");
        detail.textContent = "Здесь появятся последние обновления, ошибки и audit-записи.";
        li.append(title, detail);
        activityLogEl.append(li);
        return;
      }
      entries.forEach((entry) => {
        const li = document.createElement("li");
        const title = document.createElement("b");
        title.textContent = `${activityTime(entry.at)} · ${entry.title}`;
        const detail = document.createElement("span");
        detail.textContent = entry.detail || entry.source || "";
        li.append(title, detail);
        activityLogEl.append(li);
      });
    }

    function recordActivity(title, detail = "", status = "ok") {
      localActivity.unshift({
        at: Date.now(),
        title,
        detail: [status === "error" ? "ошибка" : "", detail].filter(Boolean).join(" · "),
        source: "local"
      });
      localActivity.splice(12);
      renderActivity(lastLeaderboardData?.adminEvents);
    }

    function eventActionLabel(action) {
      const key = String(action || "");
      if (key === "start-season") return "Запуск сезона";
      if (key === "leaderboard-rename-player") return "Правка ника";
      if (key === "leaderboard-delete-player") return "Удаление игрока";
      return key.replace(/-/g, " ") || "Audit event";
    }

    function adminEventDetail(event = {}) {
      const details = event.details || {};
      const parts = [
        details.displayName ? `ник: ${details.displayName}` : "",
        details.season?.label ? `сезон: ${details.season.label}` : "",
        Number.isFinite(Number(details.renamed)) ? `строк: ${fmt(details.renamed)}` : "",
        Number.isFinite(Number(details.removed)) ? `удалено: ${fmt(details.removed)}` : "",
        details.issueCount ? `shards: ${fmt(details.issueCount)}` : "",
        details.note ? `аудит: ${details.note}` : ""
      ];
      return parts.filter(Boolean).join(" · ") || "audit";
    }

    function adminBlockedMessage() {
      if (!adminReady) return "Данные кабинета ещё загружаются. Обнови страницу, если кабинет не разблокировался.";
      return "";
    }

    function setAdminOnlyControlState(control) {
      if (!control) return;
      control.disabled = !adminReady;
      control.title = adminReady ? "" : "Ждём подтверждения API кабинета.";
    }

    function renderAdminControlsState() {
      setAdminOnlyControlState($("wallet-submit"));
      setAdminOnlyControlState(walletListBtn);
      setAdminOnlyControlState(walletConfirmSubmitBtn);
      setAdminOnlyControlState(cashSubmitBtn);
      setAdminOnlyControlState(tournamentSubmitBtn);
      setAdminOnlyControlState(closeConfirmSubmitBtn);
      setAdminOnlyControlState(seasonSubmitBtn);
      setAdminOnlyControlState(leaderboardRenameBtn);
      setAdminOnlyControlState(leaderboardDeleteBtn);
      setAdminOnlyControlState(leaderboardDeleteConfirmSubmitBtn);
    }

    function setAdminReady(value) {
      adminReady = value === true;
      renderAdminControlsState();
      syncAccessChrome();
    }

    function screenFromLocation() {
      const hash = String(window.location.hash || "").replace(/^#/, "");
      return hash === "lobby" ? "lobby" : "leaderboard";
    }

    function setScreen(name, options = {}) {
      const target = name === "lobby" ? "lobby" : "leaderboard";
      root.querySelectorAll("[data-admin-screen]").forEach((screen) => {
        const active = screen.getAttribute("data-admin-screen") === target;
        screen.hidden = !active;
        screen.classList.toggle("is-active", active);
      });
      screenTabsEl?.querySelectorAll("button[data-admin-screen-tab]").forEach((button) => {
        const active = button.getAttribute("data-admin-screen-tab") === target;
        button.setAttribute("aria-selected", active ? "true" : "false");
        button.tabIndex = active ? 0 : -1;
      });
      if (options.syncUrl !== false && window.location.hash !== `#${target}`) {
        window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}#${target}`);
      }
    }

    function value(form, name, fallback = "") {
      return String(new FormData(form).get(name) ?? fallback).trim();
    }

    function numberValue(form, name, fallback) {
      const parsed = Number(value(form, name, fallback));
      return Number.isFinite(parsed) ? parsed : fallback;
    }

    function cleanAccessCode(input) {
      return String(input || "").replace(/\s+/g, " ").trim().slice(0, 24);
    }

    function checked(form, name) {
      return new FormData(form).get(name) === "on";
    }

    function cleanAdminNote(input) {
      return String(input || "").replace(/\s+/g, " ").trim().slice(0, 160);
    }

    function randomId() {
      try {
        if (window.crypto?.randomUUID) return window.crypto.randomUUID();
        const bytes = new Uint8Array(12);
        window.crypto?.getRandomValues?.(bytes);
        if (bytes.some(Boolean)) return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
      } catch {
        // Fall through to the timestamp fallback below.
      }
      return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    }

    function hashString(input) {
      let hash = 2166136261;
      const text = String(input || "");
      for (let index = 0; index < text.length; index += 1) {
        hash ^= text.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
      }
      return (hash >>> 0).toString(36);
    }

    function requestStorageKey(kind, payload) {
      return `${REQUEST_KEY_PREFIX}${String(kind || "op")}:${hashString(JSON.stringify(payload || {}))}`;
    }

    function pendingRequestId(kind, payload) {
      const key = requestStorageKey(kind, payload);
      try {
        const existing = window.sessionStorage.getItem(key) || "";
        if (existing) return existing;
        const created = `${kind}:${randomId()}`;
        window.sessionStorage.setItem(key, created);
        return created;
      } catch {
        return `${kind}:${randomId()}`;
      }
    }

    function clearPendingRequestId(kind, payload, requestId) {
      const key = requestStorageKey(kind, payload);
      try {
        if (!requestId || window.sessionStorage.getItem(key) === requestId) window.sessionStorage.removeItem(key);
      } catch {
        // sessionStorage can be unavailable; server idempotency still worked for this request.
      }
    }

    function walletActionPayload(form) {
      const action = value(form, "action", "read");
      const amount = Math.max(0, Math.round(numberValue(form, "amountChips", 0)));
      return {
        op: "wallet",
        userId: value(form, "userId", ""),
        displayName: value(form, "displayName", ""),
        action,
        amountChips: amount,
        balanceChips: action === "set" ? amount : undefined,
        note: cleanAdminNote(value(form, "note", ""))
      };
    }

    function roomCost(room) {
      const fallback = Number(room.startingStackBb || 100) * 100;
      return room.simulationMode === "tournament"
        ? Number(room.entryFeeChips || room.buyInChips || fallback)
        : Number(room.buyInChips || fallback);
    }

    function roomModeKey(room) {
      return room?.simulationMode === "tournament" ? "tournament" : "cash";
    }

    function roomMatchesFilter(room) {
      if (currentRoomFilter === "cash") return roomModeKey(room) === "cash";
      if (currentRoomFilter === "tournament") return roomModeKey(room) === "tournament";
      return true;
    }

    function roomSearchTerm() {
      return String(currentRoomSearch || "").replace(/\s+/g, " ").trim().toLowerCase();
    }

    function roomMatchesSearch(room) {
      const term = roomSearchTerm();
      if (!term) return true;
      const seatText = Array.isArray(room?.adminSeats)
        ? room.adminSeats.map((seat) => [seat?.playerName, seat?.walletUserId, seat?.state].filter(Boolean).join(" ")).join(" ")
        : "";
      const haystack = [
        room?.id,
        room?.name,
        room?.simulationMode,
        room?.status,
        seatText
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(term);
    }

    function fmt(value) {
      return Math.max(0, Math.round(Number(value || 0))).toLocaleString("ru-RU");
    }

    function roomLink(roomId) {
      const url = new URL("poker-simulator.html", window.location.href);
      url.search = "";
      url.hash = "";
      url.searchParams.set("room", String(roomId || ""));
      return url.toString();
    }

    function inviteMessage(invite) {
      if (!invite) return "";
      return [
        `FF Start: ${invite.name}`,
        `Стол: ${invite.mode}`,
        `Ссылка: ${invite.link}`,
        invite.accessCode ? `Код доступа: ${invite.accessCode}` : "",
        invite.accessCode ? "Ссылка без секрета. Код отправь отдельным сообщением." : ""
      ].filter(Boolean).join("\n");
    }

    function fallbackCopy(text, done, failMessage) {
      try {
        const area = document.createElement("textarea");
        area.value = text;
        area.setAttribute("readonly", "");
        area.style.position = "fixed";
        area.style.left = "-9999px";
        document.body.append(area);
        area.select();
        const copied = document.execCommand("copy");
        area.remove();
        if (copied) done();
        else toast(failMessage);
      } catch {
        toast(failMessage);
      }
    }

    function copyTextToClipboard(text, doneMessage, failMessage = "Скопируй текст вручную.") {
      const payload = String(text || "");
      if (!payload) {
        toast("Нечего копировать.");
        return;
      }
      const done = () => toast(doneMessage);
      if (window.navigator?.clipboard?.writeText) {
        window.navigator.clipboard.writeText(payload).then(done).catch(() => fallbackCopy(payload, done, failMessage));
        return;
      }
      fallbackCopy(payload, done, failMessage);
    }

    function buildInvite(room, accessCode = "") {
      const id = String(room?.id || "").trim();
      if (!id) return null;
      const mode = room?.simulationMode === "tournament" ? "турнир" : "кэш";
      return {
        id,
        name: room?.name || id,
        mode,
        link: roomLink(id),
        accessCode: cleanAccessCode(accessCode),
        hasAccessCode: Boolean(room?.hasAccessCode || cleanAccessCode(accessCode))
      };
    }

    function renderInvite(invite) {
      currentInvite = invite || null;
      if (!inviteEl) return;
      inviteEl.hidden = !currentInvite;
      if (!currentInvite) return;
      inviteTitleEl.textContent = `${currentInvite.name} · ${currentInvite.mode}`;
      inviteDetailEl.textContent = currentInvite.accessCode
        ? "Ссылка не содержит секрет. Код доступа отправь отдельным сообщением или скопируй всё."
        : "Ссылка готова для игроков. Стол без отдельного access code.";
      inviteLinkEl.textContent = currentInvite.link;
      inviteCodeEl.hidden = !currentInvite.accessCode;
      inviteCodeEl.textContent = currentInvite.accessCode ? `Код доступа: ${currentInvite.accessCode}` : "";
      if (copyCodeBtn) copyCodeBtn.hidden = !currentInvite.accessCode;
    }

    function clearInviteForRoom(roomId) {
      if (currentInvite?.id === String(roomId || "")) renderInvite(null);
    }

    function copyCurrentInvite(part) {
      if (!currentInvite) {
        toast("Сначала создай стол.");
        return;
      }
      if (part === "code") {
        copyTextToClipboard(currentInvite.accessCode, "Код доступа скопирован.", "Скопируй код из блока приглашения.");
      } else if (part === "message") {
        copyTextToClipboard(inviteMessage(currentInvite), "Приглашение скопировано.", "Скопируй приглашение из блока.");
      } else {
        copyTextToClipboard(currentInvite.link, "Ссылка на стол скопирована.", "Скопируй ссылку из блока приглашения.");
      }
    }

    function signedFmt(value) {
      const number = Math.round(Number(value || 0));
      const sign = number > 0 ? "+" : "";
      return sign + number.toLocaleString("ru-RU");
    }

    function balanceFmt(value) {
      const number = Math.round(Number(value || 0));
      return number < 0 ? `-${fmt(Math.abs(number))}` : fmt(number);
    }

    function signedBb(value) {
      const number = Math.round(Number(value || 0) * 10) / 10;
      const sign = number > 0 ? "+" : "";
      return `${sign}${number.toLocaleString("ru-RU")} BB`;
    }

    function pct(value) {
      const number = Number(value || 0);
      return `${Math.round(number * 1000) / 10}%`;
    }

    function dateTimeLocalValue(value) {
      const parsed = Date.parse(value || "");
      if (!Number.isFinite(parsed)) return "";
      const date = new Date(parsed);
      const pad = (num) => String(num).padStart(2, "0");
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
    }

    function humanDateTime(value) {
      const parsed = Date.parse(value || "");
      if (!Number.isFinite(parsed)) return "";
      return new Date(parsed).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" });
    }

    function shortTime(value = Date.now()) {
      const date = value instanceof Date ? value : new Date(value);
      return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    }

    function roomDataAgeMs() {
      return lastRoomsLoadedAt ? Date.now() - lastRoomsLoadedAt : Infinity;
    }

    function roomDataAgeLabel() {
      const age = roomDataAgeMs();
      if (!Number.isFinite(age)) return "данные ещё не загружены";
      const seconds = Math.max(0, Math.round(age / 1000));
      if (seconds < 60) return `${seconds}с назад`;
      return `${Math.round(seconds / 60)}м назад`;
    }

    function roomDataStale() {
      return roomDataAgeMs() > 60_000;
    }

    function monthSeason(offsetMonths = 0) {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1, 0, 0, 0, 0);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 1, 0, 0, 0, 0);
      const pad = (num) => String(num).padStart(2, "0");
      const id = `season-${start.getFullYear()}-${pad(start.getMonth() + 1)}`;
      const label = start.toLocaleDateString("ru-RU", { month: "long", year: "numeric" }).replace(/^./, (char) => char.toUpperCase());
      return { id, label, startAt: dateTimeLocalValue(start.toISOString()), endAt: dateTimeLocalValue(end.toISOString()) };
    }

    function shortAccessCode() {
      const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      let code = "";
      try {
        const bytes = new Uint8Array(6);
        window.crypto?.getRandomValues?.(bytes);
        for (const byte of bytes) code += alphabet[byte % alphabet.length];
      } catch {
        code = Math.random().toString(36).slice(2, 8).toUpperCase();
      }
      return code || "PRIVATE";
    }

    function leaderboardQuery() {
      const form = $("leaderboard-filter-form");
      const data = form ? new FormData(form) : new FormData();
      const params = new URLSearchParams({ admin: "1", limit: String(LEADERBOARD_LIMIT) });
      ["period", "players", "difficulty", "search"].forEach((key) => {
        const value = String(data.get(key) || "").trim();
        if (value) params.set(key, value);
      });
      return params.toString();
    }

    function leaderboardSearchTerm() {
      const form = $("leaderboard-filter-form");
      if (!form) return "";
      return String(new FormData(form).get("search") || "").replace(/\s+/g, " ").trim().toLowerCase();
    }

    function leaderboardEntryMatchesSearch(entry, term) {
      if (!term) return true;
      const haystack = [
        entry?.playerKey,
        entry?.id,
        entry?.sessionId,
        entry?.source,
        entry?.profile?.id,
        entry?.profile?.name,
        entry?.profile?.displayName,
        entry?.profile?.email
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(term);
    }

    function scheduleLeaderboardSearchRefresh() {
      window.clearTimeout(leaderboardSearchTimer);
      if (!adminReady) return;
      leaderboardSearchTimer = window.setTimeout(() => {
        refreshLeaderboardAdmin({ silent: true }).catch((error) => toast(`Лидерборд: ${readableError(error)}`));
      }, 280);
    }

    function seasonPayload(form) {
      return {
        op: "start-season",
        season: {
          id: value(form, "id", ""),
          label: value(form, "label", ""),
          startAt: value(form, "startAt", ""),
          endAt: value(form, "endAt", "")
        },
        note: cleanAdminNote(value(form, "note", ""))
      };
    }

    function applySeasonPreset(preset) {
      const form = $("season-form");
      if (!form) return;
      if (preset === "clear") {
        form.elements.id.value = "";
        form.elements.label.value = "";
        form.elements.startAt.value = "";
        form.elements.endAt.value = "";
        form.elements.note.value = "";
        form.dataset.dirty = "true";
        updateSeasonPreview();
        toast("Поля сезона очищены.");
        return;
      }
      const next = monthSeason(preset === "next-month" ? 1 : 0);
      form.elements.id.value = next.id;
      form.elements.label.value = next.label;
      form.elements.startAt.value = next.startAt;
      form.elements.endAt.value = next.endAt;
      if (!String(form.elements.note.value || "").trim()) form.elements.note.value = `запуск сезона ${next.label}`;
      form.dataset.dirty = "true";
      updateSeasonPreview();
      toast(`Заполнен сезон: ${next.label}.`);
    }

    function leaderboardEditPayload(form, op) {
      return {
        op,
        playerKey: value(form, "playerKey", ""),
        displayName: value(form, "displayName", ""),
        note: cleanAdminNote(value(form, "note", ""))
      };
    }

    function fillSeasonForm(season = {}) {
      const form = $("season-form");
      if (!form || form.dataset.dirty === "true") return;
      form.elements.id.value = season.id || "";
      form.elements.label.value = season.label || "";
      form.elements.startAt.value = dateTimeLocalValue(season.startAt);
      form.elements.endAt.value = dateTimeLocalValue(season.endAt);
    }

    function updateSeasonPreview() {
      const form = $("season-form");
      if (!seasonPreviewEl || !form) return;
      const id = value(form, "id", "");
      const label = value(form, "label", "");
      const start = humanDateTime(value(form, "startAt", ""));
      const end = humanDateTime(value(form, "endAt", ""));
      if (!id && !label && !start && !end) {
        seasonPreviewEl.textContent = "Выбери пресет или заполни поля сезона.";
        return;
      }
      const range = [start, end].filter(Boolean).join(" - ");
      seasonPreviewEl.textContent = `${label || "Новый сезон"} · ${id || "без ID"}${range ? ` · ${range}` : ""}`;
    }

    function seasonValidationMessage(payload = {}) {
      const season = payload.season || {};
      if (!String(season.id || "").trim()) return ERROR_COPY.season_id_required;
      if (!String(season.label || "").trim()) return ERROR_COPY.season_label_required;
      const startMs = Date.parse(season.startAt || "");
      const endMs = Date.parse(season.endAt || "");
      if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return ERROR_COPY.season_dates_required;
      if (endMs <= startMs) return ERROR_COPY.season_range_invalid;
      return "";
    }

    function renderSeason(data = {}) {
      const season = data.season || {};
      fillSeasonForm(season);
      updateSeasonPreview();
      if (!seasonStateEl) return;
      const range = [humanDateTime(season.startAt), humanDateTime(season.endAt)].filter(Boolean).join(" - ");
      const source = season.source === "stored" ? "задан вручную" : season.source === "env" ? "из настроек" : "по умолчанию";
      seasonStateEl.textContent = `${season.label || "Текущий сезон"} · ${season.id || "season-current"} · ${range || "без дат"} · ${source}`;
    }

    function fillLeaderboardForm(entry = {}) {
      const form = $("leaderboard-form");
      if (!form) return;
      form.elements.playerKey.value = entry.playerKey || "";
      form.elements.displayName.value = entry.profile?.name || "";
      form.elements.note.value = "";
      hideLeaderboardDeleteConfirm();
      if (leaderboardSelectedEl) {
        const name = entry.profile?.name || entry.playerKey || "Игрок";
        const hands = fmt(entry.metrics?.hands);
        leaderboardSelectedEl.textContent = `${name} выбран · ${hands} рук · ключ подставлен в форму.`;
      }
      renderPlayerDetail(entry);
      form.scrollIntoView({ block: "nearest" });
    }

    function hideLeaderboardDeleteConfirm() {
      pendingLeaderboardDelete = null;
      if (leaderboardDeleteConfirmEl) leaderboardDeleteConfirmEl.hidden = true;
    }

    function showLeaderboardDeleteConfirm() {
      const blocked = adminBlockedMessage();
      if (blocked) {
        toast(blocked);
        return;
      }
      const form = $("leaderboard-form");
      const payload = leaderboardEditPayload(form, "leaderboard-delete-player");
      if (!payload.playerKey) {
        toast("Укажи ключ игрока.");
        return;
      }
      pendingLeaderboardDelete = payload;
      if (leaderboardDeleteDetailEl) {
        leaderboardDeleteDetailEl.textContent = `${payload.playerKey}${payload.note ? ` · аудит: ${payload.note}` : ""}`;
      }
      if (leaderboardDeleteConfirmEl) {
        leaderboardDeleteConfirmEl.hidden = false;
        leaderboardDeleteConfirmEl.scrollIntoView({ block: "nearest" });
        leaderboardDeleteCancelBtn?.focus?.({ preventScroll: true });
      }
    }

    function fillWalletFromLeaderboard(entry = {}) {
      const form = $("wallet-form");
      const playerKey = String(entry.playerKey || entry.id || "").trim();
      if (!form || !playerKey) {
        toast("У игрока нет ключа для кошелька.");
        return;
      }
      form.elements.userId.value = playerKey;
      form.elements.displayName.value = entry.profile?.name || "";
      form.elements.action.value = "read";
      hideWalletConfirm();
      setScreen("lobby");
      form.scrollIntoView({ block: "nearest" });
      toast("Игрок подставлен в форму кошелька.");
    }

    function leaderboardPlayerKey(entry = {}) {
      return String(entry.playerKey || entry.id || "").trim().toLowerCase();
    }

    function playerStatsForEntry(entry = {}) {
      const key = leaderboardPlayerKey(entry);
      const players = Array.isArray(lastLeaderboardData?.players) ? lastLeaderboardData.players : [];
      return players.find((player) => String(player?.playerKey || "").trim().toLowerCase() === key) || null;
    }

    function metricRow(label, value, detail = "") {
      const item = document.createElement("div");
      item.className = "mp-admin-player-metric";
      const title = document.createElement("b");
      title.textContent = value;
      const sub = document.createElement("span");
      sub.textContent = detail ? `${label} · ${detail}` : label;
      item.append(title, sub);
      return item;
    }

    function renderPlayerDetail(entry = null) {
      if (!playerDetailEl) return;
      playerDetailEl.replaceChildren();
      if (!entry) {
        const title = document.createElement("b");
        title.textContent = "Игрок не выбран";
        const detail = document.createElement("span");
        detail.textContent = "Нажми «Править» в строке лидерборда, чтобы увидеть сессии, источники и последние руки.";
        playerDetailEl.append(title, detail);
        return;
      }
      const stats = playerStatsForEntry(entry);
      const profile = stats?.profile || entry.profile || {};
      const metrics = stats?.metrics || entry.metrics || {};
      const name = profile.name || entry.playerKey || "Игрок";
      const key = entry.playerKey || stats?.playerKey || entry.id || "";
      const title = document.createElement("div");
      title.className = "mp-admin-player-title";
      const titleText = document.createElement("b");
      titleText.textContent = name;
      const keyText = document.createElement("code");
      keyText.textContent = key;
      title.append(titleText, keyText);

      const summary = document.createElement("div");
      summary.className = "mp-admin-player-metrics";
      summary.append(
        metricRow("руки", fmt(metrics.hands), `${fmt(stats?.sessionCount || entry.sessionCount || 0)} сессий`),
        metricRow("EV bb/100", signedBb(metrics.evBb100), `${pct(metrics.evWinRate ?? metrics.winRate)} winrate`),
        metricRow("score", signedBb(entry.rating?.score ?? metrics.score), entry.rating?.qualified ? "зачёт" : "малая выборка"),
        metricRow("источники", (stats?.sources || [entry.source || "leaderboard"]).join(", "), `до ${fmt(LEADERBOARD_LIMIT)} строк`)
      );

      const sessions = [
        ...(Array.isArray(stats?.sessions) ? stats.sessions : []),
        ...(Array.isArray(stats?.handHistory?.sessions) ? stats.handHistory.sessions : [])
      ];
      const dedupedSessions = [];
      const seen = new Set();
      sessions.forEach((session) => {
        const id = String(session?.sessionId || "").trim();
        if (!id || seen.has(id)) return;
        seen.add(id);
        dedupedSessions.push(session);
      });
      const sessionList = document.createElement("ul");
      sessionList.className = "mp-admin-player-sessions";
      if (!dedupedSessions.length) {
        const li = document.createElement("li");
        li.textContent = "Разбивки по сессиям нет в загруженных данных.";
        sessionList.append(li);
      } else {
        dedupedSessions.slice(0, 6).forEach((session) => {
          const li = document.createElement("li");
          const main = document.createElement("b");
          main.textContent = session.sessionId || "session";
          const detail = document.createElement("span");
          const when = humanDateTime(session.lastPlayedAt || session.updatedAt || session.firstPlayedAt);
          detail.textContent = [
            `${fmt(session.metrics?.hands)} рук`,
            signedBb(session.metrics?.evNetBb ?? session.metrics?.netBb),
            session.playerCount ? `${fmt(session.playerCount)}max` : "",
            session.difficulty || "",
            when
          ].filter(Boolean).join(" · ");
          li.append(main, detail);
          sessionList.append(li);
        });
      }
      playerDetailEl.append(title, summary, sessionList);
    }

    function renderLeaderboardStats(data = {}) {
      if (!leaderboardStatsEl) return;
      const entries = Array.isArray(data.entries) ? data.entries : [];
      const qualified = entries.filter((entry) => entry?.rating?.qualified).length;
      const hands = entries.reduce((sum, entry) => sum + Number(entry?.metrics?.hands || 0), 0);
      const sessions = entries.reduce((sum, entry) => sum + Number(entry?.sessionCount || 0), 0);
      leaderboardStatsEl.replaceChildren(
        statCard("Игроки", fmt(entries.length), `${fmt(qualified)} прошли порог`),
        statCard("Руки", fmt(hands), `${fmt(data.qualificationHands || 20)} рук для зачёта`),
        statCard("Сессии", fmt(sessions), "агрегация по игрокам"),
        statCard("Источник", data.configured ? "готов" : "нет данных", data.storage?.githubConfigured ? data.storage.githubRepo || "GitHub" : "центральное хранилище не подключено")
      );
    }

    function leaderboardMetric(label, value) {
      const wrap = document.createElement("div");
      wrap.className = "mp-admin-leaderboard-metric";
      const main = document.createElement("span");
      main.textContent = value;
      const sub = document.createElement("small");
      sub.textContent = label;
      wrap.append(main, sub);
      return wrap;
    }

    function renderLeaderboard(data = {}) {
      lastLeaderboardData = data || null;
      renderActivity(data.adminEvents);
      renderSeason(data);
      renderLeaderboardStats(data);
      if (!leaderboardEntriesEl) return;
      leaderboardEntriesEl.replaceChildren();
      const allEntries = Array.isArray(data.entries) ? data.entries : [];
      const searchTerm = leaderboardSearchTerm();
      const rankedEntries = allEntries.map((entry, index) => ({ entry, rank: index + 1 }));
      const visibleEntries = rankedEntries.filter(({ entry }) => leaderboardEntryMatchesSearch(entry, searchTerm));
      if (!visibleEntries.length) {
        const li = document.createElement("li");
        li.className = "mp-admin-leaderboard-row";
        const rank = document.createElement("span");
        rank.className = "mp-admin-leaderboard-rank";
        rank.textContent = "-";
        const main = document.createElement("div");
        main.className = "mp-admin-leaderboard-player";
        const title = document.createElement("b");
        title.textContent = searchTerm && allEntries.length ? "Игрок не найден" : data.configured ? "Строк нет" : "Центральные данные недоступны";
        const detail = document.createElement("small");
        detail.textContent = searchTerm && allEntries.length
          ? "Проверь написание или очисти поиск. Запрос уже отправляется в центральное хранилище."
          : data.configured ? "Для выбранных фильтров нет игроков." : "Проверь подключение хранилища сессий перед правками лидерборда.";
        main.append(title, detail);
        li.append(rank, main);
        leaderboardEntriesEl.append(li);
        if (leaderboardStateEl) {
          const season = data.season || {};
          leaderboardStateEl.textContent = searchTerm
            ? `0 из ${fmt(allEntries.length)} игроков · ${season.label || "Сезон"} · серверный поиск`
            : `${fmt(allEntries.length)} игроков · ${season.label || "Сезон"} · серверные фильтры`;
        }
        return;
      }
      visibleEntries.forEach(({ entry, rank: originalRank }) => {
        const li = document.createElement("li");
        li.className = "mp-admin-leaderboard-row";
        const rank = document.createElement("span");
        rank.className = "mp-admin-leaderboard-rank";
        rank.textContent = `#${originalRank}`;
        const player = document.createElement("div");
        player.className = "mp-admin-leaderboard-player";
        const name = document.createElement("b");
        name.textContent = entry.profile?.name || entry.playerKey || "Игрок";
        const key = document.createElement("small");
        key.textContent = entry.playerKey || entry.id || "";
        key.title = key.textContent;
        player.append(name, key);
        const score = leaderboardMetric("score", signedBb(entry.rating?.score ?? entry.metrics?.score));
        const hands = leaderboardMetric("руки", fmt(entry.metrics?.hands));
        const ev = leaderboardMetric("EV bb/100", signedBb(entry.metrics?.evBb100));
        const win = leaderboardMetric("winrate", pct(entry.metrics?.evWinRate ?? entry.metrics?.winRate));
        const edit = document.createElement("button");
        edit.type = "button";
        edit.textContent = "Править";
        edit.disabled = !adminReady;
        edit.title = adminReady ? "" : "Ждём подтверждения API кабинета.";
        edit.addEventListener("click", () => fillLeaderboardForm(entry));
        const wallet = document.createElement("button");
        wallet.type = "button";
        wallet.textContent = "Кошелёк";
        wallet.addEventListener("click", () => fillWalletFromLeaderboard(entry));
        const copyKey = document.createElement("button");
        copyKey.type = "button";
        copyKey.textContent = "Ключ";
        copyKey.addEventListener("click", () => copyTextToClipboard(entry.playerKey || entry.id || "", "Ключ игрока скопирован.", "Скопируй ключ из строки лидерборда."));
        const actions = document.createElement("div");
        actions.className = "mp-admin-leaderboard-actions";
        actions.append(edit, wallet, copyKey);
        li.append(rank, player, score, hands, ev, win, actions);
        leaderboardEntriesEl.append(li);
      });
      if (leaderboardStateEl) {
        const season = data.season || {};
        const source = data.configured ? "центральные данные доступны" : "центральные данные недоступны";
        const count = searchTerm ? `${fmt(visibleEntries.length)} из ${fmt(allEntries.length)}` : fmt(allEntries.length);
        const searchCopy = searchTerm ? "серверный поиск" : `до ${fmt(LEADERBOARD_LIMIT)} строк`;
        leaderboardStateEl.textContent = `${count} игроков · ${season.label || "Сезон"} · ${source} · ${searchCopy}`;
      }
    }

    function renderLeaderboardBlocked(message) {
      if (leaderboardStateEl) leaderboardStateEl.textContent = message;
      if (leaderboardUpdatedEl) leaderboardUpdatedEl.textContent = "Данные не обновлены.";
      if (seasonStateEl) seasonStateEl.textContent = message;
      if (leaderboardSelectedEl) leaderboardSelectedEl.textContent = "Правки станут доступны после подключения.";
      renderPlayerDetail(null);
      renderActivity(lastLeaderboardData?.adminEvents);
      renderLeaderboardStats({ entries: [], configured: false });
      if (leaderboardEntriesEl) {
        leaderboardEntriesEl.replaceChildren();
        const li = document.createElement("li");
        li.className = "mp-admin-leaderboard-row";
        const rank = document.createElement("span");
        rank.className = "mp-admin-leaderboard-rank";
        rank.textContent = "-";
        const main = document.createElement("div");
        main.className = "mp-admin-leaderboard-player";
        const title = document.createElement("b");
        title.textContent = "Подключение не принято";
        const detail = document.createElement("small");
        detail.textContent = message;
        main.append(title, detail);
        li.append(rank, main);
        leaderboardEntriesEl.append(li);
      }
    }

    function occupiedCount(room) {
      return Math.max(0, Math.round(Number(room?.occupiedCount || 0)));
    }

    function maxSeatsCount(room) {
      return Math.max(0, Math.round(Number(room?.maxSeats || 0)));
    }

    function roomCommittedChips(room) {
      const occupied = occupiedAdminSeats(room);
      if (occupied.length) {
        return occupied.reduce((sum, seat) => sum + estimatedCloseSettlement(room, seat), 0);
      }
      return occupiedCount(room) * roomCost(room);
    }

    function roomStats(rooms) {
      const stats = {
        total: 0,
        cash: 0,
        tournament: 0,
        occupied: 0,
        seats: 0,
        chips: 0,
        cashChips: 0,
        tournamentChips: 0,
        registrationOpen: 0,
        registrationClosed: 0
      };
      for (const room of Array.isArray(rooms) ? rooms : []) {
        const mode = roomModeKey(room);
        const occupied = occupiedCount(room);
        const chips = roomCommittedChips(room);
        stats.total += 1;
        stats[mode] += 1;
        stats.occupied += occupied;
        stats.seats += maxSeatsCount(room);
        stats.chips += chips;
        if (mode === "tournament") {
          stats.tournamentChips += chips;
          if (room.registrationOpen === false) stats.registrationClosed += 1;
          else stats.registrationOpen += 1;
        } else {
          stats.cashChips += chips;
        }
      }
      return stats;
    }

    function statCard(label, value, detail) {
      const card = document.createElement("div");
      card.className = "mp-admin-stat";
      const title = document.createElement("b");
      title.textContent = label;
      const main = document.createElement("span");
      main.textContent = value;
      const sub = document.createElement("small");
      sub.textContent = detail;
      card.append(title, main, sub);
      return card;
    }

    function renderRoomStats(rooms) {
      if (!roomStatsEl) return;
      const stats = roomStats(rooms);
      roomStatsEl.replaceChildren(
        statCard("Открытые", fmt(stats.total), `кэш ${fmt(stats.cash)} · турниры ${fmt(stats.tournament)}`),
        statCard("Игроки", `${fmt(stats.occupied)}/${fmt(stats.seats)}`, "занятые места / всего"),
        statCard("Фантики в игре", fmt(stats.chips), `кэш ${fmt(stats.cashChips)} · турниры ${fmt(stats.tournamentChips)}`),
        statCard("Регистрация", `${fmt(stats.registrationOpen)} / ${fmt(stats.registrationClosed)}`, "турниры открыто / закрыто")
      );
    }

    function riskFlagLabel(flag) {
      const key = String(flag || "");
      if (key === "stale_playing") return "давно без обновлений";
      if (key === "empty_playing") return "playing без игроков";
      if (key === "disconnected_seats") return "есть оффлайн-места";
      return key.replace(/_/g, " ") || "risk";
    }

    function renderOpsSummary(adminOps) {
      if (!opsSummaryEl) return;
      opsSummaryEl.replaceChildren();
      if (!adminOps) {
        opsSummaryEl.append(statCard("Операции", "нужен админ", "liability и риски после подключения"));
        return;
      }
      const wallets = adminOps.wallets || {};
      const rooms = adminOps.rooms || {};
      const risk = adminOps.risk || {};
      opsSummaryEl.append(
        statCard("Кошельки", fmt(wallets.balanceChips), `${fmt(wallets.count)} кошельков`),
        statCard("В игре", fmt(rooms.tableChips), `кэш ${fmt(rooms.cashChips)} · призы ${fmt(rooms.tournamentChips)}`),
        statCard("Оффлайн", `${fmt(rooms.disconnectedSeats)} / ${fmt(rooms.sittingOutSeats)}`, "оффлайн / ситаут"),
        statCard("Риски", fmt(risk.flaggedRooms), risk.flaggedRooms ? "нужна проверка столов" : "без флагов")
      );
      const flagged = Array.isArray(risk.rooms) ? risk.rooms : [];
      if (!flagged.length) return;
      const list = document.createElement("ul");
      list.className = "mp-admin-ops-risks";
      flagged.slice(0, 4).forEach((room) => {
        const li = document.createElement("li");
        const title = document.createElement("b");
        title.textContent = room.name || room.id || "стол";
        const detail = document.createElement("span");
        const flags = Array.isArray(room.flags) ? room.flags.map(riskFlagLabel).join(", ") : "";
        detail.textContent = [
          room.id || "",
          room.status || "",
          `${fmt(room.occupiedCount)}/${fmt(room.maxSeats)}`,
          room.ageSeconds ? `${fmt(Math.round(Number(room.ageSeconds || 0) / 60))} мин` : "",
          flags
        ].filter(Boolean).join(" · ");
        li.append(title, detail);
        list.append(li);
      });
      opsSummaryEl.append(list);
    }

    function syncRoomFilterButtons() {
      if (!roomFilterEl) return;
      roomFilterEl.querySelectorAll("button[data-filter]").forEach((button) => {
        button.setAttribute("aria-selected", button.dataset.filter === currentRoomFilter ? "true" : "false");
      });
    }

    function emptyRoomsLabel() {
      if (roomSearchTerm()) return ["Ничего не найдено", "Очисти поиск или смени фильтр столов."];
      if (currentRoomFilter === "cash") return ["Нет открытых кэш-столов", "Создай кэш-стол через форму выше."];
      if (currentRoomFilter === "tournament") return ["Нет открытых турниров", "Создай турнир через форму выше."];
      return ["Нет открытых столов", "Создай кэш-стол или турнир через формы выше."];
    }

    function setFormValue(form, name, value) {
      const field = form?.elements?.[name];
      if (!field) return;
      if (field.type === "checkbox") field.checked = value === true;
      else field.value = String(value ?? "");
    }

    function applyWalletPreset(preset) {
      const form = $("wallet-form");
      if (!form) return;
      const presets = {
        read: { action: "read", amountChips: 100000, note: "" },
        "start-bankroll": { action: "set", amountChips: 100000, note: "стартовый банкролл" },
        "bonus-10k": { action: "credit", amountChips: 10000, note: "компенсация" },
        "debit-10k": { action: "debit", amountChips: 10000, note: "ручное списание" }
      };
      const values = presets[preset];
      if (!values) return;
      Object.entries(values).forEach(([name, nextValue]) => setFormValue(form, name, nextValue));
      hideWalletConfirm();
      toast("Пресет кошелька применён.");
    }

    function applyRoomPreset(preset) {
      const isTournament = String(preset || "").startsWith("tournament-");
      const form = $(isTournament ? "tournament-form" : "cash-form");
      if (!form) return;
      const shared = {
        maxSeats: 6,
        startingStackBb: isTournament ? 50 : 100,
        actionTimerSeconds: 20,
        difficulty: "standard",
        botFill: true,
        isPrivate: false,
        accessCode: ""
      };
      const presets = {
        "cash-6max": { ...shared, name: "Cash NLH · 100 BB", maxSeats: 6, buyInChips: 10000 },
        "cash-hu": { ...shared, name: "HU Cash · 100 BB", maxSeats: 2, buyInChips: 10000 },
        "cash-private": { ...shared, name: "Private Cash · 100 BB", maxSeats: 6, buyInChips: 10000, isPrivate: true, accessCode: shortAccessCode() },
        "tournament-turbo": { ...shared, name: "MTT Turbo · 50 BB", maxSeats: 6, entryFeeChips: 5000, lateRegistration: false },
        "tournament-hu": { ...shared, name: "HU Sit&Go · 30 BB", maxSeats: 2, startingStackBb: 30, entryFeeChips: 1000, actionTimerSeconds: 15, lateRegistration: false },
        "tournament-private": { ...shared, name: "Private MTT · 50 BB", maxSeats: 6, entryFeeChips: 5000, isPrivate: true, lateRegistration: true, accessCode: shortAccessCode() }
      };
      const values = presets[preset];
      if (!values) return;
      Object.entries(values).forEach(([name, nextValue]) => setFormValue(form, name, nextValue));
      toast("Пресет применён.");
    }

    function openRoom(room) {
      const id = String(room?.id || "").trim();
      if (!id) {
        toast("У стола нет id.");
        return;
      }
      window.open(roomLink(id), "_blank", "noopener");
    }

    function repeatRoomSettings(room) {
      const isTournament = roomModeKey(room) === "tournament";
      const form = $(isTournament ? "tournament-form" : "cash-form");
      if (!form) return;
      const startingStackBb = Math.max(1, Number(room?.startingStackBb || (isTournament ? 50 : 100)));
      const fallbackCost = Math.round(startingStackBb * 100);
      const values = {
        name: `${room?.name || (isTournament ? "MTT" : "Cash")} · copy`,
        maxSeats: Math.max(2, Number(room?.maxSeats || 6)),
        startingStackBb,
        actionTimerSeconds: Math.max(0, Number(room?.actionTimerSeconds || 20)),
        difficulty: room?.difficulty || room?.settings?.difficulty || "standard",
        botFill: room?.botFill !== false,
        isPrivate: Boolean(room?.isPrivate || room?.hasAccessCode),
        accessCode: "",
        buyInChips: Math.max(100, Number(room?.buyInChips || roomCost(room) || fallbackCost)),
        entryFeeChips: Math.max(0, Number(room?.entryFeeChips || room?.buyInChips || roomCost(room) || fallbackCost)),
        lateRegistration: Boolean(room?.lateRegistration)
      };
      Object.entries(values).forEach(([name, nextValue]) => setFormValue(form, name, nextValue));
      setScreen("lobby");
      form.scrollIntoView({ block: "nearest" });
      toast(isTournament ? "Настройки турнира подставлены." : "Настройки кэш-стола подставлены.");
    }

    function settlementSummary(settlements) {
      const entries = Array.isArray(settlements) ? settlements.filter((entry) => Number(entry?.amountChips || 0) > 0) : [];
      if (!entries.length) return "";
      const total = entries.reduce((sum, entry) => sum + Number(entry.amountChips || 0), 0);
      const players = entries.length === 1 ? (entries[0].playerName || "игроку") : `${entries.length} игрокам`;
      return `Возврат: ${fmt(total)} фантиков · ${players}.`;
    }

    function occupiedAdminSeats(room) {
      return Array.isArray(room?.adminSeats) ? room.adminSeats.filter((seat) => seat?.occupied) : [];
    }

    function estimatedCloseSettlement(room, seat) {
      const isTournament = room?.simulationMode === "tournament";
      if (isTournament) return Math.max(0, Math.round(Number(seat?.entryFeeChips || room?.entryFeeChips || roomCost(room) || 0)));
      const startingStackBb = Math.max(0.1, Number(room?.startingStackBb || 100));
      const chipsPerBb = Number(room?.buyInChips || roomCost(room) || 0) / startingStackBb;
      const fromStack = Math.round(Number(seat?.stackBb || 0) * chipsPerBb);
      return Math.max(0, fromStack || Number(seat?.buyInChips || 0));
    }

    function closeSettlementPreview(room) {
      const seats = occupiedAdminSeats(room);
      const isTournament = room?.simulationMode === "tournament";
      if (!seats.length) return "Игроков за столом нет, расчёт кошельков не нужен.";
      const total = seats.reduce((sum, seat) => sum + estimatedCloseSettlement(room, seat), 0);
      const countLabel = seats.length === 1 ? "1 игрок" : `${seats.length} игроков`;
      const prefix = isTournament
        ? "Турнир будет отменён; входной взнос вернётся в кошелёк."
        : "Кэш-стол закроется; текущие фишки за столом вернутся в кошелёк.";
      const liveHand = Number(room?.handNo || 0) > 0 || room?.status === "playing"
        ? " Если идёт рука, сервер void/refund использует авторитативное состояние."
        : "";
      return `${prefix} Предварительно: ~${fmt(total)} фантиков · ${countLabel}. Сервер пересчитает сумму при закрытии.${liveHand}`;
    }

    function serverClosePreviewText(data = {}) {
      const summary = settlementSummary(data.settlements);
      const handNo = Number(data.room?.handNo || 0);
      const version = Number(data.room?.version || 0);
      const suffix = [
        handNo ? `hand #${handNo}` : "",
        version ? `версия ${version}` : ""
      ].filter(Boolean).join(" · ");
      if (summary) return `Серверный preview: ${summary}${suffix ? ` ${suffix}.` : ""}`;
      return `Серверный preview: кошельковые возвраты не нужны.${suffix ? ` ${suffix}.` : ""}`;
    }

    async function loadClosePreview(room, { quiet = false } = {}) {
      const id = String(room?.id || "").trim();
      if (!id || !closeConfirmSettlementEl || !closeConfirmSubmitBtn) return;
      const requestId = ++closePreviewRequestId;
      pendingCloseRoom = { id, room, previewReady: false, preview: null };
      closeConfirmSubmitBtn.disabled = true;
      closeConfirmSettlementEl.textContent = `${closeSettlementPreview(room)} Запрашиваю серверный preview...`;
      try {
        const data = await api("/api/rooms", { method: "POST", body: { op: "close-preview", id } });
        if (requestId !== closePreviewRequestId || pendingCloseRoom?.id !== id) return;
        pendingCloseRoom = { id, room, previewReady: true, preview: data };
        closeConfirmSettlementEl.textContent = serverClosePreviewText(data);
        if (roomDataStale()) {
          closeConfirmSettlementEl.textContent = `${closeConfirmSettlementEl.textContent} Список столов старше 60 секунд: обнови его перед финальным закрытием.`;
          closeConfirmSubmitBtn.disabled = true;
          return;
        }
        closeConfirmSubmitBtn.disabled = false;
      } catch (error) {
        if (requestId !== closePreviewRequestId || pendingCloseRoom?.id !== id) return;
        const message = readableError(error);
        pendingCloseRoom = { id, room, previewReady: false, preview: null };
        closeConfirmSettlementEl.textContent = `${closeSettlementPreview(room)} Серверный preview не получен: ${message}. Закрытие заблокировано.`;
        closeConfirmSubmitBtn.disabled = true;
        if (!quiet) toast(`Preview закрытия: ${message}`);
      }
    }

    function renderCloseSeatPreview(room) {
      if (!closeConfirmSeatsEl) return;
      closeConfirmSeatsEl.replaceChildren();
      const seats = occupiedAdminSeats(room);
      if (!seats.length) {
        const li = document.createElement("li");
        li.textContent = "Нет занятых мест.";
        closeConfirmSeatsEl.append(li);
        return;
      }
      seats.forEach((seat) => {
        const li = document.createElement("li");
        const name = seat.playerName || `Seat #${Number(seat.index || 0) + 1}`;
        const amount = estimatedCloseSettlement(room, seat);
        li.textContent = `#${Number(seat.index || 0) + 1} · ${name} · ${seatStateLabel(seat.state)} · ~${fmt(amount)} фантиков`;
        closeConfirmSeatsEl.append(li);
      });
    }

    function clearCloseConfirmForRoom(roomId) {
      if (!pendingCloseRoom || pendingCloseRoom.id !== String(roomId || "")) return;
      pendingCloseRoom = null;
      if (closeConfirmEl) closeConfirmEl.hidden = true;
    }

    function reasonLabel(reason) {
      const key = String(reason || "").toLowerCase();
      if (key === "admin_wallet_set") return "админ-коррекция";
      if (key === "admin_wallet_credit") return "админ-пополнение";
      if (key === "admin_wallet_debit") return "админ-списание";
      if (key === "cash_buy_in") return "buy-in кэш";
      if (key === "cash_rebuy") return "ребай кэш";
      if (key === "cash_out") return "cash-out";
      if (key === "admin_cash_close_out") return "закрытие кэш-стола";
      if (key === "tournament_entry") return "вход в турнир";
      if (key === "tournament_payout") return "приз турнира";
      if (key === "tournament_refund") return "возврат турнира";
      if (key === "admin_tournament_refund") return "админ-возврат турнира";
      return key ? key.replace(/_/g, " ") : "операция кошелька";
    }

    function renderWalletHistory(history) {
      if (!walletHistoryEl) return;
      walletHistoryEl.replaceChildren();
      const entries = Array.isArray(history) ? history.slice(-8).reverse() : [];
      if (!entries.length) {
        const li = document.createElement("li");
        const text = document.createElement("b");
        text.textContent = "История операций пуста";
        li.append(text);
        walletHistoryEl.append(li);
        return;
      }
      entries.forEach((entry) => {
        const li = document.createElement("li");
        const main = document.createElement("div");
        const title = document.createElement("b");
        title.textContent = reasonLabel(entry.reason);
        const detail = document.createElement("small");
        const atMs = Date.parse(entry.at || "");
        const when = Number.isFinite(atMs) ? new Date(atMs).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" }) : "";
        const room = entry.roomName || entry.roomId || entry.mode || "";
        const note = cleanAdminNote(entry.note);
        const hasBalanceAfter = entry.balanceAfter !== null && entry.balanceAfter !== undefined && Number.isFinite(Number(entry.balanceAfter));
        detail.textContent = [when, room, hasBalanceAfter ? `баланс ${fmt(entry.balanceAfter)}` : "", note ? `аудит: ${note}` : ""].filter(Boolean).join(" · ");
        main.append(title, detail);
        const delta = document.createElement("span");
        delta.textContent = signedFmt(entry.delta);
        if (Number(entry.delta || 0) < 0) delta.className = "is-negative";
        li.append(main, delta);
        walletHistoryEl.append(li);
      });
    }

    function renderWalletState(wallet) {
      if (!walletStateEl) return;
      if (!wallet) {
        walletStateEl.textContent = "Кошелёк не найден.";
        renderWalletHistory([]);
        return;
      }
      walletStateEl.textContent = `${wallet.userId || "user"} · ${fmt(wallet.balanceChips)} фантиков`;
      renderWalletHistory(wallet.history);
    }

    function walletActionLabel(action) {
      const key = String(action || "read").toLowerCase();
      if (key === "set") return "Поставить баланс";
      if (key === "credit" || key === "top-up") return "Пополнить баланс";
      if (key === "debit") return "Списать баланс";
      return "Проверить баланс";
    }

    function walletPreview(payload, wallet) {
      const action = String(payload?.action || "read").toLowerCase();
      const startingBalance = wallet ? Number(wallet.balanceChips || 0) : 100000;
      const amount = Math.max(0, Math.round(Number(payload?.amountChips || payload?.balanceChips || 0)));
      const nextBalance = action === "set"
        ? amount
        : action === "debit"
          ? startingBalance - amount
          : startingBalance + amount;
      const delta = nextBalance - startingBalance;
      const created = wallet ? "" : " · новый кошелёк стартует со 100 000";
      return {
        startingBalance,
        nextBalance,
        delta,
        detail: `${payload.userId} · ${walletActionLabel(action)} · ${fmt(startingBalance)} → ${balanceFmt(nextBalance)} (${signedFmt(delta)})${created}`
      };
    }

    function hideWalletConfirm() {
      pendingWalletAction = null;
      if (walletConfirmEl) walletConfirmEl.hidden = true;
    }

    async function requestWalletAction(form) {
      const blocked = adminBlockedMessage();
      if (blocked) {
        toast(blocked);
        return;
      }
      const payload = walletActionPayload(form);
      if (!payload.userId) {
        toast("Укажи User ID.");
        return;
      }
      if (payload.action === "read") {
        await updateWallet(payload);
        hideWalletConfirm();
        return;
      }
      const read = await api("/api/rooms", { method: "POST", body: { ...payload, action: "read" } });
      const preview = walletPreview(payload, read.wallet);
      if (payload.action === "debit" && preview.nextBalance < 0) {
        renderWalletState(read.wallet);
        hideWalletConfirm();
        toast(`Нельзя списать больше текущего баланса: ${fmt(preview.startingBalance)}.`);
        return;
      }
      const requestId = pendingRequestId("wallet", payload);
      pendingWalletAction = { payload: { ...payload, requestId }, preview, requestPayload: payload, requestId };
      walletConfirmTitleEl.textContent = walletActionLabel(payload.action);
      walletConfirmDetailEl.textContent = preview.detail;
      walletConfirmNoteEl.textContent = payload.note ? `Комментарий аудита: ${payload.note}` : "Комментарий аудита пустой; операция всё равно попадёт в историю.";
      walletConfirmEl.hidden = false;
      walletConfirmSubmitBtn.disabled = false;
      renderWalletState(read.wallet);
      walletConfirmEl.scrollIntoView({ block: "nearest" });
      walletCancelBtn?.focus?.({ preventScroll: true });
    }

    async function inspectWallet(wallet) {
      const form = $("wallet-form");
      const userId = String(wallet?.userId || "").trim();
      if (!form || !userId) return;
      form.elements.userId.value = userId;
      form.elements.displayName.value = wallet.displayName || "";
      form.elements.action.value = "read";
      const data = await api("/api/rooms", { method: "POST", body: walletActionPayload(form) });
      renderWalletState(data.wallet);
      hideWalletConfirm();
    }

    function renderWalletList(wallets) {
      if (!walletListEl) return;
      walletListEl.replaceChildren();
      const entries = Array.isArray(wallets) ? wallets : [];
      if (!entries.length) {
        const li = document.createElement("li");
        const text = document.createElement("b");
        text.textContent = "Кошельков пока нет";
        li.append(text);
        walletListEl.append(li);
        return;
      }
      entries.forEach((wallet) => {
        const li = document.createElement("li");
        const button = document.createElement("button");
        button.type = "button";
        const main = document.createElement("div");
        const title = document.createElement("b");
        title.textContent = wallet.displayName || wallet.userId || "user";
        const detail = document.createElement("small");
        const atMs = Date.parse(wallet.updatedAt || "");
        const when = Number.isFinite(atMs) ? new Date(atMs).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" }) : "";
        detail.textContent = [wallet.userId || "", when].filter(Boolean).join(" · ");
        main.append(title, detail);
        const balance = document.createElement("span");
        balance.textContent = fmt(wallet.balanceChips);
        button.append(main, balance);
        button.addEventListener("click", () => {
            inspectWallet(wallet).catch((error) => toast(`Кошелёк: ${readableError(error)}`));
        });
        li.append(button);
        walletListEl.append(li);
      });
    }

    function seatStateLabel(state) {
      const key = String(state || "active").toLowerCase();
      if (key === "sitting-out") return "ситаут";
      if (key === "disconnected") return "оффлайн";
      if (key === "empty") return "свободно";
      return "активен";
    }

    function fmtBb(value) {
      const number = Number(value || 0);
      if (!Number.isFinite(number)) return "0 BB";
      const fixed = Math.round(number * 10) / 10;
      return `${fixed.toLocaleString("ru-RU")} BB`;
    }

    function renderRoomSeats(room) {
      const seats = Array.isArray(room?.adminSeats) ? room.adminSeats : [];
      if (!seats.length) return null;
      const occupied = seats.filter((seat) => seat?.occupied);
      const wrap = document.createElement("div");
      wrap.className = "mp-admin-room-seats";
      if (!occupied.length) {
        const empty = document.createElement("small");
        empty.textContent = "Игроков пока нет";
        wrap.append(empty);
        return wrap;
      }
      occupied.forEach((seat) => {
        const row = document.createElement("div");
        row.className = "mp-admin-room-seat";
        const text = document.createElement("span");
        text.textContent = `#${Number(seat.index || 0) + 1} · ${seat.playerName || "Игрок"} · ${seatStateLabel(seat.state)} · ${fmtBb(seat.stackBb)}`;
        row.append(text);
        const walletUserId = String(seat.walletUserId || "").trim();
        if (walletUserId) {
          const walletBtn = document.createElement("button");
          walletBtn.type = "button";
          walletBtn.textContent = "Кошелёк";
          walletBtn.title = `Открыть кошелёк: ${walletUserId}`;
          walletBtn.addEventListener("click", () => {
            inspectWallet({ userId: walletUserId, displayName: seat.playerName || "" }).catch((error) => toast(`Кошелёк: ${readableError(error)}`));
          });
          row.append(walletBtn);
        }
        wrap.append(row);
      });
      const freeCount = seats.length - occupied.length;
      if (freeCount > 0) {
        const free = document.createElement("small");
        free.textContent = `+ ${freeCount} свободно`;
        wrap.append(free);
      }
      return wrap;
    }

    function renderRooms(data) {
      const rooms = Array.isArray(data?.rooms) ? data.rooms : [];
      lastRoomsData = data || null;
      lastRoomsLoadedAt = Date.now();
      backendEl.textContent = data?.backend === "unavailable"
        ? "Связь с API кабинета недоступна."
        : `Обновлено ${shortTime()} · ${data?.durable ? "постоянное хранилище" : "временное хранилище"}`;
      renderRoomStats(rooms);
      renderOpsSummary(data?.adminOps || null);
      syncRoomFilterButtons();
      roomsEl.replaceChildren();
      const visibleRooms = rooms.filter((room) => roomMatchesFilter(room) && roomMatchesSearch(room));
      if (pendingCloseRoom && !rooms.some((room) => String(room.id || "") === pendingCloseRoom.id)) {
        clearCloseConfirmForRoom(pendingCloseRoom.id);
      }
      if (pendingCloseRoom && closeConfirmEl && !closeConfirmEl.hidden) {
        const refreshed = rooms.find((room) => String(room.id || "") === pendingCloseRoom.id);
        if (refreshed) {
          pendingCloseRoom = { id: pendingCloseRoom.id, room: refreshed, previewReady: false, preview: null };
          const mode = refreshed.simulationMode === "tournament" ? "турнир" : "кэш";
          closeConfirmTitleEl.textContent = `Закрыть ${refreshed.name || pendingCloseRoom.id}?`;
          closeConfirmDetailEl.textContent = `${pendingCloseRoom.id} · ${mode} · ${Number(refreshed.occupiedCount || 0)}/${Number(refreshed.maxSeats || 0)} · hand #${Number(refreshed.handNo || 0)} · список ${roomDataAgeLabel()}`;
          renderCloseSeatPreview(refreshed);
          loadClosePreview(refreshed, { quiet: true });
        }
      }
      if (!visibleRooms.length) {
        const [titleText, detailText] = emptyRoomsLabel();
        const li = document.createElement("li");
        li.className = "mp-admin-room";
        const main = document.createElement("div");
        main.className = "mp-admin-room-main";
        const title = document.createElement("b");
        title.textContent = titleText;
        const detail = document.createElement("span");
        detail.textContent = detailText;
        main.append(title, detail);
        li.append(main);
        roomsEl.append(li);
        return;
      }
      visibleRooms.forEach((room) => {
        const li = document.createElement("li");
        li.className = "mp-admin-room";
        const main = document.createElement("div");
        main.className = "mp-admin-room-main";
        const title = document.createElement("b");
        title.textContent = room.name || room.id;
        const meta = document.createElement("span");
        const mode = room.simulationMode === "tournament" ? "турнир" : "кэш";
        const timer = Number(room.actionTimerSeconds || 0) > 0 ? `${Number(room.actionTimerSeconds)}с` : "без таймера";
        const registration = room.simulationMode === "tournament"
          ? (room.registrationOpen === false ? " · рег закрыта" : (room.lateRegistration ? " · поздняя рег" : " · рег до старта"))
          : "";
        meta.textContent = `${room.id} · ${mode} · ${Number(room.occupiedCount || 0)}/${Number(room.maxSeats || 0)} · ${fmt(roomCost(room))} фантиков · ${timer}${registration}${room.hasAccessCode ? " · код" : ""}${room.fixedTable ? " · админский" : ""}`;
        meta.title = meta.textContent;
        main.append(title, meta);
        const seats = renderRoomSeats(room);
        if (seats) main.append(seats);
        const actions = document.createElement("div");
        actions.className = "mp-admin-room-actions";
        const open = document.createElement("button");
        open.type = "button";
        open.textContent = "Открыть";
        open.addEventListener("click", () => openRoom(room));
        actions.append(open);
        const repeat = document.createElement("button");
        repeat.type = "button";
        repeat.textContent = "Повторить";
        repeat.addEventListener("click", () => repeatRoomSettings(room));
        actions.append(repeat);
        const link = document.createElement("button");
        link.type = "button";
        link.textContent = "Ссылка";
        link.addEventListener("click", () => copyTextToClipboard(roomLink(room.id), "Ссылка на стол скопирована.", "Скопируй ссылку из строки стола."));
        actions.append(link);
        if (currentInvite?.id === String(room.id || "") && currentInvite.accessCode) {
          const code = document.createElement("button");
          code.type = "button";
          code.textContent = "Код";
          code.addEventListener("click", () => copyTextToClipboard(currentInvite.accessCode, "Код доступа скопирован.", "Скопируй код из блока приглашения."));
          actions.append(code);
        }
        if (room.simulationMode === "tournament") {
          const registrationBtn = document.createElement("button");
          registrationBtn.type = "button";
          const open = room.registrationOpen === false;
          registrationBtn.textContent = open ? "Открыть рег" : "Закрыть рег";
          registrationBtn.disabled = !adminReady;
          registrationBtn.title = adminReady ? "" : "Ждём подтверждения API кабинета.";
          registrationBtn.addEventListener("click", () => setTournamentRegistration(room.id, open));
          actions.append(registrationBtn);
        }
        const close = document.createElement("button");
        close.type = "button";
        close.textContent = "Закрыть…";
        close.disabled = !adminReady;
        close.title = adminReady ? "" : "Ждём подтверждения API кабинета.";
        close.addEventListener("click", () => requestCloseRoom(room));
        actions.append(close);
        li.append(main, actions);
        roomsEl.append(li);
      });
    }

    function healthRow({ label, ok, detail, tone = "" }) {
      const row = document.createElement("div");
      row.className = `mp-admin-health-row ${ok ? "is-ok" : "is-blocked"}`;
      if (tone) row.classList.add(`is-${tone}`);
      const title = document.createElement("b");
      title.textContent = label;
      const text = document.createElement("span");
      text.textContent = detail;
      row.append(title, text);
      return row;
    }

    function renderHealth(data, status = {}) {
      if (!healthEl) return;
      const auth = data?.auth || {};
      const missing = Array.isArray(auth.missing) ? auth.missing.filter(Boolean) : [];
      const authConfigured = auth.configured !== false;
      const sessionSecretConfigured = auth.sessionSecretConfigured === true;
      const dedicatedSessionSecretConfigured = auth.dedicatedSessionSecretConfigured === true;
      const callback = callbackStatus(auth.redirectUri);
      const durable = data?.durable === true;
      lastAccessData = data || null;
      lastAccessStatus = status || {};
      syncAccessChrome(data, status);
      healthEl.replaceChildren(
        healthRow({
          label: "Хранилище",
          tone: "storage",
          ok: durable,
          detail: durable
            ? `Постоянный backend: ${data?.backend || "unknown"}. Столы не пропадут после рестарта.`
            : "Preview без постоянного storage: столы живут только в памяти процесса."
        }),
        healthRow({
          label: "Вход игроков",
          tone: "login",
          ok: authConfigured,
          detail: authConfigured
            ? `Google-вход включён; кошельки и приватные столы могут работать.${callback}`
            : `Google-вход не настроен${missing.length ? `: ${missing.join(", ")}` : ""}.${callback}`
        }),
        healthRow({
          label: "Сессии",
          tone: "sessions",
          ok: sessionSecretConfigured,
          detail: sessionSecretConfigured
            ? (dedicatedSessionSecretConfigured
              ? "Cookies и приватные ссылки подписываются отдельным секретом."
              : "Подпись есть через fallback; для production лучше отдельный AUTH_SESSION_SECRET.")
            : "Нет секрета подписи для cookies и приватных ссылок."
        })
      );
    }

    async function refreshLeaderboardAdmin({ silent = false } = {}) {
      const blocked = adminBlockedMessage();
      if (blocked) {
        renderLeaderboardBlocked(blocked);
        if (!silent) toast(blocked);
        return null;
      }
      try {
        const data = await api(`/api/simulator-sessions?${leaderboardQuery()}`);
        renderLeaderboard(data);
        if (leaderboardUpdatedEl) leaderboardUpdatedEl.textContent = `Обновлено ${shortTime()}.`;
        return data;
      } catch (error) {
        renderLeaderboardBlocked(`Лидерборд: ${readableError(error)}`);
        if (!silent) toast(`Лидерборд: ${readableError(error)}`);
        return null;
      }
    }

    async function startSeason(form) {
      const blocked = adminBlockedMessage();
      if (blocked) {
        toast(blocked);
        return;
      }
      try {
        const payload = seasonPayload(form);
        const validation = seasonValidationMessage(payload);
        if (validation) {
          toast(`Сезон: ${validation}`);
          recordActivity("Сезон не запущен", validation, "error");
          return;
        }
        if (seasonSubmitBtn) {
          seasonSubmitBtn.disabled = true;
          seasonSubmitBtn.textContent = "Запускаем…";
        }
        await api("/api/simulator-sessions", {
          method: "POST",
          body: payload
        });
        form.dataset.dirty = "false";
        toast("Сезон запущен.");
        recordActivity("Сезон запущен", value(form, "label", "") || value(form, "id", ""));
        await refreshLeaderboardAdmin({ silent: true });
      } catch (error) {
        const message = readableError(error);
        toast(`Сезон: ${message}`);
        recordActivity("Сезон не запущен", message, "error");
      } finally {
        if (seasonSubmitBtn) seasonSubmitBtn.textContent = "Запустить сезон";
        renderAdminControlsState();
      }
    }

    async function submitLeaderboardEdit(op) {
      const blocked = adminBlockedMessage();
      if (blocked) {
        toast(blocked);
        return false;
      }
      const form = $("leaderboard-form");
      const payload = leaderboardEditPayload(form, op);
      if (!payload.playerKey) {
        toast("Укажи ключ игрока.");
        return false;
      }
      if (op === "leaderboard-rename-player" && !payload.displayName) {
        toast("Укажи новый ник.");
        return false;
      }
      const button = op === "leaderboard-delete-player" ? (leaderboardDeleteConfirmSubmitBtn || leaderboardDeleteBtn) : leaderboardRenameBtn;
      const originalText = button?.textContent || "";
      try {
        if (button) {
          button.disabled = true;
          button.textContent = op === "leaderboard-delete-player" ? "Удаляем…" : "Сохраняем…";
        }
        const data = await api("/api/simulator-sessions", { method: "POST", body: payload });
        if (op === "leaderboard-delete-player") {
          toast(`Игрок удалён: ${fmt(data.removed)} строк.`);
          recordActivity("Игрок удалён", `${payload.playerKey} · ${fmt(data.removed)} строк · audit ${data.audit?.stored ? "сохранён" : "не сохранён"}`);
        } else {
          toast(`Ник обновлён: ${fmt(data.renamed)} строк.`);
          recordActivity("Ник обновлён", `${payload.playerKey} → ${payload.displayName} · ${fmt(data.renamed)} строк · audit ${data.audit?.stored ? "сохранён" : "не сохранён"}`);
        }
        await refreshLeaderboardAdmin({ silent: true });
        return true;
      } catch (error) {
        const message = readableError(error);
        toast(`Лидерборд: ${message}`);
        recordActivity("Лидерборд не обновлён", message, "error");
        return false;
      } finally {
        if (button) button.textContent = originalText;
        renderAdminControlsState();
      }
    }

    async function refresh() {
      let publicData = null;
      try {
        publicData = await api(`/api/rooms?adminHealth=${Date.now()}`, { admin: false });
        const googleAdminReady = publicData?.auth?.admin === true;
        setAdminReady(googleAdminReady);
        if (!googleAdminReady) {
          handleAdminGateBlocked(publicData?.auth || {});
          return;
        }
        renderHealth(publicData, { adminReady: googleAdminReady });
        renderRooms(publicData);
      } catch (error) {
        setAdminReady(false);
        if (healthEl) {
          healthEl.replaceChildren(healthRow({
            label: "Связь",
            ok: false,
            detail: "API кабинета недоступен в этом preview. Для реальных действий нужен запущенный backend."
          }));
        }
        renderRooms({ backend: "unavailable", durable: false, rooms: [] });
        toast("Backend кабинета недоступен.");
        return;
      }
      try {
        const data = await api("/api/rooms?admin=1");
        clearServerGateRetry();
        setAdminReady(true);
        if (tokenState) tokenState.textContent = "Доступ кабинета подтверждён; действия доступны.";
        renderHealth(data, { adminReady: true });
        renderRooms(data);
        await refreshLeaderboardAdmin({ silent: true });
        await listWallets({ silent: true });
      } catch (error) {
        setAdminReady(false);
        if (error.message === "admin_only") {
          handleAdminGateBlocked(publicData?.auth || {});
          return;
        }
        if (tokenState) {
          tokenState.textContent = `Данные кабинета недоступны: ${readableError(error)}`;
        }
        if (publicData) {
          renderHealth(publicData, { adminReady: false });
          renderRooms(publicData);
          renderLeaderboardBlocked(`Данные кабинета недоступны: ${readableError(error)}`);
        }
        toast(`Ошибка списка: ${readableError(error)}`);
      }
    }

    async function closeRoom(id) {
      try {
        if (closeConfirmSubmitBtn) closeConfirmSubmitBtn.disabled = true;
        const data = await api(`/api/rooms?id=${encodeURIComponent(id)}`, { method: "DELETE" });
        const summary = settlementSummary(data.settlements);
        clearInviteForRoom(id);
        clearCloseConfirmForRoom(id);
        toast(summary ? `Стол закрыт. ${summary}` : "Стол закрыт.");
        recordActivity("Стол закрыт", summary || id);
        await refresh();
      } catch (error) {
        const message = readableError(error);
        toast(`Не удалось закрыть: ${message}`);
        recordActivity("Стол не закрыт", message, "error");
      } finally {
        if (closeConfirmSubmitBtn) closeConfirmSubmitBtn.disabled = false;
      }
    }

    function requestCloseRoom(room) {
      const blocked = adminBlockedMessage();
      if (blocked) {
        toast(blocked);
        return;
      }
      const id = String(room?.id || "").trim();
      if (!id || !closeConfirmEl) return;
      pendingCloseRoom = { id, room, previewReady: false, preview: null };
      closeConfirmEl.hidden = false;
      closeConfirmTitleEl.textContent = `Закрыть ${room.name || id}?`;
      const mode = room.simulationMode === "tournament" ? "турнир" : "кэш";
      closeConfirmDetailEl.textContent = `${id} · ${mode} · ${Number(room.occupiedCount || 0)}/${Number(room.maxSeats || 0)} · hand #${Number(room.handNo || 0)} · список ${roomDataAgeLabel()}`;
      renderCloseSeatPreview(room);
      const stale = roomDataStale();
      if (stale) {
        toast("Список столов устарел. Нажми «Обновить» перед закрытием.");
      }
      closeConfirmSubmitBtn.disabled = true;
      closeConfirmEl.scrollIntoView({ block: "nearest" });
      closeCancelBtn?.focus?.({ preventScroll: true });
      loadClosePreview(room);
    }

    function confirmCloseRoom() {
      const blocked = adminBlockedMessage();
      if (blocked) {
        toast(blocked);
        return;
      }
      const id = pendingCloseRoom?.id || "";
      if (!id) {
        toast("Сначала выбери стол для закрытия.");
        return;
      }
      if (roomDataStale()) {
        toast("Список столов устарел. Обнови перед закрытием.");
        if (closeConfirmSubmitBtn) closeConfirmSubmitBtn.disabled = true;
        return;
      }
      if (!pendingCloseRoom?.previewReady) {
        toast("Дождись серверного preview перед закрытием.");
        if (closeConfirmSubmitBtn) closeConfirmSubmitBtn.disabled = true;
        return;
      }
      closeRoom(id);
    }

    async function setTournamentRegistration(id, registrationOpen) {
      const blocked = adminBlockedMessage();
      if (blocked) {
        toast(blocked);
        return;
      }
      try {
        await api("/api/rooms", {
          method: "POST",
          body: { op: "registration", id, registrationOpen }
        });
        toast(registrationOpen ? "Регистрация открыта." : "Регистрация закрыта.");
        recordActivity(registrationOpen ? "Регистрация открыта" : "Регистрация закрыта", String(id || ""));
        await refresh();
      } catch (error) {
        const message = readableError(error);
        toast(`Регистрация: ${message}`);
        recordActivity("Регистрация не изменена", message, "error");
      }
    }

    async function createRoom(form, mode) {
      const blocked = adminBlockedMessage();
      if (blocked) {
        toast(blocked);
        return;
      }
      if (form?.dataset?.pending === "true") {
        toast("Создание уже выполняется.");
        return;
      }
      const submitBtn = form?.querySelector('button[type="submit"]');
      const originalSubmitText = submitBtn ? submitBtn.textContent : "";
      if (form?.dataset) form.dataset.pending = "true";
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Создаём…";
      }
      const isTournament = mode === "tournament";
      try {
        const startingStackBb = numberValue(form, "startingStackBb", isTournament ? 50 : 100);
        const fallbackCost = Math.round(startingStackBb * 100);
        const accessCode = value(form, "accessCode", "");
        const body = {
          op: "create",
          name: value(form, "name", isTournament ? "MTT" : "Cash"),
          accessCode,
          settings: {
            maxSeats: numberValue(form, "maxSeats", 6),
            simulationMode: isTournament ? "tournament" : "random",
            difficulty: value(form, "difficulty", "standard"),
            startingStackBb,
            actionTimerSeconds: numberValue(form, "actionTimerSeconds", 20),
            botFill: checked(form, "botFill"),
            isPrivate: checked(form, "isPrivate"),
            lateRegistration: isTournament && checked(form, "lateRegistration"),
            fixedTable: true,
            requiresAuth: true,
            buyInChips: isTournament ? fallbackCost : numberValue(form, "buyInChips", fallbackCost),
            entryFeeChips: isTournament ? numberValue(form, "entryFeeChips", fallbackCost) : fallbackCost
          }
        };
        const requestId = pendingRequestId("create", body);
        const data = await api("/api/rooms", { method: "POST", body: { ...body, requestId } });
        clearPendingRequestId("create", body, requestId);
        renderInvite(buildInvite(data.room, accessCode));
        toast(`${isTournament ? "Турнир" : "Кэш-стол"} создан: ${data.room?.id || ""}. Приглашение готово.`);
        recordActivity(isTournament ? "Турнир создан" : "Кэш-стол создан", `${data.room?.id || ""} · ${body.name}`);
        await refresh();
      } catch (error) {
        recordActivity(isTournament ? "Турнир не создан" : "Кэш-стол не создан", readableError(error), "error");
        throw error;
      } finally {
        if (form?.dataset) delete form.dataset.pending;
        if (submitBtn) {
          submitBtn.textContent = originalSubmitText;
        }
        renderAdminControlsState();
      }
    }

    async function updateWallet(payload) {
      const data = await api("/api/rooms", { method: "POST", body: payload });
      renderWalletState(data.wallet);
      listWallets({ silent: true }).catch(() => {});
      toast(payload?.action === "read" ? "Кошелёк загружен." : "Кошелёк обновлён.");
      recordActivity(payload?.action === "read" ? "Кошелёк загружен" : "Кошелёк обновлён", `${payload.userId} · ${payload.action}`);
      return data.wallet;
    }

    async function confirmWalletAction() {
      const pending = pendingWalletAction;
      if (!pending?.payload) {
        toast("Сначала выбери операцию с кошельком.");
        return;
      }
      const blocked = adminBlockedMessage();
      if (blocked) {
        toast(blocked);
        return;
      }
      try {
        walletConfirmSubmitBtn.disabled = true;
        await updateWallet(pending.payload);
        clearPendingRequestId("wallet", pending.requestPayload || pending.payload, pending.requestId);
        hideWalletConfirm();
      } catch (error) {
        toast(`Кошелёк: ${readableError(error)}`);
      } finally {
        renderAdminControlsState();
      }
    }

    async function listWallets({ silent = false } = {}) {
      const blocked = adminBlockedMessage();
      if (blocked) {
        if (!silent) toast(blocked);
        return [];
      }
      const data = await api("/api/rooms", {
        method: "POST",
        body: { op: "wallet", action: "list", limit: 50 }
      });
      renderWalletList(data.wallets);
      if (!silent) toast("Список кошельков обновлён.");
      return data.wallets || [];
    }

    screenTabsEl?.addEventListener("click", (event) => {
      const button = event.target?.closest?.("button[data-admin-screen-tab]");
      if (!button || !screenTabsEl.contains(button)) return;
      setScreen(button.getAttribute("data-admin-screen-tab") || "leaderboard");
    });
    screenTabsEl?.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      const buttons = [...screenTabsEl.querySelectorAll("button[data-admin-screen-tab]")];
      const current = buttons.indexOf(document.activeElement);
      if (!buttons.length || current < 0) return;
      event.preventDefault();
      const nextIndex = event.key === "Home"
        ? 0
        : event.key === "End"
          ? buttons.length - 1
          : (current + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
      const next = buttons[nextIndex];
      next.focus();
      setScreen(next.getAttribute("data-admin-screen-tab") || "leaderboard");
    });
    window.addEventListener("hashchange", () => {
      setScreen(screenFromLocation(), { syncUrl: false });
    });
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      let handled = false;
      if (leaderboardDeleteConfirmEl && !leaderboardDeleteConfirmEl.hidden) {
        hideLeaderboardDeleteConfirm();
        handled = true;
      }
      if (walletConfirmEl && !walletConfirmEl.hidden) {
        hideWalletConfirm();
        handled = true;
      }
      if (closeConfirmEl && !closeConfirmEl.hidden) {
        pendingCloseRoom = null;
        closeConfirmEl.hidden = true;
        handled = true;
      }
      if (handled) event.preventDefault();
    });
    leaderboardRefreshBtn?.addEventListener("click", () => {
      refreshLeaderboardAdmin().catch((error) => toast(`Лидерборд: ${readableError(error)}`));
    });
    $("leaderboard-filter-form")?.addEventListener("change", () => {
      if (adminReady) refreshLeaderboardAdmin({ silent: true }).catch((error) => toast(`Лидерборд: ${readableError(error)}`));
    });
    $("leaderboard-filter-form")?.addEventListener("input", (event) => {
      if (event.target?.name !== "search") return;
      if (lastLeaderboardData) renderLeaderboard(lastLeaderboardData);
      scheduleLeaderboardSearchRefresh();
    });
    root.addEventListener("click", (event) => {
      const seasonPreset = event.target?.closest?.("button[data-admin-season-preset]");
      if (seasonPreset && root.contains(seasonPreset)) {
        applySeasonPreset(seasonPreset.getAttribute("data-admin-season-preset"));
        return;
      }
      const roomPreset = event.target?.closest?.("button[data-admin-room-preset]");
      if (roomPreset && root.contains(roomPreset)) {
        applyRoomPreset(roomPreset.getAttribute("data-admin-room-preset"));
        return;
      }
      const walletPreset = event.target?.closest?.("button[data-admin-wallet-preset]");
      if (walletPreset && root.contains(walletPreset)) {
        applyWalletPreset(walletPreset.getAttribute("data-admin-wallet-preset"));
      }
    });
    $("season-form")?.addEventListener("input", (event) => {
      event.currentTarget.dataset.dirty = "true";
      updateSeasonPreview();
    });
    $("season-form")?.addEventListener("submit", (event) => {
      event.preventDefault();
      startSeason(event.currentTarget).catch((error) => toast(`Сезон: ${readableError(error)}`));
    });
    leaderboardRenameBtn?.addEventListener("click", () => {
      submitLeaderboardEdit("leaderboard-rename-player").catch((error) => toast(`Лидерборд: ${readableError(error)}`));
    });
    leaderboardDeleteBtn?.addEventListener("click", () => {
      showLeaderboardDeleteConfirm();
    });
    leaderboardDeleteCancelBtn?.addEventListener("click", hideLeaderboardDeleteConfirm);
    leaderboardDeleteConfirmSubmitBtn?.addEventListener("click", () => {
      if (!pendingLeaderboardDelete?.playerKey) {
        hideLeaderboardDeleteConfirm();
        toast("Сначала выбери игрока для удаления.");
        return;
      }
      submitLeaderboardEdit("leaderboard-delete-player")
        .then((ok) => { if (ok) hideLeaderboardDeleteConfirm(); })
        .catch((error) => toast(`Лидерборд: ${readableError(error)}`));
    });
    $("refresh").addEventListener("click", refresh);
    roomFilterEl?.addEventListener("click", (event) => {
      const button = event.target?.closest?.("button[data-filter]");
      if (!button || !roomFilterEl.contains(button)) return;
      const next = String(button.dataset.filter || "all");
      currentRoomFilter = next === "cash" || next === "tournament" ? next : "all";
      syncRoomFilterButtons();
      if (lastRoomsData) renderRooms(lastRoomsData);
    });
    roomSearchEl?.addEventListener("input", () => {
      currentRoomSearch = String(roomSearchEl.value || "");
      if (lastRoomsData) renderRooms(lastRoomsData);
    });
    $("cash-form").addEventListener("submit", (event) => {
      event.preventDefault();
      createRoom(event.currentTarget, "cash").catch((error) => toast(`Кэш не создан: ${readableError(error)}`));
    });
    $("tournament-form").addEventListener("submit", (event) => {
      event.preventDefault();
      createRoom(event.currentTarget, "tournament").catch((error) => toast(`Турнир не создан: ${readableError(error)}`));
    });
    $("wallet-form").addEventListener("submit", (event) => {
      event.preventDefault();
      requestWalletAction(event.currentTarget).catch((error) => toast(`Кошелёк: ${readableError(error)}`));
    });
    $("wallet-submit").addEventListener("click", () => {
      requestWalletAction($("wallet-form")).catch((error) => toast(`Кошелёк: ${readableError(error)}`));
    });
    walletListBtn.addEventListener("click", () => {
      listWallets().catch((error) => toast(`Список кошельков: ${readableError(error)}`));
    });
    copyLinkBtn.addEventListener("click", () => copyCurrentInvite("link"));
    copyCodeBtn.addEventListener("click", () => copyCurrentInvite("code"));
    copyInviteBtn.addEventListener("click", () => copyCurrentInvite("message"));
    walletCancelBtn.addEventListener("click", hideWalletConfirm);
    walletConfirmSubmitBtn.addEventListener("click", confirmWalletAction);
    closeCancelBtn.addEventListener("click", () => {
      pendingCloseRoom = null;
      closeConfirmEl.hidden = true;
    });
    closeConfirmSubmitBtn.addEventListener("click", confirmCloseRoom);
    setScreen(screenFromLocation(), { syncUrl: false });
    renderAdminControlsState();
    updateSeasonPreview();
    renderLeaderboardBlocked("Проверяем Google admin-сессию.");
    refresh();
  });
})();
