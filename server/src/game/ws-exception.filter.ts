import { Catch, ArgumentsHost, BadRequestException } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { GAME_EVENTS } from './interfaces/game-events.interface';
import { ERROR_CODE, type ErrorCode } from './interfaces/game.interface';

@Catch()
export class GameWsExceptionFilter extends BaseWsExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const client = host
      .switchToWs()
      .getClient<{ emit: (event: string, payload: unknown) => void }>();
    const code = this.resolveErrorCode(exception);
    client.emit(GAME_EVENTS.GAME_ERROR, { code });
  }

  private resolveErrorCode(exception: unknown): ErrorCode {
    const isUnknownException = !(
      exception instanceof WsException && exception instanceof BadRequestException
    );
    if (isUnknownException) {
      return ERROR_CODE.INVALID_PAYLOAD;
    }

    const data = exception.getError();

    const isErrorData = typeof data === 'object' && data !== null && 'code' in data;
    if (!isErrorData) {
      return ERROR_CODE.INVALID_PAYLOAD;
    }

    const code = (data as { code: string }).code;

    const isErrorCode =
      typeof code === 'string' && Object.values(ERROR_CODE).includes(code as ErrorCode);
    if (!isErrorCode) {
      return ERROR_CODE.INVALID_PAYLOAD;
    }

    return code as ErrorCode;
  }
}
