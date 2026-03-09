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
import { SessionService } from './session.service';
import { GameplayService } from './gameplay.service';
import {
  Game,
  SECOND_PLAYER,
  GAME_STATUS,
  PlayerToken,
  CellRevealedPayload,
  ERROR_CODE,
  ErrorCode,
} from './interfaces/game.interface';
import {
  GAME_EVENTS,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from './interfaces/game-events.interface';
import { GameConfigService } from './config/game-config.service';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

const ERROR_CODE_TO_MESSAGE = {
  [ERROR_CODE.JOIN_NOT_FOUND]: 'Game not found',
  [ERROR_CODE.JOIN_FINISHED]: 'Game already finished',
  [ERROR_CODE.JOIN_ALREADY_STARTED]: 'Game already started',
  [ERROR_CODE.JOIN_CANNOT_JOIN]: 'Cannot join this game',
  [ERROR_CODE.JOIN_CANNOT_REJOIN]: 'Cannot rejoin with this token',
  [ERROR_CODE.CANCEL_FAILED]: 'Failed to cancel game',
  [ERROR_CODE.GAME_NOT_FOUND]: 'Game not found',
  [ERROR_CODE.GAME_NOT_IN_PROGRESS]: 'Game is not in progress',
  [ERROR_CODE.NOT_IN_GAME]: 'You are not in this game',
  [ERROR_CODE.NOT_YOUR_TURN]: 'Not your turn',
  [ERROR_CODE.INVALID_CELL]: 'Invalid cell coordinates',
  [ERROR_CODE.CELL_ALREADY_REVEALED]: 'Cell already revealed',
} as const satisfies Record<ErrorCode, string>;

const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173';

@WebSocketGateway({
  cors: {
    origin: CORS_ORIGIN,
    credentials: true,
  },
})
export class GameGateway implements OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server!: TypedServer;

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
        this.server.to(gameId).emit(GAME_EVENTS.GAME_OVER, result);
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
  handleJoin(@ConnectedSocket() client: TypedSocket, @MessageBody() data: { gameId: Game['id'] }) {
    const { gameId } = data;
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

    const result = this.lobbyService.joinGame(gameId, client.id);
    if (!result) {
      client.emit(GAME_EVENTS.GAME_UNAVAILABLE, { code: ERROR_CODE.JOIN_CANNOT_JOIN });
      return;
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
  handleRejoin(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody()
    data: {
      gameId: Game['id'];
      playerToken: PlayerToken;
    },
  ) {
    const { gameId, playerToken } = data;

    const playerNumber = this.sessionService.rejoinGame(gameId, client.id, playerToken);

    if (playerNumber === null) {
      client.emit(GAME_EVENTS.GAME_UNAVAILABLE, {
        code: ERROR_CODE.JOIN_CANNOT_REJOIN,
      });
      return;
    }

    client.leave(this.gameConfig.getConfig().lobbyRoom);
    client.join(gameId);

    this.broadcastGameStateToAllPlayers(gameId);
    this.server.to(gameId).emit(GAME_EVENTS.GAME_PLAYER_RECONNECTED, {
      playerNumber,
    });
  }

  @SubscribeMessage(GAME_EVENTS.GAME_CANCEL)
  handleCancel(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: { gameId: Game['id'] },
  ) {
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
  handleOpen(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody()
    data: {
      gameId: Game['id'];
      row: CellRevealedPayload['row'];
      col: CellRevealedPayload['col'];
    },
  ) {
    const { gameId, row, col } = data;
    const result = this.gameplayService.openCell(gameId, client.id, row, col);

    if (!result.ok) {
      this.emitGameError(client, { ok: false, error: result.error });
      return;
    }

    this.server.to(gameId).emit(GAME_EVENTS.GAME_UPDATE, result.revealed);
    if (result.gameOver) {
      this.server.to(gameId).emit(GAME_EVENTS.GAME_OVER, result.gameOver);
      this.invalidateAndBroadcastLobby();
    }
  }

  @SubscribeMessage(GAME_EVENTS.GAME_SURRENDER)
  handleSurrender(
    @ConnectedSocket() client: TypedSocket,
    @MessageBody() data: { gameId: Game['id'] },
  ) {
    const { gameId } = data;
    const result = this.gameplayService.surrenderGame(gameId, client.id);

    if (!result.ok) {
      this.emitGameError(client, result);
      return;
    }

    this.server.to(gameId).emit(GAME_EVENTS.GAME_OVER, result.payload);
    this.invalidateAndBroadcastLobby();
  }

  handleDisconnect(client: TypedSocket) {
    const disconnectResult = this.sessionService.handlePlayerDisconnect(client.id);
    if (!disconnectResult) {
      return;
    }

    this.server.to(disconnectResult.gameId).emit(GAME_EVENTS.GAME_PLAYER_LEFT, {
      playerNumber: disconnectResult.playerNumber,
    });
    // Invalidate lobby cache so deleted games (e.g. only player left) disappear from the list
    this.invalidateAndBroadcastLobby();
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
    const message = ERROR_CODE_TO_MESSAGE[result.error] ?? ERROR_CODE.GAME_NOT_FOUND;
    client.emit(GAME_EVENTS.GAME_ERROR, { message, code: result.error });
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
