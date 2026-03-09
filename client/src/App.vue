<template>
  <div class="app">
    <header class="app-header">
      <router-link to="/" class="app-title">Парный обратный сапёр</router-link>
    </header>
    <main class="app-main">
      <router-view />
    </main>
    <ToastNotification />
  </div>
</template>

<script setup lang="ts">
import ToastNotification from '@/components/ToastNotification.vue';
</script>

<style>
:root {
  --color-bg-primary: #1a1a2e;
  --color-bg-secondary: #16213e;
  --color-bg-tertiary: #0f3460;

  --color-accent: #e94560;
  --color-accent-hover: #c73450;

  --color-info: #53d8fb;
  --color-warning: #f0a500;
  --color-success: #4ade80;
  --color-error: #ff6b6b;
  --color-diamond: #ba68c8;

  --color-text-primary: #eee;
  --color-text-secondary: #aaa;
  --color-text-muted: #888;
  --color-text-dim: #666;
  --color-text-faint: #555;

  --color-border: #0f3460;

  --color-player-1: #53d8fb;
  --color-player-2: #e94560;

  --color-cell-hidden: #0f3460;
  --color-cell-hover: #1a4a8a;
  --color-cell-active-hover: #2562ad;
  --color-cell-revealed: #233554;
  --color-cell-diamond: #3d1e5c;

  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-xl: 12px;
  --radius-2xl: 16px;
}

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--color-bg-primary);
  color: var(--color-text-primary);
  min-height: 100vh;
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  padding: 16px 24px;
  background: var(--color-bg-secondary);
  border-bottom: 2px solid var(--color-border);
}

.app-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--color-accent);
  text-decoration: none;
}

.app-main {
  flex: 1;
  display: flex;
  justify-content: center;
  padding: 32px 16px;
}
</style>
