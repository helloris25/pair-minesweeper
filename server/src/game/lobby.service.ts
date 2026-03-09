import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import {
  Game,
  Cell,
  PlayerNumber,
  AvailableGameInfo,
  FIRST_PLAYER,
  SECOND_PLAYER,
  GAME_STATUS,
  PlayerToken,
  SocketId,
} from './interfaces/game.interface';
import { GameRepository, GAME_REPOSITORY } from './interfaces/game-repository.interface';
import { IBoardGenerator, BOARD_GENERATOR } from './interfaces/board-generator.interface';
import { GameConfigService } from './config/game-config.service';

@Injectable()
export class LobbyService {
  private lobbyListDirty = true;
  private cachedLobbyList: AvailableGameInfo[] = [];

  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(BOARD_GENERATOR) private readonly boardGenerator: IBoardGenerator,
    private readonly gameConfig: GameConfigService,
  ) {}

  /** Call when the set of waiting games may have changed (so next listAvailableGames recomputes). */
  invalidateLobbyCache(): void {
    this.lobbyListDirty = true;
  }

  /** Creates a new game with the given parameters and stores it. */
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

  /** Lists games waiting for a second player; removes expired non-playing games. */
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

  /** Adds a player to a waiting game. Returns null if game is full or missing. */
  joinGame(
    gameId: Game['id'],
    socketId: SocketId,
  ): {
    playerNumber: PlayerNumber;
    playerToken: PlayerToken;
    gameStarted: boolean;
  } | null {
    const game = this.gameRepository.get(gameId);
    if (!game) {
      return null;
    }
    const { maxPlayers } = this.gameConfig.getConfig();
    if (game.players.size >= maxPlayers) {
      return null;
    }

    const playerNumber: PlayerNumber = game.playerTokens.size === 0 ? FIRST_PLAYER : SECOND_PLAYER;
    const playerToken = uuidv4();

    game.players.set(socketId, playerNumber);
    game.playerTokens.set(playerToken, playerNumber);
    this.gameRepository.registerSocket(socketId, gameId, playerNumber);

    const gameStarted = game.playerTokens.size === maxPlayers;
    if (gameStarted) {
      game.status = GAME_STATUS.playing;
      this.invalidateLobbyCache();
    }

    return { playerNumber, playerToken, gameStarted };
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

  private buildGameEntity(params: {
    gameId: Game['id'];
    gridSize: Game['gridSize'];
    diamondsCount: Game['diamondsCount'];
    turnTimeSeconds: Game['turnTimeSeconds'];
    board: Cell[][];
  }): Game {
    const { gameId, gridSize, diamondsCount, turnTimeSeconds, board } = params;
    return {
      id: gameId,
      gridSize,
      diamondsCount,
      turnTimeSeconds,
      board,
      players: new Map(),
      playerTokens: new Map(),
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
