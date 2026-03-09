import { Injectable } from '@nestjs/common';
import { Game, PlayerNumber, SocketId } from './interfaces/game.interface';
import { GameRepository as GameRepository } from './interfaces/game-repository.interface';

@Injectable()
export class GameRepositoryService implements GameRepository {
  private games = new Map<Game['id'], Game>();

  get(gameId: Game['id']): Game | undefined {
    return this.games.get(gameId);
  }

  set(gameId: Game['id'], game: Game): void {
    this.games.set(gameId, game);
  }

  delete(gameId: Game['id']): void {
    this.games.delete(gameId);
  }

  /** Returns all [gameId, game] pairs for iteration and cleanup. */
  getEntries(): [Game['id'], Game][] {
    return Array.from(this.games.entries());
  }

  findGameAndPlayerBySocketId(socketId: SocketId): {
    gameId: Game['id'];
    game: Game;
    playerNumber: PlayerNumber;
  } | null {
    for (const [gameId, game] of this.games) {
      if (game.players.has(socketId)) {
        const playerNumber = game.players.get(socketId)!;
        return { gameId, game, playerNumber };
      }
    }
    return null;
  }
}
