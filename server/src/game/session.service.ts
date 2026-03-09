import { Inject, Injectable } from '@nestjs/common';
import {
  Game,
  GAME_STATUS,
  PlayerNumber,
  PlayerToken,
  SocketId,
} from './interfaces/game.interface';
import { GameRepository, GAME_REPOSITORY } from './interfaces/game-repository.interface';
import { GameConfigService } from './config/game-config.service';

@Injectable()
export class SessionService {
  private onDisconnectTimeoutCallback:
    | ((gameId: Game['id'], playerNumber: PlayerNumber) => void)
    | null = null;

  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    private readonly gameConfig: GameConfigService,
  ) {}

  setOnDisconnectTimeout(cb: (gameId: Game['id'], playerNumber: PlayerNumber) => void): void {
    this.onDisconnectTimeoutCallback = cb;
  }

  /** Re-establishes a player in the game by token; returns player number or null. */
  rejoinGame(
    gameId: Game['id'],
    socketId: SocketId,
    playerToken: PlayerToken,
  ): PlayerNumber | null {
    const game = this.gameRepository.get(gameId);
    if (!game) {
      return null;
    }

    const playerNumber = game.playerTokens.get(playerToken);
    if (playerNumber === undefined) {
      return null;
    }

    const dcTimer = game.disconnectTimers.get(playerNumber);
    if (dcTimer) {
      clearTimeout(dcTimer);
      game.disconnectTimers.delete(playerNumber);
    }

    for (const [sid, playerNum] of game.players) {
      if (playerNum === playerNumber) {
        game.players.delete(sid);
        break;
      }
    }

    game.players.set(socketId, playerNumber);
    return playerNumber;
  }

  /**
   * Called on socket disconnect. Schedules a delayed forfeit for playing games.
   * Returns info for the gateway to notify the opponent.
   */
  handlePlayerDisconnect(socketId: SocketId): {
    gameId: Game['id'];
    playerNumber: PlayerNumber;
  } | null {
    const found = this.gameRepository.findGameAndPlayerBySocketId(socketId);
    if (!found) {
      return null;
    }

    const { gameId, game, playerNumber } = found;
    game.players.delete(socketId);

    const isWaitingGameWithNoPlayersLeft =
      game.status === GAME_STATUS.waiting && game.players.size === 0;
    if (isWaitingGameWithNoPlayersLeft) {
      this.gameRepository.delete(gameId);
      return { gameId, playerNumber };
    }

    if (game.status === GAME_STATUS.playing) {
      const timer = setTimeout(() => {
        game.disconnectTimers.delete(playerNumber);
        if (this.onDisconnectTimeoutCallback) {
          this.onDisconnectTimeoutCallback(gameId, playerNumber);
        }
      }, this.gameConfig.get().reconnectTimeoutMs);
      game.disconnectTimers.set(playerNumber, timer);
    }

    return { gameId, playerNumber };
  }
}
