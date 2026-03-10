<template>
  <section class="panel create-panel">
    <div class="panel-hero">
      <h2>Новая игра</h2>
    </div>

    <div class="presets">
      <button
        type="button"
        class="preset-btn"
        :class="{ active: presetActive === 'fast' }"
        @click="applyPreset('fast')"
      >
        Быстрая
      </button>
      <button
        type="button"
        class="preset-btn"
        :class="{ active: presetActive === 'medium' }"
        @click="applyPreset('medium')"
      >
        Средняя
      </button>
      <button
        type="button"
        class="preset-btn"
        :class="{ active: presetActive === 'large' }"
        @click="applyPreset('large')"
      >
        Большое поле
      </button>
    </div>

    <form class="form" @submit.prevent="onSubmit">
      <label class="field">
        <span class="field-label">Размер поля</span>
        <input
          v-model.number="gridSize"
          type="number"
          min="2"
          max="6"
          required
          aria-describedby="field-size-hint"
        />
        <small id="field-size-hint" class="field-hint"
          >Сетка {{ gridSize }}×{{ gridSize }} (от 2×2 до 6×6)</small
        >
      </label>
      <label class="field">
        <span class="field-label">Количество алмазов</span>
        <input
          v-model.number="diamondsCount"
          type="number"
          min="1"
          :max="gridSize * gridSize - 1"
          step="2"
          required
          aria-describedby="diamonds-hint"
        />
        <small id="diamonds-hint" class="field-hint"
          >Нечётное число, не больше {{ gridSize * gridSize - 1 }}</small
        >
      </label>
      <label class="field">
        <span class="field-label">Время на ход, сек</span>
        <input
          v-model.number="turnTimeSeconds"
          type="number"
          min="5"
          max="120"
          step="5"
          required
          aria-describedby="time-hint"
        />
        <small id="time-hint" class="field-hint"
          >От 5 до 120 секунд — чем меньше, тем динамичнее</small
        >
      </label>
      <p v-if="createError" class="error" role="alert">{{ createError }}</p>
      <button type="submit" class="submit-btn" :disabled="creating">
        <span v-if="creating" class="btn-loading" aria-hidden="true" />
        {{ creating ? 'Создаём...' : 'Создать игру' }}
      </button>
    </form>
  </section>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useCreateGameForm } from '@/composables/useCreateGameForm';

const router = useRouter();
const {
  gridSize,
  diamondsCount,
  turnTimeSeconds,
  presetActive,
  creating,
  createError,
  applyPreset,
  submit,
} = useCreateGameForm();

async function onSubmit() {
  const gameId = await submit();
  if (gameId) {
    router.push(`/game/${gameId}`);
  }
}
</script>

<style scoped>
.panel {
  flex: 1;
  min-width: 260px;
  padding: 20px;
  background: var(--color-bg-secondary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  transition:
    box-shadow 0.3s ease,
    border-color 0.3s ease;
}

.panel:hover {
  border-color: rgba(233, 69, 96, 0.25);
  box-shadow: 0 10px 32px rgba(0, 0, 0, 0.2);
}

.panel-hero {
  margin-bottom: 14px;
  text-align: center;
}

.panel-hero h2 {
  margin: 0 0 6px;
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--color-accent);
}

.presets {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  padding-bottom: 12px;
  margin-bottom: 14px;
  border-bottom: 1px solid var(--color-border);
}

.preset-btn {
  padding: 6px 12px;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  cursor: pointer;
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition: all 0.2s ease;
}

.preset-btn:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.preset-btn.active {
  color: var(--color-accent);
  background: rgba(233, 69, 96, 0.15);
  border-color: var(--color-accent);
}

.form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text-primary);
}

.field-hint {
  font-size: 0.78rem;
  line-height: 1.3;
  color: var(--color-text-dim);
}

input {
  padding: 10px 14px;
  font-size: 1rem;
  color: var(--color-text-primary);
  background: var(--color-bg-primary);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

input:focus {
  outline: 2px solid var(--color-accent);
  outline-offset: -1px;
  border-color: transparent;
  box-shadow: 0 0 0 3px rgba(233, 69, 96, 0.2);
}

.submit-btn {
  position: relative;
  padding: 12px 24px;
  margin-top: 4px;
  font-size: 1.05rem;
  font-weight: 700;
  color: white;
  cursor: pointer;
  background: var(--color-accent);
  border: none;
  border-radius: var(--radius-md);
  transition:
    background 0.25s ease,
    transform 0.2s ease,
    box-shadow 0.25s ease;
}

.submit-btn:disabled {
  cursor: wait;
  opacity: 0.8;
}

.submit-btn:hover:not(:disabled) {
  background: var(--color-accent-hover);
  box-shadow: 0 4px 20px rgba(233, 69, 96, 0.4);
  transform: translateY(-1px);
}

.btn-loading {
  display: inline-block;
  width: 1em;
  height: 1em;
  margin-right: 8px;
  vertical-align: -0.2em;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error {
  margin: 0;
  font-size: 0.9rem;
  color: var(--color-error);
}
</style>
