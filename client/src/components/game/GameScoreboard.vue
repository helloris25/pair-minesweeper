<template>
  <div class="game-info-bar">
    <div class="game-info-center">
      <div class="scoreboard">
        <div
          class="player-score-wrap"
          :class="{
            active: gameState.currentTurn === 1 && gameState.status === 'playing',
            self: gameState.playerNumber === 1,
          }"
        >
          <div class="player-score">
            <span class="player-label">Игрок 1</span>
            <Transition name="score-num" mode="out-in">
              <span :key="gameState.scores[1]" class="score">{{ gameState.scores[1] }}</span>
            </Transition>
            <span v-if="gameState.playerNumber === 1" class="you-badge">ВЫ</span>
          </div>
          <div
            v-if="gameState.currentTurn === 1 && gameState.status === 'playing'"
            class="turn-time-bar"
            role="progressbar"
            :aria-valuenow="timeLeft"
            :aria-valuemin="0"
            :aria-valuemax="gameState.turnTimeSeconds"
          >
            <div
              class="turn-time-fill"
              :class="{ urgent: timeLeft <= 5 }"
              :style="{ width: `${(timeLeft / gameState.turnTimeSeconds) * 100}%` }"
            />
          </div>
        </div>
        <div class="vs">vs</div>
        <div
          class="player-score-wrap"
          :class="{
            active: gameState.currentTurn === 2 && gameState.status === 'playing',
            self: gameState.playerNumber === 2,
          }"
        >
          <div class="player-score">
            <span class="player-label">Игрок 2</span>
            <Transition name="score-num" mode="out-in">
              <span :key="gameState.scores[2]" class="score">{{ gameState.scores[2] }}</span>
            </Transition>
            <span v-if="gameState.playerNumber === 2" class="you-badge">ВЫ</span>
          </div>
          <div
            v-if="gameState.currentTurn === 2 && gameState.status === 'playing'"
            class="turn-time-bar"
            role="progressbar"
            :aria-valuenow="timeLeft"
            :aria-valuemin="0"
            :aria-valuemax="gameState.turnTimeSeconds"
          >
            <div
              class="turn-time-fill"
              :class="{ urgent: timeLeft <= 5 }"
              :style="{ width: `${timeLeftPercent}%` }"
            />
          </div>
        </div>
      </div>
      <div class="diamonds-progress">
        <span class="diamonds-label"
          >&#x1F48E; {{ gameState.diamondsFound }} / {{ gameState.diamondsCount }}</span
        >
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{
              width: `${(gameState.diamondsFound / gameState.diamondsCount) * 100}%`,
            }"
          >
            <span class="progress-shine" />
          </div>
        </div>
      </div>
    </div>
    <button
      type="button"
      class="surrender-btn"
      title="Сдаться"
      aria-label="Сдаться"
      @click="$emit('surrender')"
    >
      &#x1F3F3;&#xFE0F;
    </button>
  </div>
</template>

<script setup lang="ts">
import type { GameStatePayload } from '@/types/game';

defineProps<{
  gameState: GameStatePayload;
  timeLeft: number;
  timeLeftPercent: number;
}>();

defineEmits<{ surrender: [] }>();
</script>

<style scoped>
.game-info-bar {
  position: relative;
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: 420px;
  padding: 12px 16px;
  background: rgba(22, 33, 62, 0.6);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
}

.game-info-center {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 10px;
  align-items: center;
  min-width: 0;
}

.scoreboard {
  display: flex;
  gap: 20px;
  align-items: flex-end;
}

.player-score-wrap {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  min-width: 80px;
}

.player-score {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: center;
  padding: 10px 20px;
  background: var(--color-bg-secondary);
  border: 2px solid transparent;
  border-radius: var(--radius-md);
  transition:
    border-color 0.3s ease,
    box-shadow 0.3s ease;
}

.player-score-wrap.active .player-score {
  border-color: var(--color-accent);
  box-shadow: var(--shadow-glow-accent);
}

.turn-time-bar {
  width: 100%;
  height: 4px;
  overflow: hidden;
  background: var(--color-bg-tertiary);
  border-radius: 2px;
}

.turn-time-fill {
  height: 100%;
  background: var(--color-info);
  border-radius: 2px;
  transition: width 0.8s linear;
}

.turn-time-fill.urgent {
  background: var(--color-error);
  animation: turn-bar-pulse 0.6s ease-in-out infinite;
}

@keyframes turn-bar-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.75;
  }
}

.score {
  display: inline-block;
  font-size: 1.75rem;
  font-weight: 700;
}

.score-num-enter-active,
.score-num-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.score-num-enter-from {
  opacity: 0;
  transform: scale(0.85);
}

.score-num-leave-to {
  opacity: 0;
  transform: scale(1.08);
}

.player-label {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
}

.player-score.self .player-label {
  color: var(--color-player-1);
}

.you-badge {
  position: absolute;
  top: -8px;
  right: -8px;
  padding: 2px 6px;
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--color-bg-primary);
  background: var(--color-info);
  border-radius: var(--radius-sm);
}

.vs {
  align-self: center;
  padding-bottom: 4px;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--color-text-faint);
}

.diamonds-progress {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  width: 100%;
  min-width: 0;
  max-width: 200px;
}

.diamonds-label {
  font-size: 0.85rem;
  color: var(--color-text-muted);
}

.progress-bar {
  width: 100%;
  height: 6px;
  overflow: hidden;
  background: var(--color-bg-tertiary);
  border-radius: 4px;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.3);
}

.progress-fill {
  position: relative;
  height: 100%;
  overflow: hidden;
  background: linear-gradient(90deg, var(--color-diamond), #d946ef);
  border-radius: 4px;
  transition: width 0.5s var(--ease-out-expo);
}

.progress-shine {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    105deg,
    transparent 0%,
    rgba(255, 255, 255, 0.25) 45%,
    rgba(255, 255, 255, 0.4) 50%,
    rgba(255, 255, 255, 0.25) 55%,
    transparent 100%
  );
  animation: progress-shine 2.5s ease-in-out infinite;
}

@keyframes progress-shine {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}

.surrender-btn {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  font-size: 1.25rem;
  line-height: 1;
  color: var(--color-text-muted);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  transition:
    border-color 0.25s ease,
    color 0.25s ease,
    background 0.25s ease;
}

.surrender-btn:hover {
  color: var(--color-text-secondary);
  background: rgba(255, 255, 255, 0.06);
  border-color: var(--color-text-dim);
}
</style>
