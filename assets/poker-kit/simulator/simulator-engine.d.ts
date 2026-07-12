// TypeScript declarations for window.PokerSimulatorEngine.
//
// Цель: дать compile-time проверку через `tsc --checkJs --noEmit` для
// consumers (UI runtime в simulator.js, тесты, будущий lobby layer)
// без введения build-step в проект. Сам engine остаётся .js — он
// уже задокументирован JSDoc, эти декларации просто формализуют
// контракт чтобы tsc мог его проверить.
//
// Парный JSDoc-блок в конце simulator-engine.js (@typedef EngineApi)
// должен оставаться синхронным с этим файлом — если меняешь сигнатуру
// функции, правь и здесь, и там.

export type Difficulty = "easy" | "standard" | "pro";
export type DifficultyAlias = "loose" | "public" | "nitty";
export type Street = "preflop" | "flop" | "turn" | "river" | "showdown";
export type HandAction =
  | "fold"
  | "check"
  | "call"
  | "bet"
  | "bet-third"
  | "bet-half"
  | "bet-pot"
  | "raise"
  | "raise-half"
  | "raise-custom"
  | "bet-custom"
  | "open"
  | "allin";
export type ActionTone = "fold" | "passive" | "aggressive" | "neutral";
export type LobbyState = "active" | "sitting-out" | "disconnected" | "eliminated";

/** Card code like "Ah", "Kc", "Td" — rank letter + suit letter. */
export type CardCode = string;
export type HandGroup = "random" | "vpip" | "fold";

export interface Seat {
  id: number;
  name: string;
  position: string;
  stack: number;
  cards: CardCode[];
  isHero: boolean;
  folded: boolean;
  foldedAt: string;
  revealed: boolean;
  dealer: boolean;
  blind: "" | "SB" | "BB";
  botProfile: BotProfile | null;
  lobbyState: LobbyState;
}

export interface BotProfile {
  archetype?: string;
  difficulty: Difficulty;
  style: string;
  label?: string;
  strategyModel?: BotStrategyModel | null;
  botPack?: BotPackMetadata | null;
  packRole?: string;
  packFocusSkill?: string;
  packLeakTags?: string[];
  strategyModelRequired?: boolean;
  strategyModelMissing?: boolean;
  trainingLeague?: number;
  policyOverlay?: BotPolicyOverlay;
  learning?: Record<string, unknown>;
}

export interface BotStrategyModel {
  id: string;
  label: string;
  tier: string;
  role?: string;
  difficulty: Difficulty;
  style: string;
  archetype?: string;
  tableTypes?: string[];
  minPlayers?: number | null;
  maxPlayers?: number | null;
  baseModelId?: string | null;
  sourceModelId?: string | null;
  tableSizePlayers?: number | null;
  stackDepthBucket?: string;
  anteBb?: number;
  requiresAnte?: boolean;
  minStackDepthBb?: number | null;
  maxStackDepthBb?: number | null;
  production: Record<string, number>;
  realizedRanges?: Record<string, unknown> | null;
  useRealizedRanges?: boolean;
  botPack?: BotPackMetadata | null;
  packRole?: string;
  packSeat?: BotPackSeatMetadata | null;
  packFocusSkill?: string;
  packLeakTags?: string[];
  packProduction?: Record<string, number>;
  packRealizedRanges?: Record<string, unknown> | null;
}

export interface BotPackMetadata {
  key: string;
  label: string;
  difficultyBand?: string;
  productGoal?: string;
}

export interface BotPackSeatMetadata {
  role: string;
  tier?: "top" | "standard" | "weak" | "";
  style?: string;
  difficulty?: Difficulty;
  focusSkill?: string;
  leakTags?: string[];
}

export interface BotPackSeatDefinition {
  role: string;
  tier: "top" | "standard" | "weak";
  style: string;
  difficulty: Difficulty;
  weight?: number;
  modelIds?: string[];
	profile?: {
	  focusSkill?: string;
	  leakTags?: string[];
	  production?: Record<string, number>;
	  realizedRanges?: Record<string, unknown>;
	};
}

