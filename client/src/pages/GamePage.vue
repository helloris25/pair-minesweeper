<template>
  <div class="game-page">
    <div v-if="!gameState" class="connecting">
      <p>Подключение к игре...</p>
      <p v-if="error" class="error">{{ error }}</p>
    </div>

    <template v-else>
      <div class="game-info">
        <div class="game-id">
          Игра: <code>{{ gameId }}</code>
          <button class="copy-btn" @click="copyGameId">{{ copyLabel }}</button>
        </div>

        <div v-if="gameState.status === 'waiting'" class="waiting">
          Ожидание второго игрока...
          <br />
          <small>Отправьте ID игры вашему сопернику</small>
          <button class="cancel-btn" @click="onCancel">Отменить игру</button>
        </div>

        <div v-if="playerLeft" class="warning">
          Соперник переподключается...
          <small class="reconnect-hint">Игра продолжится автоматически</small>
        </div>

        <div class="scoreboard">
          <div
            class="player-score"
            :class="{
              active: gameState.currentTurn === 1 && gameState.status === 'playing',
              self: gameState.playerNumber === 1,
            }"
          >
            <span class="player-label">Игрок 1</span>
            <span class="score">{{ gameState.scores[1] }}</span>
            <span v-if="gameState.playerNumber === 1" class="you-badge">ВЫ</span>
          </div>
          <div class="vs">vs</div>
          <div
            class="player-score"
            :class="{
              active: gameState.currentTurn === 2 && gameState.status === 'playing',
              self: gameState.playerNumber === 2,
            }"
          >
            <span class="player-label">Игрок 2</span>
            <span class="score">{{ gameState.scores[2] }}</span>
            <span v-if="gameState.playerNumber === 2" class="you-badge">ВЫ</span>
          </div>
        </div>

        <Transition name="extra-turn">
          <div v-if="extraTurn" class="extra-turn-banner">
            Бонусный ход!
          </div>
        </Transition>

        <div v-if="gameState.status === 'playing'" class="turn-info">
          <template v-if="isMyTurn">Ваш ход!</template>
          <template v-else>Ход соперника</template>
          <div class="timer" :class="{ urgent: timeLeft <= 5 }">
            {{ timeLeft }} сек
          </div>
        </div>

        <div class="diamonds-progress">
          <span class="diamonds-label">
            Алмазы: {{ gameState.diamondsFound }} / {{ gameState.diamondsCount }}
          </span>
          <div class="progress-bar">
            <div
              class="progress-fill"
              :style="{ width: `${(gameState.diamondsFound / gameState.diamondsCount) * 100}%` }"
            />
          </div>
        </div>

        <button
          v-if="gameState.status === 'playing'"
          class="surrender-btn"
          @click="onSurrender"
        >
          Сдаться
        </button>
      </div>

      <GameBoard
        :board="gameState.board"
        :grid-size="gameState.gridSize"
        :can-click="isMyTurn"
        @cell-click="onCellClick"
      />

      <Transition name="overlay">
        <div v-if="gameOver" class="game-over-overlay">
          <div class="game-over-card">
            <h2>Игра окончена!</h2>

            <template v-if="gameOver.reason === 'timeout'">
              <p v-if="gameOver.winner === gameState.playerNumber" class="result-win">
                Время соперника вышло — вы победили!
              </p>
              <p v-else class="result-lose">
                Время вышло — вы проиграли
              </p>
            </template>

            <template v-else-if="gameOver.reason === 'surrender'">
              <p v-if="gameOver.winner === gameState.playerNumber" class="result-win">
                Соперник сдался — вы победили!
              </p>
              <p v-else class="result-lose">
                Вы сдались
              </p>
            </template>

            <template v-else>
              <p class="final-score">
                Игрок 1: {{ gameOver.scores[1] }} &mdash; Игрок 2: {{ gameOver.scores[2] }}
              </p>
              <p v-if="gameOver.winner === gameState.playerNumber" class="result-win">
                Вы победили!
              </p>
              <p v-else-if="gameOver.winner" class="result-lose">
                Игрок {{ gameOver.winner }} победил
              </p>
              <p v-else class="result-draw">Ничья!</p>
            </template>

            <button @click="goHome">На главную</button>
          </div>
        </div>
      </Transition>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useSocket } from '@/composables/useSocket';
