import { Cell, Game } from './game.interface';

export const BOARD_GENERATOR = Symbol('BOARD_GENERATOR');

export interface IBoardGenerator {
  generateBoard(gridSize: Game['gridSize'], diamondsCount: Game['diamondsCount']): Cell[][];
}
