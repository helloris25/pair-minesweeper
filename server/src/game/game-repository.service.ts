import { Injectable } from '@nestjs/common';
import { Game, FindGameAndPlayerResult, PlayerNumber, SocketId } from './interfaces/game.interface';
import { GameRepository as GameRepository } from './interfaces/game-repository.interface';

@Injectable()
export class GameRepositoryService implements GameRepository {
  private games = new Map<Game['id'], Game>();
  private socketIndex = new Map<SocketId, { gameId: Game['id']; playerNumber: PlayerNumber }>();

  get(gameId: Game['id']): Game | undefined {
    return this.games.get(gameId);
  }

  set(gameId: Game['id'], game: Game): void {
    this.games.set(gameId, game);
  }

  delete(gameId: Game['id']): void {
    const game = this.games.get(gameId);
    if (game) {
      for (const socketId of game.players.keys()) {
        this.socketIndex.delete(socketId);
      }
    }
    this.games.delete(gameId);
  }

  getEntries(): [Game['id'], Game][] {
    return Array.from(this.games.entries());
  }

  findGameAndPlayerBySocketId(socketId: SocketId): FindGameAndPlayerResult | null {
    const socketEntry = this.socketIndex.get(socketId);
    if (!socketEntry) {
      return null;
    }

    const game = this.games.get(socketEntry.gameId);
    if (!game) {
      return null;
    }

    return {
      gameId: socketEntry.gameId,
      game,
      playerNumber: socketEntry.playerNumber,
    };
  }

  registerSocket(socketId: SocketId, gameId: Game['id'], playerNumber: PlayerNumber): void {
    this.socketIndex.set(socketId, { gameId, playerNumber });
  }

  unregisterSocket(socketId: SocketId): void {
    this.socketIndex.delete(socketId);
  }
}
