import { IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class GameJoinDto {
  @IsString()
  @IsNotEmpty()
  gameId!: string;

  @IsOptional()
  @IsString()
  browserId?: string;
}
