import { IsInt, Min, Max, IsString, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';
import { GAME_CONFIG_DEFAULTS } from '../config/game-config.interface';

function truncateToInt(value: unknown): number {
  return Math.trunc(Number(value));
}

export class GameOpenDto {
  @IsString()
  @IsNotEmpty()
  gameId!: string;

  @Transform(({ value }) => truncateToInt(value))
  @IsInt()
  @Min(0)
  @Max(GAME_CONFIG_DEFAULTS.gridSizeMax - 1)
  row!: number;

  @Transform(({ value }) => truncateToInt(value))
  @IsInt()
  @Min(0)
  @Max(GAME_CONFIG_DEFAULTS.gridSizeMax - 1)
  col!: number;
}
