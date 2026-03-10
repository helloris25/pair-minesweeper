import { Injectable } from '@nestjs/common';
import { Cell, OpenedCellResultPayload, Game } from './interfaces/game.interface';
import { IBoardGenerator } from './interfaces/board-generator.interface';
import { isCellInBounds } from './utils/board.util';

// Смещения соседних ячеек в 8 направлениях (окружающие клетки по кресту и диагоналям)
// Используется для подсчёта количества алмазов рядом с данной клеткой при генерации поля
// Сделано, чтобы не писать 8 if-ов для проверки соседних клеток.
const NEIGHBOR_OFFSETS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
] as const;

@Injectable()
export class BoardGeneratorService implements IBoardGenerator {
  generateBoard(gridSize: Game['gridSize'], diamondsCount: Game['diamondsCount']): Cell[][] {
    const diamondIndices = this.getDiamondPositions(gridSize, diamondsCount);
    const board = this.buildBoard(gridSize, diamondIndices);

    this.fillNeighborDiamondsCount(board, gridSize);

    return board;
  }

  private buildBoard(gridSize: Game['gridSize'], diamondIndices: Set<number>): Cell[][] {
    const board: Cell[][] = [];

    // Тут норм использовать цикл в цикле, потому что размер доски фиксированный и небольшой. Чтобы не усложнять код, оставил так.
    for (let row = 0; row < gridSize; row++) {
      const boardRow: Cell[] = [];

      for (let col = 0; col < gridSize; col++) {
        boardRow.push({
          hasDiamond: diamondIndices.has(this.getCellIndex(gridSize, row, col)),
          adjacentDiamonds: 0,
          revealed: false,
        });
      }

      board.push(boardRow);
    }

    return board;
  }

  private getDiamondPositions(
    gridSize: Game['gridSize'],
    diamondsCount: Game['diamondsCount'],
  ): Set<number> {
    const totalCells = gridSize * gridSize;
    const indices = Array.from({ length: totalCells }, (_, index) => index);

    for (let index = indices.length - 1; index > 0; index--) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [indices[index], indices[swapIndex]] = [indices[swapIndex], indices[index]];
    }

    return new Set(indices.slice(0, diamondsCount));
  }

  private fillNeighborDiamondsCount(board: Cell[][], gridSize: Game['gridSize']): void {
    // Тут норм использовать цикл в цикле, потому что размер доски фиксированный и небольшой. Чтобы не усложнять код, оставил так.
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        if (board[row][col].hasDiamond) {
          continue;
        }

        board[row][col].adjacentDiamonds = this.countNeighborDiamonds(board, gridSize, row, col);
      }
    }
  }

  private countNeighborDiamonds(
    board: Cell[][],
    gridSize: Game['gridSize'],
    row: OpenedCellResultPayload['row'],
    col: OpenedCellResultPayload['col'],
  ): number {
    let count = 0;

    for (const [rowOffset, colOffset] of NEIGHBOR_OFFSETS) {
      const neighborRow = row + rowOffset;
      const neighborCol = col + colOffset;

      if (!isCellInBounds(gridSize, neighborRow, neighborCol)) {
        continue;
      }

      if (board[neighborRow][neighborCol].hasDiamond) {
        count++;
      }
    }

    return count;
  }

  private getCellIndex(
    gridSize: Game['gridSize'],
    row: OpenedCellResultPayload['row'],
    col: OpenedCellResultPayload['col'],
  ): number {
    return row * gridSize + col;
  }
}
