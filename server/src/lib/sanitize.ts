/** Strip HTML tags and normalize whitespace for safe text storage. */
export function sanitizeText(value: string, maxLength = 500): string {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}
