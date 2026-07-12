# Poker Simulator Embed

Reusable iframe wrapper for project pages that need the poker simulator without
copying simulator DOM or state.

## Files

- `embed.js` exposes `window.PokerSimulatorEmbed.mount`.
- `../../poker-simulator-embed-demo.html` is a local integration demo.
- `poker-simulator.html?embedded=1` activates compact iframe mode.

## Usage

```html
<script src="assets/poker-simulator/embed.js"></script>
<section id="sim"></section>
<script>
  const simulator = PokerSimulatorEmbed.mount("#sim", { tableCount: 2 });
  await simulator.ready;
  await simulator.setTableCount(4);
  await simulator.newHand();
  const hand = await simulator.latestHandHistory();
</script>
```

## Commands

The wrapper talks to the iframe through `postMessage`; callers should use the
controller methods instead of reading iframe DOM directly.

- `snapshot()`
- `settings()`
- `setTableCount(count, keepExisting)`
- `newHand()`
- `hotkey(key)`
- `latestHandHistory()`
- `openReplay()`
- `exportSession()`
- `exportSessionArchive()`
- `handLogJsonl()`
- `leaderboard()`
- `restartTournament(tableId)`

Embedded simulator state uses `sessionStorage`, so demo pages do not overwrite
the main simulator's local session.
