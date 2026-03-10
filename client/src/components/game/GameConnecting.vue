<template>
  <div class="game-center-viewport">
    <div class="connecting">
      <div class="loader" aria-hidden="true">
        <span class="loader-dot" />
        <span class="loader-dot" />
        <span class="loader-dot" />
      </div>
      <p class="connecting-text">Подключение к игре...</p>
      <p v-if="error" class="error">{{ error }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ error: string | null }>();
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

.connecting {
  padding: 48px 40px;
  text-align: center;
}

.loader {
  display: flex;
  gap: 8px;
  justify-content: center;
  margin-bottom: 20px;
}

.loader-dot {
  width: 10px;
  height: 10px;
  background: var(--color-accent);
  border-radius: 50%;
  box-shadow: 0 0 12px rgba(233, 69, 96, 0.6);
  animation: loader-bounce 0.6s ease-in-out infinite both;
}

.loader-dot:nth-child(1) {
  animation-delay: 0s;
}
.loader-dot:nth-child(2) {
  animation-delay: 0.15s;
}
.loader-dot:nth-child(3) {
  animation-delay: 0.3s;
}

@keyframes loader-bounce {
  0%,
  80%,
  100% {
    opacity: 0.6;
    transform: scale(0.8);
  }
  40% {
    opacity: 1;
    transform: scale(1.2);
  }
}

.connecting-text {
  font-weight: 600;
  color: var(--color-text-secondary);
}

.error {
  margin-top: 8px;
  color: var(--color-error);
}
</style>
