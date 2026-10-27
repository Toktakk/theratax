import {
  allowableExpenseWhere,
  baselinePaidIncomeWhere,
  paidIncomePence,
  paidLineIncomeWhere,
  TAX_PERIOD_END,
  TAX_PERIOD_START,
} from './paid-income.js';

describe('paid income for tax', () => {
  it('sums paid invoice lines and a baseline invoice that has no lines', () => {
    expect(paidIncomePence(6700, null)).toBe(6700);
    expect(paidIncomePence(null, 6500)).toBe(6500);
    expect(paidIncomePence(6700, 6500)).toBe(13200);
    expect(paidIncomePence(null, null)).toBe(0);
  });

  it('keeps each sum inside this user and the 2026-27 tax year', () => {
    const period = { gte: TAX_PERIOD_START, lte: TAX_PERIOD_END };

    expect(paidLineIncomeWhere(4)).toEqual({
      occurredOn: period,
      invoice: { userId: 4, status: 'paid' },
    });
    expect(baselinePaidIncomeWhere(4)).toEqual({
      userId: 4,
      type: 'income',
      occurredOn: period,
      invoice: { userId: 4, status: 'paid', lines: { none: {} } },
    });
    expect(allowableExpenseWhere(8)).toEqual({
      userId: 8,
      type: 'expense',
      occurredOn: period,
    });
    expect(paidLineIncomeWhere(8).invoice.userId).toBe(8);
    expect(baselinePaidIncomeWhere(8).userId).toBe(8);
  });
});
