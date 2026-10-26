import type { ExpenseCategory, ExpenseMethod } from './types.ts';

export function categoriesForMethod(
  categories: readonly ExpenseCategory[],
  expenseMethod: ExpenseMethod,
): ExpenseCategory[] {
  return categories.filter((category) => {
    if (category.kind === 'general') {
      return true;
    }
    if (expenseMethod === 'flat_rate') {
      return category.kind === 'mileage';
    }
    return category.kind === 'vehicle_actual';
  });
}

export function categoryName(
  categories: readonly ExpenseCategory[],
  slug: string,
): string {
  const found = categories.find((category) => category.slug === slug);
  return found === undefined ? slug : found.name;
}
