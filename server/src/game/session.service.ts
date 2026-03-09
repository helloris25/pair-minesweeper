import { Inject, Injectable } from '@nestjs/common';
import {
  Game,
  GAME_STATUS,
  PlayerNumber,
  PlayerToken,
  SocketId,
} from './interfaces/game.interface';
import { GameRepository, GAME_REPOSITORY } from './interfaces/game-repository.interface';
import { getMapKeyByValue } from './utils/map.util';

@Injectable()
export class SessionService {
  constructor(@Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository) {}

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

    const oldSocketId = getMapKeyByValue(game.players, playerNumber);
    if (oldSocketId !== undefined) {
      game.players.delete(oldSocketId);
      this.gameRepository.unregisterSocket(oldSocketId);
    }

    game.players.set(socketId, playerNumber);
    this.gameRepository.registerSocket(socketId, gameId, playerNumber);
    return playerNumber;
  }

  /**
   * Called on socket disconnect. Removes the socket from the game; the player slot
   * remains (they can rejoin by token). Game ends only when the turn timer expires.
   */
  handlePlayerDisconnect(socketId: SocketId): {
    gameId: Game['id'];
    playerNumber: PlayerNumber;
  } | null {
    const gameAndPlayer = this.gameRepository.findGameAndPlayerBySocketId(socketId);
    if (!gameAndPlayer) {
      return null;
    }

    const { gameId, game, playerNumber } = gameAndPlayer;
    game.players.delete(socketId);
    this.gameRepository.unregisterSocket(socketId);

    const isWaitingGameWithNoPlayersLeft =
      game.status === GAME_STATUS.waiting && game.players.size === 0;
    if (isWaitingGameWithNoPlayersLeft) {
      this.gameRepository.delete(gameId);
      return { gameId, playerNumber };
    }

    return { gameId, playerNumber };
  }
}
