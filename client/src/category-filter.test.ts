import { describe, expect, it } from 'vitest';
import { categoriesForMethod } from './category-filter.ts';
import type { ExpenseCategory } from './types.ts';

const categories: ExpenseCategory[] = [
  { slug: 'oils-consumables', name: 'Oils', keywords: ['oil'], kind: 'general' },
  { slug: 'mileage', name: 'Mileage', keywords: ['miles'], kind: 'mileage' },
  { slug: 'vehicle-costs', name: 'Vehicle costs', keywords: ['mot'], kind: 'vehicle_actual' },
];

describe('categoriesForMethod', () => {
  it('keeps general categories and the vehicle kind that matches the method', () => {
    expect(categoriesForMethod(categories, 'flat_rate').map((category) => category.slug)).toEqual([
      'oils-consumables',
      'mileage',
    ]);
    expect(categoriesForMethod(categories, 'actual_cost').map((category) => category.slug)).toEqual([
      'oils-consumables',
      'vehicle-costs',
    ]);
  });
});
