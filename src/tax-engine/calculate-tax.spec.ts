import { calculateTaxSummary } from './calculate-tax.js';

describe('calculateTaxSummary', () => {
  it('estimates tax on a £20,000 profit', () => {
    const summary = calculateTaxSummary({
      incomePence: 2_000_000,
      allowableExpensesPence: 0,
      expenseMethod: 'flat_rate',
    });

    expect(summary.taxYear).toBe('2026-27');
    expect(summary.periodStart).toBe('06-04-2026');
    expect(summary.periodEnd).toBe('05-04-2027');
    expect(summary.netProfitPence).toBe(2_000_000);
    expect(summary.taxableProfitPence).toBe(2_000_000);
    expect(summary.incomeTaxPence).toBe(148_600);
    expect(summary.class4NationalInsurancePence).toBe(44_580);
    expect(summary.estimatedTaxOwedPence).toBe(193_180);
    expect(summary.class2).toEqual({
      treatedAsPaid: true,
      voluntaryWeeklyPence: 365,
    });
    expect(summary.assumptions).toHaveLength(6);
    expect(summary.disclaimer).toBe(
      'TheraTax produces estimated tax figures for planning purposes only and is not a substitute for formal accounting or tax advice.',
    );
  });

  it('rounds each slice on its own', () => {
    const summary = calculateTaxSummary({
      incomePence: 5_027_025,
      allowableExpensesPence: 0,
      expenseMethod: 'actual_cost',
    });

    expect(summary.expenseMethod).toBe('actual_cost');
    expect(summary.incomeTaxPence).toBe(754_010);
    expect(summary.class4NationalInsurancePence).toBe(226_201);
    expect(summary.estimatedTaxOwedPence).toBe(980_211);
  });

  it('keeps a loss visible and charges no tax', () => {
    const summary = calculateTaxSummary({
      incomePence: 100_000,
      allowableExpensesPence: 250_000,
      expenseMethod: 'flat_rate',
    });

    expect(summary.netProfitPence).toBe(-150_000);
    expect(summary.taxableProfitPence).toBe(0);
    expect(summary.incomeTaxPence).toBe(0);
    expect(summary.class4NationalInsurancePence).toBe(0);
    expect(summary.estimatedTaxOwedPence).toBe(0);
    expect(summary.class2.treatedAsPaid).toBe(false);
    expect(summary.class2.voluntaryWeeklyPence).toBe(365);
  });
});