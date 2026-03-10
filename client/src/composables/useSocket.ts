import { ref, onUnmounted } from 'vue';
import { io, Socket } from 'socket.io-client';
import { API_URL } from '@/config';
import type { GameStatePayload, CellRevealedPayload, GameOverPayload } from '@/types/game';
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

const BROWSER_ID_KEY = 'pair-minesweeper-browser-id';

function getOrCreateBrowserId(): string {
  try {
    let id = localStorage.getItem(BROWSER_ID_KEY);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
      localStorage.setItem(BROWSER_ID_KEY, id);
    }
    return id;
  } catch {
    return `anon-${Date.now()}`;
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
  /** True when this tab was replaced by another tab/device (rejoin with same token). */
  const playerReplaced = ref(false);
  /** Seconds until win when opponent disconnected; null when not applicable. Countdown runs in composable. */
  const opponentDisconnectedSeconds = ref<number | null>(null);

  /** Game we're currently joining/rejoining; used to clear stale token on unavailable */
  let lastJoinedGameId: string | null = null;
  let extraTurnTimer: ReturnType<typeof setTimeout> | null = null;
  let opponentDisconnectCountdownInterval: ReturnType<typeof setInterval> | null = null;

  function clearOpponentDisconnectCountdown() {
    if (opponentDisconnectCountdownInterval) {
      clearInterval(opponentDisconnectCountdownInterval);
      opponentDisconnectCountdownInterval = null;
    }
    opponentDisconnectedSeconds.value = null;
  }

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
      clearOpponentDisconnectCountdown();
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
      clearOpponentDisconnectCountdown();
      playerLeft.value = false;
    });

    socketInstance.on('game:player-left', () => {
      playerLeft.value = true;
    });

    socketInstance.on('game:player-replaced', () => {
      playerReplaced.value = true;
    });

    socketInstance.on('game:opponent-disconnected', (data: { secondsUntilWin: number }) => {
      opponentDisconnectedSeconds.value = data.secondsUntilWin;
      if (opponentDisconnectCountdownInterval) clearInterval(opponentDisconnectCountdownInterval);
      opponentDisconnectCountdownInterval = setInterval(() => {
        if (opponentDisconnectedSeconds.value === null || opponentDisconnectedSeconds.value <= 0) {
          clearOpponentDisconnectCountdown();
          return;
        }
        opponentDisconnectedSeconds.value--;
      }, 1000);
    });

    socket.value = socketInstance;
  }

  function joinGame(gameId: string) {
    lastJoinedGameId = gameId;
    const storedToken = getStoredToken(gameId);
    if (storedToken) {
      socket.value?.emit('game:rejoin', { gameId, playerToken: storedToken });
    } else {
      socket.value?.emit('game:join', { gameId, browserId: getOrCreateBrowserId() });
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
    clearOpponentDisconnectCountdown();
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
    playerReplaced,
    opponentDisconnectedSeconds,
    connect,
    joinGame,
    openCell,
    surrender,
    cancelGame,
    disconnect,
  };
}
