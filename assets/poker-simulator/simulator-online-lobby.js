/* Online lobby — start-screen sub-tab for the simulator.
 *
 * Adds an "Онлайн лобби" tab next to "Одиночная игра" on the simulator's idle
 * start screen. Player-facing lobby is intentionally fixed-table only: it reads
 * rooms opened by the admin surface, shows auth + play-money wallet state, and
 * joins a selected room through poker-simulator.html?room=ID where server-mode
 * owns the real felt. This file owns only the lobby chrome, never the in-hand UI.
 *
 * It lives as a persistent overlay inside .workspace (built once here, not inside
 * the re-rendered #table-grid), so typed text and the room list are never clobbered
 * by the start panel's render loop. Visibility is gated to the idle state in CSS
 * via `.app:has(.table-grid.is-idle)`; this script only toggles which sub-view is
 * active. Inert (no tab, no lobby) when the page is already in server mode (?room= / ?rooms=).
 */
(function () {
  "use strict";

  function ready(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn, { once: true });
    else fn();
  }

  ready(function () {
    const api = window.FFSimulatorMultiplayer;
    const app = document.querySelector(".app");
    const workspace = document.querySelector(".workspace");
    const tabs = document.getElementById("sim-start-tabs");
    const lobby = document.getElementById("online-lobby");
    if (!api || typeof api.createMultiplayerClient !== "function" || !app || !workspace || !tabs || !lobby) return;

    // Server mode (a room is already open): the lobby/tabs must never appear over
    // a live table. Strip them and stop.
    if (/[?&]rooms?=/.test(window.location.search || "")) {
      tabs.remove();
      lobby.remove();
      return;
    }

    const client = api.createMultiplayerClient({ baseUrl: "/api" });
    const escapeHtml = (value) => String(value == null ? "" : value).replace(/[&<>"']/g, (ch) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]
    ));
    const formatChips = (value) => Math.max(0, Math.round(Number(value || 0))).toLocaleString("ru-RU");

    lobby.innerHTML = [
      '<div class="online-lobby-inner">',
      '  <div class="lob-head">',
      '    <h2>Онлайн лобби</h2>',
      '    <span class="lob-tag">админские столы</span>',
      '    <a class="lob-admin-link" href="multiplayer-admin.html" aria-label="Открыть Multiplayer Admin">Админка</a>',
      '    <span class="lob-badge" data-lob="backend">бэкенд: …</span>',
      '  </div>',
      '  <p class="lob-sub">Игроки садятся только за столы, открытые админом. Кэш и турниры играются на фантики аккаунта; создание столов вынесено в отдельную админ-панель.</p>',
      '  <p class="lob-warning" data-lob="warning" hidden>⚠ Текущий backend эфемерный — стол живёт только в этом dev/process. На проде нужен durable backend: GitHub fallback или Redis.</p>',
      '  <div class="lob-grid">',
      '    <section class="lob-card">',
      '      <h3>Аккаунт</h3>',
      '      <div class="lob-account" data-lob="account">',
      '        <span class="lob-account-avatar" data-lob="account-avatar">FF</span>',
      '        <div class="lob-account-main">',
      '          <b data-lob="account-name">Проверяем вход…</b>',
      '          <span data-lob="account-state">Баланс загружается</span>',
      '        </div>',
      '      </div>',
      '      <div class="lob-wallet" data-lob="wallet" hidden>',
      '        <span>Баланс</span>',
      '        <b data-lob="wallet-balance">0</b>',
      '        <small>фантиков</small>',
      '      </div>',
      '      <div class="lob-wallet-activity" data-lob="wallet-activity" hidden>',
      '        <b>Последние операции</b>',
      '        <ul data-lob="wallet-activity-list"></ul>',
      '      </div>',
      '      <div class="lob-row">',
      '        <button type="button" class="lob-btn" data-lob="login" hidden>Войти через Google</button>',
      '        <button type="button" class="lob-btn ghost" data-lob="logout" hidden>Выйти</button>',
      '      </div>',
      '      <p class="lob-notice" data-lob="account-error"></p>',
      '    </section>',
      '    <section class="lob-card">',
      '      <div class="lob-rooms-head"><h3>Открытые столы</h3><button type="button" class="lob-btn ghost" data-lob="refresh">обновить</button></div>',
      '      <div class="lob-join-code">',
      '        <input data-lob="join-id" maxlength="40" placeholder="Код стола (для приватных по ссылке)" autocomplete="off" aria-label="Код стола">',
      '        <input class="lob-access-join" data-lob="join-access-code" maxlength="24" placeholder="Код доступа" autocomplete="off" aria-label="Код доступа">',
      '        <button type="button" class="lob-btn ghost lob-join-btn" data-lob="join">Войти по коду</button>',
      '      </div>',
      '      <p class="lob-notice" data-lob="join-error"></p>',
      '      <ul class="lob-rooms" data-lob="rooms"></ul>',
      '      <p class="lob-empty" data-lob="rooms-empty" hidden>Пока нет открытых столов. Их создаёт админ.</p>',
      '    </section>',
      '  </div>',
      '</div>'
    ].join("\n");

    const $ = (key) => lobby.querySelector(`[data-lob="${key}"]`);
    const backendBadge = $("backend");
    const warning = $("warning");
    const roomsList = $("rooms");
    const roomsEmpty = $("rooms-empty");
    const accountName = $("account-name");
    const accountState = $("account-state");
    const accountAvatar = $("account-avatar");
    const accountError = $("account-error");
    const walletBox = $("wallet");
    const walletBalance = $("wallet-balance");
    const walletActivity = $("wallet-activity");
    const walletActivityList = $("wallet-activity-list");
    const loginBtn = $("login");
    const logoutBtn = $("logout");
    const joinBtn = $("join");
    const joinError = $("join-error");

    let pollTimer = null;
    let lastLobbyData = null;
    const PENDING_ACCESS_CODE_STORAGE_PREFIX = "ff-simulator-room-code-pending:";

    function cleanAccessCode(value) {
      return String(value || "").replace(/\s+/g, " ").trim().slice(0, 24);
    }

    function rememberPendingAccessCode(roomId, code) {
      const cleaned = cleanAccessCode(code);
      if (!roomId || !cleaned) return;
      try { window.sessionStorage?.setItem(PENDING_ACCESS_CODE_STORAGE_PREFIX + String(roomId), cleaned); } catch {}
    }

    function gotoTable(roomId, accessCode) {
      rememberPendingAccessCode(roomId, accessCode);
      const target = "poker-simulator.html?room=" + encodeURIComponent(roomId);
      window.location.href = target;
    }

    function difficultyLabel(value) {
      const key = String(value || "standard").toLowerCase();
      if (key === "easy") return "рек-боты";
      if (key === "pro") return "pro-боты";
      return "рег-боты";
    }

    function roomSeatCost(room) {
      const mode = room.simulationMode === "tournament" ? "tournament" : "cash";
      const fallback = Number(room.startingStackBb || 100) * 100;
      // Use firstNumber (finite-aware), NOT falsy-OR: an explicit 0 entry fee is a
      // valid free-entry tournament that the server charges 0 for. Falsy-OR skipped
      // the 0 and fabricated a buy-in price, blocking low-balance players from free
      // events the server would seat them in. See BUGHUNT F020.
      return mode === "tournament"
        ? firstNumber(room.entryFeeChips, room.buyInChips, fallback)
        : firstNumber(room.buyInChips, fallback);
    }

    function firstNumber(...values) {
      for (const value of values) {
        if (value === undefined || value === null || value === "") continue;
        const number = Number(value);
        if (Number.isFinite(number)) return number;
      }
      return 0;
    }

    function firstValue(...values) {
      return values.find((value) => value !== undefined && value !== null && value !== "");
    }

    function normalizeRoomForJoin(room) {
      if (!room || typeof room !== "object") return null;
      const settings = room.settings || {};
      const economy = room.economy || {};
      const seats = Array.isArray(room.seats) ? room.seats : [];
      const occupiedCount = firstNumber(room.occupiedCount, seats.filter((seat) => seat?.occupied).length);
      const maxSeats = firstNumber(room.maxSeats, seats.length, settings.maxSeats);
      const simulationMode = String(firstValue(room.simulationMode, settings.simulationMode, "random"));
      const registrationOpen = firstValue(room.registrationOpen, economy.registrationOpen, true) !== false;
      const status = String(firstValue(room.status, "lobby"));
      return {
        ...room,
        simulationMode,
        status,
        occupiedCount,
        maxSeats,
        hasOpenSeat: firstValue(room.hasOpenSeat, occupiedCount < maxSeats && status !== "closed") === true,
        startingStackBb: firstNumber(room.startingStackBb, settings.startingStackBb, 100),
        buyInChips: firstNumber(room.buyInChips, economy.buyInChips, settings.buyInChips),
        entryFeeChips: firstNumber(room.entryFeeChips, economy.entryFeeChips, settings.entryFeeChips),
        lateRegistration: firstValue(room.lateRegistration, economy.lateRegistration, settings.lateRegistration) === true,
        registrationOpen,
        registrationClosed: firstValue(room.registrationClosed, economy.registrationClosed, settings.registrationClosed) === true,
        difficulty: String(firstValue(room.difficulty, settings.difficulty, "standard")),
        botFill: firstValue(room.botFill, settings.botFill, true) !== false,
        hasAccessCode: firstValue(room.hasAccessCode, Boolean(room.accessCodeHash)) === true
      };
    }

    function accountJoinBlockReason(data = lastLobbyData) {
      if (!data) return "Лобби ещё загружает аккаунт и баланс.";
      const auth = data?.auth || {};
      if (!auth.authenticated) {
        return auth.configured === false
          ? "Вход временно недоступен."
          : "Сначала войди через Google.";
      }
      if (!data.wallet) return "Баланс ещё загружается. Обнови лобби.";
      return "";
    }

    function startGoogleLogin(returnTo = authReturnTo()) {
      window.location.href = "/api/auth/google/start?returnTo=" + encodeURIComponent(returnTo);
    }

    function walletReasonLabel(reason) {
      const key = String(reason || "").toLowerCase();
      if (key === "cash_buy_in") return "buy-in кэш";
      if (key === "cash_rebuy") return "ребай";
      if (key === "cash_out") return "cash-out";
      if (key === "tournament_entry") return "вход в турнир";
      if (key === "tournament_payout") return "приз турнира";
      if (key === "tournament_refund" || key === "admin_tournament_refund") return "возврат турнира";
      if (key === "admin_cash_close_out") return "закрытие стола";
      if (key === "admin_wallet_credit") return "пополнение";
      if (key === "admin_wallet_debit") return "списание";
      if (key === "admin_wallet_set") return "коррекция";
      return key ? key.replace(/_/g, " ") : "операция";
    }

    function renderWalletActivity(wallet) {
      const activity = Array.isArray(wallet?.activity) ? wallet.activity.slice(0, 4) : [];
      if (!walletActivity || !walletActivityList) return;
      walletActivityList.innerHTML = "";
      walletActivity.hidden = !wallet || !activity.length;
      activity.forEach((entry) => {
        const delta = Number(entry?.delta || 0);
        const amount = Math.abs(Math.round(delta));
        const li = document.createElement("li");
        li.className = delta >= 0 ? "is-positive" : "is-negative";
        const value = document.createElement("span");
        value.textContent = (delta >= 0 ? "+" : "-") + formatChips(amount);
        const details = document.createElement("small");
        details.textContent = [walletReasonLabel(entry?.reason), entry?.roomName || ""].filter(Boolean).join(" · ");
        li.appendChild(value);
        li.appendChild(details);
        walletActivityList.appendChild(li);
      });
    }

    function renderAccount(data) {
      const auth = data?.auth || {};
      const wallet = data?.wallet || null;
      const configured = auth.configured !== false;
      const authenticated = Boolean(auth.authenticated);
      const user = auth.user || {};
      accountError.textContent = "";
      loginBtn.hidden = authenticated || !configured;
      logoutBtn.hidden = !authenticated;
      loginBtn.disabled = !configured;
      walletBox.hidden = !wallet;
      if (wallet) walletBalance.textContent = formatChips(wallet.balanceChips);
      renderWalletActivity(wallet);
      if (authenticated) {
        const name = user.name || wallet?.displayName || "Игрок";
        accountName.textContent = name;
        accountState.textContent = "Можно садиться за кэш и турниры";
        accountAvatar.textContent = (String(name).match(/[\p{L}\p{N}]/u)?.[0] || "F").toUpperCase();
      } else {
        accountName.textContent = configured ? "Нужен вход" : "Вход недоступен";
        accountState.textContent = configured ? "Столы играются только залогиненными игроками" : "Аккаунт и баланс появятся после настройки входа.";
        accountAvatar.textContent = "FF";
        if (!configured) accountError.textContent = "Вход через Google временно недоступен.";
      }
    }

    function renderRooms(rooms, data = lastLobbyData) {
      const list = Array.isArray(rooms) ? rooms : [];
      const auth = data?.auth || {};
      const wallet = data?.wallet || null;
      const balance = Number(wallet?.balanceChips || 0);
      const authenticated = Boolean(auth.authenticated);
      const configured = auth.configured !== false;
      roomsList.innerHTML = "";
      roomsEmpty.hidden = list.length > 0;
      list.forEach((room) => {
        const li = document.createElement("li");
        const isTournament = room.simulationMode === "tournament";
        const registrationOpen = room.registrationOpen !== false;
        const open = room.hasOpenSeat && registrationOpen;
        const mode = isTournament ? "турнир" : "кэш";
        const timer = Number(room.actionTimerSeconds || 0) > 0 ? Number(room.actionTimerSeconds || 0) + "с" : "без таймера";
        const bots = room.botFill === false ? "без ботов" : difficultyLabel(room.difficulty);
        const stack = Number(room.startingStackBb || 0) > 0 ? Number(room.startingStackBb || 0) + " BB" : "100 BB";
        const protectedMark = room.hasAccessCode ? " · код" : "";
        const cost = roomSeatCost(room);
        const costLabel = cost > 0 ? " · " + formatChips(cost) + " фантиков" : "";
        const registrationLabel = isTournament
          ? (registrationOpen ? (room.lateRegistration ? " · late reg" : " · рег до старта") : " · регистрация закрыта")
          : "";
        li.innerHTML =
          '<span class="lob-room-name">' + escapeHtml(room.name) + '</span>' +
          '<span class="lob-room-meta">' + Number(room.occupiedCount || 0) + "/" + Number(room.maxSeats || 0) + " · " + mode + " · " + stack + costLabel + " · " + timer + " · " + bots + registrationLabel + protectedMark + '</span>';
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "lob-btn";
        btn.style.flex = "0 0 auto";
        const enough = balance >= cost;
        btn.textContent = !registrationOpen
          ? "Регистрация закрыта"
          : !room.hasOpenSeat
            ? "Полон"
            : !authenticated
              ? (configured ? "Войти" : "Вход выключен")
              : !enough ? "Не хватает" : "Сесть";
        btn.disabled = !open || (!authenticated && !configured) || (authenticated && !enough);
        btn.addEventListener("click", () => {
          if (!authenticated) {
            startGoogleLogin("/poker-simulator.html?room=" + encodeURIComponent(room.id));
            return;
          }
          const blocked = joinBlockReason(room, data);
          if (blocked) {
            joinError.textContent = blocked;
            return;
          }
          gotoTable(room.id);
        });
        li.appendChild(btn);
        roomsList.appendChild(li);
      });
    }

    function findKnownRoomByCode(code) {
      const id = String(code || "").trim();
      const rooms = Array.isArray(lastLobbyData?.rooms) ? lastLobbyData.rooms : [];
      return id ? normalizeRoomForJoin(rooms.find((room) => String(room?.id || "") === id) || null) : null;
    }

    function joinBlockReason(room, data = lastLobbyData, options = {}) {
      if (!room) return options.requireAccount ? accountJoinBlockReason(data) : "";
      const wallet = data?.wallet || null;
      if (room.registrationOpen === false) return "Регистрация закрыта.";
      if (!room.hasOpenSeat) return "Стол заполнен.";
      const accountBlocked = accountJoinBlockReason(data);
      if (accountBlocked) return accountBlocked;
      const cost = roomSeatCost(room);
      const balance = Number(wallet?.balanceChips || 0);
      if (cost > 0 && balance < cost) return "Не хватает фантиков: нужно " + formatChips(cost) + ".";
      return "";
    }

    function mergeLobbyPreflightState(data) {
      if (!data || typeof data !== "object") return lastLobbyData;
      return {
        ...(lastLobbyData || {}),
        auth: data.auth || lastLobbyData?.auth || {},
        wallet: data.wallet || lastLobbyData?.wallet || null
      };
    }

    function roomPreflightErrorMessage(error) {
      const key = String(error?.data?.error || error?.message || "").toLowerCase();
      if (key === "access_code_required") return "Введи код доступа.";
      if (key === "access_code_invalid") return "Код доступа неверный.";
      if (key === "room_not_found" || key === "http_404") return "Стол не найден.";
      if (key === "login_required") return "Сначала войди через Google.";
      return "Не удалось проверить стол. Обнови лобби и попробуй ещё раз.";
    }

    async function preflightRoomForJoin(roomId, accessCode) {
      const data = await client.getRoom(roomId, cleanAccessCode(accessCode));
      return {
        data,
        room: normalizeRoomForJoin(data?.room)
      };
    }

    async function refreshBackend() {
      try {
        const data = await client.listRooms();
        lastLobbyData = data;
        backendBadge.innerHTML = "бэкенд: <b>" + escapeHtml(data.backend) + "</b>" + (data.durable ? "" : " (эфемерно)");
        warning.hidden = Boolean(data.durable);
        renderAccount(data);
        renderRooms(data.rooms || [], data);
      } catch (err) {
        backendBadge.textContent = "бэкенд: недоступен";
        accountError.textContent = "Не удалось получить lobby state.";
      }
    }

    function authReturnTo() {
      return window.location.pathname + window.location.search + window.location.hash;
    }

    async function logout() {
      logoutBtn.disabled = true;
      try {
        await window.fetch("/api/auth/logout", { method: "POST", credentials: "same-origin", cache: "no-store" });
        await refreshBackend();
      } catch (err) {
        accountError.textContent = "Не удалось выйти.";
      } finally {
        logoutBtn.disabled = false;
      }
    }

    function startPolling() {
      if (pollTimer) return;
      pollTimer = window.setInterval(() => {
        // Don't poll a backgrounded tab — wasted requests against the room API.
        if (app.dataset.simView === "online" && !document.hidden) refreshBackend();
      }, 8000);
    }

    function stopPolling() {
      if (pollTimer) { window.clearInterval(pollTimer); pollTimer = null; }
    }

    // Refresh immediately when a backgrounded tab returns to the online view, and
    // drop the timer entirely on unload so it never leaks past the page.
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && app.dataset.simView === "online") refreshBackend();
    });
    window.addEventListener("pagehide", stopPolling);

    function setView(view) {
      const online = view === "online";
      app.dataset.simView = online ? "online" : "single";
      tabs.querySelectorAll(".sim-start-tab").forEach((btn) => {
        const active = btn.dataset.startView === view;
        btn.classList.toggle("is-active", active);
        btn.setAttribute("aria-selected", active ? "true" : "false");
        btn.tabIndex = active ? 0 : -1; // roving tabindex (ARIA tabs pattern)
      });
      if (online) {
        refreshBackend();
        startPolling();
      } else {
        stopPolling();
      }
    }

    tabs.addEventListener("click", (event) => {
      const btn = event.target.closest(".sim-start-tab");
      if (!btn || !tabs.contains(btn)) return;
      setView(btn.dataset.startView === "online" ? "online" : "single");
    });

    // ARIA tabs keyboard contract: arrow/Home/End move focus + activate.
    tabs.addEventListener("keydown", (event) => {
      const items = Array.from(tabs.querySelectorAll(".sim-start-tab"));
      // The keydown bubbles from the focused tab, so event.target is it; fall back
      // to activeElement for safety.
      const focused = (event.target && event.target.closest) ? event.target.closest(".sim-start-tab") : null;
      const current = items.indexOf(focused || document.activeElement);
      if (current === -1) return;
      let next = -1;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") next = (current + 1) % items.length;
      else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (current - 1 + items.length) % items.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = items.length - 1;
      if (next === -1) return;
      event.preventDefault();
      items[next].focus();
      setView(items[next].dataset.startView === "online" ? "online" : "single");
    });

    async function joinByCode() {
      if (joinBtn.disabled) return;
      const code = ($("join-id").value || "").trim();
      const accessCode = $("join-access-code").value;
      joinError.textContent = "";
      if (!code) {
        joinError.textContent = "Введи код стола.";
        return;
      }
      let room = findKnownRoomByCode(code);
      let lobbyData = lastLobbyData;
      let blocked = joinBlockReason(room, lobbyData, { requireAccount: true });
      if (blocked) {
        joinError.textContent = blocked;
        return;
      }
      const shouldPreflight = !room || cleanAccessCode(accessCode);
      if (shouldPreflight) {
        const originalText = joinBtn.textContent;
        joinBtn.disabled = true;
        joinBtn.textContent = "Проверяем…";
        try {
          const preflight = await preflightRoomForJoin(code, accessCode);
          room = preflight.room;
          lobbyData = mergeLobbyPreflightState(preflight.data);
        } catch (error) {
          joinError.textContent = roomPreflightErrorMessage(error);
          return;
        } finally {
          joinBtn.disabled = false;
          joinBtn.textContent = originalText;
        }
        blocked = joinBlockReason(room, lobbyData, { requireAccount: true });
        if (blocked) {
          joinError.textContent = blocked;
          return;
        }
      }
      gotoTable(code, accessCode);
    }

    $("refresh").addEventListener("click", refreshBackend);
    joinBtn.addEventListener("click", () => {
      joinByCode().catch(() => { joinError.textContent = "Не удалось проверить стол. Обнови лобби и попробуй ещё раз."; });
    });
    loginBtn.addEventListener("click", () => {
      startGoogleLogin();
    });
    logoutBtn.addEventListener("click", logout);
    $("join-id").addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        joinByCode().catch(() => { joinError.textContent = "Не удалось проверить стол. Обнови лобби и попробуй ещё раз."; });
      }
    });
    // If a single-player game starts (idle state leaves), drop back to the single
    // view so returning to the start screen never re-opens a stale lobby. CSS
    // already hides the overlay off-idle; this keeps the logical view in sync.
    const grid = document.getElementById("table-grid");
    if (grid && typeof MutationObserver === "function") {
      const observer = new MutationObserver(() => {
        if (!grid.classList.contains("is-idle") && app.dataset.simView === "online") setView("single");
      });
      observer.observe(grid, { attributes: true, attributeFilter: ["class"] });
    }

    // Initial roving tabindex (the single-player tab is active in the markup).
    tabs.querySelectorAll(".sim-start-tab").forEach((btn) => {
      btn.tabIndex = btn.classList.contains("is-active") ? 0 : -1;
    });

    app.dataset.simView = "single";
  });
})();
