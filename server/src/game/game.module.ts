import { Module } from '@nestjs/common';
import { GameController } from './game.controller';
import { LobbyService } from './lobby.service';
import { SessionService } from './session.service';
import { GameplayService } from './gameplay.service';
import { GameGateway } from './game.gateway';
import { BoardGeneratorService } from './board-generator.service';
import { GameRepositoryService } from './game-repository.service';
import { GameConfigService } from './config/game-config.service';
import { GAME_REPOSITORY } from './interfaces/game-repository.interface';
import { BOARD_GENERATOR } from './interfaces/board-generator.interface';

@Module({
  controllers: [GameController],
  providers: [
    { provide: GAME_REPOSITORY, useClass: GameRepositoryService },
    { provide: BOARD_GENERATOR, useClass: BoardGeneratorService },
    GameConfigService,
    LobbyService,
    SessionService,
    GameplayService,
    GameGateway,
  ],
})
export class GameModule {}
