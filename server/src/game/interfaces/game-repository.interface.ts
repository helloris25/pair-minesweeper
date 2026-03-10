import { Game, FindGameAndPlayerResult, PlayerNumber, SocketId } from './game.interface';

export const GAME_REPOSITORY = Symbol('GAME_REPOSITORY');

export interface GameRepository {
  get(gameId: Game['id']): Game | undefined;
  set(gameId: Game['id'], game: Game): void;
  delete(gameId: Game['id']): void;
  getEntries(): [Game['id'], Game][];
  findGameAndPlayerBySocketId(socketId: SocketId): FindGameAndPlayerResult | null;
  /** Register socket in the socketId index (call when adding a player to a game). */
  registerSocket(socketId: SocketId, gameId: Game['id'], playerNumber: PlayerNumber): void;
  /** Unregister socket from the index (call when removing a player from a game). */
  unregisterSocket(socketId: SocketId): void;
}
