<template>
  <button class="cell" :class="cellClass" :disabled="!canClick" @click="onClick">
    <span v-if="ripple" class="ripple" :style="rippleStyle" />
    <span class="cell-inner">
      <span v-if="cell.revealed && cell.hasDiamond" class="diamond">&#x1F48E;</span>
      <span v-else-if="cell.revealed" class="number" :data-count="cell.adjacentDiamonds">
        {{ cell.adjacentDiamonds || '' }}
      </span>
    </span>
  </button>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { ClientCell } from '@/types/game';

const props = defineProps<{
  cell: ClientCell;
  canClick: boolean;
}>();

const emit = defineEmits<{ click: [] }>();

const ripple = ref(false);
const rippleX = ref(0);
const rippleY = ref(0);
let rippleTimer: ReturnType<typeof setTimeout> | null = null;

const rippleStyle = computed(() => ({
  left: `${rippleX.value}px`,
  top: `${rippleY.value}px`,
}));

function onClick(e: MouseEvent) {
  if (!props.canClick) return;
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
  rippleX.value = e.clientX - rect.left;
  rippleY.value = e.clientY - rect.top;
  ripple.value = true;
  if (rippleTimer) clearTimeout(rippleTimer);
  rippleTimer = setTimeout(() => {
    ripple.value = false;
    rippleTimer = null;
  }, 600);
  emit('click');
}

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
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 1;
  overflow: hidden;
  font-size: 1.3rem;
  font-weight: 700;
  cursor: default;
  border: none;
  border-radius: var(--radius-md);
  transition:
    background 0.2s ease,
    transform 0.2s var(--ease-spring),
    box-shadow 0.25s ease;
}

.cell-inner {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ripple {
  position: absolute;
  width: 20px;
  height: 20px;
  margin-top: -10px;
  margin-left: -10px;
  pointer-events: none;
  background: rgba(255, 255, 255, 0.4);
  border-radius: 50%;
  animation: ripple-expand 0.6s var(--ease-out-expo) forwards;
}

@keyframes ripple-expand {
  to {
    opacity: 0;
    transform: scale(15);
  }
}

.cell.hidden {
  background: var(--color-cell-hidden);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
}

.cell.hidden.clickable {
  cursor: pointer;
  background: var(--color-cell-hover);
}

.cell.hidden.clickable:hover {
  background: var(--color-cell-active-hover);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transform: scale(1.06);
}

.cell.hidden.clickable:active {
  transform: scale(0.98);
}

.cell.revealed {
  background: var(--color-cell-revealed);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
  animation: cell-reveal 0.4s var(--ease-out-expo) forwards;
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

.cell.revealed .number {
  animation: number-pop 0.35s var(--ease-spring) 0.1s both;
}

.diamond {
  display: inline-block;
  font-size: 1.5rem;
  filter: drop-shadow(0 0 6px rgba(186, 104, 200, 0.6));
  animation: diamond-float 3s ease-in-out infinite;
}

.cell.revealed.diamond {
  background: linear-gradient(145deg, var(--color-cell-diamond) 0%, #2d1645 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.1),
    0 0 20px rgba(186, 104, 200, 0.25);
  animation: diamond-reveal 0.5s var(--ease-out-expo) forwards;
}

.cell.revealed.diamond .diamond {
  animation: diamond-sparkle 0.6s var(--ease-spring) 0.15s both;
}

.cell.revealed.diamond.player-1 {
  box-shadow:
    inset 0 0 0 2px var(--color-player-1),
    0 0 16px rgba(83, 216, 251, 0.2);
}

.cell.revealed.diamond.player-2 {
  box-shadow:
    inset 0 0 0 2px var(--color-player-2),
    0 0 16px rgba(233, 69, 96, 0.2);
}

@keyframes cell-reveal {
  0% {
    opacity: 0.3;
    transform: scale(0.8);
  }
  60% {
    transform: scale(1.05);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes number-pop {
  0% {
    opacity: 0;
    transform: scale(0);
  }
  70% {
    transform: scale(1.15);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes diamond-reveal {
  0% {
    opacity: 0.2;
    transform: scale(0.6) rotate(-8deg);
  }
  50% {
    transform: scale(1.12) rotate(3deg);
  }
  100% {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }
}

@keyframes diamond-sparkle {
  0% {
    opacity: 0;
    filter: brightness(0.5);
    transform: scale(0) rotate(-180deg);
  }
  60% {
    filter: brightness(1.4);
    transform: scale(1.2) rotate(10deg);
  }
  100% {
    opacity: 1;
    filter: brightness(1);
    transform: scale(1) rotate(0deg);
  }
}

@keyframes diamond-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-2px);
  }
}
</style>
