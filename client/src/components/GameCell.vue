<template>
  <button
    class="cell"
    :class="cellClass"
    :disabled="!canClick"
    @click="canClick && $emit('click')"
  >
    <span v-if="cell.revealed && cell.hasDiamond" class="diamond">&#x1F48E;</span>
    <span v-else-if="cell.revealed" class="number" :data-count="cell.adjacentDiamonds">
      {{ cell.adjacentDiamonds || '' }}
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ClientCell } from '@/types/game';

const props = defineProps<{
  cell: ClientCell;
  canClick: boolean;
}>();

defineEmits<{ click: [] }>();

const cellClass = computed(() => {
  if (!props.cell.revealed) {
    return { hidden: true, clickable: props.canClick };
  }
  return {
    revealed: true,
    diamond: props.cell.hasDiamond,
    [`player-${props.cell.revealedBy}`]: true,
  };
});
</script>

<style scoped>
.cell {
  aspect-ratio: 1;
  border: none;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.3rem;
  font-weight: 700;
  cursor: default;
  transition: background 0.15s, transform 0.15s;
}

.cell.hidden {
  background: var(--color-cell-hidden);
}

.cell.hidden.clickable {
  cursor: pointer;
  background: var(--color-cell-hover);
}

.cell.hidden.clickable:hover {
  background: var(--color-cell-active-hover);
  transform: scale(1.05);
}

.cell.revealed {
  background: var(--color-cell-revealed);
  animation: cell-reveal 0.35s ease-out;
}

.cell.revealed.diamond {
  background: var(--color-cell-diamond);
  animation: diamond-reveal 0.45s ease-out;
}

.cell.revealed.diamond.player-1 {
  box-shadow: inset 0 0 0 2px var(--color-player-1);
}

.cell.revealed.diamond.player-2 {
  box-shadow: inset 0 0 0 2px var(--color-player-2);
}

@keyframes cell-reveal {
  0% {
    transform: scale(0.85);
    opacity: 0.4;
  }
  50% {
    transform: scale(1.04);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes diamond-reveal {
  0% {
    transform: scale(0.7) rotate(-5deg);
    opacity: 0.3;
  }
  40% {
    transform: scale(1.1) rotate(2deg);
  }
  100% {
    transform: scale(1) rotate(0deg);
    opacity: 1;
  }
}

.diamond {
  font-size: 1.5rem;
}

.number {
  color: var(--color-text-secondary);
}

.number[data-count='0'] {
  color: var(--color-text-faint);
}

.number[data-count='1'] {
  color: #4fc3f7;
}

.number[data-count='2'] {
  color: #81c784;
}

.number[data-count='3'] {
  color: #e57373;
}

.number[data-count='4'] {
  color: var(--color-diamond);
}

.number[data-count='5'] {
  color: #ff8a65;
}

.number[data-count='6'] {
  color: #4dd0e1;
}

.number[data-count='7'] {
  color: #f06292;
}

.number[data-count='8'] {
  color: #fff176;
}
</style>
