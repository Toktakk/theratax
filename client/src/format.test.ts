import { describe, expect, it } from 'vitest';
import {
  basePenceFromMinutes,
  civilDateFromInput,
  effectiveHourRatePence,
  formatHours,
  formatPounds,
  hoursLabel,
  massageTypeLabel,
  readAmountPence,
} from './format.ts';

describe('format', () => {
  it('formats pounds and pence, including a negative amount', () => {
    expect(formatPounds(6700)).toBe('£67.00');
    expect(formatPounds(1)).toBe('£0.01');
    expect(formatPounds(-50)).toBe('-£0.50');
  });

  it('reads pounds and pence and rejects pence above 99', () => {
    expect(readAmountPence('2', '5')).toEqual({ ok: true, amountPence: 205 });
    expect(readAmountPence('1', '100').ok).toBe(false);
  });

  it('labels massage types and uses a custom name for other', () => {
    expect(massageTypeLabel('swedish')).toBe('Swedish');
    expect(massageTypeLabel('other', 'Hot towel')).toBe('Hot towel');
  });

  it('turns hours into minutes and prices a session', () => {
    expect(formatHours(90)).toBe('1.5');
    expect(hoursLabel(60)).toBe('1 hour');
    expect(hoursLabel(90)).toBe('1.5 hours');
    expect(
      effectiveHourRatePence(2500, [{ massageType: 'pregnancy', extraPence: 200 }], 'pregnancy'),
    ).toBe(2700);
    expect(basePenceFromMinutes(90, 2700)).toBe(4050);
  });

  it('converts an input date to a civil date', () => {
    expect(civilDateFromInput('2026-05-01')).toBe('01-05-2026');
    expect(civilDateFromInput('')).toBeUndefined();
  });
});
