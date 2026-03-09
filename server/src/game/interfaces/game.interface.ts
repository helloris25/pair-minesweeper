export type FirstPlayer = 1;
export type SecondPlayer = 2;
export type PlayerNumber = FirstPlayer | SecondPlayer;

export const FIRST_PLAYER = 1 as const satisfies FirstPlayer;
export const SECOND_PLAYER = 2 as const satisfies SecondPlayer;

export type ErrorCode =
  | 'JOIN_NOT_FOUND'
  | 'JOIN_FINISHED'
  | 'JOIN_ALREADY_STARTED'
  | 'JOIN_CANNOT_JOIN'
  | 'JOIN_CANNOT_REJOIN'
  | 'CANCEL_FAILED'
  | 'GAME_NOT_FOUND'
  | 'GAME_NOT_IN_PROGRESS'
  | 'NOT_IN_GAME'
  | 'NOT_YOUR_TURN'
  | 'INVALID_CELL'
  | 'CELL_ALREADY_REVEALED';

export const ERROR_CODE = {
  JOIN_NOT_FOUND: 'JOIN_NOT_FOUND',
  JOIN_FINISHED: 'JOIN_FINISHED',
  JOIN_ALREADY_STARTED: 'JOIN_ALREADY_STARTED',
  JOIN_CANNOT_JOIN: 'JOIN_CANNOT_JOIN',
  JOIN_CANNOT_REJOIN: 'JOIN_CANNOT_REJOIN',
  CANCEL_FAILED: 'CANCEL_FAILED',
  GAME_NOT_FOUND: 'GAME_NOT_FOUND',
  GAME_NOT_IN_PROGRESS: 'GAME_NOT_IN_PROGRESS',
  NOT_IN_GAME: 'NOT_IN_GAME',
  NOT_YOUR_TURN: 'NOT_YOUR_TURN',
  INVALID_CELL: 'INVALID_CELL',
  CELL_ALREADY_REVEALED: 'CELL_ALREADY_REVEALED',
} as const satisfies Record<ErrorCode, ErrorCode>;

export interface Cell {
  hasDiamond: boolean;
  adjacentDiamonds: number;
  revealed: boolean;
  revealedBy?: PlayerNumber;
}
export type GameStatus = 'waiting' | 'playing' | 'finished';

export const GAME_STATUS = {
  waiting: 'waiting',
  playing: 'playing',
  finished: 'finished',
} as const satisfies Record<GameStatus, GameStatus>;

export type SocketId = string;

export type PlayerToken = string;

export interface Game {
  id: string;
  gridSize: number;
  diamondsCount: number;
  turnTimeSeconds: number;
  board: Cell[][];
  /** Maps socket ID → player number */
  players: Map<SocketId, PlayerNumber>;
  /** Maps token → player number (persistent across reconnects) */
  playerTokens: Map<PlayerToken, PlayerNumber>;
  currentTurn: PlayerNumber;
  scores: Record<PlayerNumber, number>;
  status: GameStatus;
  diamondsFound: number;
  createdAt: Date;
  turnStartedAt: number | null;
  turnTimer: ReturnType<typeof setTimeout> | null;
  /** Tracks remaining turn time in ms when timer is paused (disconnect) */
  turnTimeRemainingMs: number | null;
}

/** Board state sent to clients — hides diamond positions for unrevealed cells */
export interface ClientCell {
  revealed: boolean;
  adjacentDiamonds?: number;
  hasDiamond?: boolean;
  revealedBy?: PlayerNumber;
}

export interface GameStatePayload {
  gameId: Game['id'];
  gridSize: Game['gridSize'];
  diamondsCount: Game['diamondsCount'];
  turnTimeSeconds: Game['turnTimeSeconds'];
  board: ClientCell[][];
  currentTurn: Game['currentTurn'];
  scores: Game['scores'];
  status: Game['status'];
  playerNumber: PlayerNumber;
  playerToken: PlayerToken;
  diamondsFound: Game['diamondsFound'];
  turnStartedAt: Game['turnStartedAt'];
}

export interface CellRevealedPayload {
  row: number;
  col: number;
  cell: ClientCell;
  currentTurn: Game['currentTurn'];
  scores: Game['scores'];
  diamondsFound: Game['diamondsFound'];
  extraTurn: boolean;
  turnStartedAt: Game['turnStartedAt'];
}

export type GameOverReason = 'completed' | 'surrender' | 'timeout';
export const GAME_OVER_REASON = {
  completed: 'completed',
  surrender: 'surrender',
  timeout: 'timeout',
} as const satisfies Record<GameOverReason, GameOverReason>;

export interface GameOverPayload {
  scores: Game['scores'];
  winner: PlayerNumber | null;
  reason?: (typeof GAME_OVER_REASON)[keyof typeof GAME_OVER_REASON];
}

/** Result of openCell: either success with payload(s) or an error message */
export type OpenCellResult =
  | {
      ok: true;
      revealed: CellRevealedPayload;
      gameOver?: GameOverPayload;
    }
  | { ok: false; error: ErrorCode };

/** Result of surrenderGame: either success with game over payload or an error message */
export type SurrenderResult =
  | { ok: true; payload: GameOverPayload }
  | { ok: false; error: ErrorCode };

export interface AvailableGameInfo {
  id: Game['id'];
  gridSize: Game['gridSize'];
  diamondsCount: Game['diamondsCount'];
  turnTimeSeconds: Game['turnTimeSeconds'];
  createdAt: string;
}
