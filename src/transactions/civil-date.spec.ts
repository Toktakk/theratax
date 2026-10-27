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

  it('rejects 31 February', () => {
    expect(parseTaxYearDate('31-02-2026')).toBeNull();
  });

  it('round-trips the first day through UTC midnight', () => {
    const date = parseTaxYearDate('06-04-2026');
    expect(date).not.toBeNull();
    if (date !== null) {
      expect(date.toISOString()).toBe('2026-04-06T00:00:00.000Z');
      expect(formatCivilDate(date)).toBe('06-04-2026');
    }
  });

  it('accepts the last day of the tax year', () => {
    const date = parseTaxYearDate('05-04-2027');
    expect(date).not.toBeNull();
    if (date !== null) {
      expect(formatCivilDate(date)).toBe('05-04-2027');
    }
  });
});