<template>
  <div class="board-wrapper">
    <div class="board" :style="boardStyle">
      <GameCell
        v-for="(cell, idx) in flatBoard"
        :key="`${Math.floor(idx / gridSize)}-${idx % gridSize}`"
        :cell="cell"
        :can-click="canClick && !cell.revealed"
        @click="handleClick(idx)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ClientCell } from '@/types/game';
import GameCell from './GameCell.vue';

const props = defineProps<{
  board: ClientCell[][];
  gridSize: number;
  canClick: boolean;
}>();

const emit = defineEmits<{
  cellClick: [row: number, col: number];
}>();

const flatBoard = computed(() => props.board.flat());

const boardStyle = computed(() => ({
  gridTemplateColumns: `repeat(${props.gridSize}, 1fr)`,
}));

function handleClick(cellIndex: number) {
  const row = Math.floor(cellIndex / props.gridSize);
  const col = cellIndex % props.gridSize;
  emit('cellClick', row, col);
}
</script>

<style scoped>
.board-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  max-width: min(420px, 78vmin);
  max-height: min(420px, 78vmin);
  padding: 6px;
}

.board-wrapper::before {
  position: absolute;
  inset: -4px;
  z-index: -1;
  content: '';
  background: linear-gradient(135deg, rgba(233, 69, 96, 0.08), rgba(83, 216, 251, 0.06));
  border-radius: var(--radius-xl);
  opacity: 0.8;
  filter: blur(12px);
  animation: board-glow 4s ease-in-out infinite alternate;
}

@keyframes board-glow {
  from {
    opacity: 0.5;
  }
  to {
    opacity: 1;
  }
}

.board {
  position: relative;
  display: grid;
  gap: 3px;
  width: 100%;
  max-width: min(420px, 78vmin);
  max-height: min(420px, 78vmin);
  aspect-ratio: 1;
}
</style>
