/* Account login gate for the simulator start screen.
 *
 * The simulator's account identity is the hub-wide FFPlayerProgress profile
 * (assets/poker-progress/progress.js) — the same profile the leaderboard,
 * session archive and telemetry already tag every session with. This module
 * surfaces that identity as a REQUIRED login on the idle start screen:
 *
 *   - If a real (non-guest) profile is already active — because the player
 *     logged in here before, in another hub trainer, or via Google — the
 *     simulator picks it up automatically and shows a compact "Играешь как
 *     <ник>" chip. Nothing to type.
 *   - Otherwise the start screen shows a login card. Typing a nickname calls
 *     FFPlayerProgress.login(name), which mints a named profile shared across
 *     the whole hub, so that single nick is used for every later session.
 *     Until then, starting a session is blocked.
 *
 * Lives as a persistent overlay inside .workspace (like the online lobby), so
 * the start panel's render loop never clobbers it. Visibility is gated to the
 * idle/start screen via the same `.app:has(.table-grid.is-idle)` CSS pattern
 * the rest of the shell uses; this script only toggles which sub-state is on.
 *
 * The gate is INERT — no card, no chip, play never blocked — when:
 *   - server mode (?room=ID / ?rooms=ID1,ID2): the multiplayer flow owns its own seat name;
 *   - embedded (?embedded) or framed (inside the hub iframe): the host owns
 *     identity (and a same-origin iframe already reads the hub profile);
 *   - automation: navigator.webdriver (Playwright layout/core-ui/visual gates)
 *     or the explicit window.__FF_SIM_SKIP_LOGIN escape hatch (agent-browser
 *     smoke). Every UI-driving smoke must reach the felt unblocked.
 */
