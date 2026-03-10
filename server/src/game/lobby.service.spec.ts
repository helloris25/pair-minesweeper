/* eslint-disable max-lines-per-function */
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { LobbyService } from './lobby.service';
import { GAME_REPOSITORY } from './interfaces/game-repository.interface';
import { BOARD_GENERATOR } from './interfaces/board-generator.interface';
import { GameConfigService } from './config/game-config.service';
import {
  Game,
  Cell,
  FIRST_PLAYER,
  SECOND_PLAYER,
  GAME_STATUS,
  SocketId,
} from './interfaces/game.interface';

function createEmptyWaitingGame(gameId: string): Game {
  const board: Cell[][] = [
    [
      { hasDiamond: false, adjacentDiamonds: 0, revealed: false },
      { hasDiamond: false, adjacentDiamonds: 0, revealed: false },
    ],
    [
      { hasDiamond: false, adjacentDiamonds: 0, revealed: false },
      { hasDiamond: false, adjacentDiamonds: 0, revealed: false },
    ],
  ];
  return {
    id: gameId,
    gridSize: 2,
    diamondsCount: 1,
    turnTimeSeconds: 30,
    board,
    players: new Map(),
    playerTokens: new Map(),
    playerBrowserIds: new Map(),
    currentTurn: FIRST_PLAYER,
    scores: { [FIRST_PLAYER]: 0, [SECOND_PLAYER]: 0 },
    status: GAME_STATUS.waiting,
    diamondsFound: 0,
    createdAt: new Date(),
    turnStartedAt: null,
    turnTimer: null,
    turnTimeRemainingMs: null,
  };
}

function createGameWithOnePlayer(
  gameId: string,
  socketId: SocketId,
  playerToken: string,
  browserId?: string,
): Game {
  const game = createEmptyWaitingGame(gameId);
  game.players.set(socketId, FIRST_PLAYER);
  game.playerTokens.set(playerToken, FIRST_PLAYER);
  if (browserId) {
    game.playerBrowserIds!.set(FIRST_PLAYER, browserId);
  }
  return game;
}