export interface BotPackDefinition {
  key: string;
  label: string;
  difficultyBand: string;
  productGoal: string;
  runtime?: {
    legacyLineup?: boolean;
    seats?: BotPackSeatDefinition[];
  };
  targetStats?: Record<string, [number, number]>;
  preflop?: Record<string, string>;
  postflop?: Record<string, string>;
  leaks?: string[];
}

export interface BotPolicyOverlay {
  key: string;
  levelBand: string;
  source: string;
  focusSkill: string;
  weakTags: string[];
  preflop: Record<string, number>;
  postflop: Record<string, number>;
}

export interface SeatAction {
  label: string;
  tone: ActionTone;
  seq: number;
}

export interface ActionAnimation {
  key: string;
  seatId: number;
  label: string;
  tone: ActionTone;
  street: Street;
  boardLength: number;
  seq: number;
}

export interface PotAward {
  seatId: number;
  amount: number;
}

export interface ShowdownParticipant {
  seatId: number;
  position: string;
  name: string;
  isHero: boolean;
  cards: CardCode[];
  handName?: string;
  score?: number[];
}

export interface ShowdownSnapshot {
  schema: "poker-simulator-showdown-v1" | string;
  allIn: boolean;
  pot: number;
  result: string;
  winningHandName: string;
  winningCards: CardCode[];
  winners: Array<Omit<ShowdownParticipant, "cards" | "handName" | "score">>;
  potAwards: PotAward[];
  potWinners: Array<Omit<ShowdownParticipant, "cards" | "handName" | "score"> & { amount: number }>;
  participants: ShowdownParticipant[];
}

export interface AllInRunoutParticipant {
  seatId: number;
  position: string;
  name: string;
  isHero: boolean;
  cards: CardCode[];
}

export interface AllInRunoutEquity {
  seatId: number;
  equity: number;
  share?: number;
  ahead?: boolean;
  tied?: boolean;
  realized?: number;
}

export interface AllInRunoutOut {
  seatId: number;
  outs: number;
  cards?: CardCode[];
  ahead?: boolean;
}

export interface AllInRunoutStage {
  index: number;
  street: Street;
  board: CardCode[];
  equities: AllInRunoutEquity[];
  handEquities?: AllInRunoutEquity[];
  outs: AllInRunoutOut[];
  samples: number;
  sampled: boolean;
}

export interface AllInRunout {
  schema: "poker-simulator-all-in-runout-v1" | string;
  equityMode: "pot-share" | "winner-share" | string;
  pot: number;
  startedAtStreet: Street | string;
  startBoard: CardCode[];
  finalBoard: CardCode[];
  preAwardStacks?: Record<number, number>;
  participants: AllInRunoutParticipant[];
  stages: AllInRunoutStage[];
}

export interface BlindLevelAnnouncement {
  fromLevel: number;
  toLevel: number;
  fromMultiplier: number;
  toMultiplier: number;
  handNo: number;
}

export interface TournamentFinish {
  status: "busted";
  place: number;
  entrants: number;
  handsPlayed: number;
  level: number;
  blindMultiplier: number;
  stackBb: number;
  reason: string;
}

