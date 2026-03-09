import { IsInt, Min, Max } from 'class-validator';
import { GAME_CONFIG_DEFAULTS } from '../config/game-config.interface';

export class CreateGameDto {
  @IsInt()
  @Min(GAME_CONFIG_DEFAULTS.gridSizeMin)
  @Max(GAME_CONFIG_DEFAULTS.gridSizeMax)
  gridSize!: number;

  @IsInt()
  @Min(GAME_CONFIG_DEFAULTS.diamondsCountMin)
  diamondsCount!: number;

  @IsInt()
  @Min(GAME_CONFIG_DEFAULTS.turnTimeSecondsMin)
  @Max(GAME_CONFIG_DEFAULTS.turnTimeSecondsMax)
  turnTimeSeconds!: number;
}
