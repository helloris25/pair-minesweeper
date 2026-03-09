export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:3000';

export function toApiUrl(path: string): string {
  return new URL(path, API_URL).toString();
}
