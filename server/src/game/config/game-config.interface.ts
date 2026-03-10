/** Default values for game config (used when env vars are not set). */
export const GAME_CONFIG_DEFAULTS = {
  maxPlayers: 2,
  gameAgeMinutes: 10,
  lobbyRoom: 'lobby',
  gridSizeMin: 2,
  gridSizeMax: 6,
  diamondsCountMin: 1,
  turnTimeSecondsMin: 5,
  turnTimeSecondsMax: 120,
  msPerSecond: 1000,
  disconnectLossSeconds: 10,
} as const;

export interface GameConfig {
  maxPlayers: number;
  gameAgeMinutes: number;
  lobbyRoom: string;
  gridSizeMin: number;
  gridSizeMax: number;
  diamondsCountMin: number;
  turnTimeSecondsMin: number;
  turnTimeSecondsMax: number;
  msPerSecond: number;
  disconnectLossSeconds: number;
}
