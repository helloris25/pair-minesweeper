/**
 * Returns true if (row, col) is inside the grid [0, gridSize) x [0, gridSize).
 */
export function isCellInBounds(gridSize: number, row: number, col: number): boolean {
  return row >= 0 && row < gridSize && col >= 0 && col < gridSize;
}
