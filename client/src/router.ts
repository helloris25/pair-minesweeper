import { createRouter, createWebHistory } from 'vue-router';
import HomePage from '@/pages/HomePage.vue';
import GamePage from '@/pages/GamePage.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: HomePage },
    { path: '/game/:gameId', component: GamePage, props: true },
  ],
});

export default router;
