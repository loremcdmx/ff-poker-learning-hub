(function () {
  "use strict";

  const host = document.querySelector("[data-structure-league-matrix]");
  const source = window.FF_POKER_FIELD_LESSON_DATA?.fieldMatrix;
  const STRUCTURE_COPY = {
    a_high_dry: ["Туз-хай · сухая", "разные масти · мало связей"],
    k_high_dry: ["Король-хай · сухая", "разные масти · мало связей"],
    broadway: ["Бродвейная", "две или три карты от десятки"],
    low_connected: ["Низкая связанная", "низкие ранги · много стрит-дро"],
    paired: ["Спаренная", "две или три карты одного ранга"],
    two_tone: ["Двухмастная", "ровно две карты одной масти"],
    monotone: ["Одномастная", "три карты одной масти"],
    other: ["Другие разноцветные", "остальные неспаренные флопы разных мастей"]
  };
  const STRUCTURE_KEYS = [
    "a_high_dry",
    "k_high_dry",
    "broadway",
    "low_connected",
    "paired",
    "two_tone",
    "monotone",
    "other"
  ];
  const LEAGUE_KEYS = ["league1", "league2", "league3"];
  const FOLD_VIEW_KEYS = ["overall", "matched"];
  let foldView = source?.defaultFoldView || "overall";

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  }

  function integer(value) {
    return Number.isInteger(value) ? value : null;
  }

  function rate(numerator, denominator) {
    return denominator > 0 ? numerator / denominator * 100 : null;
  }

  function percent(value) {
    if (!Number.isFinite(value)) return "—";
    return `${value.toLocaleString("ru-RU", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
  }

  function reliabilityFor(denominator) {
    const directionalMin = Number(source?.reliability?.directionalMin) || 50;
    const solidMin = Number(source?.reliability?.solidMin) || 200;
    if (!Number.isFinite(denominator) || denominator < directionalMin) return "thin";
    if (denominator < solidMin) return "directional";
    return "solid";
  }

  function matrixErrors(matrix) {
    const errors = [];
    if (!matrix || typeof matrix !== "object") return ["нет fieldMatrix"];
    if (matrix.version !== 1) errors.push("ожидается fieldMatrix.version = 1");
    if (matrix.role !== "aggressor") errors.push("role должен быть aggressor");
    if (matrix.rankRole !== "preflop_aggressor") errors.push("rankRole должен быть preflop_aggressor");
    if (JSON.stringify(matrix.positions) !== JSON.stringify(["CO", "BTN"])) errors.push("positions должны быть CO и BTN");
    if (matrix.canonicalNode !== false) errors.push("nearby HH sample должен быть помечен canonicalNode=false");

    const leagues = Array.isArray(matrix.leagues) ? matrix.leagues : [];
    const rows = Array.isArray(matrix.rows) ? matrix.rows : [];
    const views = Array.isArray(matrix.foldViews) ? matrix.foldViews : [];
    if (JSON.stringify(leagues.map((item) => item?.key)) !== JSON.stringify(LEAGUE_KEYS)) {
      errors.push("нужны League 1, 2 и 3 в правильном порядке");
    }
    if (JSON.stringify(rows.map((item) => item?.key)) !== JSON.stringify(STRUCTURE_KEYS)) {
      errors.push("нужны восемь взаимоисключающих структур в правильном порядке");
    }
    if (JSON.stringify(views.map((item) => item?.key)) !== JSON.stringify(FOLD_VIEW_KEYS)) {
      errors.push("нужны overall и matched sizing views");
    }

    rows.forEach((row, rowIndex) => {
      LEAGUE_KEYS.forEach((leagueKey) => {
        const cell = row?.values?.[leagueKey];
        const cbet = cell?.cbet;
        const made = integer(cbet?.made);
        const opportunities = integer(cbet?.opportunities);
        if (made === null || opportunities === null || opportunities <= 0 || made < 0 || made > opportunities) {
          errors.push(`rows[${rowIndex}].${leagueKey}: неверные c-bet counts`);
          return;
        }
        FOLD_VIEW_KEYS.forEach((viewKey) => {
          const fold = cell?.foldVsXr?.[viewKey];
          const folds = integer(fold?.folds);
          const faced = integer(fold?.faced);
          if (folds === null || faced === null || faced <= 0 || folds < 0 || folds > faced || faced > made) {
            errors.push(`rows[${rowIndex}].${leagueKey}.${viewKey}: неверные fold-vs-X/R counts`);
          }
        });
        const overallFaced = integer(cell?.foldVsXr?.overall?.faced);
        const matchedFaced = integer(cell?.foldVsXr?.matched?.faced);
        if (overallFaced !== null && matchedFaced !== null && matchedFaced > overallFaced) {
          errors.push(`rows[${rowIndex}].${leagueKey}: matched N больше overall N`);
        }
      });
    });
    return errors;
  }

  function totalsFor(leagueKey) {
    return source.rows.reduce((totals, row) => {
      const cell = row.values[leagueKey];
      totals.cbets += cell.cbet.made;
      totals.opportunities += cell.cbet.opportunities;
      FOLD_VIEW_KEYS.forEach((viewKey) => {
        totals[viewKey].folds += cell.foldVsXr[viewKey].folds;
        totals[viewKey].faced += cell.foldVsXr[viewKey].faced;
      });
      return totals;
    }, {
      cbets: 0,
      opportunities: 0,
      overall: { folds: 0, faced: 0 },
      matched: { folds: 0, faced: 0 }
    });
  }

  function appendKpi(parent, label, numerator, denominator, className) {
    const kpi = element("div", `structure-league-kpi ${className}`);
    const reliability = reliabilityFor(denominator);
    const value = percent(rate(numerator, denominator));
    kpi.dataset.reliability = reliability;
    const content = [
      element("span", "structure-league-kpi-label", label),
      element("strong", "", value)
    ];
    kpi.append(...content);
    parent.append(kpi);
  }

  function renderScope() {
    const scope = element("aside", "structure-league-scope panel");
    const copy = element("div", "structure-league-scope-copy");
    copy.append(
      element("p", "eyebrow", "Что показываем"),
      element("strong", "", "Смотрим на игрока CO/BTN, который открылся префлоп"),
      element("span", "", "Жёлтый процент — как часто он ставит после чека BB. Зелёный — как часто пасует на чек-рейз. Наблюдение поля, не рекомендация.")
    );
    scope.append(copy);
    return scope;
  }

  function renderControls() {
    const controls = element("section", "structure-league-controls panel");
    const copy = element("div", "structure-league-controls-copy");
    const selectedView = source.foldViews.find((item) => item.key === foldView);
    copy.append(
      element("p", "eyebrow", "Размеры"),
      element("h3", "", "Как меняется пас на чек-рейз"),
      element("p", "", selectedView.key === "matched"
        ? "Ставка 30–36% банка и чек-рейз примерно до банка."
        : "Все размеры ставок и чек-рейзов.")
    );

    const buttons = element("div", "structure-league-view-tabs");
    buttons.setAttribute("role", "group");
    buttons.setAttribute("aria-label", "Размер ставки и чек-рейза");
    source.foldViews.forEach((view) => {
      const buttonLabel = view.key === "matched" ? "Один размер" : "Все размеры";
      const button = element("button", view.key === foldView ? "is-active" : "", buttonLabel);
      button.type = "button";
      button.dataset.foldView = view.key;
      button.setAttribute("aria-pressed", String(view.key === foldView));
      button.title = view.key === "matched"
        ? "Ставка 30–36% банка и чек-рейз примерно до банка"
        : "Все размеры ставок и чек-рейзов";
      button.addEventListener("click", () => {
        if (foldView === view.key) return;
        foldView = view.key;
        render();
      });
      buttons.append(button);
    });
    controls.append(copy, buttons);
    return controls;
  }

  function renderLeagueSummaries() {
    const grid = element("div", "structure-league-summary-grid");
    source.leagues.forEach((league) => {
      const totals = totalsFor(league.key);
      const fold = totals[foldView];
      const card = element("article", `structure-league-summary panel is-${league.key}`);
      const heading = element("header", "");
      heading.append(
        element("span", "structure-league-index", league.key.slice(-1).padStart(2, "0")),
        element("div", "", undefined)
      );
      heading.lastElementChild.append(
        element("p", "eyebrow", "Игра после флопа"),
        element("h3", "", `Лига ${league.key.slice(-1)}`)
      );
      const metrics = element("div", "structure-league-summary-metrics");
      appendKpi(metrics, "Нам ставят", totals.cbets, totals.opportunities, "is-cbet");
      appendKpi(metrics, `Пас · ${foldView === "matched" ? "сопоставимый размер" : "все размеры"}`, fold.folds, fold.faced, "is-fold");
      card.append(heading, metrics);
      grid.append(card);
    });
    return grid;
  }

  function renderTable() {
    const card = element("article", "structure-league-table-card panel");
    const header = element("header", "structure-league-table-heading");
    const title = element("div", "");
    title.append(
      element("p", "eyebrow", "8 взаимоисключающих типов флопа"),
      element("h3", "", "Тип флопа × лига")
    );
    const legend = element("div", "structure-league-legend");
    legend.append(
      element("span", "is-cbet", "CO/BTN ставит после чека BB"),
      element("span", "is-fold", "CO/BTN пасует на чек-рейз")
    );
    header.append(title, legend);

    const scroll = element("div", "structure-league-table-scroll");
    const table = element("table", "structure-league-table");
    const caption = element("caption", "visually-hidden", "Как часто CO/BTN ставит после чека BB и пасует на чек-рейз, по типам флопа и лигам");
    const thead = element("thead", "");
    const headRow = element("tr", "");
    ["Тип флопа", ...source.leagues.map((league, index) => `Лига ${index + 1}`)].forEach((label) => {
      const cell = element("th", "", label);
      cell.scope = "col";
      headRow.append(cell);
    });
    thead.append(headRow);

    const tbody = element("tbody", "");
    source.rows.forEach((row) => {
      const tr = element("tr", "");
      const structure = element("th", "structure-league-board");
      structure.scope = "row";
      const [structureLabel, structureNote] = STRUCTURE_COPY[row.key] || [row.label, row.note];
      structure.append(
        element("span", "structure-league-board-example", row.example),
        element("strong", "", structureLabel),
        element("small", "", structureNote)
      );
      tr.append(structure);
      source.leagues.forEach((league, leagueIndex) => {
        const value = row.values[league.key];
        const fold = value.foldVsXr[foldView];
        const cell = element("td", "structure-league-cell");
        cell.dataset.label = `Лига ${leagueIndex + 1}`;
        const metrics = element("div", "structure-league-cell-metrics");
        metrics.append(element("span", "structure-league-mobile-label", `Лига ${leagueIndex + 1}`));
        appendKpi(metrics, "Нам ставят", value.cbet.made, value.cbet.opportunities, "is-cbet");
        appendKpi(metrics, "Пас на чек-рейз", fold.folds, fold.faced, "is-fold");
        cell.append(metrics);
        tr.append(cell);
      });
      tbody.append(tr);
    });
    table.append(caption, thead, tbody);
    scroll.append(table);

    card.append(header, scroll);
    return card;
  }

  function renderError(errors) {
    console.error("[flop-checkraise] field matrix validation failed", errors);
    const card = element("article", "structure-league-error panel");
    card.append(
      element("strong", "", "Данные поля не загрузились"),
      element("p", "", "Обнови страницу или попробуй позже.")
    );
    host.replaceChildren(card);
  }

  function render() {
    const errors = matrixErrors(source);
    if (errors.length) {
      renderError(errors);
      return;
    }
    host.dataset.foldView = foldView;
    host.replaceChildren(
      renderScope(),
      renderControls(),
      renderLeagueSummaries(),
      renderTable()
    );
  }

  window.FFCheckraiseFieldMatrix = Object.freeze({
    version: 1,
    validate(matrix) {
      return { errors: matrixErrors(matrix) };
    }
  });

  if (!host) return;
  render();
})();
