<template>
  <div
    class="board"
    :style="{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }"
  >
    <GameCell
      v-for="(cell, idx) in flatBoard"
      :key="`${Math.floor(idx / gridSize)}-${idx % gridSize}`"
      :cell="cell"
      :can-click="canClick && !cell.revealed"
      @click="handleClick(idx)"
    />
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

function handleClick(cellIndex: number) {
  const row = Math.floor(cellIndex / props.gridSize);
  const col = cellIndex % props.gridSize;
  emit('cellClick', row, col);
}
</script>

<style scoped>
.board {
  display: grid;
  gap: 3px;
  width: 100%;
  max-width: 420px;
  aspect-ratio: 1;
}
</style>
