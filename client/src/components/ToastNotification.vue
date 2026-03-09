<template>
  <Teleport to="body">
    <TransitionGroup name="toast" tag="div" class="toast-container">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="toast"
        :class="`toast--${toast.type}`"
      >
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
  padding: 12px 20px;
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  font-weight: 500;
  color: #fff;
  pointer-events: auto;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  max-width: 360px;
}

.toast--info {
  background: var(--color-info);
  color: var(--color-bg-primary);
}

.toast--success {
  background: var(--color-success);
  color: var(--color-bg-primary);
}

.toast--error {
  background: var(--color-error);
}

.toast--warning {
  background: var(--color-warning);
  color: var(--color-bg-primary);
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
