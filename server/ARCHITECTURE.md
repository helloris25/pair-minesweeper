# Архитектура сервера

## Обзор

Сервер реализован на **NestJS** и решает задачу real-time multiplayer игры с WebSocket-коммуникацией. Основные технические вызовы:

- Пошаговая механика с таймером хода
- Два игрока на одну партию с корректной синхронизацией состояния
- Переподключение игрока без потери сессии
- Лобби с live-обновлением списка доступных игр

Весь игровой функционал сосредоточен в одном NestJS-модуле — `GameModule`.

## Структура модуля

```
server/src/
├── main.ts                         — Bootstrap, CORS, ValidationPipe
├── app.module.ts                   — Root module (ConfigModule + GameModule)
└── game/
    ├── game.module.ts              — Wiring сервисов и провайдеров
    ├── game.controller.ts          — REST: POST /games, GET /games
    ├── game.gateway.ts             — WebSocket gateway (точка входа всех WS-событий)
    ├── lobby.service.ts            — Создание, поиск, присоединение к играм
    ├── session.service.ts          — Реконнект и обработка дисконнектов
    ├── gameplay.service.ts         — Игровая логика: ходы, таймеры, surrender
    ├── board-generator.service.ts  — Генерация поля (Fisher-Yates)
    ├── game-repository.service.ts  — In-memory хранилище игр (Map)
    ├── dto/
    │   └── create-game.dto.ts      — Валидация параметров создания игры
    ├── config/
    │   ├── game-config.interface.ts — Типы и дефолты конфигурации
    │   └── game-config.service.ts  — Чтение env-переменных
    └── interfaces/
        ├── game.interface.ts       — Все типы: Game, Cell, Payloads, Results
        ├── game-events.interface.ts — Имена WS-событий, типизация emit/on
        ├── game-repository.interface.ts  — Контракт хранилища
        └── board-generator.interface.ts  — Контракт генератора поля
```

## Сервисы и их ответственность

### GameGateway

**Роль:** WebSocket-контроллер. Единственный слой, который знает о Socket.IO.

Принимает все входящие WS-события (`game:join`, `game:open`, `game:surrender` и т.д.), делегирует бизнес-логику сервисам и транслирует результат обратно клиентам через `server.to(room).emit(...)`.

Также реализует `OnGatewayDisconnect` — обрабатывает отключения игроков.

Gateway не содержит бизнес-логики — только маршрутизацию, валидацию на уровне "есть ли игра / можно ли в неё войти", и трансляцию ошибок в коды (`ErrorCode`).

### GameController

**Роль:** REST API для действий, не требующих WebSocket.

Два эндпоинта:
- `POST /games` — создание новой игры (используется до подключения к WS)
- `GET /games` — список доступных игр (для начального рендера, до подписки на лобби)

Создание игры вынесено в REST, потому что это одноразовый запрос-ответ, не требующий двусторонней связи. После создания клиент получает `gameId` и уже подключается к WebSocket для присоединения к партии.

### LobbyService

**Роль:** Жизненный цикл игры до начала партии.

- `createGame()` — валидация параметров, генерация доски, сохранение
- `joinGame()` — назначение номера игрока и токена, переход в `playing`
- `cancelGame()` — отмена ожидающей игры создателем
- `listAvailableGames()` — фильтрация по статусу `waiting`, удаление устаревших

Именно `LobbyService` отвечает за то, что игра проходит через `waiting → playing`. Как только оба игрока подключены, gateway вызывает `gameplayService.startGame()`.

### GameplayService

**Роль:** Игровая механика после старта партии.

- `openCell()` — валидация хода, раскрытие ячейки, начисление очков, проверка окончания
- `startGame()` / `startTurnTimer()` — запуск и перезапуск таймера хода
- `handleTimeout()` — обработка истечения таймера (проигрыш по времени)
- `surrenderGame()` — сдача текущего игрока
- `forfeitDisconnectedPlayer()` — проигрыш при истечении таймера переподключения
- `getStateForPlayer()` — сериализация состояния с фильтрацией скрытых ячеек

Ключевое решение — **сокрытие данных**: клиенту отправляется `ClientCell`, где `hasDiamond` и `adjacentDiamonds` видны только для раскрытых ячеек. Это предотвращает чтение позиций алмазов из WebSocket-трафика.

### SessionService

**Роль:** Управление подключениями игроков.

- `rejoinGame()` — восстановление сессии по `playerToken`, замена `socketId`
- `handlePlayerDisconnect()` — удаление сокета, запуск таймера фор-фита (30 сек)

Разделение от `GameplayService` обусловлено тем, что сессии работают на уровне сокетов и таймеров дисконнекта, а не игровой логики. При дисконнекте не нужно знать правила игры — нужно только отсчитать таймаут и уведомить.

### BoardGeneratorService

**Роль:** Генерация игрового поля.

Использует Fisher-Yates shuffle для случайного размещения алмазов, затем предвычисляет `adjacentDiamonds` для каждой неалмазной ячейки. Выделен в отдельный сервис для изоляции алгоритма от бизнес-логики.

### GameRepositoryService

**Роль:** In-memory хранилище.

Обёртка над `Map<string, Game>` с методом `findGameAndPlayerBySocketId()` для обратного поиска по сокету. Выделен отдельно, чтобы при необходимости заменить на persistent storage.

