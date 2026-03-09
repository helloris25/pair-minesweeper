import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GameConfig, GAME_CONFIG_DEFAULTS } from './game-config.interface';

function parseIntEnv(value: string | undefined, fallback: number): number {
  if (value === undefined || value === '') {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

@Injectable()
export class GameConfigService {
  private readonly config: GameConfig;

  constructor(private readonly configService: ConfigService) {
    const defaults = GAME_CONFIG_DEFAULTS;

    this.config = {
      maxPlayers: parseIntEnv(
        this.configService.get<string>('GAME_MAX_PLAYERS'),
        defaults.maxPlayers,
      ),
      gameAgeMinutes: parseIntEnv(
        this.configService.get<string>('GAME_AGE_MINUTES'),
        defaults.gameAgeMinutes,
      ),
      reconnectTimeoutMs: parseIntEnv(
        this.configService.get<string>('GAME_RECONNECT_TIMEOUT_MS'),
        defaults.reconnectTimeoutMs,
      ),
      lobbyRoom: this.configService.get<string>('GAME_LOBBY_ROOM') ?? defaults.lobbyRoom,
      gridSizeMin: parseIntEnv(
        this.configService.get<string>('GAME_GRID_SIZE_MIN'),
        defaults.gridSizeMin,
      ),
      gridSizeMax: parseIntEnv(
        this.configService.get<string>('GAME_GRID_SIZE_MAX'),
        defaults.gridSizeMax,
      ),
      diamondsCountMin: parseIntEnv(
        this.configService.get<string>('GAME_DIAMONDS_COUNT_MIN'),
        defaults.diamondsCountMin,
      ),
      turnTimeSecondsMin: parseIntEnv(
        this.configService.get<string>('GAME_TURN_TIME_SECONDS_MIN'),
        defaults.turnTimeSecondsMin,
      ),
      turnTimeSecondsMax: parseIntEnv(
        this.configService.get<string>('GAME_TURN_TIME_SECONDS_MAX'),
        defaults.turnTimeSecondsMax,
      ),
      msPerSecond: parseIntEnv(
        this.configService.get<string>('GAME_MS_PER_SECOND'),
        defaults.msPerSecond,
      ),
    };
  }

  get(): GameConfig {
    return this.config;
  }

  get maxGameAgeMs(): number {
    const SECONDS_PER_MINUTE = 60;
    return this.config.gameAgeMinutes * SECONDS_PER_MINUTE * this.config.msPerSecond;
  }
}
