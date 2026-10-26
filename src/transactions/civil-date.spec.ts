import { formatCivilDate, parseTaxYearDate } from './civil-date.js';

describe('parseTaxYearDate', () => {
  it('accepts the first day of the tax year', () => {
    const date = parseTaxYearDate('06-04-2026');
    expect(date).not.toBeNull();
    if (date !== null) {
      expect(formatCivilDate(date)).toBe('06-04-2026');
    }
  });

  it('rejects the day before the tax year', () => {
    expect(parseTaxYearDate('05-04-2026')).toBeNull();
  });
});