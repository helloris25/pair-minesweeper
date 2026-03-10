<template>
  <div class="game-page">
    <!-- Нет состояния игры — показываем загрузку -->
    <template v-if="!gameState">
      <GameConnecting :error="error" />
    </template>

    <template v-else>
      <!-- Ожидание второго игрока -->
      <template v-if="gameState.status === 'waiting'">
        <GameWaitingModal
          :board="gameState.board"
          :grid-size="gameState.gridSize"
          :invite-url="inviteUrl"
          :can-share="canShare"
          @copy="copyGameId"
          @share="shareGame"
          @cancel="onCancel"
        />
      </template>

      <!-- Идёт игра -->
      <template v-else>
        <div class="game-info">
          <GameAlerts
            :opponent-disconnected-seconds="opponentDisconnectedSeconds"
            :player-left="playerLeft"
            :extra-turn="extraTurn"
          />
          <GameScoreboard
            :game-state="gameState"
            :time-left="timeLeft"
            :time-left-percent="timeLeftPercent"
            @surrender="onSurrender"
          />
        </div>

        <div class="game-center-viewport">
          <GameBoard
            :board="gameState.board"
            :grid-size="gameState.gridSize"
            :can-click="isMyTurn"
            @cell-click="onCellClick"
          />
        </div>
      </template>

      <!-- Модалка конца игры -->
      <GameOverOverlay
        :game-over="gameOver"
        :player-number="gameState?.playerNumber ?? 1"
        @go-home="goHome"
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSocket } from '@/composables/useSocket';
import { useToast } from '@/composables/useToast';
import { useInviteShare } from '@/composables/useInviteShare';
import { useTurnTimer } from '@/composables/useTurnTimer';
import { useGamePageWatchers } from '@/composables/useGamePageWatchers';
import GameBoard from '@/components/GameBoard.vue';
import GameConnecting from '@/components/game/GameConnecting.vue';
import GameWaitingModal from '@/components/game/GameWaitingModal.vue';
import GameAlerts from '@/components/game/GameAlerts.vue';
import GameScoreboard from '@/components/game/GameScoreboard.vue';
import GameOverOverlay from '@/components/game/GameOverOverlay.vue';

const props = defineProps<{ gameId: string }>();
const router = useRouter();
const toast = useToast();

// Состояние игры и сокет
const {
  gameState,
  gameOver,
  error,
  unavailable,
  cancelled,
  playerLeft,
  extraTurn,
  playerReplaced,
  opponentDisconnectedSeconds,
  connect,
  joinGame,
  openCell,
  surrender,
  cancelGame,
  connected,
} = useSocket();

// Приглашение и шаринг ссылки
const { inviteUrl, canShare, copyGameId, shareGame, clearCopyTimer } = useInviteShare(props.gameId);

// Таймер хода (обновление раз в 80 мс для плавной полоски)
const { timeLeft, timeLeftPercent, startTicker, stopTicker } = useTurnTimer(gameState);

// Навигация, тосты при ошибках/отмене, beforeunload
const { goHome } = useGamePageWatchers({
  gameId: props.gameId,
  router,
  toast,
  socket: {
    gameState,
    unavailable,
    cancelled,
    playerReplaced,
    connected,
  },
  onConnected: () => joinGame(props.gameId),
});

const isMyTurn = computed(() => {
  if (!gameState.value) return false;
  return (
    gameState.value.status === 'playing' &&
    gameState.value.currentTurn === gameState.value.playerNumber
  );
});

function onCellClick(row: number, col: number) {
  openCell(props.gameId, row, col);
}

function onCancel() {
  cancelGame(props.gameId);
}

function onSurrender() {
  const confirmed = window.confirm('Вы уверены, что хотите сдаться?');
  if (confirmed) {
    surrender(props.gameId);
  }
}

onMounted(() => {
  connect();
  startTicker();
});

onUnmounted(() => {
  stopTicker();
  clearCopyTimer();
});
</script>

<style scoped>
.game-page {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 600px;
  height: 100%;
  min-height: 0;
  margin: 0 auto;
}

.game-info {
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding-bottom: 6px;
}

.game-center-viewport {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 0;
  padding: 8px 0;
}
</style>
