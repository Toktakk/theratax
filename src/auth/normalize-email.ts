export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function normalizeEmailValue({ value }: { value: unknown }): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  return normalizeEmail(value);
}
