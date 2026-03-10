import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  Game,
  PlayerNumber,
  AvailableGameInfo,
  JoinGameResult,
  BuildGameEntityParams,
  FIRST_PLAYER,
  SECOND_PLAYER,
  GAME_STATUS,
  SocketId,
} from './interfaces/game.interface';
import { GameRepository, GAME_REPOSITORY } from './interfaces/game-repository.interface';
import { IBoardGenerator, BOARD_GENERATOR } from './interfaces/board-generator.interface';
import { GameConfigService } from './config/game-config.service';
import { getMapKeyByValue } from './utils/map.util';

@Injectable()
export class LobbyService {
  private lobbyListDirty = true;
  private cachedLobbyList: AvailableGameInfo[] = [];

  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(BOARD_GENERATOR) private readonly boardGenerator: IBoardGenerator,
    private readonly gameConfig: GameConfigService,
  ) {}

  invalidateLobbyCache(): void {
    this.lobbyListDirty = true;
  }

  createGame(
    gridSize: Game['gridSize'],
    diamondsCount: Game['diamondsCount'],
    turnTimeSeconds: Game['turnTimeSeconds'],
  ): Game {
    const config = this.gameConfig.getConfig();
    const { maxPlayers } = config;

    const isParamsOutOfRange =
      gridSize < config.gridSizeMin ||
      gridSize > config.gridSizeMax ||
      diamondsCount < config.diamondsCountMin ||
      turnTimeSeconds < config.turnTimeSecondsMin ||
      turnTimeSeconds > config.turnTimeSecondsMax;

    if (isParamsOutOfRange) {
      throw new BadRequestException('Game parameters out of allowed range');
    }
    if (diamondsCount % maxPlayers === 0) {
      throw new BadRequestException('diamondsCount must be odd');
    }
    if (diamondsCount >= gridSize * gridSize) {
      throw new BadRequestException('diamondsCount must be less than gridSize*gridSize');
    }

    const gameId = uuidv4();
    const board = this.boardGenerator.generateBoard(gridSize, diamondsCount);
    const game = this.buildGameEntity({
      gameId,
      gridSize,
      diamondsCount,
      turnTimeSeconds,
      board,
    });
    this.gameRepository.set(gameId, game);
    this.invalidateLobbyCache();
    return game;
  }

  getGameById(gameId: Game['id']): Game | undefined {
    return this.gameRepository.get(gameId);
  }

  listAvailableGames(): AvailableGameInfo[] {
    if (!this.lobbyListDirty) {
      return this.cachedLobbyList;
    }

    const now = Date.now();
    const result: AvailableGameInfo[] = [];
    const maxGameAgeMs = this.gameConfig.maxGameAgeMs;

    for (const [gameId, game] of this.gameRepository.getEntries()) {
      const age = now - game.createdAt.getTime();

      const isExpired = age > maxGameAgeMs && game.status !== GAME_STATUS.playing;
      if (isExpired) {
        this.gameRepository.delete(gameId);
        continue;
      }

      const isWaiting = game.status === GAME_STATUS.waiting && age < maxGameAgeMs;
      if (isWaiting) {
        result.push({
          id: game.id,
          gridSize: game.gridSize,
          diamondsCount: game.diamondsCount,
          turnTimeSeconds: game.turnTimeSeconds,
          createdAt: game.createdAt.toISOString(),
        });
      }
    }

    this.cachedLobbyList = result;
    this.lobbyListDirty = false;

    return result;
  }

  joinGame(gameId: Game['id'], socketId: SocketId, browserId?: string): JoinGameResult | null {
    const game = this.gameRepository.get(gameId);
    if (!game) {
      return null;
    }

    const { maxPlayers } = this.gameConfig.getConfig();
    if (game.players.size >= maxPlayers) {
      return null;
    }

    const replaceResult = this.tryReplaceFirstPlayerSocket(game, socketId, browserId);
    if (replaceResult !== null) {
      return replaceResult;
    }

    const playerNumber: PlayerNumber = game.playerTokens.size === 0 ? FIRST_PLAYER : SECOND_PLAYER;
    const playerToken = uuidv4();

    game.players.set(socketId, playerNumber);
    game.playerTokens.set(playerToken, playerNumber);

    if (!game.playerBrowserIds) {
      game.playerBrowserIds = new Map();
    }

    if (browserId) {
      game.playerBrowserIds.set(playerNumber, browserId);
    }

    this.gameRepository.registerSocket(socketId, gameId, playerNumber);

    const gameStarted = game.playerTokens.size === maxPlayers;
    if (gameStarted) {
      game.status = GAME_STATUS.playing;
      this.invalidateLobbyCache();
    }

    return { playerNumber, playerToken, gameStarted };
  }

  private tryReplaceFirstPlayerSocket(
    game: Game,
    socketId: SocketId,
    browserId: string | undefined,
  ): JoinGameResult | null {
    if (game.players.size !== 1 || !browserId) {
      return null;
    }

    const playerBrowserIds = game.playerBrowserIds ?? new Map<PlayerNumber, string>();
    if (playerBrowserIds.get(FIRST_PLAYER) !== browserId) {
      return null;
    }

    const oldSocketId = getMapKeyByValue(game.players, FIRST_PLAYER);
    const existingToken = getMapKeyByValue(game.playerTokens, FIRST_PLAYER);
    const isReplacement = oldSocketId === undefined || existingToken === undefined;
    if (isReplacement) {
      return null;
    }

    game.players.delete(oldSocketId);
    this.gameRepository.unregisterSocket(oldSocketId);
    game.players.set(socketId, FIRST_PLAYER);
    this.gameRepository.registerSocket(socketId, game.id, FIRST_PLAYER);

    return {
      playerNumber: FIRST_PLAYER,
      playerToken: existingToken,
      gameStarted: false,
      replacedSocketId: oldSocketId,
    };
  }

  cancelGame(gameId: Game['id'], socketId: SocketId): boolean {
    const game = this.gameRepository.get(gameId);
    if (!game || game.status !== GAME_STATUS.waiting || !game.players.has(socketId)) {
      return false;
    }

    this.gameRepository.delete(gameId);
    this.invalidateLobbyCache();

    return true;
  }

  deleteGame(gameId: Game['id']): void {
    this.gameRepository.delete(gameId);
    this.invalidateLobbyCache();
  }

  getSocketIdsForGame(gameId: Game['id']): SocketId[] {
    const game = this.gameRepository.get(gameId);
    if (!game) {
      return [];
    }

    return Array.from(game.players.keys());
  }

  private buildGameEntity(params: BuildGameEntityParams): Game {
    const { gameId, gridSize, diamondsCount, turnTimeSeconds, board } = params;

    return {
      id: gameId,
      gridSize,
      diamondsCount,
      turnTimeSeconds,
      board,
      players: new Map(),
      playerTokens: new Map(),
      playerBrowserIds: new Map(),
      currentTurn: FIRST_PLAYER,
      scores: {
        [FIRST_PLAYER]: 0,
        [SECOND_PLAYER]: 0,
      },
      status: GAME_STATUS.waiting,
      diamondsFound: 0,
      createdAt: new Date(),
      turnStartedAt: null,
      turnTimer: null,
      turnTimeRemainingMs: null,
    };
  }
}