export interface Table {
  id: number;
  handNo: number;
  tournamentHandNo?: number;
  playerCount?: number;
  seatSlotCount?: number;
  activeSeatIds?: number[];
  positions?: string[];
  status: "playing" | "won" | "folded" | "showdown" | "split";
  street: Street;
  board: CardCode[];
  deck: CardCode[];
  handGroup: HandGroup;
  boardRevealFrom: number;
  pot: number;
  currentBet: number;
  toCall: number;
  /** Per-player ante (BB) posted on every live hand; dead money, not a call obligation. */
  anteBb?: number;
  /** Tournament-style ante posted once by the big blind; mutually exclusive with anteBb. */
  bigBlindAnteBb?: number;
  anteMode?: "none" | "per-player" | "big-blind";
  /** Total antes posted into the pot this hand across all contesting seats. */
  anteTotal?: number;
  /** Per-seat ante ledger used for side-pot eligibility; not part of to-call state. */
  anteContributions?: Record<number, number>;
  minRaiseTo: number;
  lastRaiseSize: number;
  canCheck: boolean;
  heroTurn: boolean;
  busy: boolean;
  activeVillain: number;
  contestingSeatIds: number[];
  contributions: Record<number, number>;
  seatBets: Record<number, number>;
  seats: Seat[];
  heroHand: CardCode[];
  heroPosition: string;
  seatPositions?: string[] | null;
  combo: string;
  stackDepth: number;
  spot?: { title?: string; prompt?: string; heroPosition?: string; villainPosition?: string };
  simulationMode?: "random" | "tournament" | "fixed";
  blindLevelIndex?: number;
  blindLevel?: number;
  blindMultiplier?: number;
  blindLevelUp?: boolean;
  blindLevelAnnouncement?: BlindLevelAnnouncement | null;
  blindLevelAnnouncementUntil?: number;
  tournamentLevelHands?: number;
  tournamentFinish?: TournamentFinish | null;
  actionTimerSeconds?: number;
  result: string;
  resultKind?: string;
  heroBusted?: boolean;
  bustedReason?: string;
  lastAction: string;
  winningCards: CardCode[];
  streetAggressorSeatId: number | null;
  previousStreetAggressorSeatId: number | null;
  preflopAggressorSeatId: number | null;
  preflopOpenerSeatId?: number | null;
  preflopOpenToBb?: number;
  preflopOpenCallerSeatIds?: number[];
  initiativeSeatId: number | null;
  heroPreflopRaiseLocked?: boolean;
  heroPostflopRaiseLocked?: boolean;
  villainActedThisStreet?: boolean;
  streetActionSeatIds?: number[];
  villainTurnRiverBets?: number;
  previousStreetCheckedThrough?: boolean;
  actionAnimations: ActionAnimation[];
  /**
   * Pending chip-fly animations pushed by addSeatContribution. `actionKey` /
   * `actionSeq` are retro-stamped by bindPendingBetAnimationsToAction when the
   * same-seat, same-(street,boardLength) action is recorded on the same tick, so
   * the renderer can bind each bet to its action animation by identity rather
   * than by ordinal fallback (see actionIndexForBetAnimation).
   */
  betAnimations: Array<{
    key: string;
    seatId: number;
    amount: number;
    contribution?: number;
    street?: Street;
    boardLength?: number;
    actionKey?: string;
    actionSeq?: number;
    until?: number;
    landed?: boolean;
  }>;
  visualClosedStreetBets?: {
    handNo: number;
    street: Street;
    boardLength: number;
    /**
     * Seq identity of the closed street: max actionAnimation.seq on this
     * (street,boardLength), else the running actionSeq. Satisfies
     * `closingSeq >= every same-street action seq` and `closingSeq <= actionSeq`.
     * Optional for backward compatibility — legacy snapshots omit it and consumers
     * treat its absence as "match by (street,boardLength)".
     */
    closingSeq?: number;
    /**
     * Lower edge of the closed street's seq band: min actionAnimation.seq on this
     * (street,boardLength), else (no same-street action survived) closingSeq, so the
     * band collapses to `[closingSeq, closingSeq]`. Because actionSeq is a
     * contiguous per-hand counter, `[openingSeq, closingSeq]` is exactly this
     * street's seqs; consumers (actionMatchesClosingStreet) match an action iff
     * `openingSeq <= action.seq <= closingSeq`, which excludes earlier streets that
     * a `seq <= closingSeq` upper-bound-only test would false-match. Optional for
     * backward compatibility — absent alongside closingSeq means "match by
     * (street,boardLength) tuple".
     */
    openingSeq?: number;
    seatBets: Record<number, number>;
  };
  seatActions: Record<number, SeatAction>;
  actionTimeline: TimelineEvent[];
  logs?: string[];
  actionSeq: number;
  timelineSeq: number;
  animationSeq: number;
  handContributions?: Record<number, number>;
  allInRunout?: AllInRunout | null;
  showdown?: ShowdownSnapshot | null;
  potAwards?: PotAward[];
  tournamentComplete?: boolean;
  potAwarded?: boolean;
  pendingHeroActionAnimation?: ActionAnimation | null;
  actionRevealStartedAt?: number;
  actionSequenceLeadMs?: number;
}

