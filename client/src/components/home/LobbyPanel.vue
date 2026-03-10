<template>
  <section class="panel lobby-panel">
    <div class="panel-header">
      <h2>Доступные игры</h2>
      <span class="connection-badge" :class="{ connected: lobbyConnected }">
        <span class="connection-dot" />
        {{ lobbyConnected ? 'Онлайн' : 'Подключение...' }}
      </span>
    </div>

    <div class="games-list">
      <div v-if="availableGames.length > 0" class="games-header">
        <span>Поле</span>
        <span>Алмазы</span>
        <span>Ход</span>
        <span></span>
      </div>
      <TransitionGroup name="game-row-anim" tag="div" class="games-body">
        <div v-for="game in availableGames" :key="game.id" class="game-row">
          <span class="game-board-size">{{ game.gridSize }}×{{ game.gridSize }}</span>
          <span class="game-diamonds">{{ game.diamondsCount }} &#x1F48E;</span>
          <span class="game-turn-time">{{ game.turnTimeSeconds }} сек</span>
          <button type="button" class="join-btn" @click="goToGame(game.id)">Играть</button>
        </div>
      </TransitionGroup>
      <Transition name="fade">
        <div v-if="availableGames.length === 0" class="empty-state">
          <span class="empty-icon" aria-hidden="true">&#x1F48E;</span>
          <p class="empty-title">Пока нет открытых игр</p>
          <p class="empty-text">
            Создайте новую игру выше — после создания вы получите ссылку для приглашения соперника.
          </p>
        </div>
      </Transition>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useLobby } from '@/composables/useLobby';

const router = useRouter();
const { games: availableGames, connected: lobbyConnected } = useLobby();

function goToGame(gameId: string) {
  router.push(`/game/${gameId}`);
}
</script>

<style scoped>
.panel {
  flex: 1;
  min-width: 260px;
  padding: 20px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  transition:
    box-shadow 0.3s ease,
    border-color 0.3s ease;
}

.panel:hover {
  border-color: rgba(233, 69, 96, 0.25);
  box-shadow: 0 10px 32px rgba(0, 0, 0, 0.2);
}

.lobby-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.panel-header h2 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--color-accent);
}

.connection-badge {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.connection-badge .connection-dot {
  width: 6px;
  height: 6px;
  background: var(--color-warning);
  border-radius: 50%;
  animation: pulse-dot 1.2s ease-in-out infinite;
}

.connection-badge.connected .connection-dot {
  background: var(--color-success);
  animation: none;
}

@keyframes pulse-dot {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

.games-list {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  overflow-y: auto;
}

.games-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.games-header {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr auto;
  gap: 12px;
  padding: 10px 14px;
  font-size: 0.78rem;
  color: var(--color-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.game-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr auto;
  gap: 12px;
  align-items: center;
  padding: 12px 14px;
  background: var(--color-bg-primary);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.game-row:hover {
  border-color: rgba(233, 69, 96, 0.2);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
}

.game-board-size {
  font-weight: 700;
  color: var(--color-text-primary);
}

.game-diamonds {
  font-size: 0.95rem;
  color: var(--color-diamond);
}

.game-turn-time {
  font-size: 0.9rem;
  color: var(--color-info);
}

.join-btn {
  padding: 8px 18px;
  font-size: 0.9rem;
  font-weight: 600;
  color: white;
  cursor: pointer;
  background: var(--color-accent);
  border: none;
  border-radius: var(--radius-md);
  transition:
    background 0.2s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.join-btn:hover {
  background: var(--color-accent-hover);
  box-shadow: 0 4px 14px rgba(233, 69, 96, 0.4);
  transform: translateY(-1px);
}

.empty-state {
  padding: 32px 24px;
  text-align: center;
  background: rgba(15, 52, 96, 0.2);
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-lg);
}

.empty-icon {
  display: block;
  margin-bottom: 12px;
  font-size: 2.5rem;
  opacity: 0.6;
}

.empty-title {
  margin: 0 0 8px;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--color-text-secondary);
}

.empty-text {
  max-width: 320px;
  margin: 0;
  margin-inline: auto;
  font-size: 0.9rem;
  line-height: 1.45;
  color: var(--color-text-muted);
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
