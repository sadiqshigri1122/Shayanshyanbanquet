/** Client-side checks aligned with backend Zod rules. */

export function validatePhone(phone: string): string | null {
  const trimmed = phone.trim();
  if (trimmed.length < 7) return 'Phone must be at least 7 characters.';
  if (trimmed.length > 20) return 'Phone must be 20 characters or fewer.';
  return null;
}

export function validateEmailOptional(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'Enter a valid email address.';
  return null;
}

export function validatePositiveInt(value: number, label = 'Quantity'): string | null {
  if (!Number.isFinite(value) || value < 1 || !Number.isInteger(value)) {
    return `${label} must be a whole number of at least 1.`;
  }
  return null;
}

export function validateNonNegativeInt(value: number, label = 'Quantity'): string | null {
  if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
    return `${label} must be a whole number of 0 or more.`;
  }
  return null;
}
