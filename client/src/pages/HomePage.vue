<template>
  <div class="home">
    <div class="top-panels">
      <div class="panel">
        <h2>Создать игру</h2>
        <form class="form" @submit.prevent="onCreateGame">
          <label class="field">
            <span>Размер поля (N):</span>
            <input
              v-model.number="gridSize"
              type="number"
              min="2"
              max="6"
              required
            />
            <small>Поле {{ gridSize }}x{{ gridSize }}</small>
          </label>
          <label class="field">
            <span>Алмазы (M):</span>
            <input
              v-model.number="diamondsCount"
              type="number"
              min="1"
              :max="gridSize * gridSize - 1"
              step="2"
              required
            />
            <small>Нечётное, меньше {{ gridSize * gridSize }}</small>
          </label>
          <label class="field">
            <span>Время на ход (сек):</span>
            <input
              v-model.number="turnTimeSeconds"
              type="number"
              min="5"
              max="120"
              step="5"
              required
            />
            <small>От 5 до 120 секунд</small>
          </label>
          <p v-if="createError" class="error">{{ createError }}</p>
          <button type="submit" :disabled="creating">
            {{ creating ? 'Создание...' : 'Создать игру' }}
          </button>
        </form>
      </div>
    </div>

    <div class="panel full-width">
      <div class="panel-header">
        <h2>Доступные игры</h2>
        <span v-if="!lobbyConnected" class="connection-status">Подключение...</span>
      </div>

      <div class="games-list">
        <div v-if="availableGames.length > 0" class="games-header">
          <span>Поле</span>
          <span>Алмазы</span>
          <span>Ход</span>
          <span>Создана</span>
          <span></span>
        </div>
        <TransitionGroup name="game-row-anim" tag="div" class="games-body">
          <div
            v-for="game in availableGames"
            :key="game.id"
            class="game-row"
          >
            <span class="game-board-size">{{ game.gridSize }}x{{ game.gridSize }}</span>
            <span class="game-diamonds">{{ game.diamondsCount }}</span>
            <span class="game-turn-time">{{ game.turnTimeSeconds }} сек</span>
            <span class="game-time">{{ timeAgo(game.createdAt) }}</span>
            <button class="join-btn" @click="router.push(`/game/${game.id}`)">
              Войти
            </button>
          </div>
        </TransitionGroup>
        <Transition name="fade">
          <div v-if="availableGames.length === 0" class="empty-state">
            Нет игр, ожидающих игроков
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { createGame } from '@/api/games';
import { useLobby } from '@/composables/useLobby';

const router = useRouter();

const gridSize = ref(5);
const diamondsCount = ref(5);
const turnTimeSeconds = ref(30);
const creating = ref(false);
const createError = ref('');

const { games: availableGames, connected: lobbyConnected } = useLobby();

function timeAgo(isoDate: string): string {
  const seconds = Math.floor((Date.now() - new Date(isoDate).getTime()) / 1000);
  if (seconds < 10) return 'только что';
  if (seconds < 60) return `${seconds} сек. назад`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes} мин. назад`;
}

async function onCreateGame() {
  createError.value = '';

  if (diamondsCount.value % 2 === 0) {
    createError.value = 'Количество алмазов должно быть нечётным';
    return;
  }
  if (diamondsCount.value >= gridSize.value * gridSize.value) {
    createError.value = 'Слишком много алмазов для данного размера поля';
    return;
  }

  creating.value = true;
  try {
    const { gameId } = await createGame({
      gridSize: gridSize.value,
      diamondsCount: diamondsCount.value,
      turnTimeSeconds: turnTimeSeconds.value,
    });
    router.push(`/game/${gameId}`);
  } catch (err) {
    createError.value = err instanceof Error ? err.message : 'Ошибка сети';
  } finally {
    creating.value = false;
  }
}
</script>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-width: 800px;
  width: 100%;
}

.top-panels {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.panel {
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: 24px;
  flex: 1;
  min-width: 280px;
}

.panel.full-width {
  flex-basis: 100%;
}

.panel h2 {
  margin-bottom: 16px;
  font-size: 1.1rem;
  color: var(--color-accent);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.panel-header h2 {
  margin-bottom: 0;
}

.connection-status {
  font-size: 0.8rem;
  color: var(--color-warning);
}

.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field span {
  font-size: 0.9rem;
  color: var(--color-text-secondary);
}

.field small {
  font-size: 0.75rem;
  color: var(--color-text-dim);
}

input {
  padding: 8px 12px;
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  font-size: 1rem;
}

input:focus {
  outline: 2px solid var(--color-accent);
  outline-offset: -1px;
  border-color: transparent;
}

button {
  padding: 10px 20px;
  border-radius: var(--radius-md);
  border: none;
  background: var(--color-accent);
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

button:hover:not(:disabled) {
  background: var(--color-accent-hover);
}

button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.error {
  color: var(--color-error);
  font-size: 0.85rem;
}

.empty-state {
  color: var(--color-text-dim);
  text-align: center;
  padding: 20px 0;
}

.games-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.games-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.games-header {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr auto;
  gap: 12px;
  padding: 8px 12px;
  font-size: 0.8rem;
  color: var(--color-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.game-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 10px 12px;
  background: var(--color-bg-primary);
  border-radius: var(--radius-md);
}

.game-board-size {
  font-weight: 600;
}

.game-diamonds {
  color: var(--color-diamond);
}

.game-turn-time {
  color: var(--color-info);
  font-size: 0.9rem;
}

.game-time {
  color: var(--color-text-muted);
  font-size: 0.9rem;
}

.join-btn {
  padding: 6px 16px;
  font-size: 0.85rem;
  border-radius: var(--radius-sm);
}

.game-row-anim-enter-active,
.game-row-anim-leave-active {
  transition: all 0.35s ease;
}

.game-row-anim-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.game-row-anim-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

.game-row-anim-move {
  transition: transform 0.35s ease;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
