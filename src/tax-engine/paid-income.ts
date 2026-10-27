export const TAX_PERIOD_START = new Date(Date.UTC(2026, 3, 6));
export const TAX_PERIOD_END = new Date(Date.UTC(2027, 3, 5));

const period = { gte: TAX_PERIOD_START, lte: TAX_PERIOD_END };

export function paidLineIncomeWhere(userId: number): {
  occurredOn: { gte: Date; lte: Date };
  invoice: { userId: number; status: 'paid' };
} {
  return {
    occurredOn: period,
    invoice: { userId, status: 'paid' },
  };
}

export function baselinePaidIncomeWhere(userId: number): {
  userId: number;
  type: 'income';
  occurredOn: { gte: Date; lte: Date };
  invoice: { userId: number; status: 'paid'; lines: { none: Record<string, never> } };
} {
  return {
    userId,
    type: 'income',
    occurredOn: period,
    invoice: { userId, status: 'paid', lines: { none: {} } },
  };
}

export function allowableExpenseWhere(userId: number): {
  userId: number;
  type: 'expense';
  occurredOn: { gte: Date; lte: Date };
} {
  return {
    userId,
    type: 'expense',
    occurredOn: period,
  };
}

export function paidIncomePence(linePence: number | null, baselinePence: number | null): number {
  return (linePence ?? 0) + (baselinePence ?? 0);
}
