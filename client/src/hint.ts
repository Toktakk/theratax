import type { ExpenseCategory } from './types.ts';

export function suggestCategory(
  categories: readonly ExpenseCategory[],
  note: string,
): ExpenseCategory | null {
  const lowered = note.toLowerCase();
  if (lowered.trim() === '') {
    return null;
  }
  for (const category of categories) {
    for (const keyword of category.keywords) {
      if (keyword !== '' && lowered.includes(keyword.toLowerCase())) {
        return category;
      }
    }
  }
  return null;
}