export interface TimelineEvent {
  seq: number;
  phase: "action" | "street" | "result" | "deal" | "chips";
  text?: string;
  seatId?: number;
  label?: string;
  tone?: ActionTone;
  street?: Street;
  board?: CardCode[];
  pot?: number;
  state?: {
    board?: CardCode[];
    seats?: Array<Partial<Seat> & { id: number }>;
    [key: string]: unknown;
  } | null;
  result?: string;
  status?: string;
  labSpot?: string;
  labSpots?: string[];
  botReason?: string;
  [key: string]: unknown;
}

export interface ActionOutcome {
  accepted: boolean;
  tone?: ActionTone;
  needsBot?: boolean;
  delay?: number;
  heroAction?: HandAction;
  heroAmount?: number;
}

export interface Grade {
  grade: "good" | "thin" | "leak" | "neutral";
  label: string;
  detail: string;
  score?: number;
}

export interface CardAssessment {
  category?: number;
  flushDraw?: boolean;
  straightDraw?: boolean;
  name?: string;
  score?: number[];
  cards?: CardCode[];
  [key: string]: unknown;
}

export interface BoardTexture {
  label: string;
  kind: "dry" | "a-high-dry" | "paired" | "medium" | "wet" | "monotone";
  paired?: boolean;
  monotone?: boolean;
  twoTone?: boolean;
  straighty?: boolean;
}

export interface HandHistory {
  handNo: number;
  tournamentHandNo?: number;
  tableId: number;
  status: string;
  result: string;
  heroBusted?: boolean;
  bustedReason?: string;
  spot: { title: string; prompt: string; heroPosition: string; villainPosition: string };
  stackDepth: number;
  blindLevel?: number;
  blindLevelIndex?: number;
  blindMultiplier?: number;
  blindLevelAnnouncement?: BlindLevelAnnouncement | null;
  tournamentLevelHands?: number;
  tournamentFinish?: TournamentFinish | null;
  combo: string;
  heroHand: CardCode[];
  board: CardCode[];
  pot: number;
  seats: Array<Partial<Seat> & { id: number }>;
  actions: TimelineEvent[];
  winningCards?: CardCode[];
  showdown?: ShowdownSnapshot | null;
  allInRunout?: AllInRunout | null;
}

export interface SimulatorSettings {
  pack: string;
  difficulty: Difficulty;
  lineup: string;
  botLineup?: string;
  botStrategyPool?: string;
  botPack?: string;
  botPackId?: string;
  botOpponentPack?: string;
  playerCount: number;
  anteBb?: number;
  bigBlindAnteBb?: number;
  deck: string;
  chipSet: string;
  amountMode: "bb" | "chips";
  sliderPresets: string;
  postflopBetPercents: string;
  sound: boolean;
  trainingMode: boolean;
  manualNextHand?: boolean;
  continueAfterBust?: boolean;
  sessionHandLimit?: number;
  autoStart?: boolean;
  demoMode?: boolean;
  turboMode: boolean;
  revealOpponentCardsOnFinish: boolean;
  simulationMode?: "random" | "tournament" | "fixed";
  stackDepth?: number;
  startingStackBb?: number;
  randomStackMinBb?: number;
  randomStackMaxBb?: number;
  tournamentStartingStackBb?: number;
  tournamentLevelHands?: number;
  tournamentBlindLevels?: string;
  actionTimerSeconds?: number;
  trainingLeague?: number;
  botPolicyOverlay?: "third_league" | string;
}

export interface PackDefinition {
  schema: number;
  id: string;
  title: string;
  villainPosition?: string;
  spots?: Array<{ title?: string; combo?: string }>;
  stackDepths?: number[];
}

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

export interface EngineApi {
  TABLE_COUNTS: readonly number[];
  PACK_SCHEMA_VERSION: number;
  BOT_PACK_SCHEMA_VERSION: number;
  PLAYER_COUNTS: readonly number[];
  BOT_STRATEGY_PROFILE: Record<string, unknown>;
  BOT_PACK_PROFILE: Record<string, unknown>;
  PACKS: Record<string, PackDefinition>;
  PREFLOP_CHARTS: Record<string, unknown>;
  THIRD_LEAGUE_BOT_OVERLAYS: readonly BotPolicyOverlay[];
  COACH_15_11_SOURCE: string;
  RANK_VALUES: Record<string, number>;

