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
} from './interfaces/game.interface';
import { GameRepository, GAME_REPOSITORY } from './interfaces/game-repository.interface';
import { GameConfigService } from './config/game-config.service';

@Injectable()
export class GameplayService {
  private onTurnTimeoutCallback: ((gameId: Game['id']) => void) | null = null;

  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    private readonly gameConfig: GameConfigService,
  ) {}

  setOnTurnTimeout(cb: (gameId: Game['id']) => void): void {
    this.onTurnTimeoutCallback = cb;
  }

  /** Starts the turn timer for a game (called when both players have joined). */
  startGame(gameId: Game['id']): void {
    const game = this.gameRepository.get(gameId);
    if (game) {
      this.startTurnTimer(game);
    }
  }

  /** Reveals a cell; returns success payload(s) or error. */
  openCell(gameId: Game['id'], socketId: SocketId, row: number, col: number): OpenCellResult {
    const validation = this.validateOpenCell(this.gameRepository.get(gameId), socketId, row, col);
    if (!validation.valid) {
      return { ok: false, error: validation.error };
    }

    const game = validation.game;
    const playerNumber = game.players.get(socketId)!;
    const applied = this.applyOpenCell(game, row, col, playerNumber);

    if (applied.completed) {
      game.status = GAME_STATUS.finished;
      this.clearTurnTimer(game);
      const winner = this.determineWinner(game);
      const revealed = this.buildRevealedPayload({
        game,
        row,
        col,
        cell: applied.cell,
        extraTurn: applied.extraTurn,
        turnStartedAt: null,
      });
      return {
        ok: true,
        revealed,
        gameOver: this.buildGameOverPayload(game.scores, winner, 'completed'),
      };
    }

    this.startTurnTimer(game);
    const revealed = this.buildRevealedPayload({
      game,
      row,
      col,
      cell: applied.cell,
      extraTurn: applied.extraTurn,
      turnStartedAt: game.turnStartedAt,
    });
    return { ok: true, revealed };
  }

  /** Surrenders the current player; returns game over payload or error. */
  surrenderGame(gameId: Game['id'], socketId: SocketId): SurrenderResult {
    const game = this.gameRepository.get(gameId);
    if (!game) {
      return { ok: false, error: 'Game not found' };
    }
    if (game.status !== GAME_STATUS.playing) {
      return { ok: false, error: 'Game is not in progress' };
    }

    const playerNumber = game.players.get(socketId);
    if (!playerNumber) {
      return { ok: false, error: 'You are not in this game' };
    }

    game.status = GAME_STATUS.finished;
    this.clearTurnTimer(game);
    const winner = this.otherPlayer(playerNumber);

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
    const loser = game.currentTurn;
    const winner = this.otherPlayer(loser);

    return this.buildGameOverPayload(game.scores, winner, GAME_OVER_REASON.timeout);
  }

  /** Called when the reconnect timeout expires; marks the disconnected player as forfeit. */
  forfeitDisconnectedPlayer(
    gameId: Game['id'],
    playerNumber: PlayerNumber,
  ): GameOverPayload | null {
    const game = this.gameRepository.get(gameId);
    const isGameMissingOrNotPlaying = !game || game.status !== GAME_STATUS.playing;
    if (isGameMissingOrNotPlaying) {
      return null;
    }

    for (const playerNum of game.players.values()) {
      if (playerNum === playerNumber) {
        return null;
      }
    }

    game.status = GAME_STATUS.finished;
    this.clearTurnTimer(game);
    const winner = this.otherPlayer(playerNumber);
    return this.buildGameOverPayload(game.scores, winner, GAME_OVER_REASON.surrender);
  }

  /** Returns sanitized game state for a player. */
  getStateForPlayer(gameId: Game['id'], socketId: SocketId): GameStatePayload | null {
    const game = this.gameRepository.get(gameId);
    if (!game) {
      return null;
    }

    const playerNumber = game.players.get(socketId);
    if (!playerNumber) {
      return null;
    }

    const playerToken = this.getTokenForPlayer(game, playerNumber);
    if (!playerToken) {
      return null;
    }

    return {
      gameId: game.id,
      gridSize: game.gridSize,
      diamondsCount: game.diamondsCount,
      turnTimeSeconds: game.turnTimeSeconds,
      board: game.board.map((row) => row.map((cell) => this.toClientCell(cell))),
      currentTurn: game.currentTurn,
      scores: { ...game.scores },
      status: game.status,
      playerNumber,
      playerToken,
      diamondsFound: game.diamondsFound,
      turnStartedAt: game.turnStartedAt,
    };
  }

  // --- Turn timer ---

  private startTurnTimer(game: Game): void {
    this.clearTurnTimer(game);
    game.turnTimeRemainingMs = null;
    game.turnStartedAt = Date.now();
    game.turnTimer = setTimeout(() => {
      if (this.onTurnTimeoutCallback) {
        this.onTurnTimeoutCallback(game.id);
      }
    }, game.turnTimeSeconds * this.gameConfig.get().msPerSecond);
  }

  private clearTurnTimer(game: Game): void {
    if (game.turnTimer) {
      clearTimeout(game.turnTimer);
      game.turnTimer = null;
    }
    game.turnStartedAt = null;
    game.turnTimeRemainingMs = null;
  }

  // --- Game rules ---

  private validateOpenCell(
    game: Game | undefined,
    socketId: SocketId,
    row: CellRevealedPayload['row'],
    col: CellRevealedPayload['col'],
  ): { valid: true; game: Game } | { valid: false; error: string } {
    if (!game) {
      return { valid: false, error: 'Game not found' };
    }

    if (game.status !== GAME_STATUS.playing) {
      return { valid: false, error: 'Game is not in progress' };
    }

    const playerNumber = game.players.get(socketId);
    if (!playerNumber) {
      return { valid: false, error: 'You are not in this game' };
    }
    if (playerNumber !== game.currentTurn) {
      return { valid: false, error: 'Not your turn' };
    }

    const isCellOutOfBounds = row < 0 || row >= game.gridSize || col < 0 || col >= game.gridSize;
    if (isCellOutOfBounds) {
      return { valid: false, error: 'Invalid cell coordinates' };
    }

    const cell = game.board[row][col];
    if (cell.revealed) {
      return { valid: false, error: 'Cell already revealed' };
    }

    return { valid: true, game };
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
      game.currentTurn = this.otherPlayer(playerNumber);
    }

    const completed = game.diamondsFound === game.diamondsCount;
    return { extraTurn, completed, cell };
  }

  private determineWinner(game: Game): PlayerNumber | null {
    if (game.scores[FIRST_PLAYER] > game.scores[SECOND_PLAYER]) {
      return FIRST_PLAYER;
    }
    if (game.scores[SECOND_PLAYER] > game.scores[FIRST_PLAYER]) {
      return SECOND_PLAYER;
    }
    return null;
  }

  private otherPlayer(playerNumber: PlayerNumber): PlayerNumber {
    return playerNumber === FIRST_PLAYER ? SECOND_PLAYER : FIRST_PLAYER;
  }

  // --- Payload builders ---

  private toClientCell(cell: Cell): ClientCell {
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
      cell: this.toClientCell(cell),
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

  private getTokenForPlayer(game: Game, playerNumber: PlayerNumber): PlayerToken | null {
    for (const [token, playerNum] of game.playerTokens) {
      if (playerNum === playerNumber) {
        return token;
      }
    }
    return null;
  }
}
