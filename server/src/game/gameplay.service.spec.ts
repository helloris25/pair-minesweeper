import { Test, TestingModule } from '@nestjs/testing';
import { GameplayService } from './gameplay.service';
import { GAME_REPOSITORY } from './interfaces/game-repository.interface';
import { GameConfigService } from './config/game-config.service';
import {
  Game,
  Cell,
  FIRST_PLAYER,
  SECOND_PLAYER,
  GAME_STATUS,
  ERROR_CODE,
  GAME_OVER_REASON,
  SocketId,
  PlayerNumber,
  PlayerToken,
} from './interfaces/game.interface';

function createPlayingGame(overrides: {
  gameId?: string;
  socket1?: SocketId;
  socket2?: SocketId;
  currentTurn?: PlayerNumber;
  board?: Cell[][];
  diamondsFound?: number;
}): Game {
  const gameId = overrides.gameId ?? 'game-1';
  const socket1: SocketId = overrides.socket1 ?? 'socket-1';
  const socket2: SocketId = overrides.socket2 ?? 'socket-2';
  const token1: PlayerToken = 'token-1';
  const token2: PlayerToken = 'token-2';

  const board: Cell[][] = overrides.board ?? [
    [
      { hasDiamond: false, adjacentDiamonds: 1, revealed: false },
      { hasDiamond: true, adjacentDiamonds: 0, revealed: false },
    ],
    [
      { hasDiamond: false, adjacentDiamonds: 1, revealed: false },
      { hasDiamond: false, adjacentDiamonds: 1, revealed: false },
    ],
  ];

  const game: Game = {
    id: gameId,
    gridSize: 2,
    diamondsCount: 1,
    turnTimeSeconds: 30,
    board,
    players: new Map([
      [socket1, FIRST_PLAYER],
      [socket2, SECOND_PLAYER],
    ]),
    playerTokens: new Map([
      [token1, FIRST_PLAYER],
      [token2, SECOND_PLAYER],
    ]),
    currentTurn: overrides.currentTurn ?? FIRST_PLAYER,
    scores: { [FIRST_PLAYER]: 0, [SECOND_PLAYER]: 0 },
    status: GAME_STATUS.playing,
    diamondsFound: overrides.diamondsFound ?? 0,
    createdAt: new Date(),
    turnStartedAt: Date.now(),
    turnTimer: null,
    turnTimeRemainingMs: null,
  };

  return game;
}

let service: GameplayService;
let gameRepository: {
  get: jest.Mock;
  set: jest.Mock;
  delete: jest.Mock;
  getEntries: jest.Mock;
  findGameAndPlayerBySocketId: jest.Mock;
  registerSocket: jest.Mock;
  unregisterSocket: jest.Mock;
};

