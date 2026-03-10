<template>
  <Transition name="overlay">
    <div v-if="gameOver" class="game-over-overlay">
      <div class="game-over-backdrop" aria-hidden="true" />
      <div class="game-over-card">
        <h2>Игра окончена!</h2>

        <template v-if="gameOver.reason === 'timeout'">
          <p v-if="gameOver.winner === playerNumber" class="result-win">
            Время соперника вышло — вы победили!
          </p>
          <p v-else class="result-lose">Время вышло — вы проиграли</p>
        </template>

        <template v-else-if="gameOver.reason === 'surrender'">
          <p v-if="gameOver.winner === playerNumber" class="result-win">
            Соперник сдался — вы победили!
          </p>
          <p v-else class="result-lose">Вы сдались</p>
        </template>

        <template v-else-if="gameOver.reason === 'disconnect'">
          <p v-if="gameOver.winner === playerNumber" class="result-win">
            Соперник отключился — вы победили!
          </p>
          <p v-else class="result-lose">Вы отключились надолго — вы проиграли</p>
        </template>

        <template v-else>
          <p class="final-score">
            Игрок 1: {{ gameOver.scores[1] }} &mdash; Игрок 2: {{ gameOver.scores[2] }}
          </p>
          <p v-if="gameOver.winner === playerNumber" class="result-win">Вы победили!</p>
          <p v-else-if="gameOver.winner" class="result-lose">Игрок {{ gameOver.winner }} победил</p>
          <p v-else class="result-draw">Ничья!</p>
        </template>

        <button @click="$emit('goHome')">На главную</button>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import type { GameOverPayload, PlayerNumber } from '@/types/game';

defineProps<{
  gameOver: GameOverPayload | null;
  playerNumber: PlayerNumber;
}>();

defineEmits<{ goHome: [] }>();
</script>

<style scoped>
.game-over-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
}

.game-over-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
}

.game-over-card {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 36px 48px;
  text-align: center;
  background: linear-gradient(160deg, var(--color-bg-secondary) 0%, var(--color-bg-tertiary) 100%);
  border: 2px solid var(--color-accent);
  border-radius: var(--radius-2xl);
  box-shadow:
    0 0 0 1px rgba(233, 69, 96, 0.2),
    0 24px 48px rgba(0, 0, 0, 0.4),
    0 0 60px rgba(233, 69, 96, 0.15);
}

.game-over-card h2 {
  font-size: 1.75rem;
  font-weight: 800;
  color: var(--color-accent);
  text-shadow: 0 0 20px rgba(233, 69, 96, 0.4);
  animation: game-over-title 0.5s var(--ease-spring) both;
}

@keyframes game-over-title {
  from {
    opacity: 0;
    transform: scale(0.9) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.final-score {
  font-size: 1.2rem;
}

.result-win {
  margin: 0.5em 0;
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--color-success);
  text-shadow: 0 0 12px rgba(74, 222, 128, 0.4);
  animation: result-win 0.6s var(--ease-spring) 0.2s both;
}

@keyframes result-win {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.result-lose {
  margin: 0.5em 0;
  font-size: 1.3rem;
  font-weight: 600;
  color: #f87171;
  opacity: 0.95;
}

.result-draw {
  margin: 0.5em 0;
  font-size: 1.3rem;
  font-weight: 600;
  color: #94a3b8;
}

.game-over-card button {
  padding: 12px 28px;
  margin-top: 12px;
  font-size: 1rem;
  font-weight: 700;
  color: white;
  cursor: pointer;
  background: var(--color-accent);
  border: none;
  border-radius: var(--radius-md);
  transition:
    background 0.25s ease,
    transform 0.2s var(--ease-spring),
    box-shadow 0.25s ease;
  animation: game-over-title 0.5s var(--ease-spring) 0.15s both;
}

.game-over-card button:hover {
  background: var(--color-accent-hover);
  box-shadow: var(--shadow-glow-accent);
  transform: translateY(-2px);
}

.overlay-enter-active {
  transition: opacity 0.35s ease;
}

.overlay-enter-active .game-over-backdrop {
  transition: opacity 0.35s ease;
}

.overlay-enter-active .game-over-card {
  transition:
    transform 0.4s var(--ease-spring),
    opacity 0.4s ease;
}

.overlay-enter-from {
  opacity: 0;
}

.overlay-enter-from .game-over-card {
  opacity: 0;
  transform: scale(0.85) translateY(20px);
}

.overlay-leave-active .game-over-card {
  transition:
    transform 0.25s ease,
    opacity 0.25s ease;
}

.overlay-leave-to .game-over-card {
  opacity: 0;
  transform: scale(0.95);
}
</style>