  createTable(input: {
    id: number;
    settings: SimulatorSettings;
    handNo: number;
    previousTable?: Table | null;
    tournamentHandNo?: number;
    testHeroPosition?: string;
  }): Table;

  registerPack(id: string, pack: PackDefinition): void;
  registerPacks(manifest: Record<string, PackDefinition>): void;
  validatePackDefinition(id: string, pack: PackDefinition): ValidationResult;
  loadPackManifest(url: string): Promise<void>;

  startHeroAction(
    table: Table,
    action: HandAction,
    settings: SimulatorSettings,
    options?: { amount?: number }
  ): ActionOutcome;

  resolveBotAction(
    table: Table,
    heroAction: HandAction,
    heroAmount: number,
    settings: SimulatorSettings
  ): ActionOutcome;

  gradeHeroDecision(
    table: Table,
    action: HandAction,
    amount: number,
    settings: SimulatorSettings
  ): Grade;

  formatBb(value: number): string;
  difficultyLabel(value: string): string;
  normalizeDifficulty(value: string): Difficulty;
  normalizeBotLineup(value: string): string;
  normalizeBotStrategyPool(value: string): string;
  botPackCatalog(): Record<string, BotPackDefinition>;
  normalizeBotPack(value: string): string;
  botPackDefinition(value: string): BotPackDefinition | null;
  botPackLabel(value: string): string;
  normalizeStakesLevel(value: string): "" | "micro" | "mid" | "high";
  stakesLevelLabel(value: string): string;
  createStakesModelPlan(level: string, count: number, settings?: Partial<SimulatorSettings>): Array<BotStrategyModel | null> | null;
  botStrategyModelCatalog(): Record<"top" | "standard" | "weak", unknown[]>;
  normalizeBotStrategyModel(model: unknown, tier?: string): BotStrategyModel | null;
  botStrategySizeLabel(playerCount: number): string;
  normalizeBotStrategyStackBucket(value: string): string;
  botStrategyStackBucketForDepth(stackDepth: number): string;
  botStrategyTableStackBucket(settings?: Partial<SimulatorSettings>): string;
  botStrategyStackBucketBounds(bucket: string): { minStackDepthBb: number | null; maxStackDepthBb: number | null };
  tableSizedStrategyModelForSettings(model: unknown, settings?: Partial<SimulatorSettings>): BotStrategyModel | null;
  stackSizedStrategyModelForSettings(model: unknown, settings?: Partial<SimulatorSettings>): BotStrategyModel | null;
  strategyModelForSettings(model: unknown, settings?: Partial<SimulatorSettings>): BotStrategyModel | null;
  filterStrategyModelsForSettings(models: unknown[], settings?: Partial<SimulatorSettings>): BotStrategyModel[];
  createBotPackModelPlan(packKey: string, count: number, settings?: Partial<SimulatorSettings>): Array<BotStrategyModel | null> | null;
  createBotStrategyModelPlan(settings: Partial<SimulatorSettings>, botCount: number): Array<BotStrategyModel | null>;
  carryoverReplacementStrategyModel(profile: BotProfile | null | undefined, settings?: Partial<SimulatorSettings>, fallback?: BotStrategyModel | null): BotStrategyModel | null;
  adaptStrategyModelToSettings(model: unknown, settings?: Partial<SimulatorSettings>, fallback?: BotStrategyModel | null): BotStrategyModel | null;
  thirdLeagueBotOverlayForSeat(settings: Partial<SimulatorSettings>, seatIndex: number): BotPolicyOverlay | null;
  botLearningPreflopAdjustment(profile: BotProfile | null | undefined, key: string, fallback?: number): number;
  botLineupLabel(value: string): string;
  botStrategyPoolLabel(value: string): string;
  botStyleLabel(value: string): string;
  streetLabel(street: Street): string;

  evaluateBest(cards: CardCode[]): { score: number[]; cards: CardCode[]; name: string };
  compareScores(first: number[], second: number[]): number;
  settlePots(table: Table, tiers: number[][]): void;
  rankTiersFromResults(results: Array<{ seatId: number; score: number[] }>): number[][];

  assessCards(holeCards: CardCode[]): CardAssessment;
  assessPostflopHand(holeCards: CardCode[], board: CardCode[]): CardAssessment;
  assessBoardTexture(board: CardCode[]): BoardTexture;

