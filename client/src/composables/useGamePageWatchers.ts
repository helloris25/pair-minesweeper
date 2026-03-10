import { watch, onMounted, onUnmounted, type Ref } from 'vue';
import { onBeforeRouteLeave } from 'vue-router';
import type { useRouter } from 'vue-router';
import type { GameStatePayload } from '@/types/game';

const LEAVE_MESSAGE =
  'Выйти со страницы игры? Если вы единственный игрок, игра будет завершена.';

export interface GamePageSocketRefs {
  gameState: Ref<GameStatePayload | null>;
  unavailable: Ref<string | null>;
  cancelled: Ref<boolean>;
  playerReplaced: Ref<boolean>;
  connected: Ref<boolean>;
}

export interface GamePageWatchersOptions {
  gameId: string;
  router: ReturnType<typeof useRouter>;
  toast: { error: (msg: string) => void; warning: (msg: string) => void };
  socket: GamePageSocketRefs;
  onConnected: () => void;
}

export function useGamePageWatchers(options: GamePageWatchersOptions) {
  const { router, toast, socket, onConnected } = options;
  const { gameState, unavailable, cancelled, playerReplaced, connected } = socket;

  function handleBeforeUnload(e: BeforeUnloadEvent) {
    if (gameState.value && gameState.value.status !== 'finished') {
      e.preventDefault();
      e.returnValue = '';
    }
  }

  onMounted(() => {
    window.addEventListener('beforeunload', handleBeforeUnload);
  });

  onUnmounted(() => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  });

  onBeforeRouteLeave((_to, _from, next) => {
    if (!gameState.value || gameState.value.status === 'finished') {
      next();
      return;
    }
    if (window.confirm(LEAVE_MESSAGE)) next();
    else next(false);
  });

  watch(connected, (val) => {
    if (val) onConnected();
  });

  watch(unavailable, (msg) => {
    if (msg) {
      toast.error(msg);
      router.push('/');
    }
  });

  watch(cancelled, (val) => {
    if (val) {
      toast.warning('Игра отменена');
      router.push('/');
    }
  });

  watch(playerReplaced, (val) => {
    if (val) {
      toast.warning('Вы вошли в игру с другого устройства или вкладки');
      router.push('/');
    }
  });

  function goHome() {
    router.push('/');
  }

  return { goHome, handleBeforeUnload };
}
