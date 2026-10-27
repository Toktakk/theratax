import { describe, expect, it } from 'vitest';
import { insertByName, replaceByName } from './directory-forms.tsx';

describe('directory order', () => {
  it('inserts and replaces rows by name then id', () => {
    const inserted = insertByName(
      [
        { id: 2, name: 'North Spa' },
        { id: 1, name: 'City Clinic' },
      ],
      { id: 3, name: 'Ada Client' },
    );
    expect(inserted.map((row) => row.name)).toEqual(['Ada Client', 'City Clinic', 'North Spa']);

    const replaced = replaceByName(inserted, { id: 2, name: 'South Spa' });
    expect(replaced.map((row) => row.name)).toEqual(['Ada Client', 'City Clinic', 'South Spa']);
  });
});
