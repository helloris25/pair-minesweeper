import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GameConfig, GAME_CONFIG_DEFAULTS } from './game-config.interface';

function parseIntegerFromEnv(value: string | undefined, fallback: number): number {
  if (value === undefined || value === '') {
    return fallback;
  }

  const parsedValue = Number.parseInt(value, 10);
  return Number.isNaN(parsedValue) ? fallback : parsedValue;
}

@Injectable()
export class GameConfigService {
  private readonly config: GameConfig;

  constructor(private readonly configService: ConfigService) {
    const defaults = GAME_CONFIG_DEFAULTS;

    this.config = {
      maxPlayers: parseIntegerFromEnv(
        this.configService.get<string>('GAME_MAX_PLAYERS'),
        defaults.maxPlayers,
      ),
      gameAgeMinutes: parseIntegerFromEnv(
        this.configService.get<string>('GAME_AGE_MINUTES'),
        defaults.gameAgeMinutes,
      ),
      lobbyRoom: this.configService.get<string>('GAME_LOBBY_ROOM') ?? defaults.lobbyRoom,
      gridSizeMin: parseIntegerFromEnv(
        this.configService.get<string>('GAME_GRID_SIZE_MIN'),
        defaults.gridSizeMin,
      ),
      gridSizeMax: parseIntegerFromEnv(
        this.configService.get<string>('GAME_GRID_SIZE_MAX'),
        defaults.gridSizeMax,
      ),
      diamondsCountMin: parseIntegerFromEnv(
        this.configService.get<string>('GAME_DIAMONDS_COUNT_MIN'),
        defaults.diamondsCountMin,
      ),
      turnTimeSecondsMin: parseIntegerFromEnv(
        this.configService.get<string>('GAME_TURN_TIME_SECONDS_MIN'),
        defaults.turnTimeSecondsMin,
      ),
      turnTimeSecondsMax: parseIntegerFromEnv(
        this.configService.get<string>('GAME_TURN_TIME_SECONDS_MAX'),
        defaults.turnTimeSecondsMax,
      ),
      msPerSecond: parseIntegerFromEnv(
        this.configService.get<string>('GAME_MS_PER_SECOND'),
        defaults.msPerSecond,
      ),
      disconnectLossSeconds: parseIntegerFromEnv(
        this.configService.get<string>('GAME_DISCONNECT_LOSS_SECONDS'),
        defaults.disconnectLossSeconds,
      ),
    };
  }

  getConfig(): GameConfig {
    return this.config;
  }

  get maxGameAgeMs(): number {
    const SECONDS_PER_MINUTE = 60;
    return this.config.gameAgeMinutes * SECONDS_PER_MINUTE * this.config.msPerSecond;
  }
}
