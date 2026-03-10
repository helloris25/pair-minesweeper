import type {
  Game,
  GameStatePayload,
  GameOverPayload,
  OpenedCellResultPayload,
  AvailableGameInfo,
  PlayerNumber,
  PlayerToken,
} from './game.interface';

/** Event names — single source of truth for server and client. */
export const GAME_EVENTS = {
  LOBBY_LIST: 'lobby:list',
  LOBBY_SUBSCRIBE: 'lobby:subscribe',
  LOBBY_UNSUBSCRIBE: 'lobby:unsubscribe',
  GAME_STATE: 'game:state',
  GAME_UPDATE: 'game:update',
  GAME_OVER: 'game:over',
  GAME_ERROR: 'game:error',
  GAME_UNAVAILABLE: 'game:unavailable',
  GAME_CANCELLED: 'game:cancelled',
  GAME_PLAYER_JOINED: 'game:player-joined',
  GAME_PLAYER_RECONNECTED: 'game:player-reconnected',
  GAME_PLAYER_LEFT: 'game:player-left',
  GAME_PLAYER_REPLACED: 'game:player-replaced',
  GAME_OPPONENT_DISCONNECTED: 'game:opponent-disconnected',
  GAME_JOIN: 'game:join',
  GAME_REJOIN: 'game:rejoin',
  GAME_CANCEL: 'game:cancel',
  GAME_OPEN: 'game:open',
  GAME_SURRENDER: 'game:surrender',
} as const;

/** Error payload for GAME_ERROR and GAME_UNAVAILABLE. message is optional (e.g. for debugging). */
export interface GameErrorPayload {
  code: string;
  message?: string;
}

/** Events the server sends to clients (typed emit). */
export interface ServerToClientEvents {
  [GAME_EVENTS.LOBBY_LIST]: (games: AvailableGameInfo[]) => void;
  [GAME_EVENTS.GAME_STATE]: (state: GameStatePayload) => void;
  [GAME_EVENTS.GAME_UPDATE]: (data: OpenedCellResultPayload) => void;
  [GAME_EVENTS.GAME_OVER]: (data: GameOverPayload) => void;
  [GAME_EVENTS.GAME_ERROR]: (data: GameErrorPayload) => void;
  [GAME_EVENTS.GAME_UNAVAILABLE]: (data: GameErrorPayload) => void;
  [GAME_EVENTS.GAME_CANCELLED]: () => void;
  [GAME_EVENTS.GAME_PLAYER_JOINED]: (data: { playerNumber: PlayerNumber }) => void;
  [GAME_EVENTS.GAME_PLAYER_RECONNECTED]: (data: { playerNumber: PlayerNumber }) => void;
  [GAME_EVENTS.GAME_PLAYER_LEFT]: (data: { playerNumber: PlayerNumber }) => void;
  [GAME_EVENTS.GAME_PLAYER_REPLACED]: () => void;
  [GAME_EVENTS.GAME_OPPONENT_DISCONNECTED]: (data: { secondsUntilWin: number }) => void;
}

/** Events the client sends to the server (SubscribeMessage handlers). */
export interface ClientToServerEvents {
  [GAME_EVENTS.LOBBY_SUBSCRIBE]: () => void;
  [GAME_EVENTS.LOBBY_UNSUBSCRIBE]: () => void;
  [GAME_EVENTS.GAME_JOIN]: (data: { gameId: Game['id']; browserId?: string }) => void;
  [GAME_EVENTS.GAME_REJOIN]: (data: { gameId: Game['id']; playerToken: PlayerToken }) => void;
  [GAME_EVENTS.GAME_CANCEL]: (data: { gameId: Game['id'] }) => void;
  [GAME_EVENTS.GAME_OPEN]: (data: {
    gameId: Game['id'];
    row: OpenedCellResultPayload['row'];
    col: OpenedCellResultPayload['col'];
  }) => void;
  [GAME_EVENTS.GAME_SURRENDER]: (data: { gameId: Game['id'] }) => void;
}
