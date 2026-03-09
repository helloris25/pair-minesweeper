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
} from './interfaces/game.interface';
import {
  GAME_EVENTS,
  type ClientToServerEvents,
  type ServerToClientEvents,
} from './interfaces/game-events.interface';
import { GameConfigService } from './config/game-config.service';

type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

/** Error codes sent to the client; the client maps them to localized messages. */
export const ErrorCode = {
  JOIN_NOT_FOUND: 'JOIN_NOT_FOUND',
  JOIN_FINISHED: 'JOIN_FINISHED',
  JOIN_ALREADY_STARTED: 'JOIN_ALREADY_STARTED',
  JOIN_CANNOT_JOIN: 'JOIN_CANNOT_JOIN',
  JOIN_CANNOT_REJOIN: 'JOIN_CANNOT_REJOIN',
  CANCEL_FAILED: 'CANCEL_FAILED',
  GAME_NOT_FOUND: 'GAME_NOT_FOUND',
  GAME_NOT_IN_PROGRESS: 'GAME_NOT_IN_PROGRESS',
  NOT_IN_GAME: 'NOT_IN_GAME',
  NOT_YOUR_TURN: 'NOT_YOUR_TURN',
  INVALID_CELL: 'INVALID_CELL',
  CELL_ALREADY_REVEALED: 'CELL_ALREADY_REVEALED',
} as const;

/** Maps service error messages to error codes. */
const SERVICE_ERROR_TO_CODE: Record<string, string> = {
  'Game not found': ErrorCode.GAME_NOT_FOUND,
  'Game is not in progress': ErrorCode.GAME_NOT_IN_PROGRESS,
  'You are not in this game': ErrorCode.NOT_IN_GAME,
  'Not your turn': ErrorCode.NOT_YOUR_TURN,
  'Invalid cell coordinates': ErrorCode.INVALID_CELL,
  'Cell already revealed': ErrorCode.CELL_ALREADY_REVEALED,
};

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
    this.gameplayService.setOnTurnTimeout((gameId: Game['id']) => {
      const result = this.gameplayService.handleTimeout(gameId);
      if (result) {
        this.server.to(gameId).emit(GAME_EVENTS.GAME_OVER, result);
        this.broadcastLobby();
      }
    });

    this.sessionService.setOnDisconnectTimeout((gameId, playerNumber) => {
      const result = this.gameplayService.forfeitDisconnectedPlayer(gameId, playerNumber);
      if (result) {
        this.server.to(gameId).emit(GAME_EVENTS.GAME_OVER, result);
        this.broadcastLobby();
      }
    });
  }

  @SubscribeMessage(GAME_EVENTS.LOBBY_SUBSCRIBE)
  handleLobbySubscribe(@ConnectedSocket() client: TypedSocket) {
    client.join(this.gameConfig.get().lobbyRoom);
    client.emit(GAME_EVENTS.LOBBY_LIST, this.lobbyService.listAvailableGames());
  }

  @SubscribeMessage(GAME_EVENTS.LOBBY_UNSUBSCRIBE)
  handleLobbyUnsubscribe(@ConnectedSocket() client: TypedSocket) {
    client.leave(this.gameConfig.get().lobbyRoom);
  }

  @SubscribeMessage(GAME_EVENTS.GAME_JOIN)
  handleJoin(@ConnectedSocket() client: TypedSocket, @MessageBody() data: { gameId: Game['id'] }) {
    const { gameId } = data;
    const game = this.lobbyService.getGame(gameId);

    if (!game) {
      client.emit(GAME_EVENTS.GAME_UNAVAILABLE, { code: ErrorCode.JOIN_NOT_FOUND });
      return;
    }
    if (game.status === GAME_STATUS.finished) {
      client.emit(GAME_EVENTS.GAME_UNAVAILABLE, { code: ErrorCode.JOIN_FINISHED });
      return;
    }
    if (game.status === GAME_STATUS.playing) {
      client.emit(GAME_EVENTS.GAME_UNAVAILABLE, {
        code: ErrorCode.JOIN_ALREADY_STARTED,
      });
      return;
    }

    const result = this.lobbyService.joinGame(gameId, client.id);
    if (!result) {
      client.emit(GAME_EVENTS.GAME_UNAVAILABLE, { code: ErrorCode.JOIN_CANNOT_JOIN });
      return;
    }

    client.leave(this.gameConfig.get().lobbyRoom);
    client.join(gameId);

    if (result.gameStarted) {
      this.gameplayService.startGame(gameId);
    }

    const state = this.gameplayService.getStateForPlayer(gameId, client.id);
    if (state) {
      client.emit(GAME_EVENTS.GAME_STATE, state);
    }

    if (result.playerNumber === SECOND_PLAYER) {
      this.broadcastStateToAll(gameId);
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
        code: ErrorCode.JOIN_CANNOT_REJOIN,
      });
      return;
    }

    client.leave(this.gameConfig.get().lobbyRoom);
    client.join(gameId);

    this.broadcastStateToAll(gameId);
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
      client.emit(GAME_EVENTS.GAME_ERROR, { code: ErrorCode.CANCEL_FAILED });
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
      const code = SERVICE_ERROR_TO_CODE[result.error] ?? ErrorCode.GAME_NOT_FOUND;
      client.emit(GAME_EVENTS.GAME_ERROR, { code, message: result.error });
      return;
    }

    this.server.to(gameId).emit(GAME_EVENTS.GAME_UPDATE, result.revealed);
    if (result.gameOver) {
      this.server.to(gameId).emit(GAME_EVENTS.GAME_OVER, result.gameOver);
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
      const code = SERVICE_ERROR_TO_CODE[result.error] ?? ErrorCode.GAME_NOT_FOUND;
      client.emit(GAME_EVENTS.GAME_ERROR, { code, message: result.error });
      return;
    }

    this.server.to(gameId).emit(GAME_EVENTS.GAME_OVER, result.payload);
    this.broadcastLobby();
  }

  handleDisconnect(client: TypedSocket) {
    const removed = this.sessionService.handlePlayerDisconnect(client.id);
    if (!removed) {
      return;
    }

    this.server.to(removed.gameId).emit(GAME_EVENTS.GAME_PLAYER_LEFT, {
      playerNumber: removed.playerNumber,
    });
    this.broadcastLobby();
  }

  broadcastLobby() {
    this.server
      .to(this.gameConfig.get().lobbyRoom)
      .emit(GAME_EVENTS.LOBBY_LIST, this.lobbyService.listAvailableGames());
  }

  private broadcastStateToAll(gameId: Game['id']) {
    const socketIds = this.lobbyService.getSocketIdsForGame(gameId);
    for (const socketId of socketIds) {
      const state = this.gameplayService.getStateForPlayer(gameId, socketId);
      if (state) {
        this.server.to(socketId).emit(GAME_EVENTS.GAME_STATE, state);
      }
    }
  }
}