beforeEach(() => {
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

beforeEach(async () => {
  gameRepository = {
    get: jest.fn(),
    set: jest.fn(),
    delete: jest.fn(),
    getEntries: jest.fn(() => []),
    findGameAndPlayerBySocketId: jest.fn(),
    registerSocket: jest.fn(),
    unregisterSocket: jest.fn(),
  };

  const module: TestingModule = await Test.createTestingModule({
    providers: [
      GameplayService,
      { provide: GAME_REPOSITORY, useValue: gameRepository },
      {
        provide: GameConfigService,
        useValue: { getConfig: () => ({ msPerSecond: 1000 }) },
      },
    ],
  }).compile();

  service = module.get(GameplayService);
});

describe('GameplayService — openCell validation', () => {
  it('returns INVALID_CELL when row/col are out of bounds', () => {
    const game = createPlayingGame({ gameId: 'g1' });
    gameRepository.get.mockReturnValue(game);
    const colOutOfBounds = 2; // grid is 2x2, valid cols are 0 and 1

    expect(service.openCell('g1', 'socket-1', 0, colOutOfBounds)).toEqual({
      ok: false,
      error: ERROR_CODE.INVALID_CELL,
    });
    expect(service.openCell('g1', 'socket-1', -1, 0)).toEqual({
      ok: false,
      error: ERROR_CODE.INVALID_CELL,
    });
  });

  it('returns GAME_NOT_FOUND when game is missing', () => {
    gameRepository.get.mockReturnValue(undefined);

    const result = service.openCell('missing', 'socket-1', 0, 0);
    expect(result).toEqual({ ok: false, error: ERROR_CODE.GAME_NOT_FOUND });
  });

  it('returns GAME_NOT_IN_PROGRESS when game is not playing', () => {
    const game = createPlayingGame({ gameId: 'g1' });
    game.status = GAME_STATUS.waiting;
    gameRepository.get.mockReturnValue(game);

    expect(service.openCell('g1', 'socket-1', 0, 0)).toEqual({
      ok: false,
      error: ERROR_CODE.GAME_NOT_IN_PROGRESS,
    });
  });

  it('returns NOT_IN_GAME when socket is not in the game', () => {
    const game = createPlayingGame({ gameId: 'g1' });
    gameRepository.get.mockReturnValue(game);

    expect(service.openCell('g1', 'unknown-socket', 0, 0)).toEqual({
      ok: false,
      error: ERROR_CODE.NOT_IN_GAME,
    });
  });

  it('returns NOT_YOUR_TURN when another player should move', () => {
    const game = createPlayingGame({ gameId: 'g1', currentTurn: SECOND_PLAYER });
    gameRepository.get.mockReturnValue(game);

    expect(service.openCell('g1', 'socket-1', 0, 0)).toEqual({
      ok: false,
      error: ERROR_CODE.NOT_YOUR_TURN,
    });
  });

  it('returns CELL_ALREADY_REVEALED when cell is already open', () => {
    const game = createPlayingGame({ gameId: 'g1' });
    game.board[0][0].revealed = true;
    gameRepository.get.mockReturnValue(game);

    expect(service.openCell('g1', 'socket-1', 0, 0)).toEqual({
      ok: false,
      error: ERROR_CODE.CELL_ALREADY_REVEALED,
    });
  });
});

describe('openCell — mechanics', () => {
  it('opening empty cell: no score change, turn switches, extraTurn false', () => {
    const game = createPlayingGame({ gameId: 'g1', currentTurn: FIRST_PLAYER });
    gameRepository.get.mockReturnValue(game);

    const result = service.openCell('g1', 'socket-1', 0, 0);
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) {
      return;
    }
    expect(result.revealed.extraTurn).toBe(false);
    expect(result.gameOver).toBeUndefined();

    expect(game.scores[FIRST_PLAYER]).toBe(0);
    expect(game.currentTurn).toBe(SECOND_PLAYER);
    expect(game.board[0][0].revealed).toBe(true);
    expect(game.board[0][0].revealedBy).toBe(FIRST_PLAYER);
  });

  it('opening diamond: score +1, extra turn, extraTurn true', () => {
    const game = createPlayingGame({ gameId: 'g1', currentTurn: FIRST_PLAYER });
    gameRepository.get.mockReturnValue(game);

    const result = service.openCell('g1', 'socket-1', 0, 1);
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) {
      return;
    }
    expect(result.revealed.extraTurn).toBe(true);
    expect(result.revealed.scores[FIRST_PLAYER]).toBe(1);
    expect(result.revealed.diamondsFound).toBe(1);

    expect(game.scores[FIRST_PLAYER]).toBe(1);
    expect(game.diamondsFound).toBe(1);
    expect(game.currentTurn).toBe(FIRST_PLAYER);
  });

  it('opening last diamond: game finishes with gameOver completed', () => {
    const game = createPlayingGame({
      gameId: 'g1',
      currentTurn: FIRST_PLAYER,
      diamondsFound: 0,
      board: [
        [
          { hasDiamond: true, adjacentDiamonds: 0, revealed: false },
          { hasDiamond: false, adjacentDiamonds: 1, revealed: false },
        ],
        [
          { hasDiamond: false, adjacentDiamonds: 1, revealed: false },
          { hasDiamond: false, adjacentDiamonds: 1, revealed: false },
        ],
      ],
    });
    game.diamondsCount = 1;
    gameRepository.get.mockReturnValue(game);

    const result = service.openCell('g1', 'socket-1', 0, 0);
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) {
      return;
    }
    expect(result.gameOver).toBeDefined();
    expect(result.gameOver?.winner).toBe(FIRST_PLAYER);
    expect(result.gameOver?.reason).toBe(GAME_OVER_REASON.completed);
    expect(game.status).toBe(GAME_STATUS.finished);
  });
});