import { useToast } from '@/composables/useToast';
import GameBoard from '@/components/GameBoard.vue';

const props = defineProps<{ gameId: string }>();
const router = useRouter();
const toast = useToast();

const {
  gameState,
  gameOver,
  error,
  unavailable,
  cancelled,
  playerLeft,
  extraTurn,
  connect,
  joinGame,
  openCell,
  surrender,
  cancelGame,
  connected,
} = useSocket();

const now = ref(Date.now());
let tickInterval: ReturnType<typeof setInterval> | null = null;

const copyLabel = ref('Копировать ID');
let copyResetTimer: ReturnType<typeof setTimeout> | null = null;

const isMyTurn = computed(() => {
  if (!gameState.value) return false;
  return (
    gameState.value.status === 'playing' &&
    gameState.value.currentTurn === gameState.value.playerNumber
  );
});

const timeLeft = computed(() => {
  const state = gameState.value;
  if (!state || state.turnStartedAt === null || state.turnStartedAt === undefined) {
    return state?.turnTimeSeconds ?? 0;
  }
  const elapsed = Math.floor((now.value - state.turnStartedAt) / 1000);
  return Math.max(0, state.turnTimeSeconds - elapsed);
});

function handleBeforeUnload(e: BeforeUnloadEvent) {
  if (gameState.value && gameState.value.status !== 'finished') {
    e.preventDefault();
    e.returnValue = '';
  }
}

onMounted(() => {
  connect();
  tickInterval = setInterval(() => {
    now.value = Date.now();
  }, 250);
  window.addEventListener('beforeunload', handleBeforeUnload);
});

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
  if (tickInterval) clearInterval(tickInterval);
  if (copyResetTimer) clearTimeout(copyResetTimer);
});

