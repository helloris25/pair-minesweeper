import { ref, onUnmounted } from 'vue';
import { io, Socket } from 'socket.io-client';
import { API_URL } from '@/config';
import type {
  GameStatePayload,
  CellRevealedPayload,
  GameOverPayload,
} from '@/types/game';
import { messageFromPayload, type GameErrorPayload } from '@/errors';

function getStoredToken(gameId: string): string | null {
  try {
    return sessionStorage.getItem(`game-token:${gameId}`);
  } catch {
    return null;
  }
}

function storeToken(gameId: string, token: string) {
  try {
    sessionStorage.setItem(`game-token:${gameId}`, token);
  } catch {
    /* storage unavailable */
  }
}

function clearToken(gameId: string) {
  try {
    sessionStorage.removeItem(`game-token:${gameId}`);
  } catch {
    /* storage unavailable */
  }
}

export function useSocket() {
  const socket = ref<Socket | null>(null);
  const gameState = ref<GameStatePayload | null>(null);
  const gameOver = ref<GameOverPayload | null>(null);
  const error = ref<string | null>(null);
  const unavailable = ref<string | null>(null);
  const cancelled = ref(false);
  const connected = ref(false);
  const playerLeft = ref(false);
  const extraTurn = ref(false);

  /** Game we're currently joining/rejoining; used to clear stale token on unavailable */
  let lastJoinedGameId: string | null = null;
  let extraTurnTimer: ReturnType<typeof setTimeout> | null = null;

  function connect() {
    if (socket.value?.connected) return;

    const socketInstance = io(API_URL, { transports: ['websocket'] });

    socketInstance.on('connect', () => {
      connected.value = true;
    });

    socketInstance.on('disconnect', () => {
      connected.value = false;
    });

    socketInstance.on('game:state', (state: GameStatePayload) => {
      gameState.value = state;
      error.value = null;
      lastJoinedGameId = null;
      storeToken(state.gameId, state.playerToken);
    });

    socketInstance.on('game:update', (data: CellRevealedPayload) => {
      if (!gameState.value) return;

      gameState.value.board[data.row][data.col] = data.cell;
      gameState.value.currentTurn = data.currentTurn;
      gameState.value.scores = data.scores;
      gameState.value.diamondsFound = data.diamondsFound;
      gameState.value.turnStartedAt = data.turnStartedAt;

      if (data.extraTurn) {
        extraTurn.value = true;
        if (extraTurnTimer) clearTimeout(extraTurnTimer);
        extraTurnTimer = setTimeout(() => {
          extraTurn.value = false;
        }, 2000);
      } else {
        extraTurn.value = false;
      }
    });

    socketInstance.on('game:over', (data: GameOverPayload) => {
      gameOver.value = data;
      if (gameState.value) {
        gameState.value.status = 'finished';
        clearToken(gameState.value.gameId);
      }
    });

    socketInstance.on('game:error', (data: GameErrorPayload) => {
      error.value = messageFromPayload(data);
    });

    socketInstance.on('game:unavailable', (data: GameErrorPayload) => {
      if (lastJoinedGameId) {
        clearToken(lastJoinedGameId);
        lastJoinedGameId = null;
      }
      unavailable.value = messageFromPayload(data);
    });

    socketInstance.on('game:cancelled', () => {
      if (gameState.value) clearToken(gameState.value.gameId);
      cancelled.value = true;
    });

    socketInstance.on('game:player-joined', () => {
      playerLeft.value = false;
    });

    socketInstance.on('game:player-reconnected', () => {
      playerLeft.value = false;
    });

    socketInstance.on('game:player-left', () => {
      playerLeft.value = true;
    });

    socket.value = socketInstance;
  }

  function joinGame(gameId: string) {
    lastJoinedGameId = gameId;
    const storedToken = getStoredToken(gameId);
    if (storedToken) {
      socket.value?.emit('game:rejoin', { gameId, playerToken: storedToken });
    } else {
      socket.value?.emit('game:join', { gameId });
    }
  }

  function openCell(gameId: string, row: number, col: number) {
    socket.value?.emit('game:open', { gameId, row, col });
  }

  function surrender(gameId: string) {
    socket.value?.emit('game:surrender', { gameId });
  }

  function cancelGame(gameId: string) {
    clearToken(gameId);
    socket.value?.emit('game:cancel', { gameId });
  }

  function disconnect() {
    if (extraTurnTimer) clearTimeout(extraTurnTimer);
    socket.value?.disconnect();
    socket.value = null;
    connected.value = false;
  }

  onUnmounted(() => {
    disconnect();
  });

  return {
    socket,
    gameState,
    gameOver,
    error,
    unavailable,
    cancelled,
    connected,
    playerLeft,
    extraTurn,
    connect,
    joinGame,
    openCell,
    surrender,
    cancelGame,
    disconnect,
  };
}
