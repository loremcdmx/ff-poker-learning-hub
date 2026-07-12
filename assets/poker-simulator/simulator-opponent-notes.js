(function () {
  "use strict";

  const root = typeof window !== "undefined" ? window : globalThis;

  function model(options = {}) {
    const windowRef = options.windowRef || root;
    const getState = typeof options.getState === "function" ? options.getState : () => ({});
    const opponentNoteKeyForSeat = typeof options.opponentNoteKeyForSeat === "function" ? options.opponentNoteKeyForSeat : () => "";
    const opponentNoteHasContent = typeof options.opponentNoteHasContent === "function" ? options.opponentNoteHasContent : (note) => Boolean(note);
    const sanitizeOpponentNoteKey = typeof options.sanitizeOpponentNoteKey === "function" ? options.sanitizeOpponentNoteKey : (value) => String(value || "");
    const sanitizeOpponentNoteTag = typeof options.sanitizeOpponentNoteTag === "function" ? options.sanitizeOpponentNoteTag : (value) => String(value || "");
    const sanitizeOpponentNoteEntry = typeof options.sanitizeOpponentNoteEntry === "function" ? options.sanitizeOpponentNoteEntry : (value) => value || null;
    const saveOpponentNotes = typeof options.saveOpponentNotes === "function" ? options.saveOpponentNotes : () => false;
    const markAllTablesDirty = typeof options.markAllTablesDirty === "function" ? options.markAllTablesDirty : () => {};
    const render = typeof options.render === "function" ? options.render : () => {};
    const formatAmount = typeof options.formatAmount === "function" ? options.formatAmount : (value) => String(value || 0);
    const escapeHtml = typeof options.escapeHtml === "function" ? options.escapeHtml : (value) => String(value ?? "");
    const now = typeof options.now === "function" ? options.now : () => new Date().toISOString();
    const controls = options.controls || {};

    function state() {
      return getState() || {};
    }

    function opponentNoteForSeat(seat) {
      const current = state();
      const key = opponentNoteKeyForSeat(seat);
      return key ? current.opponentNotes?.[key] || null : null;
    }

    function opponentNoteTagLabel(tag) {
      const labels = {
        fish: "Фиш",
        reg: "Рег",
        nit: "Нит",
        station: "Телефон",
        aggro: "Агро"
      };
      return labels[sanitizeOpponentNoteTag(tag)] || "Без метки";
    }

    function opponentNoteTagShort(tag) {
      const labels = {
        fish: "F",
        reg: "R",
        nit: "N",
        station: "CS",
        aggro: "AG"
      };
      return labels[sanitizeOpponentNoteTag(tag)] || "+";
    }

    function renderOpponentNoteButton(seat, note = opponentNoteForSeat(seat)) {
      const key = opponentNoteKeyForSeat(seat);
      if (!key) return "";
      const hasNote = opponentNoteHasContent(note);
      const tag = sanitizeOpponentNoteTag(note?.tag);
      const label = hasNote
        ? `${opponentNoteTagLabel(tag)} · ${String(note?.text || "").trim() || "есть заметка"}`
        : `Нотс на ${seat.name || seat.position || "оппонента"}`;
      return `
          <button class="opponent-note-button ${hasNote ? "has-note" : "is-empty"}" type="button" data-opponent-note-key="${escapeHtml(key)}" data-opponent-note-seat="${Number(seat.id)}" aria-label="${escapeHtml(label)}" title="${escapeHtml(label)}">
            ${escapeHtml(hasNote ? opponentNoteTagShort(tag) : "+")}
          </button>
        `;
    }

    function openOpponentNoteDialog(table, seat) {
      const current = state();
      if (!controls.dialog || !seat || seat.isHero) return;
      const key = opponentNoteKeyForSeat(seat);
      if (!key) return;
      const note = opponentNoteForSeat(seat) || { tag: "", text: "", seatName: seat.name || "" };
      current.editingOpponentNoteKey = key;
      current.editingOpponentNoteSeatName = seat.name || seat.position || `Seat ${seat.id}`;
      if (controls.title) controls.title.textContent = `Нотс: ${current.editingOpponentNoteSeatName}`;
      if (controls.subtitle) {
        const position = seat.position ? `${seat.position} · ` : "";
        controls.subtitle.textContent = `${position}${formatAmount(seat.stack || 0)} · раздача #${table?.handNo || current.handSeq || 0}`;
      }
      if (controls.tagSelect) controls.tagSelect.value = sanitizeOpponentNoteTag(note.tag);
      if (controls.textInput) controls.textInput.value = String(note.text || "");
      controls.dialog.showModal();
      windowRef.setTimeout?.(() => controls.textInput?.focus?.(), 0);
    }

    function saveOpponentNoteFromDialog() {
      const current = state();
      const key = sanitizeOpponentNoteKey(current.editingOpponentNoteKey);
      if (!key) return;
      const tag = sanitizeOpponentNoteTag(controls.tagSelect?.value);
      const text = String(controls.textInput?.value || "").replace(/\r\n/g, "\n").slice(0, 1200);
      const note = sanitizeOpponentNoteEntry({
        key,
        tag,
        text,
        seatName: current.editingOpponentNoteSeatName,
        updatedAt: now()
      }, key);
      if (!current.opponentNotes) current.opponentNotes = {};
      if (note) current.opponentNotes[key] = note;
      else delete current.opponentNotes[key];
      saveOpponentNotes();
      markAllTablesDirty();
      render("opponent-note");
      controls.dialog?.close();
    }

    function clearOpponentNoteFromDialog() {
      const current = state();
      const key = sanitizeOpponentNoteKey(current.editingOpponentNoteKey);
      if (!current.opponentNotes) current.opponentNotes = {};
      if (key) delete current.opponentNotes[key];
      saveOpponentNotes();
      markAllTablesDirty();
      render("opponent-note-clear");
      controls.dialog?.close();
    }

    function resetEditingOpponentNote() {
      const current = state();
      current.editingOpponentNoteKey = "";
      current.editingOpponentNoteSeatName = "";
    }

    return {
      opponentNoteForSeat,
      opponentNoteTagLabel,
      opponentNoteTagShort,
      renderOpponentNoteButton,
      openOpponentNoteDialog,
      saveOpponentNoteFromDialog,
      clearOpponentNoteFromDialog,
      resetEditingOpponentNote
    };
  }

  root.PokerSimulatorOpponentNotes = { model };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = { model };
  }
}());
