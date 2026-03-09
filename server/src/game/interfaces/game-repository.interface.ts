import { Game, PlayerNumber, SocketId } from './game.interface';

export const GAME_REPOSITORY = Symbol('GAME_REPOSITORY');

export interface GameRepository {
  get(gameId: Game['id']): Game | undefined;
  set(gameId: Game['id'], game: Game): void;
  delete(gameId: Game['id']): void;
  getEntries(): [Game['id'], Game][];
  findGameAndPlayerBySocketId(socketId: SocketId): {
    gameId: Game['id'];
    game: Game;
    playerNumber: PlayerNumber;
  } | null;
}
