(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;
  const DESIGN_WIDTH = 1920;
  const TWO_TABLE_DESIGN_WIDTH = 2100;
  const TWO_TABLE_DESIGN_HEIGHT = 960;
  // Vertical (stacked) 2-table canvas: one column over two stacked rows, sized to
  // FILL the width of a portrait/tall workspace rather than just transpose the
  // side-by-side plane. The width (1400) is wide enough that on a typical tablet-
  // portrait workspace (~0.78 aspect) the plane is width-limited, so each stacked
  // table spreads to (almost) the full workspace width — a proper wide poker oval
  // (~1.9:1, like the single-table felt) instead of the cramped ~1.4 near-square
  // it would be if we preserved the side-by-side cell. The felt being wider also
  // makes every cqw-based element (cards, names, stacks) render larger; the
  // vertical-orientation token bumps in simulator-table.css push readability
  // further. Height stays 1920 so two full tables stack with the dock under each.
  const TWO_TABLE_VERTICAL_DESIGN_WIDTH = 1400;
  const TWO_TABLE_VERTICAL_DESIGN_HEIGHT = 1920;
  const DESIGN_HEIGHT = 1080;
  // A single embedded teaching table needs readable controls at laptop scale.
  // The normal simulator keeps its 1920x1080 plane; an explicit profile may use
  // a denser 1600x900 plane so fixed-pixel controls survive contain-scaling.
  const READABLE_SINGLE_DESIGN_WIDTH = 1600;
  const READABLE_SINGLE_DESIGN_HEIGHT = 900;
  // Minimum stage scale floor — stage never shrinks below this factor of design size.
  const MIN_STAGE_SCALE = 0.18;
  // Schmitt-trigger dead-band for the horizontal<->vertical 2-table flip. The
  // crossover is exactly where the two candidate scales are equal, so a workspace
  // parked near it would flap on every resize/observer tick. Require the
  // challenger orientation to beat the incumbent by this margin before switching.
  const ORIENTATION_HYSTERESIS = 0.06;

  function positiveNumber(value, fallback = 0) {
    const number = Number.parseFloat(value);
    return Number.isFinite(number) && number > 0 ? number : fallback;
  }

  // Pick the 2-table orientation that renders the tables BIGGER for this
  // workspace. Both candidate planes scale by min(availW/designW, availH/designH);
  // the larger scale wins. This self-calibrates (it reproduces a ~1.2 workspace-
  // aspect crossover) and stays correct if the design dimensions ever change,
  // unlike a hard-coded aspect threshold. `incumbent` is the orientation already
  // applied (read from the stage), so the hysteresis margin only blocks flips.
  function twoTableOrientation(availableWidth, availableHeight, incumbent) {
    const w = positiveNumber(availableWidth);
    const h = positiveNumber(availableHeight);
    if (!(w > 0) || !(h > 0)) return "horizontal";
    const scaleH = Math.min(w / TWO_TABLE_DESIGN_WIDTH, h / TWO_TABLE_DESIGN_HEIGHT);
    const scaleV = Math.min(w / TWO_TABLE_VERTICAL_DESIGN_WIDTH, h / TWO_TABLE_VERTICAL_DESIGN_HEIGHT);
    if (incumbent === "vertical") {
      return scaleH > scaleV * (1 + ORIENTATION_HYSTERESIS) ? "horizontal" : "vertical";
    }
    return scaleV > scaleH * (1 + ORIENTATION_HYSTERESIS) ? "vertical" : "horizontal";
  }

  function stageDesignSize(stage, availableWidth, availableHeight) {
    const grid = stage?.querySelector?.("#table-grid");
    const tableCount = Number(grid?.dataset?.count || 1);
    const activeTables = grid && !grid.classList.contains("is-idle");
    if (activeTables && tableCount === 2) {
      const incumbent = stage?.dataset?.orient === "vertical" ? "vertical" : "horizontal";
      const orientation = twoTableOrientation(availableWidth, availableHeight, incumbent);
      if (orientation === "vertical") {
        return { width: TWO_TABLE_VERTICAL_DESIGN_WIDTH, height: TWO_TABLE_VERTICAL_DESIGN_HEIGHT, tableCount, orientation };
      }
      return { width: TWO_TABLE_DESIGN_WIDTH, height: TWO_TABLE_DESIGN_HEIGHT, tableCount, orientation };
    }
    const stageProfile = String(root.document?.documentElement?.dataset?.simulatorStageProfile || "");
    if (activeTables && tableCount === 1 && stageProfile === "readable-single") {
      return {
        width: READABLE_SINGLE_DESIGN_WIDTH,
        height: READABLE_SINGLE_DESIGN_HEIGHT,
        tableCount,
        orientation: "horizontal"
      };
    }
    return { width: DESIGN_WIDTH, height: DESIGN_HEIGHT, tableCount, orientation: "horizontal" };
  }

  function syncStage(shell, stage, workspace) {
    if (!shell || !stage || !workspace) return 1;
    const idleGrid = stage.querySelector?.("#table-grid");
    if (idleGrid && idleGrid.classList.contains("is-idle")) {
      // The idle "Настрой сессию" start screen is a normal responsive layout,
      // NOT the fixed 1920×1080 game canvas. Letterbox-scaling it (16:9 contain)
      // shrinks the settings panel into a tiny card marooned in empty felt.
      // Let the stage fill the workspace instead, so the panel and felt size to
      // the real viewport. syncStage re-runs (MutationObserver on the grid class)
      // when tables start, restoring the scaled game canvas below.
      shell.style.width = "100%";
      shell.style.height = "100%";
      stage.style.width = "100%";
      stage.style.height = "100%";
      stage.style.transform = "none";
      if (stage.dataset.orient) stage.removeAttribute("data-orient");
      const docStyle = root.document?.documentElement?.style;
      docStyle?.setProperty("--sim-stage-scale", "1");
      docStyle?.setProperty("--sim-stage-inverse-scale", "1");
      return 1;
    }
    const rect = workspace.getBoundingClientRect();
    const style = root.getComputedStyle ? root.getComputedStyle(workspace) : null;
    const paddingX = positiveNumber(style?.paddingLeft) + positiveNumber(style?.paddingRight);
    const paddingY = positiveNumber(style?.paddingTop) + positiveNumber(style?.paddingBottom);
    const availableWidth = Math.max(1, rect.width - paddingX);
    const availableHeight = Math.max(1, rect.height - paddingY);
    const design = stageDesignSize(stage, availableWidth, availableHeight);
    // Publish the chosen 2-table orientation so CSS can switch the grid to a
    // stacked single column. Written to the STAGE (not #table-grid) on purpose:
    // the grid carries the MutationObserver that re-runs syncStage, so writing
    // an observed attribute there would risk a feedback loop. Only ever set for
    // the vertical case and removed otherwise, so `[data-orient="vertical"]`
    // never lingers into single-table / idle states.
    if (design.orientation === "vertical") {
      if (stage.dataset.orient !== "vertical") stage.dataset.orient = "vertical";
    } else if (stage.dataset.orient) {
      stage.removeAttribute("data-orient");
    }
    const scale = Math.max(MIN_STAGE_SCALE, Math.min(availableWidth / design.width, availableHeight / design.height));
    const width = Math.round(design.width * scale);
    const height = Math.round(design.height * scale);
    const widthPx = `${width}px`;
    const heightPx = `${height}px`;
    const transform = `scale(${scale})`;

    // Skip writes when nothing changed. schedule() now applies synchronously on
    // every trigger (resize, ResizeObserver, count change), so a burst of
    // workspace resizes could call this many times per frame; only the writes
    // dirty layout, so guarding them keeps redundant syncs free instead of
    // thrashing the whole scaled stage subtree.
    if (shell.style.width !== widthPx) shell.style.width = widthPx;
    if (shell.style.height !== heightPx) shell.style.height = heightPx;
    if (stage.style.width !== `${design.width}px`) stage.style.width = `${design.width}px`;
    if (stage.style.height !== `${design.height}px`) stage.style.height = `${design.height}px`;
    if (stage.style.transform !== transform) stage.style.transform = transform;
    if (stage.style.transformOrigin !== "top left") stage.style.transformOrigin = "top left";
    const docStyle = root.document?.documentElement?.style;
    if (docStyle) {
      const scaleStr = scale.toFixed(4);
      const inverseScaleStr = (1 / scale).toFixed(4);
      if (docStyle.getPropertyValue("--sim-stage-scale") !== scaleStr) docStyle.setProperty("--sim-stage-scale", scaleStr);
      if (docStyle.getPropertyValue("--sim-stage-inverse-scale") !== inverseScaleStr) docStyle.setProperty("--sim-stage-inverse-scale", inverseScaleStr);
      if (docStyle.getPropertyValue("--sim-stage-design-width") !== String(design.width)) docStyle.setProperty("--sim-stage-design-width", String(design.width));
      if (docStyle.getPropertyValue("--sim-stage-design-height") !== String(design.height)) docStyle.setProperty("--sim-stage-design-height", String(design.height));
    }
    return scale;
  }

  function init(options = {}) {
    const documentRef = options.document || root.document;
    const workspace = options.workspace || documentRef?.querySelector?.(".workspace");
    const shell = options.shell || documentRef?.getElementById?.("simulator-stage-shell");
    const stage = options.stage || documentRef?.getElementById?.("simulator-stage");
    if (!workspace || !shell || !stage) return null;

    let frame = 0;
    const request = typeof root.requestAnimationFrame === "function"
      ? root.requestAnimationFrame.bind(root)
      : (callback) => root.setTimeout(callback, 16);
    const cancel = typeof root.cancelAnimationFrame === "function"
      ? root.cancelAnimationFrame.bind(root)
      : root.clearTimeout.bind(root);

    function schedule() {
      // Apply synchronously first. Headless Chromium and backgrounded tabs
      // throttle requestAnimationFrame, so a sync that runs ONLY inside rAF can
      // be deferred well past the layout change that triggered it — leaving the
      // shell on its CSS fallback size, which for two active tables is a
      // portrait, workspace-overflowing stage (the Linux-CI roomlike-2t break).
      // The immediate pass guarantees correct geometry the moment the table
      // count / workspace changes; the trailing rAF still coalesces rapid
      // resize bursts into one final sync.
      syncStage(shell, stage, workspace);
      if (frame) cancel(frame);
      frame = request(() => {
        frame = 0;
        syncStage(shell, stage, workspace);
      });
    }

    schedule();
    root.addEventListener?.("resize", schedule, { passive: true });
    root.addEventListener?.("orientationchange", schedule, { passive: true });
    if (typeof root.ResizeObserver === "function") {
      const observer = new root.ResizeObserver(schedule);
      observer.observe(workspace);
    }
    if (typeof root.MutationObserver === "function") {
      const grid = stage.querySelector?.("#table-grid");
      if (grid) {
        const observer = new root.MutationObserver(schedule);
        observer.observe(grid, { attributes: true, attributeFilter: ["class", "data-count"] });
      }
    }

    return { sync: schedule, shell, stage, workspace };
  }

  const api = {
    DESIGN_WIDTH,
    TWO_TABLE_DESIGN_WIDTH,
    TWO_TABLE_DESIGN_HEIGHT,
    TWO_TABLE_VERTICAL_DESIGN_WIDTH,
    TWO_TABLE_VERTICAL_DESIGN_HEIGHT,
    DESIGN_HEIGHT,
    READABLE_SINGLE_DESIGN_WIDTH,
    READABLE_SINGLE_DESIGN_HEIGHT,
    init,
    syncStage
  };
  root.PokerSimulatorStage = api;

  if (root.document?.readyState === "loading") {
    root.document.addEventListener("DOMContentLoaded", () => init(), { once: true });
  } else {
    init();
  }

  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();
