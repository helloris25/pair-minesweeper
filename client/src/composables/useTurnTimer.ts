import { computed, ref, type Ref } from 'vue';
import type { GameStatePayload } from '@/types/game';

const TICK_MS = 80;

export function useTurnTimer(gameState: Ref<GameStatePayload | null>) {
  const now = ref(Date.now());
  let tickInterval: ReturnType<typeof setInterval> | null = null;

  const timeLeft = computed(() => {
    const state = gameState.value;
    if (!state || state.turnStartedAt === null || state.turnStartedAt === undefined) {
      return state?.turnTimeSeconds ?? 0;
    }
    const elapsed = (now.value - state.turnStartedAt) / 1000;
    return Math.max(0, state.turnTimeSeconds - elapsed);
  });

  const timeLeftPercent = computed(() => {
    const state = gameState.value;
    if (!state || state.turnStartedAt === null || state.turnStartedAt === undefined) {
      return 100;
    }
    const elapsedMs = now.value - state.turnStartedAt;
    const totalMs = state.turnTimeSeconds * 1000;
    const remaining = Math.max(0, totalMs - elapsedMs);
    return totalMs > 0 ? (remaining / totalMs) * 100 : 0;
  });

  function startTicker() {
    tickInterval = setInterval(() => {
      now.value = Date.now();
    }, TICK_MS);
  }

  function stopTicker() {
    if (tickInterval) {
      clearInterval(tickInterval);
      tickInterval = null;
    }
  }

  return { now, timeLeft, timeLeftPercent, startTicker, stopTicker };
}
