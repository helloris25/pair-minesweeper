<template>
  <div class="game-info waiting-hint">
    <span class="waiting-hint-text">Ожидание второго игрока — пригласите по ссылке ниже</span>
  </div>
  <div class="game-center-viewport game-center-with-overlay">
    <GameBoard :board="board" :grid-size="gridSize" :can-click="false" @cell-click="() => {}" />
    <div class="waiting-backdrop" aria-hidden="true" />
    <div
      class="waiting-modal animate-in"
      role="dialog"
      aria-labelledby="waiting-modal-title"
      aria-modal="true"
    >
      <div class="waiting-modal-card">
        <span class="waiting-icon" aria-hidden="true">&#x1F4E2;</span>
        <h3 id="waiting-modal-title" class="waiting-title">Пригласите соперника</h3>
        <p class="waiting-desc">
          Отправьте ссылку — игра начнётся, когда второй игрок перейдёт по ней.
        </p>
        <div class="waiting-link-row">
          <input
            :value="inviteUrl"
            type="text"
            readonly
            class="waiting-link-input"
            aria-label="Ссылка на игру"
          />
          <button
            type="button"
            class="waiting-copy-icon"
            title="Копировать ссылку"
            aria-label="Копировать ссылку"
            @click="$emit('copy')"
          >
            &#x1F4CB;
          </button>
        </div>
        <button
          v-if="canShare"
          type="button"
          class="share-btn share-btn-full"
          @click="$emit('share')"
        >
          Поделиться
        </button>
        <button type="button" class="cancel-btn" @click="$emit('cancel')">Отменить игру</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import GameBoard from '@/components/GameBoard.vue';
import type { ClientCell } from '@/types/game';

defineProps<{
  board: ClientCell[][];
  gridSize: number;
  inviteUrl: string;
  canShare: boolean;
}>();

defineEmits<{
  copy: [];
  share: [];
  cancel: [];
}>();
</script>

<style scoped>
.game-center-viewport {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 0;
  padding: 8px 0;
}

.game-center-with-overlay {
  position: relative;
}

.waiting-backdrop {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(2px);
}

.waiting-modal {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  pointer-events: none;
}

.waiting-modal > * {
  pointer-events: auto;
}

.waiting-modal-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 320px;
  padding: 24px 28px;
  background: linear-gradient(160deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
}

.waiting-modal .waiting-icon {
  margin-bottom: 8px;
  font-size: 2rem;
  filter: drop-shadow(0 0 8px rgba(240, 165, 0, 0.3));
}

.waiting-modal .waiting-title {
  margin: 0 0 6px;
  font-size: 1.15rem;
  color: var(--color-warning);
}

.waiting-modal .waiting-desc {
  margin: 0 0 14px;
  font-size: 0.88rem;
  line-height: 1.4;
  color: var(--color-text-muted);
  text-align: center;
}

.waiting-link-row {
  display: flex;
  gap: 6px;
  align-items: center;
  width: 100%;
  margin-bottom: 12px;
}

.waiting-link-input {
  flex: 1;
  min-width: 0;
  padding: 8px 10px;
  font-family: inherit;
  font-size: 0.8rem;
  color: var(--color-text-primary);
  background: var(--color-bg-tertiary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.waiting-copy-icon {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  font-size: 1.1rem;
  color: var(--color-accent);
  cursor: pointer;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-md);
  transition:
    background 0.2s ease,
    color 0.2s ease;
}

.waiting-copy-icon:hover {
  color: white;
  background: var(--color-accent);
}

.waiting-modal .share-btn-full {
  width: 100%;
  margin-bottom: 10px;
}

.cancel-btn {
  padding: 8px 16px;
  font-size: 0.85rem;
  color: var(--color-text-muted);
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--color-text-faint);
  border-radius: var(--radius-md);
  transition: all 0.2s ease;
}

.cancel-btn:hover {
  color: var(--color-warning);
  border-color: var(--color-warning);
}

.waiting-modal .cancel-btn {
  margin-top: 0;
}

.waiting-hint {
  padding: 6px 0;
}

.waiting-hint-text {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.copy-btn,
.share-btn {
  padding: 10px 18px;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-accent);
  cursor: pointer;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-accent);
  border-radius: var(--radius-md);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.2s ease;
}

.copy-btn:hover,
.share-btn:hover {
  color: white;
  background: var(--color-accent);
}

.animate-in {
  animation: page-in 0.45s var(--ease-out-expo) both;
}

@keyframes page-in {
  from {
    opacity: 0;
    transform: translateY(12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