describe('LobbyService', () => {
  let service: LobbyService;
  let gameRepository: {
    get: jest.Mock;
    set: jest.Mock;
    delete: jest.Mock;
    getEntries: jest.Mock;
    registerSocket: jest.Mock;
    unregisterSocket: jest.Mock;
  };
  let boardGenerator: { generateBoard: jest.Mock };
  let gameConfig: { getConfig: jest.Mock; maxGameAgeMs: number };

  beforeEach(async () => {
    const games = new Map<string, Game>();

    gameRepository = {
      get: jest.fn((id: string) => games.get(id)),
      set: jest.fn((id: string, game: Game) => {
        games.set(id, game);
      }),
      delete: jest.fn((id: string) => {
        games.delete(id);
      }),
      getEntries: jest.fn(() => Array.from(games.entries())),
      registerSocket: jest.fn(),
      unregisterSocket: jest.fn(),
    };

    boardGenerator = {
      generateBoard: jest.fn(() => [
        [
          { hasDiamond: false, adjacentDiamonds: 0, revealed: false },
          { hasDiamond: true, adjacentDiamonds: 0, revealed: false },
        ],
        [
          { hasDiamond: false, adjacentDiamonds: 0, revealed: false },
          { hasDiamond: false, adjacentDiamonds: 0, revealed: false },
        ],
      ]),
    };

    gameConfig = {
      getConfig: jest.fn(() => ({
        maxPlayers: 2,
        gridSizeMin: 2,
        gridSizeMax: 6,
        diamondsCountMin: 1,
        turnTimeSecondsMin: 5,
        turnTimeSecondsMax: 120,
      })),
      maxGameAgeMs: 600_000,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LobbyService,
        { provide: GAME_REPOSITORY, useValue: gameRepository },
        { provide: BOARD_GENERATOR, useValue: boardGenerator },
        {
          provide: GameConfigService,
          useValue: gameConfig,
        },
      ],
    }).compile();

    service = module.get(LobbyService);

    games.clear();
    gameRepository.get.mockImplementation((id: string) => games.get(id));
    gameRepository.set.mockImplementation((id: string, game: Game) => {
      games.set(id, game);
    });
  });

  describe('createGame', () => {
    const GRID_SIZE = 2;
    const DIAMONDS_COUNT = 1;
    const TURN_TIME_SECONDS = 30;

    it('creates game and stores in repository with waiting status', () => {
      const game = service.createGame(GRID_SIZE, DIAMONDS_COUNT, TURN_TIME_SECONDS);

      expect(game.gridSize).toBe(GRID_SIZE);
      expect(game.diamondsCount).toBe(DIAMONDS_COUNT);
      expect(game.turnTimeSeconds).toBe(TURN_TIME_SECONDS);
      expect(game.status).toBe(GAME_STATUS.waiting);
      expect(game.players.size).toBe(0);
      expect(game.playerTokens.size).toBe(0);
      expect(boardGenerator.generateBoard).toHaveBeenCalledWith(GRID_SIZE, DIAMONDS_COUNT);
      expect(gameRepository.set).toHaveBeenCalledWith(game.id, game);
    });

    it('throws when params out of range', () => {
      const invalidGridSize = 1;
      const diamondsCountTooHighForGrid = 2;
      const diamondsCountExceedsGrid = 4;
      expect(() => service.createGame(invalidGridSize, 1, TURN_TIME_SECONDS)).toThrow(
        BadRequestException,
      );
      expect(() =>
        service.createGame(GRID_SIZE, diamondsCountTooHighForGrid, TURN_TIME_SECONDS),
      ).toThrow(BadRequestException);
      expect(() =>
        service.createGame(GRID_SIZE, diamondsCountExceedsGrid, TURN_TIME_SECONDS),
      ).toThrow(BadRequestException);
    });
  });

  describe('joinGame', () => {
    const PLAYERS_COUNT_WHEN_FULL = 2;
    it('first join: returns player 1, token, gameStarted false', () => {
      const game = createEmptyWaitingGame('g1');
      gameRepository.set('g1', game);

      const result = service.joinGame('g1', 'socket-1');

      expect(result).not.toBeNull();
      expect(result?.playerNumber).toBe(FIRST_PLAYER);
      expect(result?.playerToken).toBeDefined();
      expect(result?.gameStarted).toBe(false);
      expect(result?.replacedSocketId).toBeUndefined();
      expect(game.players.size).toBe(1);
      expect(game.players.get('socket-1')).toBe(FIRST_PLAYER);
      expect(game.playerTokens.size).toBe(1);
      expect(gameRepository.registerSocket).toHaveBeenCalledWith('socket-1', 'g1', FIRST_PLAYER);
    });

    it('second join: returns player 2, gameStarted true, game status playing', () => {
      const game = createGameWithOnePlayer('g1', 'socket-1', 'token-1');
      gameRepository.set('g1', game);

      const result = service.joinGame('g1', 'socket-2');

      expect(result).not.toBeNull();
      expect(result?.playerNumber).toBe(SECOND_PLAYER);
      expect(result?.playerToken).toBeDefined();
      expect(result?.gameStarted).toBe(true);
      expect(game.players.size).toBe(PLAYERS_COUNT_WHEN_FULL);
      expect(game.status).toBe(GAME_STATUS.playing);
    });

    it('same browserId replaces first player socket and returns same token', () => {
      const game = createGameWithOnePlayer('g1', 'old-socket', 'token-1', 'browser-A');
      gameRepository.set('g1', game);

      const result = service.joinGame('g1', 'new-socket', 'browser-A');

      expect(result).not.toBeNull();
      expect(result?.playerNumber).toBe(FIRST_PLAYER);
      expect(result?.playerToken).toBe('token-1');
      expect(result?.gameStarted).toBe(false);
      expect(result?.replacedSocketId).toBe('old-socket');
      expect(game.players.size).toBe(1);
      expect(game.players.get('new-socket')).toBe(FIRST_PLAYER);
      expect(game.players.has('old-socket')).toBe(false);
      expect(gameRepository.unregisterSocket).toHaveBeenCalledWith('old-socket');
      expect(gameRepository.registerSocket).toHaveBeenCalledWith('new-socket', 'g1', FIRST_PLAYER);
    });

    it('different browserId adds second player instead of replacing', () => {
      const game = createGameWithOnePlayer('g1', 'socket-1', 'token-1', 'browser-A');
      gameRepository.set('g1', game);

      const result = service.joinGame('g1', 'socket-2', 'browser-B');

      expect(result).not.toBeNull();
      expect(result?.playerNumber).toBe(SECOND_PLAYER);
      expect(result?.playerToken).not.toBe('token-1');
      expect(result?.gameStarted).toBe(true);
      expect(result?.replacedSocketId).toBeUndefined();
      expect(game.players.size).toBe(PLAYERS_COUNT_WHEN_FULL);
    });

    it('returns null when game not found', () => {
      expect(service.joinGame('missing', 'socket-1')).toBeNull();
    });

    it('returns null when game already full', () => {
      const game = createGameWithOnePlayer('g1', 'socket-1', 'token-1');
      game.players.set('socket-2', SECOND_PLAYER);
      game.playerTokens.set('token-2', SECOND_PLAYER);
      gameRepository.set('g1', game);

      expect(service.joinGame('g1', 'socket-3')).toBeNull();
    });
  });

  describe('cancelGame', () => {
    it('returns true and deletes game when creator cancels in waiting', () => {
      const game = createGameWithOnePlayer('g1', 'socket-1', 'token-1');
      gameRepository.set('g1', game);

      const result = service.cancelGame('g1', 'socket-1');

      expect(result).toBe(true);
      expect(gameRepository.delete).toHaveBeenCalledWith('g1');
    });

    it('returns false when game not found', () => {
      expect(service.cancelGame('missing', 'socket-1')).toBe(false);
      expect(gameRepository.delete).not.toHaveBeenCalled();
    });

    it('returns false when socket not in game', () => {
      const game = createGameWithOnePlayer('g1', 'socket-1', 'token-1');
      gameRepository.set('g1', game);

      expect(service.cancelGame('g1', 'other-socket')).toBe(false);
      expect(gameRepository.delete).not.toHaveBeenCalled();
    });

    it('returns false when game already playing', () => {
      const game = createGameWithOnePlayer('g1', 'socket-1', 'token-1');
      game.status = GAME_STATUS.playing;
      gameRepository.set('g1', game);

      expect(service.cancelGame('g1', 'socket-1')).toBe(false);
      expect(gameRepository.delete).not.toHaveBeenCalled();
    });
  });
});
