(function lessonHeaderChrome(root) {
  "use strict";

  const HEADER_SELECTOR = "[data-lesson-header].lesson-chrome";

  function revealActiveStep(nav, behavior) {
    const active = nav.querySelector('.step-tab[aria-selected="true"]');
    if (!active || nav.scrollWidth <= nav.clientWidth + 2) return;
    const navRect = nav.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();
    if (activeRect.left >= navRect.left + 6 && activeRect.right <= navRect.right - 6) return;
    const left = nav.scrollLeft + activeRect.left - navRect.left - (nav.clientWidth - activeRect.width) / 2;
    nav.scrollTo({ left: Math.max(0, left), behavior });
  }

  function initHeader(header) {
    if (header.dataset.lessonHeaderReady === "true") return;
    const nav = header.querySelector(".lesson-chrome__steps");
    if (!nav) return;
    const tabs = Array.from(nav.querySelectorAll(".step-tab"));
    nav.style.setProperty("--lesson-step-count", String(Math.max(1, tabs.length)));
    nav.dataset.lessonStepCount = String(tabs.length);
    header.dataset.lessonHeaderReady = "true";

    function enabledTabs() {
      return tabs.filter((tab) => !tab.disabled && tab.getAttribute("aria-disabled") !== "true");
    }

    function syncTabStops() {
      const enabled = enabledTabs();
      const selected = enabled.find((tab) => tab.getAttribute("aria-selected") === "true") || enabled[0];
      tabs.forEach((tab) => {
        tab.tabIndex = tab === selected ? 0 : -1;
      });
    }

    const reducedMotion = root.matchMedia?.("(prefers-reduced-motion: reduce)");
    const reveal = () => root.requestAnimationFrame(() => revealActiveStep(nav, reducedMotion?.matches ? "auto" : "smooth"));
    const observer = new MutationObserver((records) => {
      syncTabStops();
      if (records.some((record) => record.attributeName === "aria-selected" && record.target.getAttribute("aria-selected") === "true")) reveal();
    });
    tabs.forEach((tab) => observer.observe(tab, { attributes: true, attributeFilter: ["aria-selected", "disabled", "aria-disabled"] }));
    nav.addEventListener("keydown", (event) => {
      if (!event.target.closest?.(".step-tab")) return;
      const enabled = enabledTabs();
      if (!enabled.length) return;
      const currentIndex = Math.max(0, enabled.indexOf(event.target));
      let nextIndex = null;
      if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % enabled.length;
      if (event.key === "ArrowLeft") nextIndex = (currentIndex - 1 + enabled.length) % enabled.length;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = enabled.length - 1;
      if (nextIndex === null) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const next = enabled[nextIndex];
      next.focus();
      next.click();
    }, true);
    root.addEventListener("resize", reveal, { passive: true });
    syncTabStops();
    root.requestAnimationFrame(() => revealActiveStep(nav, "auto"));
  }

  function init() {
    root.document.querySelectorAll(HEADER_SELECTOR).forEach(initHeader);
  }

  if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})(window);
