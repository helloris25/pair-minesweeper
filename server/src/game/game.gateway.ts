import { ValidationPipe, UsePipes, UseFilters } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayDisconnect,
  OnGatewayInit,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { LobbyService } from './lobby.service';
import { GameIdDto } from './dto/game-id.dto';
import { GameJoinDto } from './dto/game-join.dto';
import { GameRejoinDto } from './dto/game-rejoin.dto';
import { GameOpenDto } from './dto/game-open.dto';
import { GameWsExceptionFilter } from './ws-exception.filter';
import { SessionService } from './session.service';
import { GameplayService } from './gameplay.service';
import {
  Game,
  SECOND_PLAYER,
  GAME_STATUS,
  PlayerNumber,
  ERROR_CODE,
  type ErrorCode,
} from './interfaces/game.interface';
import {
  GAME_EVENTS,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from './interfaces/game-events.interface';
import { GameConfigService } from './config/game-config.service';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173';

const wsValidationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

@WebSocketGateway({
  cors: {
    origin: CORS_ORIGIN,
    credentials: true,
  },
})
@UsePipes(wsValidationPipe)
@UseFilters(GameWsExceptionFilter)
export class GameGateway implements OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server!: TypedServer;

  /** gameId -> { playerNumber, timeoutId } for disconnect-loss timer (playing games only). */
  private disconnectTimers = new Map<
    Game['id'],
    { playerNumber: PlayerNumber; timeoutId: ReturnType<typeof setTimeout> }
  >();

  constructor(
    private readonly lobbyService: LobbyService,
    private readonly sessionService: SessionService,
    private readonly gameplayService: GameplayService,
    private readonly gameConfig: GameConfigService,
  ) {}

  afterInit() {
    this.gameplayService.setTurnTimeoutCallback((gameId: Game['id']) => {
      const result = this.gameplayService.handleTimeout(gameId);
      if (result) {
        this.clearDisconnectTimer(gameId);
        this.server.to(gameId).emit(GAME_EVENTS.GAME_OVER, result);
        this.lobbyService.deleteGame(gameId);
        this.invalidateAndBroadcastLobby();
      }
    });
  }

  @SubscribeMessage(GAME_EVENTS.LOBBY_SUBSCRIBE)
  handleLobbySubscribe(@ConnectedSocket() client: TypedSocket) {
    client.join(this.gameConfig.getConfig().lobbyRoom);
    client.emit(GAME_EVENTS.LOBBY_LIST, this.lobbyService.listAvailableGames());
  }

  @SubscribeMessage(GAME_EVENTS.LOBBY_UNSUBSCRIBE)
  handleLobbyUnsubscribe(@ConnectedSocket() client: TypedSocket) {
    client.leave(this.gameConfig.getConfig().lobbyRoom);
  }

  @SubscribeMessage(GAME_EVENTS.GAME_JOIN)
  handleJoin(@ConnectedSocket() client: TypedSocket, @MessageBody() data: GameJoinDto) {
    const { gameId, browserId } = data;
    const game = this.lobbyService.getGameById(gameId);

    if (!game) {
      client.emit(GAME_EVENTS.GAME_UNAVAILABLE, { code: ERROR_CODE.JOIN_NOT_FOUND });
      return;
    }
    if (game.status === GAME_STATUS.finished) {
      client.emit(GAME_EVENTS.GAME_UNAVAILABLE, { code: ERROR_CODE.JOIN_FINISHED });
      return;
    }
    if (game.status === GAME_STATUS.playing) {
      client.emit(GAME_EVENTS.GAME_UNAVAILABLE, {
        code: ERROR_CODE.JOIN_ALREADY_STARTED,
      });
      return;
    }

    const result = this.lobbyService.joinGame(gameId, client.id, browserId);
    if (!result) {
      client.emit(GAME_EVENTS.GAME_UNAVAILABLE, { code: ERROR_CODE.JOIN_CANNOT_JOIN });
      return;
    }

    if (result.replacedSocketId) {
      this.server.to(result.replacedSocketId).emit(GAME_EVENTS.GAME_PLAYER_REPLACED);
    }

    client.leave(this.gameConfig.getConfig().lobbyRoom);
    client.join(gameId);

    if (result.gameStarted) {
      this.gameplayService.startGame(gameId);
    }

    const state = this.gameplayService.getStateForPlayer(gameId, client.id);
    if (state) {
      client.emit(GAME_EVENTS.GAME_STATE, state);
    }

    if (result.playerNumber === SECOND_PLAYER) {
      this.broadcastGameStateToAllPlayers(gameId);
      this.server.to(gameId).emit(GAME_EVENTS.GAME_PLAYER_JOINED, {
        playerNumber: SECOND_PLAYER,
      });
      this.broadcastLobby();
    }
  }

  @SubscribeMessage(GAME_EVENTS.GAME_REJOIN)
  handleRejoin(@ConnectedSocket() client: TypedSocket, @MessageBody() data: GameRejoinDto) {
    const { gameId, playerToken } = data;

    const result = this.sessionService.rejoinGame(gameId, client.id, playerToken);

    if (result === null) {
      client.emit(GAME_EVENTS.GAME_UNAVAILABLE, {
        code: ERROR_CODE.JOIN_CANNOT_REJOIN,
      });
      return;
    }

    const { playerNumber, replacedSocketId } = result;
    if (replacedSocketId) {
      this.server.to(replacedSocketId).emit(GAME_EVENTS.GAME_PLAYER_REPLACED);
    }

    client.leave(this.gameConfig.getConfig().lobbyRoom);
    client.join(gameId);

    this.clearDisconnectTimer(gameId);

    this.broadcastGameStateToAllPlayers(gameId);
    this.server.to(gameId).emit(GAME_EVENTS.GAME_PLAYER_RECONNECTED, {
      playerNumber,
    });
  }

  @SubscribeMessage(GAME_EVENTS.GAME_CANCEL)
  handleCancel(@ConnectedSocket() client: TypedSocket, @MessageBody() data: GameIdDto) {
    const { gameId } = data;
    const cancelled = this.lobbyService.cancelGame(gameId, client.id);

    if (!cancelled) {
      client.emit(GAME_EVENTS.GAME_ERROR, { code: ERROR_CODE.CANCEL_FAILED });
      return;
    }

    client.leave(gameId);
    client.emit(GAME_EVENTS.GAME_CANCELLED);
    this.broadcastLobby();
  }

  @SubscribeMessage(GAME_EVENTS.GAME_OPEN)
  handleOpen(@ConnectedSocket() client: TypedSocket, @MessageBody() data: GameOpenDto) {
    const { gameId, row, col } = data;
    const result = this.gameplayService.openCell(gameId, client.id, row, col);

    if (!result.ok) {
      this.emitGameError(client, { ok: false, error: result.error });
      return;
    }

    this.server.to(gameId).emit(GAME_EVENTS.GAME_UPDATE, result.revealed);
    if (result.gameOver) {
      this.clearDisconnectTimer(gameId);
      this.server.to(gameId).emit(GAME_EVENTS.GAME_OVER, result.gameOver);
      this.lobbyService.deleteGame(gameId);
      this.invalidateAndBroadcastLobby();
    }
  }

  @SubscribeMessage(GAME_EVENTS.GAME_SURRENDER)
  handleSurrender(@ConnectedSocket() client: TypedSocket, @MessageBody() data: GameIdDto) {
    const { gameId } = data;
    const result = this.gameplayService.surrenderGame(gameId, client.id);

    if (!result.ok) {
      this.emitGameError(client, result);
      return;
    }

    this.clearDisconnectTimer(gameId);
    this.server.to(gameId).emit(GAME_EVENTS.GAME_OVER, result.payload);
    this.lobbyService.deleteGame(gameId);
    this.invalidateAndBroadcastLobby();
  }

  handleDisconnect(client: TypedSocket) {
    const disconnectResult = this.sessionService.handlePlayerDisconnect(client.id);
    if (!disconnectResult) {
      return;
    }

    const { gameId, playerNumber } = disconnectResult;
    const game = this.lobbyService.getGameById(gameId);
    if (game?.status === GAME_STATUS.waiting && game.players.size === 0) {
      this.lobbyService.deleteGame(gameId);
      this.invalidateAndBroadcastLobby();
      return;
    }
    if (game?.status === GAME_STATUS.playing) {
      this.clearDisconnectTimer(gameId);
      const seconds = this.gameConfig.getConfig().disconnectLossSeconds;
      this.server.to(gameId).emit(GAME_EVENTS.GAME_OPPONENT_DISCONNECTED, {
        secondsUntilWin: seconds,
      });
      const timeoutId = setTimeout(() => {
        this.disconnectTimers.delete(gameId);
        const payload = this.gameplayService.handleDisconnectLoss(gameId, playerNumber);
        if (payload) {
          this.server.to(gameId).emit(GAME_EVENTS.GAME_OVER, payload);
          this.lobbyService.deleteGame(gameId);
          this.invalidateAndBroadcastLobby();
        }
      }, seconds * this.gameConfig.getConfig().msPerSecond);
      this.disconnectTimers.set(gameId, { playerNumber, timeoutId });
    }

    this.server.to(gameId).emit(GAME_EVENTS.GAME_PLAYER_LEFT, {
      playerNumber,
    });
    this.invalidateAndBroadcastLobby();
  }

  private clearDisconnectTimer(gameId: Game['id']): void {
    const entry = this.disconnectTimers.get(gameId);
    if (entry) {
      clearTimeout(entry.timeoutId);
      this.disconnectTimers.delete(gameId);
    }
  }

  broadcastLobby() {
    this.server
      .to(this.gameConfig.getConfig().lobbyRoom)
      .emit(GAME_EVENTS.LOBBY_LIST, this.lobbyService.listAvailableGames());
  }

  private invalidateAndBroadcastLobby(): void {
    this.lobbyService.invalidateLobbyCache();
    this.broadcastLobby();
  }

  private emitGameError(client: TypedSocket, result: { ok: false; error: ErrorCode }): void {
    client.emit(GAME_EVENTS.GAME_ERROR, { code: result.error });
  }

  private broadcastGameStateToAllPlayers(gameId: Game['id']): void {
    const socketIds = this.lobbyService.getSocketIdsForGame(gameId);
    for (const socketId of socketIds) {
      const state = this.gameplayService.getStateForPlayer(gameId, socketId);
      if (state) {
        this.server.to(socketId).emit(GAME_EVENTS.GAME_STATE, state);
      }
    }
  }
}
