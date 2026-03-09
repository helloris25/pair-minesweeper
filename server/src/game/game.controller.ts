import { Controller, Get, Post, Body } from '@nestjs/common';
import { LobbyService } from './lobby.service';
import { GameGateway } from './game.gateway';
import { CreateGameDto } from './dto/create-game.dto';

@Controller('games')
export class GameController {
  constructor(
    private readonly lobbyService: LobbyService,
    private readonly gameGateway: GameGateway,
  ) {}

  @Get()
  list() {
    return this.lobbyService.listAvailableGames();
  }

  @Post()
  create(@Body() dto: CreateGameDto) {
    const game = this.lobbyService.createGame(dto.gridSize, dto.diamondsCount, dto.turnTimeSeconds);
    this.gameGateway.broadcastLobby();
    return { gameId: game.id };
  }
}