(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;
  const FALLBACK_KEY = "ff.poker.table-simulator.identity.v1";
  const MAX_LEN = 24;
  const GENERIC_NAME_RE = /^(гость|guest|игрок|player)$/i;

  function ready(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }

  function hasParam(name) {
    try {
      return new URLSearchParams(root.location?.search || "").has(name);
    } catch (e) {
      return false;
    }
  }

  function isServerMode() {
    return /[?&]rooms?=/.test(root.location?.search || "");
  }

  function isFramed() {
    try {
      return root.self !== root.top;
    } catch (e) {
      // Cross-origin parent access throws — we are framed.
      return true;
    }
  }

  function automationBypass() {
    try {
      if (root.navigator && root.navigator.webdriver === true) return true;
      if (root.__FF_SIM_SKIP_LOGIN === true) return true;
    } catch (e) {}
    return false;
  }

  // True when the login gate should not exist at all on this page.
  function gateInert() {
    return isServerMode() || hasParam("embedded") || isFramed() || automationBypass();
  }

  const progress = () => (root.FFPlayerProgress && typeof root.FFPlayerProgress === "object" ? root.FFPlayerProgress : null);
  const hasProgress = () => Boolean(progress() && typeof progress().getActiveProfile === "function");

  function sanitizeNick(value) {
    return String(value == null ? "" : value).replace(/\s+/g, " ").trim().slice(0, MAX_LEN);
  }

  // Local degradation path: if FFPlayerProgress never loaded, persist the nick
  // ourselves so the gate still works (and still gates) as a standalone system.
  function readFallback() {
    try {
      const parsed = JSON.parse(root.localStorage.getItem(FALLBACK_KEY) || "null");
      const name = parsed && typeof parsed.nickname === "string" ? sanitizeNick(parsed.nickname) : "";
      return name ? { loggedIn: true, name } : { loggedIn: false, name: "" };
    } catch (e) {
      return { loggedIn: false, name: "" };
    }
  }

  function writeFallback(name) {
    try {
      root.localStorage.setItem(FALLBACK_KEY, JSON.stringify({ nickname: name, ts: Date.now() }));
    } catch (e) {}
  }

  // Current identity, normalized to { loggedIn, name }. Mirrors the simulator's
  // own loggedIn rule (profile id !== "guest") so the gate agrees with the
  // leaderboard / session archive that already tag sessions with this profile.
  function identityState() {
    if (hasProgress()) {
      let profile = null;
      try {
        profile = progress().getActiveProfile() || null;
      } catch (e) {
        profile = null;
      }
      const id = String(profile?.id || "guest");
      const name = sanitizeNick(profile?.name || "");
      const authenticated = Boolean(profile?.authenticated || profile?.authProvider);
      return { loggedIn: Boolean((id && id !== "guest") || authenticated), name };
    }
    return readFallback();
  }

  function login(name) {
    const clean = sanitizeNick(name);
    if (!clean) return false;
    if (hasProgress() && typeof progress().login === "function") {
      try {
        progress().login(clean);
        // Keep the local fallback in lockstep so a later progress.js failure
        // can't silently drop the just-established identity.
        writeFallback(clean);
        return true;
      } catch (e) {}
    }
    writeFallback(clean);
    return true;
  }

  // First-time prefill ("подсос"): a ?name= hint (lobby links) or a real custom
  // name already on the active profile. Generic guest names stay blank so the
  // player consciously picks one.
  function suggestion() {
    try {
      const fromUrl = sanitizeNick(new URLSearchParams(root.location?.search || "").get("name") || "");
      if (fromUrl) return fromUrl;
    } catch (e) {}
    const current = identityState();
    if (current.name && !GENERIC_NAME_RE.test(current.name)) return current.name;
    return "";
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (ch) => (
      { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]
    ));
  }

  ready(function () {
    const app = document.querySelector(".app");
    const workspace = document.querySelector(".workspace");
    if (!app || !workspace) return;

    // Inert contexts: never render the gate and never block play.
    if (gateInert()) {
      app.dataset.auth = "open";
      return;
    }

    const host = document.createElement("div");
    host.className = "sim-identity";
    host.id = "sim-identity";
    host.innerHTML = [
      '<div class="sim-identity-gate" role="dialog" aria-modal="true" aria-labelledby="sim-identity-title">',
      '  <form class="sim-identity-card" data-identity-form novalidate>',
      '    <span class="sim-identity-eyebrow">Вход в симулятор</span>',
      '    <strong id="sim-identity-title">Под каким ником играем?</strong>',
      '    <p class="sim-identity-lead">Ник закрепится за аккаунтом — под ним пишутся все сессии, статистика и место в лидерборде.</p>',
      '    <label class="sim-identity-label" for="sim-identity-input">Никнейм</label>',
      '    <input class="sim-identity-input" id="sim-identity-input" data-identity-input type="text" maxlength="' + MAX_LEN + '" autocomplete="nickname" autocapitalize="off" spellcheck="false" placeholder="Например, FunFarmShark" aria-describedby="sim-identity-hint">',
      '    <p class="sim-identity-error" data-identity-error role="alert" hidden></p>',
      '    <button class="sim-identity-login" type="submit" data-identity-login>Войти и играть</button>',
      '    <p class="sim-identity-hint" id="sim-identity-hint">Без входа игра недоступна — ник можно сменить в любой момент.</p>',
      '  </form>',
      '</div>',
      '<div class="sim-identity-chip" data-identity-chip>',
      '  <span class="sim-identity-chip-avatar" data-identity-initial aria-hidden="true">●</span>',
      '  <span class="sim-identity-chip-text">Играешь как <b data-identity-name>—</b></span>',
      '  <button class="sim-identity-switch" type="button" data-identity-switch>Сменить</button>',
      '</div>'
    ].join("\n");
    workspace.appendChild(host);

    const form = host.querySelector("[data-identity-form]");
    const input = host.querySelector("[data-identity-input]");
    const errorBox = host.querySelector("[data-identity-error]");
    const nameOuts = host.querySelectorAll("[data-identity-name]");
    const initialOut = host.querySelector("[data-identity-initial]");
    const switchBtn = host.querySelector("[data-identity-switch]");

    // When the player taps "Сменить" we drop to the login view without wiping
    // the stored profile, so a cancel is just re-confirming the same nick.
    let switching = false;

    function showError(message) {
      if (!errorBox) return;
      errorBox.textContent = message;
      errorBox.hidden = !message;
    }

    function render() {
      const state = identityState();
      const authed = state.loggedIn && !switching;
      app.dataset.auth = authed ? "in" : "out";
      host.dataset.state = authed ? "in" : "out";

      if (authed) {
        const display = state.name || "Игрок";
        nameOuts.forEach((node) => { node.textContent = display; });
        if (initialOut) initialOut.textContent = (display.match(/[\p{L}\p{N}]/u)?.[0] || "●").toUpperCase();
        showError("");
      } else if (!input.value) {
        input.value = switching ? (state.name || suggestion()) : suggestion();
      }
    }

    function submit() {
      const value = sanitizeNick(input.value);
      if (!value) {
        showError("Введите ник, чтобы войти.");
        input.focus();
        return;
      }
      if (!login(value)) {
        showError("Не удалось сохранить ник. Попробуйте ещё раз.");
        return;
      }
      switching = false;
      showError("");
      render();
    }

    if (form) {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        submit();
      });
    }
    if (input) {
      input.addEventListener("input", () => showError(""));
    }
    if (switchBtn) {
      switchBtn.addEventListener("click", () => {
        switching = true;
        input.value = sanitizeNick(identityState().name) || "";
        render();
        input.focus();
        input.select();
      });
    }

    // Hard gate: even though the logged-out overlay covers the start screen,
    // guard the actual start triggers in the capture phase so no programmatic
    // or focus-driven path can deal a hand while logged out. There is no
    // keyboard hotkey to start a session, so the click triggers are the full
    // surface (start-panel button, header "Старт", and the online-lobby
    // create/join buttons).
    const START_SELECTOR = '#deal-all-button, [data-action="start-simulator"], [data-lob="create"], .online-lobby .lob-rooms .lob-btn';
    document.addEventListener("click", (event) => {
      if (app.dataset.auth === "in") return;
      if (gateInert()) return;
      const trigger = event.target.closest && event.target.closest(START_SELECTOR);
      if (!trigger) return;
      event.preventDefault();
      event.stopPropagation();
      // Pull the gate back to the login view and nudge the field.
      switching = false;
      render();
      host.classList.remove("is-pulse");
      // Force a reflow so the animation restarts on repeated attempts.
      void host.offsetWidth;
      host.classList.add("is-pulse");
      input?.focus();
    }, true);

    // Re-render whenever the active profile changes — from this card, the
    // leaderboard rename dialog, a hub login in another tab, or Google auth.
    const onProfileChange = () => {
      if (switching) return;
      render();
    };
    root.addEventListener("ff-player-progress:profile", onProfileChange);
    root.addEventListener("ff-player-progress:update", onProfileChange);
    root.addEventListener("storage", (event) => {
      if (!event || event.key === null || event.key === "ff-player-progress-v1" || event.key === FALLBACK_KEY) onProfileChange();
    });

    render();
  });
})();
