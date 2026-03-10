import { ref, watch, computed } from 'vue';
import { createGame } from '@/api/games';

export const PRESETS = {
  fast: { gridSize: 4, diamondsCount: 3, turnTimeSeconds: 15 },
  medium: { gridSize: 5, diamondsCount: 5, turnTimeSeconds: 30 },
  large: { gridSize: 6, diamondsCount: 9, turnTimeSeconds: 45 },
} as const;

export type PresetKey = keyof typeof PRESETS;

/** Размеры поля: 2×2 … 6×6 */
export const GRID_SIZE_OPTIONS = [2, 3, 4, 5, 6] as const;

/** Допустимые значения времени на ход (сек) для чипов */
export const TURN_TIME_OPTIONS = [15, 30, 45, 60, 90, 120] as const;

function oddNumbersUpTo(max: number): number[] {
  const result: number[] = [];
  for (let n = 1; n <= max; n += 2) result.push(n);
  return result;
}

export function useCreateGameForm() {
  const gridSize = ref(5);
  const diamondsCount = ref(5);
  const turnTimeSeconds = ref(30);
  const creating = ref(false);
  const createError = ref('');
  const presetActive = ref<PresetKey | null>('medium');

  const diamondOptions = computed(() => {
    const max = gridSize.value * gridSize.value - 1;
    return oddNumbersUpTo(max);
  });

  watch(gridSize, (newSize) => {
    const max = newSize * newSize - 1;
    const options = oddNumbersUpTo(max);
    const current = diamondsCount.value;
    if (current > max || current % 2 === 0 || !options.includes(current)) {
      diamondsCount.value = options[options.length - 1] ?? 1;
    }
  });

  function applyPreset(key: PresetKey) {
    const p = PRESETS[key];
    gridSize.value = p.gridSize;
    diamondsCount.value = p.diamondsCount;
    turnTimeSeconds.value = p.turnTimeSeconds;
    presetActive.value = key;
    createError.value = '';
  }

  watch([gridSize, diamondsCount, turnTimeSeconds], () => {
    const g = gridSize.value;
    const d = diamondsCount.value;
    const t = turnTimeSeconds.value;
    if (
      g === PRESETS.fast.gridSize &&
      d === PRESETS.fast.diamondsCount &&
      t === PRESETS.fast.turnTimeSeconds
    ) {
      presetActive.value = 'fast';
    } else if (
      g === PRESETS.medium.gridSize &&
      d === PRESETS.medium.diamondsCount &&
      t === PRESETS.medium.turnTimeSeconds
    ) {
      presetActive.value = 'medium';
    } else if (
      g === PRESETS.large.gridSize &&
      d === PRESETS.large.diamondsCount &&
      t === PRESETS.large.turnTimeSeconds
    ) {
      presetActive.value = 'large';
    } else {
      presetActive.value = null;
    }
  });

  /** Возвращает gameId при успехе или null при ошибке (createError уже установлен). */
  async function submit(): Promise<string | null> {
    createError.value = '';

    if (diamondsCount.value % 2 === 0) {
      createError.value = 'Количество алмазов должно быть нечётным';
      return null;
    }
    if (diamondsCount.value >= gridSize.value * gridSize.value) {
      createError.value = 'Слишком много алмазов для данного размера поля';
      return null;
    }

    creating.value = true;
    try {
      const { gameId } = await createGame({
        gridSize: gridSize.value,
        diamondsCount: diamondsCount.value,
        turnTimeSeconds: turnTimeSeconds.value,
      });
      return gameId;
    } catch (err) {
      createError.value = err instanceof Error ? err.message : 'Ошибка сети';
      return null;
    } finally {
      creating.value = false;
    }
  }

  return {
    gridSize,
    diamondsCount,
    turnTimeSeconds,
    diamondOptions,
    presetActive,
    creating,
    createError,
    applyPreset,
    submit,
  };
}
