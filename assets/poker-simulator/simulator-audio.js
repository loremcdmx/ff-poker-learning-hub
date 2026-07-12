(function () {
  const root = typeof window !== "undefined" ? window : globalThis;
  const toneFrequencies = { deal: 560, action: 440, win: 720, fold: 220 };

  function resolveAudioContext(windowRef) {
    return windowRef.AudioContext || windowRef.webkitAudioContext || root.AudioContext || root.webkitAudioContext;
  }

  function model({ windowRef = root, getEnabled, getAudio, setAudio, onDisabled, warn } = {}) {
    const warnFn = typeof warn === "function" ? warn : () => {};
    let gestureResumeWired = false;

    function emitTone(context, type) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = toneFrequencies[type] || 420;
      oscillator.type = "sine";
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.045, context.currentTime + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.08);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.09);
    }

    // Browsers (Chrome) create AudioContext in "suspended" until a user gesture
    // resumes it. Wire a one-time gesture/visibility resume so a context that was
    // created before the first interaction (or auto-suspended on tab hide) wakes up.
    function wireGestureResume() {
      if (gestureResumeWired) return;
      const documentRef = windowRef && windowRef.document;
      if (!windowRef || typeof windowRef.addEventListener !== "function") return;
      gestureResumeWired = true;
      const resumeAudio = () => {
        const context = typeof getAudio === "function" ? getAudio() : null;
        if (context && context.state === "suspended" && typeof context.resume === "function") {
          context.resume().catch(() => {});
        }
      };
      windowRef.addEventListener("pointerdown", resumeAudio, { passive: true });
      windowRef.addEventListener("keydown", resumeAudio, { passive: true });
      if (documentRef && typeof documentRef.addEventListener === "function") {
        documentRef.addEventListener("visibilitychange", () => {
          if (!documentRef.hidden) resumeAudio();
        });
      }
    }

    function playTone(type) {
      if (typeof getEnabled === "function" && !getEnabled()) return false;
      try {
        const AudioContextCtor = resolveAudioContext(windowRef);
        if (!AudioContextCtor) throw new Error("AudioContext is not available");
        const context = (typeof getAudio === "function" && getAudio()) || new AudioContextCtor();
        if (typeof setAudio === "function") setAudio(context);
        wireGestureResume();
        if (context.state === "suspended" && typeof context.resume === "function") {
          // Resume returns a promise; schedule the tone once the context is running
          // so the oscillator is not started against a silent, suspended context.
          context.resume().then(() => emitTone(context, type)).catch(() => {});
          return true;
        }
        emitTone(context, type);
        return true;
      } catch (error) {
        warnFn("Audio playback unavailable; muting sound.", error);
        if (typeof onDisabled === "function") onDisabled();
        return false;
      }
    }

    return { playTone };
  }

  root.PokerSimulatorAudio = {
    toneFrequencies,
    model
  };
})();
