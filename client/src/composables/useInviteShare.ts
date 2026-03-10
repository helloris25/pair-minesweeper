import { computed, ref } from 'vue';
import { useToast } from '@/composables/useToast';

export function useInviteShare(gameId: string) {
  const toast = useToast();
  const copyLabel = ref('Копировать ссылку');
  let copyResetTimer: ReturnType<typeof setTimeout> | null = null;

  const inviteUrl = computed(() => {
    if (typeof window === 'undefined' || !gameId) return '';
    return `${window.location.origin}/game/${gameId}`;
  });

  const canShare = ref(typeof navigator !== 'undefined' && typeof navigator.share === 'function');

  async function copyGameId() {
    const url = `${window.location.origin}/game/${gameId}`;
    try {
      await navigator.clipboard.writeText(url);
      copyLabel.value = 'Скопировано!';
      toast.success('Ссылка скопирована');
    } catch {
      copyLabel.value = 'Ошибка';
      toast.error('Не удалось скопировать');
    }
    if (copyResetTimer) clearTimeout(copyResetTimer);
    copyResetTimer = setTimeout(() => {
      copyLabel.value = 'Копировать ссылку';
    }, 2000);
  }

  async function shareGame() {
    const url = `${window.location.origin}/game/${gameId}`;
    try {
      await navigator.share({
        title: 'Парный обратный сапёр',
        text: 'Присоединяйся к игре',
        url,
      });
      toast.success('Поделились');
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        toast.error('Не удалось поделиться');
      }
    }
  }

  function clearCopyTimer() {
    if (copyResetTimer) {
      clearTimeout(copyResetTimer);
      copyResetTimer = null;
    }
  }

  return { inviteUrl, copyLabel, canShare, copyGameId, shareGame, clearCopyTimer };
}
