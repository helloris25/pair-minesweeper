import { Inject, Injectable } from '@nestjs/common';
import {
  Game,
  Cell,
  PlayerNumber,
  ClientCell,
  GameStatePayload,
  CellRevealedPayload,
  GameOverPayload,
  OpenCellResult,
  SurrenderResult,
  FIRST_PLAYER,
  SECOND_PLAYER,
  SocketId,
  PlayerToken,
  GAME_STATUS,
  GAME_OVER_REASON,
  ErrorCode,
  ERROR_CODE,
} from './interfaces/game.interface';
import { GameRepository, GAME_REPOSITORY } from './interfaces/game-repository.interface';
import { GameConfigService } from './config/game-config.service';
import { getMapKeyByValue } from './utils/map.util';
import { isCellInBounds } from './utils/board.util';

type SuccessValidationResult<T> = { valid: true; payload: T };
type ErrorValidationResult = { valid: false; error: ErrorCode };
type ValidationResult<TSuccessPayload> =
  | SuccessValidationResult<TSuccessPayload>
  | ErrorValidationResult;

@Injectable()
export class GameplayService {
  private onTurnTimeoutCallback: ((gameId: Game['id']) => void) | null = null;
  private stateCache = new Map<Game['id'], Map<SocketId, GameStatePayload>>();

  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    private readonly gameConfig: GameConfigService,
  ) {}

  setTurnTimeoutCallback(cb: (gameId: Game['id']) => void): void {
    this.onTurnTimeoutCallback = cb;
  }

  startGame(gameId: Game['id']): void {
    const game = this.gameRepository.get(gameId);
    if (game) {
      this.invalidateGameState(gameId);
      this.startTurnTimer(game);
    }
  }

  openCell(gameId: Game['id'], socketId: SocketId, row: number, col: number): OpenCellResult {
    const validationResult = this.validateOpenCell(
      this.gameRepository.get(gameId),
      socketId,
      row,
      col,
    );
    if (!validationResult.valid) {
      return { ok: false, error: validationResult.error };
    }

    const game = validationResult.payload;
    const playerNumber = game.players.get(socketId)!;
    const cellOpenResult = this.applyOpenCell(game, row, col, playerNumber);

    if (cellOpenResult.completed) {
      game.status = GAME_STATUS.finished;

      this.clearTurnTimer(game);
      this.invalidateGameState(gameId);

      const winner = this.getWinner(game);
      const revealed = this.buildRevealedPayload({
        game,
        row,
        col,
        cell: cellOpenResult.cell,
        extraTurn: cellOpenResult.extraTurn,
        turnStartedAt: null,
      });

      return {
        ok: true,
        revealed,
        gameOver: this.buildGameOverPayload(game.scores, winner, 'completed'),
      };
    }

    this.invalidateGameState(gameId);
    this.startTurnTimer(game);

    const revealed = this.buildRevealedPayload({
      game,
      row,
      col,
      cell: cellOpenResult.cell,
      extraTurn: cellOpenResult.extraTurn,
      turnStartedAt: game.turnStartedAt,
    });

    return { ok: true, revealed };
  }

  surrenderGame(gameId: Game['id'], socketId: SocketId): SurrenderResult {
    const validation = this.validateGameAndPlayer(this.gameRepository.get(gameId), socketId, {
      requirePlaying: true,
    });
    if (!validation.valid) {
      return { ok: false, error: validation.error };
    }

    const { game, playerNumber } = validation.payload;
    game.status = GAME_STATUS.finished;

    this.clearTurnTimer(game);
    this.invalidateGameState(gameId);

    const winner = this.getOtherPlayer(playerNumber);

    return {
      ok: true,
      payload: this.buildGameOverPayload(game.scores, winner, GAME_OVER_REASON.surrender),
    };
  }

  handleTimeout(gameId: Game['id']): GameOverPayload | null {
    const game = this.gameRepository.get(gameId);
    const isGameMissingOrNotPlaying = !game || game.status !== GAME_STATUS.playing;

    if (isGameMissingOrNotPlaying) {
      return null;
    }

    game.status = GAME_STATUS.finished;

    this.clearTurnTimer(game);
    this.invalidateGameState(gameId);

    const loser = game.currentTurn;
    const winner = this.getOtherPlayer(loser);

    return this.buildGameOverPayload(game.scores, winner, GAME_OVER_REASON.timeout);
  }

  getStateForPlayer(gameId: Game['id'], socketId: SocketId): GameStatePayload | null {
    const game = this.gameRepository.get(gameId);
    if (!game) {
      this.stateCache.delete(gameId);
      return null;
    }

    const playerNumber = game.players.get(socketId);
    if (!playerNumber) {
      return null;
    }

    const cachedState = this.stateCache.get(gameId)?.get(socketId);
    if (cachedState) {
      return cachedState;
    }

    const playerToken = this.getPlayerToken(game, playerNumber);
    if (!playerToken) {
      return null;
    }

    const payload: GameStatePayload = {
      gameId: game.id,
      gridSize: game.gridSize,
      diamondsCount: game.diamondsCount,
      turnTimeSeconds: game.turnTimeSeconds,
      board: game.board.map((row) => row.map((cell) => this.convertCellToClient(cell))),
      currentTurn: game.currentTurn,
      scores: { ...game.scores },
      status: game.status,
      playerNumber,
      playerToken,
      diamondsFound: game.diamondsFound,
      turnStartedAt: game.turnStartedAt,
    };

    let gameStateCache = this.stateCache.get(gameId);
    if (!gameStateCache) {
      gameStateCache = new Map();
      this.stateCache.set(gameId, gameStateCache);
    }

    gameStateCache.set(socketId, payload);

    return payload;
  }

  private invalidateGameState(gameId: Game['id']): void {
    this.stateCache.delete(gameId);
  }

  private startTurnTimer(game: Game): void {
    this.clearTurnTimer(game);

    game.turnTimeRemainingMs = null;
    game.turnStartedAt = Date.now();
    const turnTimeMs = game.turnTimeSeconds * this.gameConfig.getConfig().msPerSecond;

    game.turnTimer = setTimeout(() => {
      if (this.onTurnTimeoutCallback) {
        this.onTurnTimeoutCallback(game.id);
      }
    }, turnTimeMs);
  }

  private clearTurnTimer(game: Game): void {
    if (game.turnTimer) {
      clearTimeout(game.turnTimer);
      game.turnTimer = null;
    }

    game.turnStartedAt = null;
    game.turnTimeRemainingMs = null;
  }

  private validateGameAndPlayer(
    game: Game | undefined,
    socketId: SocketId,
    options: { requirePlaying: boolean },
  ): ValidationResult<{ game: Game; playerNumber: PlayerNumber }> {
    if (!game) {
      return { valid: false, error: ERROR_CODE.GAME_NOT_FOUND };
    }

    if (options.requirePlaying && game.status !== GAME_STATUS.playing) {
      return { valid: false, error: ERROR_CODE.GAME_NOT_IN_PROGRESS };
    }

    const playerNumber = game.players.get(socketId);
    if (!playerNumber) {
      return { valid: false, error: ERROR_CODE.NOT_IN_GAME };
    }

    return { valid: true, payload: { game, playerNumber } };
  }

  private validateOpenCell(
    game: Game | undefined,
    socketId: SocketId,
    row: CellRevealedPayload['row'],
    col: CellRevealedPayload['col'],
  ): ValidationResult<Game> {
    const validationResult = this.validateGameAndPlayer(game, socketId, { requirePlaying: true });
    if (!validationResult.valid) {
      return validationResult;
    }

    const { game: currentGame, playerNumber } = validationResult.payload;
    if (playerNumber !== currentGame.currentTurn) {
      return { valid: false, error: ERROR_CODE.NOT_YOUR_TURN };
    }

    if (!isCellInBounds(currentGame.gridSize, row, col)) {
      return { valid: false, error: ERROR_CODE.INVALID_CELL };
    }

    const cell = currentGame.board[row][col];
    if (cell.revealed) {
      return { valid: false, error: ERROR_CODE.CELL_ALREADY_REVEALED };
    }

    return { valid: true, payload: currentGame };
  }

  private applyOpenCell(
    game: Game,
    row: CellRevealedPayload['row'],
    col: CellRevealedPayload['col'],
    playerNumber: PlayerNumber,
  ): { extraTurn: boolean; completed: boolean; cell: Cell } {
    const cell = game.board[row][col];
    cell.revealed = true;
    cell.revealedBy = playerNumber;

    const extraTurn = cell.hasDiamond;
    if (cell.hasDiamond) {
      game.scores[playerNumber]++;
      game.diamondsFound++;
    } else {
      game.currentTurn = this.getOtherPlayer(playerNumber);
    }

    const completed = game.diamondsFound === game.diamondsCount;

    return { extraTurn, completed, cell };
  }

  private getWinner(game: Game): PlayerNumber | null {
    if (game.scores[FIRST_PLAYER] > game.scores[SECOND_PLAYER]) {
      return FIRST_PLAYER;
    }

    if (game.scores[SECOND_PLAYER] > game.scores[FIRST_PLAYER]) {
      return SECOND_PLAYER;
    }

    return null;
  }

  private getOtherPlayer(playerNumber: PlayerNumber): PlayerNumber {
    return playerNumber === FIRST_PLAYER ? SECOND_PLAYER : FIRST_PLAYER;
  }

  private convertCellToClient(cell: Cell): ClientCell {
    if (!cell.revealed) {
      return { revealed: false };
    }

    return {
      revealed: true,
      hasDiamond: cell.hasDiamond,
      adjacentDiamonds: cell.adjacentDiamonds,
      revealedBy: cell.revealedBy,
    };
  }

  private buildRevealedPayload(params: {
    game: Game;
    row: CellRevealedPayload['row'];
    col: CellRevealedPayload['col'];
    cell: Cell;
    extraTurn: CellRevealedPayload['extraTurn'];
    turnStartedAt: Game['turnStartedAt'];
  }): CellRevealedPayload {
    const { game, row, col, cell, extraTurn, turnStartedAt } = params;

    return {
      row,
      col,
      cell: this.convertCellToClient(cell),
      currentTurn: game.currentTurn,
      scores: { ...game.scores },
      diamondsFound: game.diamondsFound,
      extraTurn,
      turnStartedAt,
    };
  }

  private buildGameOverPayload(
    scores: Game['scores'],
    winner: PlayerNumber | null,
    reason: GameOverPayload['reason'],
  ): GameOverPayload {
    return {
      scores: { ...scores },
      winner,
      reason,
    };
  }

  private getPlayerToken(game: Game, playerNumber: PlayerNumber): PlayerToken | null {
    const token = getMapKeyByValue(game.playerTokens, playerNumber);

    return token ?? null;
  }
}
