(function () {
  const root = typeof window !== "undefined" ? window : globalThis;

  function model(options = {}) {
    const roundBb = typeof options.roundBb === "function" ? options.roundBb : defaultRoundBb;
    const betBounds = typeof options.betBounds === "function" ? options.betBounds : () => ({ min: 0, max: 0 });
    const canHeroAct = typeof options.canHeroAct === "function" ? options.canHeroAct : () => true;
    const findHeroSeat = typeof options.heroSeat === "function" ? options.heroSeat : heroSeat;

    function defaultRoundBb(value) {
      const number = Number(value || 0);
      return Number.isFinite(number) ? Math.round(number * 100) / 100 : 0;
    }

    function heroSeat(table) {
      return table?.seats?.find((seat) => seat.isHero) || null;
    }

    function needsBetAmount(action) {
      return action === "raise-custom" || action === "bet-custom";
    }

    function isAggressiveHeroAction(action) {
      return action === "allin"
        || action === "open"
        || action === "raise-custom"
        || action === "bet-custom"
        || String(action || "").startsWith("raise-")
        || String(action || "").startsWith("bet-");
    }

    function effectiveHeroCallAmount(table) {
      const rawToCall = Number(table?.toCall || 0);
      if (!(rawToCall > 0)) return 0;
      const hero = findHeroSeat(table);
      const stack = Number(hero?.stack || 0);
      if (!(stack > 0)) return 0;
      return roundBb(Math.min(rawToCall, stack));
    }

    function heroMaxContribution(table) {
      const hero = findHeroSeat(table);
      const contributed = Number(table?.contributions?.[hero?.id ?? 0] || 0);
      return roundBb(Math.max(0, contributed + Number(hero?.stack || 0)));
    }

    function tableSeatById(table, seatId) {
      const numericId = Number(seatId);
      return table?.seats?.find((seat) => Number(seat.id) === numericId) || null;
    }

    function seatCanContestPot(seat) {
      return Boolean(seat && !seat.folded && String(seat.lobbyState || "active") === "active");
    }

    function activeContestantIds(table) {
      const source = Array.isArray(table?.contestingSeatIds) && table.contestingSeatIds.length
        ? table.contestingSeatIds
        : (table?.seats || []).filter(seatCanContestPot).map((seat) => seat.id);
      return source
        .map(Number)
        .filter((seatId, index, list) =>
          Number.isFinite(seatId)
          && list.indexOf(seatId) === index
          && seatCanContestPot(tableSeatById(table, seatId))
        );
    }

    function heroFacesLoneOpponentAllIn(table) {
      const toCall = Number(table?.toCall || 0);
      if (!(toCall > 0)) return false;
      const hero = findHeroSeat(table);
      if (!hero || hero.folded || Number(hero.stack || 0) <= 0) return false;
      const contestants = activeContestantIds(table);
      if (!contestants.includes(Number(hero.id))) return false;
      const opponents = contestants
        .filter((seatId) => seatId !== Number(hero.id))
        .map((seatId) => tableSeatById(table, seatId))
        .filter(Boolean);
      if (opponents.length !== 1) return false;

      const opponent = opponents[0];
      const currentBet = Number(table.currentBet || 0);
      const heroCommitted = Number(table.contributions?.[hero.id] || 0);
      const opponentCommitted = Number(table.contributions?.[opponent.id] || 0);
      const heroMax = heroCommitted + Number(hero.stack || 0);
      const opponentIsAllIn = Number(opponent.stack || 0) <= 0;
      const heroCannotRaise = heroMax <= currentBet + 0.001;
      return currentBet > heroCommitted
        && opponentCommitted + 0.001 >= currentBet
        && (opponentIsAllIn || heroCannotRaise);
    }

    function heroFacesOnlyAllInOpponents(table) {
      // When every opponent still contesting the pot is already all-in, nobody
      // can act on a raise — so hero's only meaningful options are call or fold,
      // even with a stack that covers them all. The single-opponent variant is
      // handled by heroFacesLoneOpponentAllIn (which also covers a capped hero);
      // this generalises the rule to two-or-more all-in opponents, where a
      // covering hero would otherwise be offered a useless raise/all-in button.
      if (!(Number(table?.toCall || 0) > 0)) return false;
      const hero = findHeroSeat(table);
      if (!hero || hero.folded || Number(hero.stack || 0) <= 0) return false;
      const contestants = activeContestantIds(table);
      if (!contestants.includes(Number(hero.id))) return false;
      const opponents = contestants
        .filter((seatId) => seatId !== Number(hero.id))
        .map((seatId) => tableSeatById(table, seatId))
        .filter(Boolean);
      if (opponents.length < 2) return false;
      return opponents.every((opponent) => Number(opponent.stack || 0) <= 0);
    }

    function fullMinRaiseTo(table) {
      const currentBet = Number(table?.currentBet || 0);
      const lastRaiseSize = Math.max(1, Number(table?.lastRaiseSize || 1));
      const fallback = currentBet + lastRaiseSize;
      return roundBb(Math.max(currentBet, fallback, Number(table?.minRaiseTo || 0)));
    }

    function heroCanMakeFullRaise(table, bounds = betBounds(table)) {
      if (!(Number(table?.toCall || 0) > 0)) return true;
      const max = Number(bounds?.max ?? heroMaxContribution(table));
      return max + 0.001 >= fullMinRaiseTo(table);
    }

    function heroFacingCallOnlyRaise(table, bounds = betBounds(table)) {
      if (!(Number(table?.toCall || 0) > 0)) return false;
      if (heroFacesLoneOpponentAllIn(table)) return true;
      if (heroFacesOnlyAllInOpponents(table)) return true;
      return !heroCanMakeFullRaise(table, bounds);
    }

    function heroCanShortAllIn(table, bounds = betBounds(table)) {
      if (!(Number(table?.toCall || 0) > 0)) return false;
      if (heroFacesLoneOpponentAllIn(table)) return false;
      if (heroFacesOnlyAllInOpponents(table)) return false;
      if (heroCanMakeFullRaise(table, bounds)) return false;
      const hero = findHeroSeat(table);
      const stack = Number(hero?.stack || 0);
      return stack > effectiveHeroCallAmount(table) + 0.001;
    }

    function hotkeyActionForTable(table, key) {
      if (!canHeroAct(table)) return "";
      const normalized = String(key || "").toLowerCase();
      if (heroFacingCallOnlyRaise(table) && normalized === "a" && !heroCanShortAllIn(table)) return "";
      if (heroFacingCallOnlyRaise(table) && (normalized === "r" || normalized === "b")) return "";
      if (normalized === "f") return "fold";
      if (normalized === "a") return "allin";

      const preflopOpenAllInOnly = table?.street === "preflop"
        && Number(table.toCall || 0) <= 0
        && !table.canCheck
        && (() => {
          const bounds = betBounds(table);
          return bounds.max > 0 && bounds.min >= bounds.max;
        })();
      if (preflopOpenAllInOnly && (normalized === "c" || normalized === "r" || normalized === "b")) {
        return "allin";
      }

      if (normalized === "c") {
        if (table?.toCall > 0) return "call";
        if (table?.canCheck || table?.street !== "preflop") return "check";
        return "raise-custom";
      }

      if (normalized === "r") {
        if (table?.toCall > 0 || table?.street === "preflop") return "raise-custom";
        return "bet-custom";
      }

      if (normalized === "b") {
        if (table?.toCall > 0 || table?.street === "preflop") return "raise-custom";
        return "bet-custom";
      }

      return "";
    }

    return {
      needsBetAmount,
      isAggressiveHeroAction,
      effectiveHeroCallAmount,
      heroMaxContribution,
      tableSeatById,
      seatCanContestPot,
      activeContestantIds,
      heroFacesLoneOpponentAllIn,
      heroFacesOnlyAllInOpponents,
      fullMinRaiseTo,
      heroCanMakeFullRaise,
      heroFacingCallOnlyRaise,
      heroCanShortAllIn,
      hotkeyActionForTable
    };
  }

  root.PokerSimulatorHeroActions = { model };
  if (typeof module !== "undefined" && module.exports) module.exports = { model };
})();
