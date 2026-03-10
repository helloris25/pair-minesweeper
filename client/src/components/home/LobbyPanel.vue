<template>
  <section class="panel lobby-panel">
    <div class="panel-header">
      <h2>Доступные игры</h2>
      <div class="panel-header-actions">
        <button
          v-if="availableGames.length > 0"
          type="button"
          class="create-btn"
          @click="createSlideOpen = true"
        >
          Создать игру
        </button>
        <span class="connection-badge" :class="{ connected: lobbyConnected }">
          <span class="connection-dot" />
          {{ lobbyConnected ? 'Онлайн' : 'Подключение...' }}
        </span>
      </div>
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
          <button
            type="button"
            class="create-btn create-btn-center"
            @click="createSlideOpen = true"
          >
            Создать игру
          </button>
          <p class="empty-hint">Создайте игру, чтобы пригласить соперника</p>
        </div>
      </Transition>
    </div>

    <Teleport to="body">
      <Transition name="slide-overlay">
        <div
          v-if="createSlideOpen"
          class="create-slide-overlay"
          aria-hidden="false"
          @click="createSlideOpen = false"
        >
          <Transition name="slide-panel">
            <div
              v-if="createSlideOpen"
              class="create-slide-panel"
              role="dialog"
              aria-modal="true"
              @click.stop
            >
              <div class="create-slide-header">
                <button
                  type="button"
                  class="create-slide-close"
                  aria-label="Закрыть"
                  @click="createSlideOpen = false"
                >
                  &#215;
                </button>
              </div>
              <div class="create-slide-body">
                <CreateGamePanel />
              </div>
            </div>
          </Transition>
        </div>
      </Transition>
    </Teleport>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useLobby } from '@/composables/useLobby';
import CreateGamePanel from '@/components/home/CreateGamePanel.vue';

const router = useRouter();
const { games: availableGames, connected: lobbyConnected } = useLobby();
const createSlideOpen = ref(false);

function goToGame(gameId: string) {
  router.push(`/game/${gameId}`);
}

function onEscape(e: KeyboardEvent) {
  if (e.key === 'Escape' && createSlideOpen.value) createSlideOpen.value = false;
}

onMounted(() => {
  document.addEventListener('keydown', onEscape);
});
onUnmounted(() => {
  document.removeEventListener('keydown', onEscape);
});
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

.panel-header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.panel-header h2 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--color-accent);
}

.create-btn {
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

.create-btn:hover {
  background: var(--color-accent-hover);
  box-shadow: 0 4px 14px rgba(233, 69, 96, 0.4);
  transform: translateY(-1px);
}

.create-btn-center {
  display: block;
  margin: 0 auto 12px;
}

.empty-hint {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-text-muted);
  text-align: center;
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

/* Create-game slide (drawer) */
.create-slide-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  cursor: pointer;
  background: rgba(0, 0, 0, 0.5);
}

.create-slide-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 1001;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 360px;
  overflow: hidden;
  cursor: default;
  background: var(--color-bg-secondary);
  border-left: 1px solid var(--color-border);
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.3);
}

.create-slide-header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: flex-end;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
}

.create-slide-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  font-size: 1.5rem;
  line-height: 1;
  color: var(--color-text-muted);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  transition:
    color 0.2s ease,
    background 0.2s ease;
}

.create-slide-close:hover {
  color: var(--color-text-primary);
  background: var(--color-bg-primary);
}

.create-slide-body {
  flex: 1;
  padding: 0;
  overflow-y: auto;
}

.create-slide-body :deep(.create-panel) {
  min-width: unset;
  border: none;
  border-radius: 0;
  box-shadow: none;
}

.create-slide-body :deep(.create-panel:hover) {
  border-color: transparent;
  box-shadow: none;
}

/* Slide overlay transition */
.slide-overlay-enter-active,
.slide-overlay-leave-active {
  transition: opacity 0.25s ease;
}

.slide-overlay-enter-from,
.slide-overlay-leave-to {
  opacity: 0;
}

/* Slide panel transition */
.slide-panel-enter-active,
.slide-panel-leave-active {
  transition: transform 0.3s var(--ease-out-expo);
}

.slide-panel-enter-from,
.slide-panel-leave-to {
  transform: translateX(100%);
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
