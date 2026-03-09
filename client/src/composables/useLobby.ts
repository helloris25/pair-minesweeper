import { ref, onMounted, onUnmounted } from 'vue';
import { io, Socket } from 'socket.io-client';
import { API_URL } from '@/config';
import type { AvailableGameInfo } from '@/types/game';

export function useLobby() {
  const games = ref<AvailableGameInfo[]>([]);
  const connected = ref(false);
  let socket: Socket | null = null;
  let timeUpdateInterval: ReturnType<typeof setInterval> | null = null;

  onMounted(() => {
    socket = io(API_URL, { transports: ['websocket'] });

    socket.on('connect', () => {
      connected.value = true;
      socket!.emit('lobby:subscribe');
    });

    socket.on('disconnect', () => {
      connected.value = false;
    });

    socket.on('lobby:list', (list: AvailableGameInfo[]) => {
      games.value = list;
    });

    timeUpdateInterval = setInterval(() => {
      games.value = [...games.value];
    }, 10_000);
  });

  onUnmounted(() => {
    if (timeUpdateInterval) clearInterval(timeUpdateInterval);
    if (socket) {
      socket.emit('lobby:unsubscribe');
      socket.disconnect();
      socket = null;
    }
  });

  return { games, connected };
}
