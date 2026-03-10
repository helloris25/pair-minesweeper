/** Payload for game:error and game:unavailable events (matches server). */
export interface GameErrorPayload {
  code: string;
  message?: string;
}

/** Maps server error codes to user-facing messages (locale: RU). */
export const ERROR_MESSAGES: Record<string, string> = {
  INVALID_PAYLOAD: 'Неверные данные запроса',
  JOIN_NOT_FOUND: 'Игра не найдена',
  JOIN_FINISHED: 'Игра уже завершена',
  JOIN_ALREADY_STARTED: 'Игра уже началась',
  JOIN_CANNOT_JOIN: 'Невозможно присоединиться к игре',
  JOIN_CANNOT_REJOIN: 'Невозможно переподключиться к игре',
  CANCEL_FAILED: 'Невозможно отменить игру',
  GAME_NOT_FOUND: 'Игра не найдена',
  GAME_NOT_IN_PROGRESS: 'Игра не в процессе',
  NOT_IN_GAME: 'Вы не участвуете в этой игре',
  NOT_YOUR_TURN: 'Сейчас не ваш ход',
  INVALID_CELL: 'Неверные координаты клетки',
  CELL_ALREADY_REVEALED: 'Клетка уже открыта',
};

/** Returns user-facing message from error payload (localized, or message for debug, or code). */
export function messageFromPayload(payload: GameErrorPayload): string {
  return ERROR_MESSAGES[payload.code] ?? payload.message ?? payload.code;
}
