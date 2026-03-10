import { Test, TestingModule } from '@nestjs/testing';
import { BoardGeneratorService } from './board-generator.service';

type Cell = { hasDiamond: boolean };

function countDiamondNeighbors(
  board: Cell[][],
  gridSize: number,
  row: number,
  col: number,
): number {
  const offsets = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ];
  let count = 0;
  for (const [dr, dc] of offsets) {
    const nr = row + dr;
    const nc = col + dc;
    if (nr >= 0 && nr < gridSize && nc >= 0 && nc < gridSize && board[nr][nc].hasDiamond) {
      count++;
    }
  }
  return count;
}

let service: BoardGeneratorService;

beforeEach(async () => {
  const module: TestingModule = await Test.createTestingModule({
    providers: [BoardGeneratorService],
  }).compile();

  service = module.get(BoardGeneratorService);
});

describe('BoardGeneratorService — diamond count and revealed', () => {
  it('generates board with exact diamondsCount cells having hasDiamond true', () => {
    const gridSize = 4;
    const diamondsCount = 5;

    const board = service.generateBoard(gridSize, diamondsCount);

    let count = 0;
    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (board[r][c].hasDiamond) {
          count++;
        }
      }
    }
    expect(count).toBe(diamondsCount);
  });

  it('all cells have revealed false initially', () => {
    const gridSize = 3;
    const diamondsCount = 2;
    const board = service.generateBoard(gridSize, diamondsCount);

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        expect(board[r][c].revealed).toBe(false);
      }
    }
  });
});

describe('BoardGeneratorService — adjacentDiamonds', () => {
  it('non-diamond cells have adjacentDiamonds in 0..8 range', () => {
    const gridSize = 5;
    const diamondsCount = 3;
    const maxAdjacentNeighbors = 8;
    const board = service.generateBoard(gridSize, diamondsCount);

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        const cell = board[r][c];
        if (!cell.hasDiamond) {
          expect(cell.adjacentDiamonds).toBeGreaterThanOrEqual(0);
          expect(cell.adjacentDiamonds).toBeLessThanOrEqual(maxAdjacentNeighbors);
        }
      }
    }
  });

  it('diamond cells have adjacentDiamonds 0 (not used for diamonds but consistent)', () => {
    const gridSize = 3;
    const diamondsCount = 2;
    const board = service.generateBoard(gridSize, diamondsCount);

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (board[r][c].hasDiamond) {
          expect(board[r][c].adjacentDiamonds).toBe(0);
        }
      }
    }
  });

  it('each non-diamond cell adjacentDiamonds matches count of diamond neighbors', () => {
    const gridSize = 3;
    const diamondsCount = 2;
    const board = service.generateBoard(gridSize, diamondsCount);

    for (let r = 0; r < gridSize; r++) {
      for (let c = 0; c < gridSize; c++) {
        if (board[r][c].hasDiamond) {
          continue;
        }
        const expected = countDiamondNeighbors(board, gridSize, r, c);
        expect(board[r][c].adjacentDiamonds).toBe(expected);
      }
    }
  });
});