watch(connected, (val) => {
  if (val) {
    joinGame(props.gameId);
  }
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

function onCellClick(row: number, col: number) {
  openCell(props.gameId, row, col);
}

function onCancel() {
  cancelGame(props.gameId);
}

function onSurrender() {
  const confirmed = window.confirm('Вы уверены, что хотите сдаться?');
  if (confirmed) {
    surrender(props.gameId);
  }
}

async function copyGameId() {
  try {
    await navigator.clipboard.writeText(props.gameId);
    copyLabel.value = 'Скопировано!';
  } catch {
    copyLabel.value = 'Ошибка';
  }
  if (copyResetTimer) clearTimeout(copyResetTimer);
  copyResetTimer = setTimeout(() => {
    copyLabel.value = 'Копировать ID';
  }, 2000);
}

function goHome() {
  router.push('/');
}
</script>

<style scoped>
.game-page {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  width: 100%;
  max-width: 600px;
  position: relative;
}

.connecting {
  text-align: center;
  padding: 40px;
}

.game-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 100%;
}

.game-id {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  display: flex;
  align-items: center;
  gap: 8px;
}

.game-id code {
  background: var(--color-bg-tertiary);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.copy-btn {
  padding: 2px 8px;
  font-size: 0.75rem;
  background: var(--color-bg-tertiary);
  border: 1px solid #1a4a8a;
  color: var(--color-text-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background 0.2s;
  min-width: 100px;
}

.copy-btn:hover {
  background: #1a4a8a;
}

.waiting {
  text-align: center;
  color: var(--color-warning);
  font-weight: 600;
}

.waiting small {
  color: var(--color-text-muted);
  font-weight: 400;
}

.warning {
  color: var(--color-warning);
  font-weight: 600;
  text-align: center;
}

.reconnect-hint {
  display: block;
  color: var(--color-text-muted);
  font-weight: 400;
  font-size: 0.8rem;
  margin-top: 4px;
}

.scoreboard {
  display: flex;
  align-items: center;
  gap: 16px;
}

.player-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 20px;
  border-radius: var(--radius-lg);
  background: var(--color-bg-secondary);
  border: 2px solid transparent;
  position: relative;
  min-width: 100px;
  transition: border-color 0.3s;
}

.player-score.active {
  border-color: var(--color-accent);
}

.player-score.self .player-label {
  color: var(--color-player-1);
}

.player-label {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.score {
  font-size: 1.8rem;
  font-weight: 700;
}

.you-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  background: var(--color-info);
  color: var(--color-bg-primary);
  font-size: 0.65rem;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

.vs {
  color: var(--color-text-faint);
  font-weight: 600;
}

.extra-turn-banner {
  color: var(--color-success);
  font-weight: 700;
  font-size: 1.1rem;
  text-align: center;
  animation: extra-turn-pop 0.4s ease-out;
}

@keyframes extra-turn-pop {
  0% { transform: scale(0.6); opacity: 0; }
  60% { transform: scale(1.15); }
  100% { transform: scale(1); opacity: 1; }
}

.extra-turn-enter-active,
.extra-turn-leave-active {
  transition: all 0.3s ease;
}

.extra-turn-enter-from,
.extra-turn-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.turn-info {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-accent);
  text-align: center;
}

.timer {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--color-info);
  margin-top: 4px;
  transition: color 0.3s;
}

.timer.urgent {
  color: var(--color-error);
  animation: pulse 0.5s ease-in-out infinite alternate;
}

@keyframes pulse {
  from { opacity: 1; }
  to { opacity: 0.5; }
}

.diamonds-progress {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 100%;
  max-width: 280px;
}

.diamonds-label {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.progress-bar {
  width: 100%;
  height: 6px;
  background: var(--color-bg-tertiary);
  border-radius: 3px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: var(--color-diamond);
  border-radius: 3px;
  transition: width 0.4s ease;
}

.error {
  color: var(--color-error);
  margin-top: 8px;
}

.game-over-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.game-over-card {
  background: var(--color-bg-secondary);
  border: 2px solid var(--color-accent);
  border-radius: var(--radius-2xl);
  padding: 32px 48px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.game-over-card h2 {
  color: var(--color-accent);
  font-size: 1.6rem;
}

.final-score {
  font-size: 1.2rem;
}

.result-win {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--color-success);
  text-shadow: 0 0 12px rgba(74, 222, 128, 0.4);
  margin: 0.5em 0;
}

.result-lose {
  font-size: 1.3rem;
  font-weight: 600;
  color: #f87171;
  opacity: 0.95;
  margin: 0.5em 0;
}

.result-draw {
  font-size: 1.3rem;
  font-weight: 600;
  color: #94a3b8;
  margin: 0.5em 0;
}

.game-over-card button {
  margin-top: 8px;
  padding: 10px 24px;
  border-radius: var(--radius-md);
  border: none;
  background: var(--color-accent);
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.game-over-card button:hover {
  background: var(--color-accent-hover);
}

.cancel-btn {
  margin-top: 12px;
  padding: 6px 16px;
  font-size: 0.85rem;
  background: transparent;
  border: 1px solid var(--color-text-faint);
  color: var(--color-text-muted);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
}

.cancel-btn:hover {
  border-color: var(--color-warning);
  color: var(--color-warning);
}

.surrender-btn {
  padding: 6px 16px;
  font-size: 0.85rem;
  background: transparent;
  border: 1px solid var(--color-text-faint);
  color: var(--color-text-muted);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.2s;
}

.surrender-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-accent);
}

.overlay-enter-active {
  transition: opacity 0.3s ease;
}

.overlay-enter-active .game-over-card {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.overlay-enter-from {
  opacity: 0;
}

.overlay-enter-from .game-over-card {
  transform: scale(0.9);
  opacity: 0;
}
</style>
