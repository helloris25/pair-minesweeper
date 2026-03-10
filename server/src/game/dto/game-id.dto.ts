import { IsNotEmpty, IsString } from 'class-validator';

export class GameIdDto {
  @IsString()
  @IsNotEmpty()
  gameId!: string;
}