### GameConfigService

**Роль:** Конфигурация из переменных окружения.

Читает env-переменные при старте и предоставляет типизированный объект `GameConfig`. Все параметры имеют разумные дефолты — сервер запускается без `.env` файла.

## Абстрактные интерфейсы (GameRepository, IBoardGenerator)

`GameRepositoryService` и `BoardGeneratorService` зарегистрированы через Symbol-токены:

```typescript
{ provide: GAME_REPOSITORY, useClass: GameRepositoryService }
{ provide: BOARD_GENERATOR, useClass: BoardGeneratorService }
```

Это позволяет подменить реализацию (например, in-memory → Redis или генератор с фиксированным seed для тестов) без изменения потребителей. В текущей версии каждый интерфейс имеет одну реализацию — абстракция заложена как точка расширения.

## Обработка таймаутов

Сервисы не имеют доступа к Socket.IO серверу — это ответственность gateway. Для обратной связи при срабатывании таймеров используется callback-регистрация:

```typescript
// gateway.afterInit()
this.gameplayService.setOnTurnTimeout((gameId) => {
  const result = this.gameplayService.handleTimeout(gameId);
  if (result) {
    this.server.to(gameId).emit(GAME_EVENTS.GAME_OVER, result);
  }
});
```

Альтернативой был бы NestJS `EventEmitter`, но callback-подход проще и не требует дополнительных зависимостей.

## Типизация WebSocket-событий

Все имена событий определены в `GAME_EVENTS` — единый source of truth. На их основе построены интерфейсы `ServerToClientEvents` и `ClientToServerEvents`, которые типизируют `server.emit()` и `@SubscribeMessage()`:

```typescript
type TypedServer = Server<ClientToServerEvents, ServerToClientEvents>;
type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents>;
```

Это даёт compile-time проверку: невозможно отправить событие с неправильным payload.

## Обработка ошибок

Gateway использует строковые коды ошибок (`ErrorCode`), а не HTTP-статусы — WebSocket не имеет понятия статус-кодов. Клиент маппит коды на локализованные сообщения (`errors.ts`), что позволяет серверу оставаться language-agnostic.

## Модель данных

Центральная сущность — `Game`:

| Поле | Назначение |
|------|-----------|
| `players: Map<SocketId, PlayerNumber>` | Текущие подключения (меняются при реконнекте) |
| `playerTokens: Map<PlayerToken, PlayerNumber>` | Постоянные токены (не меняются при реконнекте) |
| `turnTimer` | Handle текущего таймера хода |
| `disconnectTimers` | Таймеры ожидания реконнекта по игрокам |
| `turnStartedAt` | Timestamp начала хода (клиент считает обратный отсчёт) |

Двойная маппинг-схема (`players` + `playerTokens`) решает проблему: при дисконнекте `socketId` меняется, но `playerToken` сохраняется в `sessionStorage` клиента и используется для восстановления сессии.

## Indexed access types вместо примитивов

В сигнатурах методов вместо `string` и `number` используются типы вида `Game['id']`, `Game['gridSize']`, `CellRevealedPayload['row']`:

```typescript
openCell(gameId: Game['id'], socketId: SocketId, row: number, col: number): OpenCellResult
//       ^^^^^^^^^^^^^^^^                         ^^^^^^^^^^^
//       вместо string                            можно было бы CellRevealedPayload['row']
```

```typescript
createGame(
  gridSize: Game['gridSize'],
  diamondsCount: Game['diamondsCount'],
  turnTimeSeconds: Game['turnTimeSeconds'],
): Game
```

Причины:

1. **Связность через типы.** `Game['id']` — это тот же `string`, но читающий код сразу видит: "этот параметр — идентификатор игры, а не произвольная строка". Если тип `Game.id` когда-либо изменится (например, на `number` или branded type), все зависимые сигнатуры подхватят изменение автоматически.

2. **Единый источник правды.** Типы payload'ов (`GameStatePayload`, `CellRevealedPayload`) определены один раз в `game.interface.ts`. Методы сервисов ссылаются на поля этих интерфейсов, а не дублируют примитивы. Это исключает рассинхронизацию: невозможна ситуация, когда интерфейс говорит `row: number`, а метод принимает `row: string`.

3. **Самодокументирующие сигнатуры.** Сигнатура `generateBoard(gridSize: Game['gridSize'], diamondsCount: Game['diamondsCount'])` явно показывает, что параметры привязаны к полям сущности `Game`, а не являются абстрактными числами.

Тот же подход применён для branded type aliases `SocketId` и `PlayerToken` — оба являются `string`, но выделены в отдельные типы для читаемости и потенциального ужесточения в будущем (например, через `type SocketId = string & { __brand: 'SocketId' }`).

## Жизненный цикл партии

```
POST /games         → Game создана (status: waiting)
game:join (Player 1) → Ожидание второго игрока
game:join (Player 2) → status: playing, таймер хода запущен
game:open           → Раскрытие ячейки, смена хода / бонусный ход
                       ↳ Все алмазы найдены → game:over (completed)
                       ↳ Таймер хода истёк  → game:over (timeout)
game:surrender      → game:over (surrender)
disconnect          → 30 сек ожидание → game:over (surrender)
game:rejoin         → Восстановление сессии, отмена таймера фор-фита
game:cancel         → Удаление ожидающей игры
```
