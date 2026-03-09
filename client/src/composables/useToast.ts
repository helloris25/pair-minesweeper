import { ref } from 'vue';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

const toasts = ref<Toast[]>([]);
let nextId = 0;

export function useToast() {
  function show(message: string, type: Toast['type'] = 'info', duration = 3000) {
    const id = nextId++;
    toasts.value.push({ id, message, type });
    setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== id);
    }, duration);
  }

  function success(message: string, duration?: number) {
    show(message, 'success', duration);
  }

  function error(message: string, duration?: number) {
    show(message, 'error', duration);
  }

  function warning(message: string, duration?: number) {
    show(message, 'warning', duration);
  }

  return { toasts, show, success, error, warning };
}