  snapshotHandHistory(table: Table): HandHistory | null;
  normalizeCombo(cards: CardCode[]): string;

  markPreflopOpenContext(table: Table, seatId: number, openToBb?: number): void;
  markPreflopOpenCaller(table: Table, seatId: number): void;
  preflopOpenerPosition(table: Table): string;
  isOriginalPreflopOpener(table: Table, seatId: number): boolean;
  isPreflopOpenCaller(table: Table, seatId: number): boolean;
  originalOpenToBb(table: Table, fallback?: number): number;
  isInPositionVs(table: Table, actorSeatId: number, targetSeatId: number): boolean | null;
  threeBetTarget(table: Table, seatId: number, multiplier?: number): number;
  coldCallVsThreeBetDecision(
    table: Table,
    seat: Seat,
    combo: string,
    difficulty: Difficulty | string,
    style: string
  ): { call: boolean; label: string };
  openDefenseElasticity(openSizeBb: number, difficulty?: Difficulty | string, style?: string): number;
  threeBetDefenseElasticity(ratio: number, difficulty?: Difficulty | string, style?: string): number;
  preHeroContinueDecision(
    table: Table,
    seat: Seat,
    combo: string,
    difficulty: Difficulty | string,
    style: string
  ): { continue: boolean; label: string };
  botFishLimpDecision(table: Table, seat: Seat, combo: string, style?: string): { limp: boolean; label: string };
  botPostflopIntent(
    table: Table,
    cards: CardCode[],
    settings: SimulatorSettings,
    leadOnStreet?: boolean,
    seat?: Seat | null
  ): { bet: boolean; amount: number; label: string; labSpot?: string };
  fourBetPatternsFor(position: string, difficulty: Difficulty | string, heroPosition?: string, stackDepth?: number): string[];
  botFacingPushFoldDecision(
    table: Table,
    seat: Seat,
    combo: string,
    difficulty: Difficulty | string,
    style: string,
    openerPosition?: string,
    stackDepth?: number
  ): { action: "raise" | "call" | "fold"; target?: number; added?: number; label: string; pushFold?: boolean } | null;
  effectiveAllInCeiling(table: Table, seatId: number): number;
  commitCappedPreflopRaise(
    table: Table,
    seat: Seat,
    decision: { action: string; target?: number; added?: number; label?: string; pushFold?: boolean }
  ): { kind: "raise" | "call"; target: number; added: number; paidAmount?: number; allInPressure?: boolean };
  applyVillainPostflopAction(table: Table, settings: SimulatorSettings, leadOnStreet?: boolean): string;

  /**
   * Multi-lobby scaffolding — sets the lobby state of a single seat.
   * Bot seats remain "active" in single-player mode; future lobby layer
   * flips real-player seats via this entry point.
   * Returns false if table/seat missing or state unsupported.
   */
  setSeatLobbyState(table: Table, seatId: number, state: LobbyState): boolean;

  /**
   * Multi-lobby driver. Called between hands on the *previous* table so
   * new states ride into the next hand via carryover. Probabilistic
   * Markov transitions; holds dealer/SB/BB active to avoid degenerate
   * blind situations. Returns the list of transitions applied this tick.
   * `options.random` swaps in a deterministic RNG for tests.
   */
  tickLobbyForHand(table: Table, options?: { random?: () => number }): Array<{
    seatId: number;
    name: string;
    position: string;
    from: LobbyState;
    to: LobbyState;
  }>;
}

declare global {
  interface Window {
    PokerSimulatorEngine?: EngineApi;
    PokerSimulatorTimings?: SimulatorTimings;
  }
}

export interface SimulatorTimings {
  readonly defaultAutoDealDelayMs: number;
  readonly turboAutoDealDelayMs: number;
  readonly actionThinkDurationMs: number;
  readonly actionRevealDurationMs: number;
  readonly actionSettleDurationMs: number;
  readonly chipRevealDurationMs: number;
  readonly chipAnnouncementDelayMs: number;
  readonly dealRevealDurationMs: number;
  readonly boardRevealDurationMs: number;
  readonly boardSettleDurationMs: number;
  readonly visualUnlockBufferMs: number;
}
