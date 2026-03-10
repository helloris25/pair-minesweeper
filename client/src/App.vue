<template>
  <div class="app">
    <div class="bg-gradient" aria-hidden="true" />
    <div class="bg-noise" aria-hidden="true" />
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
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap');

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

  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --shadow-glow-accent: 0 0 24px rgba(233, 69, 96, 0.35);
  --shadow-glow-info: 0 0 20px rgba(83, 216, 251, 0.3);
}

*,
*::before,
*::after {
  box-sizing: border-box;
  padding: 0;
  margin: 0;
}

body {
  min-height: 100vh;
  font-family:
    'Outfit',
    -apple-system,
    BlinkMacSystemFont,
    sans-serif;
  color: var(--color-text-primary);
  background: var(--color-bg-primary);
}

.app {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  isolation: isolate;
}

.bg-gradient {
  position: fixed;
  inset: 0;
  z-index: -2;
  background:
    radial-gradient(ellipse 80% 50% at 50% -20%, rgba(233, 69, 96, 0.15), transparent),
    radial-gradient(ellipse 60% 40% at 80% 100%, rgba(83, 216, 251, 0.08), transparent),
    radial-gradient(ellipse 50% 30% at 10% 80%, rgba(186, 104, 200, 0.06), transparent);
  animation: bg-shift 12s ease-in-out infinite alternate;
}

.bg-noise {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  opacity: 0.035;
}

@keyframes bg-shift {
  from {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
  to {
    opacity: 0.9;
    transform: scale(1.02) translateY(-2%);
  }
}

.app-title {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--color-accent);
  letter-spacing: -0.02em;
  text-decoration: none;
  transition:
    text-shadow 0.3s ease,
    transform 0.2s ease;
}

.app-title:hover {
  text-shadow: var(--shadow-glow-accent);
  transform: translateY(-1px);
}

.app-main {
  display: flex;
  flex: 1;
  justify-content: center;
  min-height: 0;
  padding: 10px 12px;
  overflow: hidden;
}
</style>
