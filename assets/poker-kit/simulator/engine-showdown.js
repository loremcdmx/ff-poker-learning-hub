// Showdown, hand-history snapshots, and terminal betting cleanup. Loaded before simulator-engine.js facade.
  function showdown(table) {
    const hero = heroSeat(table);
    const heroLive = Boolean(hero && !hero.folded);
    const opponents = liveContestingOpponents(table);
    opponents.forEach((seat) => {
      seat.revealed = true;
    });
    // Close the live betting street BEFORE publishing the terminal showdown
    // state. snapshotClosingStreetBets() runs inside this call and must see the
    // real street/board tuple (river, 5), plus the full river seq band. Publishing
    // {street:"showdown"} first collapsed that band to only actionSeq, so in a
    // multiway river Hero-bet/call/call the first caller's resting marker was no
    // longer associated with the snapshot and disappeared as soon as its own
    // animation finished. The chips are still accounted identically; only the
    // visual hand-off is captured while its canonical betting context is live.
    closeTerminalBettingState(table);
    table.street = "showdown";
    table.status = "showdown";
    table.busy = false;
    table.heroTurn = false;

    const heroEval = heroLive ? evaluateBest([...table.heroHand, ...table.board]) : null;
    const opponentResults = opponents.map((seat) => ({
      seat,
      eval: evaluateBest([...seat.cards, ...table.board])
    }));
    // "сет" (a pocket pair hitting its third) vs "трипс" (one hole card + a board
    // pair, or board trips) read identically from the score alone — refine the
    // name by hole-card composition so the trainer teaches the right term.
    if (heroEval) heroEval.name = refineTripsHandName(heroEval, table.heroHand);
    opponentResults.forEach((result) => { result.eval.name = refineTripsHandName(result.eval, result.seat.cards); });
    const bestOpponent = opponentResults
      .sort((first, second) => compareScores(second.eval.score, first.eval.score))[0];
    const comparison = heroEval && bestOpponent ? compareScores(heroEval.score, bestOpponent.eval.score) : (heroEval ? 1 : -1);

    if (!heroEval && bestOpponent) {
      const botWinners = opponentResults.filter((result) => compareScores(result.eval.score, bestOpponent.eval.score) === 0);
      table.result = botWinners.length > 1
        ? `Split pot: ${bestOpponent.eval.name}`
        : `${bestOpponent.seat.position} win: ${bestOpponent.eval.name}`;
    } else if (comparison > 0) {
      table.result = `Hero win: ${heroEval.name}`;
    } else if (comparison < 0) {
      table.result = `${bestOpponent.seat.position} win: ${bestOpponent.eval.name}`;
    } else {
      table.result = `Split pot: ${heroEval.name}`;
    }

    // Cards that make up the winning 5-card combo. UI highlights these
    // (the winning seat's hole cards + matching board cards glow gold)
    // so the player can see WHY the winner won — e.g., Сет K → the three
    // Kings glow. Splits glow on the shared 5 cards.
    const winningEval = heroEval && comparison >= 0 ? heroEval : bestOpponent?.eval;
    table.winningCards = Array.isArray(winningEval?.cards) ? winningEval.cards.slice() : [];

    let winnerSeats = [];
    if (!heroEval && bestOpponent) {
      winnerSeats = opponentResults
        .filter((result) => compareScores(result.eval.score, bestOpponent.eval.score) === 0)
        .map((result) => result.seat);
    } else if (comparison > 0) {
      winnerSeats = [hero];
    } else if (comparison < 0) {
      winnerSeats = opponentResults
        .filter((result) => compareScores(result.eval.score, bestOpponent.eval.score) === 0)
        .map((result) => result.seat);
    } else {
      winnerSeats = [
        hero,
        ...opponentResults
          .filter((result) => compareScores(result.eval.score, heroEval.score) === 0)
          .map((result) => result.seat)
      ];
    }
    table.resultKind = !heroEval ? "lost" : comparison > 0 ? "won" : comparison < 0 ? "lost" : "split";
    table.showdown = {
      schema: "poker-simulator-showdown-v1",
      allIn: Boolean(table.allInRunout),
      pot: roundBbValue(table.pot),
      result: table.result,
      winningHandName: winningEval?.name || "",
      winningCards: table.winningCards.slice(),
      winners: winnerSeats.filter(Boolean).map((seat) => ({
        seatId: seat.id,
        position: seat.position,
        name: seat.name,
        isHero: Boolean(seat.isHero)
      })),
      participants: [
        {
          seatId: hero?.id ?? 0,
          position: hero?.position || table.heroPosition || "Hero",
          name: hero?.name || "Hero",
          isHero: true,
          cards: Array.isArray(table.heroHand) ? table.heroHand.slice(0, 2) : [],
          handName: heroEval?.name || "",
          score: heroEval?.score?.slice?.() || []
        },
        ...opponentResults.map((result) => ({
          seatId: result.seat.id,
          position: result.seat.position,
          name: result.seat.name,
          isHero: false,
          cards: Array.isArray(result.seat.cards) ? result.seat.cards.slice(0, 2) : [],
          handName: result.eval.name,
          score: result.eval.score.slice()
        }))
      ].filter((participant) => participant.isHero ? heroLive : true)
    };
    // Settle with the FULL live ranking (not just the headline winners) so
    // side pots resolve correctly: a short all-in wins only the main pot, while
    // a deeper seat with a worse hand can still take a side pot it alone covers.
    // Reuses the evals already computed above so award and display never diverge.
    const showdownTierInput = opponentResults.map((result) => ({
      seatId: result.seat.id,
      score: result.eval.score
    }));
    if (heroLive) {
      showdownTierInput.unshift({ seatId: hero.id, score: heroEval.score });
    }
    const allInSettlementBefore = snapshotAllInSettlementStacks(table);
    settlePots(table, rankTiersFromResults(showdownTierInput));
    const potAwards = table.potAwards && typeof table.potAwards === "object" ? table.potAwards : {};
    const potAwardsList = Object.entries(potAwards)
      .map(([seatId, amount]) => ({
        seatId: Number(seatId),
        amount: roundBbValue(amount)
      }))
      .filter((award) => Number.isFinite(award.seatId) && award.amount > 0);
    const potWinnerSeats = potAwardsList
      .map((award) => ({ award, seat: seatById(table, award.seatId) }))
      .filter((entry) => entry.seat)
      .map(({ award, seat }) => ({
        seatId: seat.id,
        position: seat.position,
        name: seat.name,
        isHero: Boolean(seat.isHero),
        amount: award.amount
      }));
    if (table.showdown) {
      table.showdown.potAwards = potAwardsList;
      table.showdown.potWinners = potWinnerSeats;
    }
    const heroPotAward = potAwardsList.find((award) => Number(award.seatId) === 0);
    // Reconcile the headline (best-hand) winner declaration with the ACTUAL
    // chip awards. settlePots can credit a deeper seat with a worse hand for a
    // side pot it alone covers, so the authoritative winner set is every seat
    // with a positive award — not the single best-hand comparison above. When
    // the awards diverge from the headline winners (a side pot exists), rebuild
    // showdown.winners, table.result and table.resultKind from the awards so the
    // banner, hand-log, seat glow and EV-share all read the complete winner set.
    const headlineWinnerIds = new Set(winnerSeats.filter(Boolean).map((seat) => Number(seat.id)));
    const awardedWinnerIds = new Set(potWinnerSeats.map((winner) => Number(winner.seatId)));
    const awardsDivergeFromHeadline = potWinnerSeats.length > 0 && (
      awardedWinnerIds.size !== headlineWinnerIds.size
      || [...awardedWinnerIds].some((seatId) => !headlineWinnerIds.has(seatId))
    );
    if (awardsDivergeFromHeadline) {
      table.showdown.winners = potWinnerSeats.map((winner) => ({
        seatId: winner.seatId,
        position: winner.position,
        name: winner.name,
        isHero: Boolean(winner.isHero)
      }));
      const heroAwarded = Boolean(heroPotAward);
      const otherAwarded = potWinnerSeats.some((winner) => Number(winner.seatId) !== 0);
      table.resultKind = heroAwarded ? (otherAwarded ? "split" : "won") : "lost";
      if (heroAwarded && comparison < 0) {
        // Hero lost the main-pot hand comparison but still collected a side pot.
        table.result = `${bestOpponent?.seat?.position || "Opponent"} wins main, Hero wins side ${formatBb(heroPotAward.amount)}`;
      } else {
        const awardText = potWinnerSeats
          .map((winner) => `${winner.isHero ? "Hero" : (winner.position || winner.name || "Opponent")} ${formatBb(winner.amount)}`)
          .join(", ");
        table.result = potWinnerSeats.length > 1 ? `Split pot: ${awardText}` : awardText;
      }
      if (table.showdown) table.showdown.result = table.result;
    }
    attachAllInRunoutRealizedShares(table, allInSettlementBefore);

    const eliminated = markTournamentEliminations(table);
    markHeroBustedIfNeeded(table);
    markTournamentWonIfNeeded(table);
    table.lastAction = table.result;
    if (eliminated.length) {
      addLog(table, `${eliminated.map((seat) => seat.position || seat.name).join(", ")} eliminated`);
    }
    addLog(table, heroEval
      ? `Showdown: Hero ${heroEval.name}${bestOpponent ? `, ${bestOpponent.seat.position} ${bestOpponent.eval.name}` : ""}`
      : `Showdown: ${bestOpponent ? `${bestOpponent.seat.position} ${bestOpponent.eval.name}` : "bot hand"}`
    );
    recordTimeline(table, "result", table.result, {
      status: table.status,
      result: table.result,
      heroBusted: Boolean(table.heroBusted),
      tournamentComplete: Boolean(table.tournamentComplete),
      bustedReason: table.bustedReason || "",
      tournamentFinish: table.tournamentFinish ? { ...table.tournamentFinish } : null,
      eliminatedSeatIds: eliminated.map((seat) => seat.id),
      heroEval: heroEval?.name || "",
      opponentEval: bestOpponent?.eval.name || "",
      showdown: table.showdown,
      allInRunout: table.allInRunout || null
    });
    return comparison > 0 ? "win" : comparison < 0 && !heroPotAward ? "fold" : "action";
  }


  function revealVillainIfShowdown(table, reveal) {
    const seats = Array.isArray(table.contestingSeatIds) && table.contestingSeatIds.length
      ? table.contestingSeatIds.map((seatId) => seatById(table, seatId)).filter(Boolean)
      : [table.seats[table.activeVillain]].filter(Boolean);
    seats.forEach((seat) => {
      if (!seat.isHero) seat.revealed = reveal;
    });
  }

  function snapshotHandHistory(table) {
    if (!table) return null;
    return {
      handNo: table.handNo,
      tableId: table.id,
      status: table.status,
      result: table.result || table.lastAction || "",
      heroBusted: Boolean(table.heroBusted),
      bustedReason: table.bustedReason || "",
      tournamentFinish: table.tournamentFinish ? { ...table.tournamentFinish } : null,
      spot: {
        title: table.spot?.title || "",
        prompt: table.spot?.prompt || "",
        heroPosition: table.heroPosition,
        villainPosition: table.spot?.villainPosition || ""
      },
      stackDepth: table.stackDepth,
      simulationMode: table.simulationMode || "random",
      tournamentHandNo: table.tournamentHandNo || 0,
      blindLevel: table.blindLevel || 1,
      blindLevelIndex: table.blindLevelIndex || 0,
      blindMultiplier: table.blindMultiplier || 1,
      blindLevelAnnouncement: table.blindLevelAnnouncement ? { ...table.blindLevelAnnouncement } : null,
      tournamentLevelHands: table.tournamentLevelHands || 0,
      actionTimerSeconds: table.actionTimerSeconds || 0,
      combo: table.combo,
      heroHand: Array.isArray(table.heroHand) ? table.heroHand.slice() : [],
      board: Array.isArray(table.board) ? table.board.slice() : [],
      pot: Math.round(Number(table.pot || 0) * 10) / 10,
      winningCards: Array.isArray(table.winningCards) ? table.winningCards.slice() : [],
      showdown: cloneShowdownSnapshot(table.showdown),
      allInRunout: cloneAllInRunoutSnapshot(table.allInRunout),
      seats: (table.seats || []).map((seat) => ({
        id: seat.id,
        name: seat.name,
        position: seat.position,
        isHero: Boolean(seat.isHero),
        revealed: Boolean(seat.revealed),
        cards: Array.isArray(seat.cards) ? seat.cards.slice() : [],
        folded: Boolean(seat.folded),
        foldedAt: seat.foldedAt || "",
        stack: Math.round(Number(seat.stack || 0) * 10) / 10,
        lobbyState: String(seat.lobbyState || "active"),
        profile: seat.botProfile ? { ...seat.botProfile } : null
      })),
      actions: (table.actionTimeline || []).map((event) => ({
        ...event,
        board: Array.isArray(event.board) ? event.board.slice() : [],
        state: event.state ? {
          ...event.state,
          board: Array.isArray(event.state.board) ? event.state.board.slice() : [],
          seats: Array.isArray(event.state.seats) ? event.state.seats.map((seat) => ({ ...seat })) : []
        } : null
      }))
    };
  }

  function cloneShowdownSnapshot(showdown) {
    if (!showdown || typeof showdown !== "object") return null;
    return {
      schema: showdown.schema || "poker-simulator-showdown-v1",
      allIn: Boolean(showdown.allIn),
      pot: roundBbValue(showdown.pot),
      result: String(showdown.result || ""),
      winningHandName: String(showdown.winningHandName || ""),
      winningCards: Array.isArray(showdown.winningCards) ? showdown.winningCards.slice() : [],
      winners: Array.isArray(showdown.winners)
        ? showdown.winners.map((winner) => ({
          seatId: winner.seatId,
          position: winner.position,
          name: winner.name,
          isHero: Boolean(winner.isHero)
        }))
        : [],
      potAwards: Array.isArray(showdown.potAwards)
        ? showdown.potAwards.map((award) => ({
          seatId: award.seatId,
          amount: roundBbValue(award.amount)
        }))
        : [],
      potWinners: Array.isArray(showdown.potWinners)
        ? showdown.potWinners.map((winner) => ({
          seatId: winner.seatId,
          position: winner.position,
          name: winner.name,
          isHero: Boolean(winner.isHero),
          amount: roundBbValue(winner.amount)
        }))
        : [],
      participants: Array.isArray(showdown.participants)
        ? showdown.participants.map((participant) => ({
          seatId: participant.seatId,
          position: participant.position,
          name: participant.name,
          isHero: Boolean(participant.isHero),
          cards: Array.isArray(participant.cards) ? participant.cards.slice(0, 2) : [],
          handName: participant.handName || "",
          score: Array.isArray(participant.score) ? participant.score.slice() : []
        }))
        : []
    };
  }

  function cloneAllInRunoutSnapshot(runout) {
    if (!runout || typeof runout !== "object") return null;
    return {
      schema: runout.schema || "poker-simulator-all-in-runout-v1",
      equityMode: String(runout.equityMode || ""),
      pot: roundBbValue(runout.pot),
      startedAtStreet: runout.startedAtStreet || "",
      startBoard: Array.isArray(runout.startBoard) ? runout.startBoard.slice() : [],
      finalBoard: Array.isArray(runout.finalBoard) ? runout.finalBoard.slice() : [],
      participants: Array.isArray(runout.participants)
        ? runout.participants.map((participant) => ({
          seatId: participant.seatId,
          position: participant.position,
          name: participant.name,
          isHero: Boolean(participant.isHero),
          cards: Array.isArray(participant.cards) ? participant.cards.slice(0, 2) : []
        }))
        : [],
      stages: Array.isArray(runout.stages)
        ? runout.stages.map((stage) => ({
          index: stage.index,
          street: stage.street,
          board: Array.isArray(stage.board) ? stage.board.slice() : [],
          equities: Array.isArray(stage.equities)
            ? stage.equities.map((equity) => ({
              seatId: equity.seatId,
              position: equity.position,
              name: equity.name,
              isHero: Boolean(equity.isHero),
              equity: Number(equity.equity || 0)
            }))
            : [],
          handEquities: Array.isArray(stage.handEquities)
            ? stage.handEquities.map((equity) => ({
              seatId: equity.seatId,
              position: equity.position,
              name: equity.name,
              isHero: Boolean(equity.isHero),
              equity: Number(equity.equity || 0)
            }))
            : [],
          outs: Array.isArray(stage.outs)
            ? stage.outs.map((row) => ({
              seatId: row.seatId,
              position: row.position,
              name: row.name,
              isHero: Boolean(row.isHero),
              ahead: Boolean(row.ahead),
              outs: Number(row.outs || 0)
            }))
            : [],
          samples: Number(stage.samples || 0),
          sampled: Boolean(stage.sampled)
        }))
        : [],
      realizedShares: Array.isArray(runout.realizedShares)
        ? runout.realizedShares.map((share) => ({
          seatId: share.seatId,
          position: share.position,
          name: share.name,
          isHero: Boolean(share.isHero),
          amount: roundBbValue(share.amount),
          share: Number(share.share || 0)
        }))
        : []
    };
  }

  function setSeatBet(table, seatId, amount) {
    table.seatBets = table.seatBets || {};
    const rounded = Math.round(Number(amount) * 10) / 10;
    if (rounded > 0) {
      table.seatBets[seatId] = rounded;
    } else {
      delete table.seatBets[seatId];
    }
  }

  function clearSeatBet(table, seatId) {
    if (!table.seatBets) return;
    delete table.seatBets[seatId];
  }

  function snapshotClosingStreetBets(table) {
    if (!table) return;
    // All-in runouts capture this snapshot up-front (maybeRunoutAllIn /
    // runBotOnlyAllInToShowdown) while the contested street + calling chips are
    // still live. showdown() -> closeTerminalBettingState() -> clearStreetBets()
    // re-enters here AFTER the board is filled to 5 and table.street has jumped
    // to "showdown"; re-stamping now would mislabel the snapshot {showdown, 5}
    // and break the felt-rest match. Keep the up-front capture for this hand.
    // Gated strictly on table.allInRunout so the normal multi-street path (which
    // never sets it) still re-snapshots every closing street as before.
    if (table.allInRunout
      && table.visualClosedStreetBets
      && Number(table.visualClosedStreetBets.handNo) === Number(table.handNo)) {
      return;
    }
    const seatBets = Object.entries(table.seatBets || {})
      .map(([seatId, amount]) => [seatId, Math.round(Number(amount || 0) * 10) / 10])
      .filter(([, amount]) => amount > 0);
    if (!seatBets.length) {
      delete table.visualClosedStreetBets;
      return;
    }
    const street = table.street;
    const boardLength = Array.isArray(table.board) ? table.board.length : 0;
    table.visualClosedStreetBets = {
      handNo: table.handNo,
      street,
      boardLength,
      // Seq identity of the street being closed. Every action that produced one
      // of the `seatBets` above was already recorded (its recordSeatAction ran
      // BEFORE this snapshot on BOTH paths: the normal clearStreetBets close runs
      // after the street's last action, and the all-in up-front capture in
      // engine-runout.js / runBotOnlyAllInToShowdown runs AFTER the closing call's
      // recordSeatAction that triggered the runout). So closingSeq is the max
      // actionAnimation.seq on this (street,boardLength) — which is >= every
      // same-street action seq and, being drawn from the monotonic actionSeq
      // counter, <= table.actionSeq. When no matching actionAnimation survives the
      // retention window (never at close time, where the same-street actions are
      // the most recent), fall back to the running actionSeq, which upholds the
      // same invariant. Seq-based consumers (Batch 2B) use this to match the
      // closing street without leaning on the (street,boardLength) tuple; legacy
      // snapshots without closingSeq stay valid (consumers treat it as absent).
      closingSeq: closingStreetSeq(table, street, boardLength),
      // Lower edge of the closing street's seq band: the MIN actionAnimation.seq
      // on this (street,boardLength). Because table.actionSeq is a contiguous
      // per-hand counter, [openingSeq, closingSeq] is exactly the set of seqs
      // belonging to this street — the correct discriminator against earlier
      // streets. The seq-agreement harness PROVED that a naive `seq <= closingSeq`
      // upper-bound-only test false-matches earlier-street actions (719 cases);
      // the band's lower edge is what excludes them. When no same-street action
      // survives the retention window (closingSeq itself then fell back to the
      // running actionSeq), collapse the band to that single closing action so it
      // stays valid and non-empty: openingSeq = closingSeq. Normal showdowns do not
      // take this fallback: showdown() closes the betting state before publishing
      // street="showdown", so a river close keeps its real {river,5} tuple and the
      // complete seq band (including every caller). Field placed before seatBets to keep
      // the perf-smoke `visualClosedStreetBets = { … seatBets` pin
      // (poker-trainer-perf-smoke.mjs:18140) matching.
      openingSeq: openingStreetSeq(table, street, boardLength),
      seatBets: Object.fromEntries(seatBets)
    };
  }

  function closingStreetSeq(table, street, boardLength) {
    const wantStreet = String(street || "");
    const wantBoardLength = Number(boardLength || 0);
    let maxSeq = -Infinity;
    (Array.isArray(table.actionAnimations) ? table.actionAnimations : []).forEach((item) => {
      if (!item) return;
      if (String(item.street || "") !== wantStreet) return;
      if (Number(item.boardLength || 0) !== wantBoardLength) return;
      const seq = Number(item.seq);
      if (Number.isFinite(seq) && seq > maxSeq) maxSeq = seq;
    });
    if (maxSeq > -Infinity) return maxSeq;
    const actionSeq = Number(table.actionSeq);
    return Number.isFinite(actionSeq) ? actionSeq : 0;
  }

  function openingStreetSeq(table, street, boardLength) {
    // MIN actionAnimation.seq on this (street,boardLength) — the lower edge of the
    // closing street's seq band. Mirror of closingStreetSeq (max). When no
    // same-street action survives the retention window, fall back to closingStreetSeq
    // so the band collapses to the single closing action [closingSeq, closingSeq]:
    // still valid and non-empty. (closingStreetSeq's own fallback is actionSeq, so
    // this leaves openingSeq === closingSeq === actionSeq in that degenerate case.)
    const wantStreet = String(street || "");
    const wantBoardLength = Number(boardLength || 0);
    let minSeq = Infinity;
    (Array.isArray(table.actionAnimations) ? table.actionAnimations : []).forEach((item) => {
      if (!item) return;
      if (String(item.street || "") !== wantStreet) return;
      if (Number(item.boardLength || 0) !== wantBoardLength) return;
      const seq = Number(item.seq);
      if (Number.isFinite(seq) && seq < minSeq) minSeq = seq;
    });
    if (minSeq < Infinity) return minSeq;
    return closingStreetSeq(table, street, boardLength);
  }

  function clearStreetBets(table) {
    // Roll the closing street's per-seat contributions into the per-hand tally
    // BEFORE wiping them. `contributions` is per-street (reset here every street
    // and again at showdown); `handContributions` is the cumulative record the
    // pot settlement reads. Capturing at the wipe point keeps the tally correct
    // regardless of how `contributions` was populated (live action or a
    // hand-built spot that seeds it directly).
    snapshotClosingStreetBets(table);
    table.handContributions = table.handContributions || {};
    Object.keys(table.contributions || {}).forEach((seatId) => {
      const added = Number(table.contributions[seatId] || 0);
      if (!(added > 0)) return;
      table.handContributions[seatId] = Math.round(
        (Number(table.handContributions[seatId] || 0) + added) * 10
      ) / 10;
    });
    table.seatBets = {};
    table.contributions = {};
  }

  function closeTerminalBettingState(table) {
    if (!table) return;
    clearStreetBets(table);
    table.currentBet = 0;
    table.lastRaiseSize = 0;
    table.minRaiseTo = 1;
    table.toCall = 0;
    table.canCheck = false;
    table.heroTurn = false;
    table.busy = false;
    table.heroPreflopRaiseLocked = false;
    table.heroPostflopRaiseLocked = false;
  }


var __pokerSimulatorEngineParts = (typeof window !== "undefined" ? window : globalThis).PokerSimulatorEngineParts
  || ((typeof window !== "undefined" ? window : globalThis).PokerSimulatorEngineParts = {});
Object.assign(__pokerSimulatorEngineParts, {
  showdown,
  revealVillainIfShowdown,
  snapshotHandHistory,
  cloneShowdownSnapshot,
  cloneAllInRunoutSnapshot,
  setSeatBet,
  clearSeatBet,
  snapshotClosingStreetBets,
  clearStreetBets,
  closeTerminalBettingState
});
