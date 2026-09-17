export function getErrorMessage(err: unknown, fallback = 'Request failed'): string {
  if (err instanceof Error && err.message.trim()) return err.message;
  return fallback;
}
