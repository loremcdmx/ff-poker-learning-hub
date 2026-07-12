(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  function model({
    allInRunoutStageState = () => null,
    actionSequenceBoardRevealState = () => null,
    visibleBoardLength = () => 0,
    isVisualActive = () => false,
    boardRevealDelayRemaining = () => 0,
    boardRevealMs = () => 0,
    boardCardStaggerMs = 135,
    showdownWinningCardRole = () => "",
    renderCard = () => ""
  } = {}) {
    function renderBoard(table) {
      const allInStage = allInRunoutStageState(table);
      const actionBoardState = allInStage ? null : actionSequenceBoardRevealState(table);
      const revealActive = !allInStage && !actionBoardState && isVisualActive(table, "boardRevealUntil");
      // Renderable length, not the anti-spoiler visible length: while the
      // delayed street reveal is active the new card must already exist in
      // DOM (hidden by --board-card-delay) so the CSS animation fires on
      // schedule without an extra re-render.
      const visibleLength = actionBoardState
        ? Math.max(0, Number(actionBoardState.renderableLength || 0))
        : revealActive
        ? (table?.board?.length || 0)
        : visibleBoardLength(table);
      const visibleBoard = (table?.board || []).slice(0, visibleLength);
      const revealFrom = actionBoardState
        ? Math.min(visibleLength, Math.max(0, Number(actionBoardState.revealFrom || 0)))
        : allInStage
        ? Math.min(visibleLength, Array.isArray(allInStage.previousStage?.board) ? allInStage.previousStage.board.length : visibleLength)
        : Number.isFinite(Number(table?.boardRevealFrom)) ? Number(table.boardRevealFrom) : visibleBoard.length;
      const boardActive = actionBoardState
        ? Boolean(actionBoardState.revealing)
        : allInStage ? allInStage.dealing : isVisualActive(table, "boardRevealUntil");
      const revealDelay = actionBoardState || allInStage ? 0 : boardRevealDelayRemaining(table);
      const staggerMs = Math.max(0, Number(boardCardStaggerMs) || 0);
      const cards = visibleBoard.map((card, index) => {
        const shouldDeal = boardActive && index >= revealFrom;
        const delay = shouldDeal ? revealDelay + Math.max(0, index - revealFrom) * staggerMs : 0;
        return `<span class="board-card-wrap ${shouldDeal ? "is-board-dealt" : ""}" style="--board-card-delay:${delay}ms; --board-card-duration:${boardRevealMs()}ms;">${renderCard(card, { board: true, cardRole: showdownWinningCardRole(table, card) })}</span>`;
      });
      if (visibleBoard.length > 0) {
        for (let index = visibleBoard.length; index < 5; index += 1) {
          cards.push('<span class="board-slot" aria-hidden="true"></span>');
        }
      }
      return cards.join("");
    }

    return { renderBoard };
  }

  root.PokerSimulatorBoardRender = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = { model };
})();
