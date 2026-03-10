import { Test, TestingModule } from '@nestjs/testing';
import { SessionService } from './session.service';
import { GAME_REPOSITORY } from './interfaces/game-repository.interface';
import {
  Game,
  Cell,
  FIRST_PLAYER,
  SECOND_PLAYER,
  GAME_STATUS,
  SocketId,
  PlayerToken,
} from './interfaces/game.interface';

function createGameWithTwoPlayers(params: {
  gameId: string;
  socket1: SocketId;
  socket2: SocketId;
  token1: PlayerToken;
  token2: PlayerToken;
}): Game {
  const { gameId, socket1, socket2, token1, token2 } = params;
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
    currentTurn: FIRST_PLAYER,
    scores: { [FIRST_PLAYER]: 0, [SECOND_PLAYER]: 0 },
    status: GAME_STATUS.playing,
    diamondsFound: 0,
    createdAt: new Date(),
    turnStartedAt: null,
    turnTimer: null,
    turnTimeRemainingMs: null,
  };
  return game;
}

type GameRepositoryMock = {
  get: jest.Mock;
  findGameAndPlayerBySocketId: jest.Mock;
  registerSocket: jest.Mock;
  unregisterSocket: jest.Mock;
};

function rejoinGameSuccessTests(
  getService: () => SessionService,
  getGameRepository: () => GameRepositoryMock,
) {
  it('binds new socket to player and returns playerNumber and replacedSocketId when old socket existed', () => {
    const service = getService();
    const gameRepository = getGameRepository();
    const game = createGameWithTwoPlayers({
      gameId: 'g1',
      socket1: 'old-socket',
      socket2: 'socket-2',
      token1: 'token-1',
      token2: 'token-2',
    });
    const games = new Map<string, Game>([['g1', game]]);
    gameRepository.get.mockImplementation((id: string) => games.get(id));

    const result = service.rejoinGame('g1', 'new-socket', 'token-1');

    expect(result).not.toBeNull();
    expect(result?.playerNumber).toBe(FIRST_PLAYER);
    expect(result?.replacedSocketId).toBe('old-socket');
    expect(game.players.has('old-socket')).toBe(false);
    expect(game.players.get('new-socket')).toBe(FIRST_PLAYER);
    expect(gameRepository.unregisterSocket).toHaveBeenCalledWith('old-socket');
    expect(gameRepository.registerSocket).toHaveBeenCalledWith('new-socket', 'g1', FIRST_PLAYER);
  });

  it('returns playerNumber without replacedSocketId when no previous socket', () => {
    const service = getService();
    const gameRepository = getGameRepository();
    const game = createGameWithTwoPlayers({
      gameId: 'g1',
      socket1: 'socket-1',
      socket2: 'socket-2',
      token1: 'token-1',
      token2: 'token-2',
    });
    game.players.delete('socket-1');
    gameRepository.get.mockReturnValue(game);

    const result = service.rejoinGame('g1', 'reconnecting-socket', 'token-1');

    expect(result).not.toBeNull();
    expect(result?.playerNumber).toBe(FIRST_PLAYER);
    expect(result?.replacedSocketId).toBeUndefined();
    expect(game.players.get('reconnecting-socket')).toBe(FIRST_PLAYER);
  });
}

function rejoinGameFailureTests(
  getService: () => SessionService,
  getGameRepository: () => GameRepositoryMock,
) {
  it('returns null when game not found', () => {
    const service = getService();
    const gameRepository = getGameRepository();
    gameRepository.get.mockReturnValue(undefined);

    expect(service.rejoinGame('missing', 'new-socket', 'token-1')).toBeNull();
  });

  it('returns null when token invalid or not in game', () => {
    const service = getService();
    const gameRepository = getGameRepository();
    const game = createGameWithTwoPlayers({
      gameId: 'g1',
      socket1: 'socket-1',
      socket2: 'socket-2',
      token1: 'token-1',
      token2: 'token-2',
    });
    gameRepository.get.mockReturnValue(game);

    expect(service.rejoinGame('g1', 'new-socket', 'wrong-token')).toBeNull();
    expect(service.rejoinGame('g1', 'new-socket', 'token-2')).not.toBeNull();
  });
}

function handlePlayerDisconnectTests(
  getService: () => SessionService,
  getGameRepository: () => GameRepositoryMock,
) {
  it('removes socket from game and returns gameId and playerNumber', () => {
    const service = getService();
    const gameRepository = getGameRepository();
    const game = createGameWithTwoPlayers({
      gameId: 'g1',
      socket1: 'socket-1',
      socket2: 'socket-2',
      token1: 'token-1',
      token2: 'token-2',
    });
    gameRepository.findGameAndPlayerBySocketId.mockReturnValue({
      gameId: 'g1',
      game,
      playerNumber: FIRST_PLAYER,
    });

    const result = service.handlePlayerDisconnect('socket-1');

    expect(result).not.toBeNull();
    expect(result?.gameId).toBe('g1');
    expect(result?.playerNumber).toBe(FIRST_PLAYER);
    expect(game.players.has('socket-1')).toBe(false);
    expect(gameRepository.unregisterSocket).toHaveBeenCalledWith('socket-1');
  });

  it('returns null when socket not in any game', () => {
    const service = getService();
    const gameRepository = getGameRepository();
    gameRepository.findGameAndPlayerBySocketId.mockReturnValue(null);

    expect(service.handlePlayerDisconnect('unknown-socket')).toBeNull();
    expect(gameRepository.unregisterSocket).not.toHaveBeenCalled();
  });
}

describe('SessionService', () => {
  let service: SessionService;
  let gameRepository: GameRepositoryMock;

  beforeEach(async () => {
    const games = new Map<string, Game>();

    gameRepository = {
      get: jest.fn((id: string) => games.get(id)),
      findGameAndPlayerBySocketId: jest.fn((socketId: SocketId) => {
        for (const [gameId, game] of games) {
          const playerNumber = game.players.get(socketId);
          if (playerNumber !== undefined) {
            return { gameId, game, playerNumber };
          }
        }
        return null;
      }),
      registerSocket: jest.fn(),
      unregisterSocket: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [SessionService, { provide: GAME_REPOSITORY, useValue: gameRepository }],
    }).compile();

    service = module.get(SessionService);

    games.clear();
    gameRepository.get.mockImplementation((id: string) => games.get(id));
  });

  describe('rejoinGame', () => {
    rejoinGameSuccessTests(
      () => service,
      () => gameRepository,
    );
    rejoinGameFailureTests(
      () => service,
      () => gameRepository,
    );
  });

  describe('handlePlayerDisconnect', () => {
    handlePlayerDisconnectTests(
      () => service,
      () => gameRepository,
    );
  });
});
