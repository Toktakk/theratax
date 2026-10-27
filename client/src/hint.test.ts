import { describe, expect, it } from 'vitest';
import { suggestCategory } from './hint.ts';
import type { ExpenseCategory } from './types.ts';

const categories: ExpenseCategory[] = [
  { slug: 'oils-consumables', name: 'Oils and consumables', keywords: ['oil'], kind: 'general' },
  { slug: 'other', name: 'Other', keywords: [], kind: 'general' },
];

describe('suggestCategory', () => {
  it('matches a keyword in the note and ignores a blank note', () => {
    expect(suggestCategory(categories, 'Olive oil')?.slug).toBe('oils-consumables');
    expect(suggestCategory(categories, '   ')).toBeNull();
    expect(suggestCategory(categories, 'rent')).toBeNull();
  });
});
