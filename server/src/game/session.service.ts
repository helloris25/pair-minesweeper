import { Inject, Injectable } from '@nestjs/common';
import {
  Game,
  PlayerToken,
  RejoinGameResult,
  HandlePlayerDisconnectResult,
  SocketId,
} from './interfaces/game.interface';
import { GameRepository, GAME_REPOSITORY } from './interfaces/game-repository.interface';
import { getMapKeyByValue } from './utils/map.util';

@Injectable()
export class SessionService {
  constructor(@Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository) {}

  rejoinGame(
    gameId: Game['id'],
    socketId: SocketId,
    playerToken: PlayerToken,
  ): RejoinGameResult | null {
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

    return oldSocketId !== undefined
      ? { playerNumber, replacedSocketId: oldSocketId }
      : { playerNumber };
  }

  handlePlayerDisconnect(socketId: SocketId): HandlePlayerDisconnectResult | null {
    const gameAndPlayer = this.gameRepository.findGameAndPlayerBySocketId(socketId);
    if (!gameAndPlayer) {
      return null;
    }

    const { gameId, game, playerNumber } = gameAndPlayer;
    game.players.delete(socketId);
    this.gameRepository.unregisterSocket(socketId);

    return { gameId, playerNumber };
  }
}
