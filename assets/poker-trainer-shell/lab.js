(function () {
  "use strict";

  function ready(callback) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", callback, { once: true });
      return;
    }
    callback();
  }

  ready(() => {
    const root = document.getElementById("ffTrainerShellRoot");
    const library = window.FFTrainerShellPacks || {};
    const packs = Array.isArray(library.packs) ? library.packs : [];
    const params = new URLSearchParams(window.location.search);
    const requestedPack = params.get("pack") || library.defaultPackId || packs[0]?.id;
    const pack = packs.find((item) => item.id === requestedPack) || packs[0];

    if (!root || !window.FFTrainerShell || !pack) {
      if (root) root.textContent = "Скелет тренажёра ещё не загрузился.";
      return;
    }

    window.FFTrainerShell.mount(root, {
      packs,
      pack,
      lab: true,
      packId: requestedPack,
      previewDensity: "lab"
    });
  });
}());
