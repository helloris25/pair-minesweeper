import { IsNotEmpty, IsString } from 'class-validator';

export class GameRejoinDto {
  @IsString()
  @IsNotEmpty()
  gameId!: string;

  @IsString()
  @IsNotEmpty()
  playerToken!: string;
}
