<template>
  <div class="home">
    <p class="home-intro">Создайте партию или присоединитесь к игре по ссылке.</p>
    <LobbyPanel />
  </div>
</template>

<script setup lang="ts">
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
</style>
