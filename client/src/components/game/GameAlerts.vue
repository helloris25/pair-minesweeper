<template>
  <div class="game-info-alerts">
    <Transition name="alert" mode="out-in">
      <div
        v-if="opponentDisconnectedSeconds !== null"
        key="disconnect"
        class="alert-banner alert-disconnect"
      >
        Соперник отключился. Победа через
        <strong>{{ opponentDisconnectedSeconds }} сек</strong>
      </div>
      <div v-else-if="playerLeft" key="reconnect" class="alert-banner alert-reconnect">
        Соперник переподключается…
      </div>
      <div v-else-if="extraTurn" key="bonus" class="alert-banner alert-bonus">
        Бонусный ход!
      </div>
      <div v-else key="empty" class="alert-placeholder" aria-hidden="true" />
    </Transition>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  opponentDisconnectedSeconds: number | null;
  playerLeft: boolean;
  extraTurn: boolean;
}>();
</script>

<style scoped>
.game-info-alerts {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 40px;
  margin-bottom: 8px;
}

.alert-placeholder {
  visibility: hidden;
  height: 1px;
  pointer-events: none;
}

.alert-banner {
  max-width: 100%;
  padding: 8px 16px;
  font-size: 0.9rem;
  font-weight: 600;
  text-align: center;
  border-radius: var(--radius-md);
}

.alert-disconnect {
  color: var(--color-success);
  background: rgba(74, 222, 128, 0.15);
  border: 1px solid rgba(74, 222, 128, 0.4);
}

.alert-disconnect strong {
  font-size: 1.05em;
}

.alert-reconnect {
  color: var(--color-warning);
  background: rgba(240, 165, 0, 0.12);
  border: 1px solid rgba(240, 165, 0, 0.35);
}

.alert-bonus {
  color: var(--color-success);
  background: rgba(74, 222, 128, 0.12);
  border: 1px solid rgba(74, 222, 128, 0.4);
}

.alert-enter-active,
.alert-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.alert-enter-from,
.alert-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>
