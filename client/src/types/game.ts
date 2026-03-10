export type PlayerNumber = 1 | 2;

export interface ClientCell {
  revealed: boolean;
  adjacentDiamonds?: number;
  hasDiamond?: boolean;
  revealedBy?: PlayerNumber;
}

export interface GameStatePayload {
  gameId: string;
  gridSize: number;
  diamondsCount: number;
  turnTimeSeconds: number;
  board: ClientCell[][];
  currentTurn: PlayerNumber;
  scores: Record<PlayerNumber, number>;
  status: 'waiting' | 'playing' | 'finished';
  playerNumber: PlayerNumber;
  playerToken: string;
  diamondsFound: number;
  turnStartedAt: number | null;
}

export interface CellRevealedPayload {
  row: number;
  col: number;
  cell: ClientCell;
  currentTurn: PlayerNumber;
  scores: Record<PlayerNumber, number>;
  diamondsFound: number;
  extraTurn: boolean;
  turnStartedAt: number | null;
}

export interface GameOverPayload {
  scores: Record<PlayerNumber, number>;
  winner: PlayerNumber | null;
  reason?: 'completed' | 'surrender' | 'timeout' | 'disconnect';
}

export interface AvailableGameInfo {
  id: string;
  gridSize: number;
  diamondsCount: number;
  turnTimeSeconds: number;
  createdAt: string;
}