describe('GameplayService — surrenderGame', () => {
  it('finishes game with opponent as winner and reason surrender', () => {
    const game = createPlayingGame({ gameId: 'g1', currentTurn: FIRST_PLAYER });
    gameRepository.get.mockReturnValue(game);

    const result = service.surrenderGame('g1', 'socket-1');
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) {
      return;
    }
    expect(result.payload.winner).toBe(SECOND_PLAYER);
    expect(result.payload.reason).toBe(GAME_OVER_REASON.surrender);
    expect(game.status).toBe(GAME_STATUS.finished);
  });

  it('returns error when not in game or game not playing', () => {
    const game = createPlayingGame({ gameId: 'g1' });
    game.status = GAME_STATUS.waiting;
    gameRepository.get.mockReturnValue(game);

    expect(service.surrenderGame('g1', 'socket-1')).toEqual({
      ok: false,
      error: ERROR_CODE.GAME_NOT_IN_PROGRESS,
    });

    game.status = GAME_STATUS.playing;
    expect(service.surrenderGame('g1', 'unknown-socket')).toEqual({
      ok: false,
      error: ERROR_CODE.NOT_IN_GAME,
    });
  });
});

describe('GameplayService — handleTimeout', () => {
  it('finishes game with current turn player as loser, other as winner', () => {
    const game = createPlayingGame({ gameId: 'g1', currentTurn: SECOND_PLAYER });
    gameRepository.get.mockReturnValue(game);

    const payload = service.handleTimeout('g1');
    expect(payload).not.toBeNull();
    expect(payload?.winner).toBe(FIRST_PLAYER);
    expect(payload?.reason).toBe(GAME_OVER_REASON.timeout);
    expect(game.status).toBe(GAME_STATUS.finished);
  });

  it('returns null when game missing or not playing', () => {
    gameRepository.get.mockReturnValue(undefined);
    expect(service.handleTimeout('missing')).toBeNull();

    const game = createPlayingGame({ gameId: 'g1' });
    game.status = GAME_STATUS.finished;
    gameRepository.get.mockReturnValue(game);
    expect(service.handleTimeout('g1')).toBeNull();
  });
});

describe('GameplayService — handleDisconnectLoss', () => {
  it('finishes game with disconnected player as loser', () => {
    const game = createPlayingGame({ gameId: 'g1' });
    gameRepository.get.mockReturnValue(game);

    const payload = service.handleDisconnectLoss('g1', FIRST_PLAYER);
    expect(payload).not.toBeNull();
    expect(payload?.winner).toBe(SECOND_PLAYER);
    expect(payload?.reason).toBe(GAME_OVER_REASON.disconnect);
    expect(game.status).toBe(GAME_STATUS.finished);
  });

  it('returns null when game missing or not playing', () => {
    gameRepository.get.mockReturnValue(undefined);
    expect(service.handleDisconnectLoss('missing', FIRST_PLAYER)).toBeNull();

    const game = createPlayingGame({ gameId: 'g1' });
    game.status = GAME_STATUS.waiting;
    gameRepository.get.mockReturnValue(game);
    expect(service.handleDisconnectLoss('g1', FIRST_PLAYER)).toBeNull();
  });
});
