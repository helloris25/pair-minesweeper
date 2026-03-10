<template>
  <Teleport to="body">
    <TransitionGroup name="toast" tag="div" class="toast-container">
      <div v-for="toast in toasts" :key="toast.id" class="toast" :class="`toast--${toast.type}`">
        {{ toast.message }}
      </div>
    </TransitionGroup>
  </Teleport>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast';

const { toasts } = useToast();
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.toast {
  max-width: 360px;
  padding: 12px 20px;
  font-size: 0.9rem;
  font-weight: 500;
  color: #fff;
  pointer-events: auto;
  border-radius: var(--radius-md);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease;
}

.toast:hover {
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
  transform: translateX(-2px);
}

.toast--info {
  color: var(--color-bg-primary);
  background: var(--color-info);
}

.toast--success {
  color: var(--color-bg-primary);
  background: var(--color-success);
}

.toast--error {
  background: var(--color-error);
}

.toast--warning {
  color: var(--color-bg-primary);
  background: var(--color-warning);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(40px);
}

.toast-move {
  transition: transform 0.3s ease;
}
</style>
