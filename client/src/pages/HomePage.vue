<template>
  <div class="home">
    <p class="home-intro">Создайте партию или присоединитесь к игре по ссылке.</p>

    <div class="home-columns">
      <CreateGamePanel />
      <LobbyPanel />
    </div>
  </div>
</template>

<script setup lang="ts">
import CreateGamePanel from '@/components/home/CreateGamePanel.vue';
import LobbyPanel from '@/components/home/LobbyPanel.vue';
</script>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 760px;
  height: 100%;
  min-height: 0;
  margin: 0 auto;
  overflow-y: auto;
}

.home-intro {
  flex-shrink: 0;
  margin: 0 0 16px;
  font-size: 0.95rem;
  line-height: 1.4;
  color: var(--color-text-secondary);
  text-align: center;
}

.home-columns {
  display: grid;
  flex: 1;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  align-items: start;
  min-height: 0;
}

@media (width <= 640px) {
  .home-columns {
    grid-template-columns: 1fr;
  }
}
</style>
