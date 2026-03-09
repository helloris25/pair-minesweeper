import { toApiUrl } from '@/config';

export interface CreateGameParams {
  gridSize: number;
  diamondsCount: number;
  turnTimeSeconds: number;
}

async function parseErrorMessage(res: Response): Promise<string> {
  const contentType = res.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    const data = (await res.json()) as { message?: string | string[] };
    if (Array.isArray(data.message)) {
      return data.message.join(', ');
    }
    return data.message ?? 'Не удалось создать игру';
  }

  const text = await res.text();
  return text || `Ошибка сервера (${res.status})`;
}

export async function createGame(params: CreateGameParams): Promise<{ gameId: string }> {
  const res = await fetch(toApiUrl('/games'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    throw new Error(await parseErrorMessage(res));
  }

  return res.json();
}
