export interface TaxCalculationInput {
    incomePence: number;
    allowableExpensesPence: number;
    expenseMethod: 'flat_rate' | 'actual_cost';
  }
  
  export interface TaxSummary {
    taxYear: string;
    periodStart: string;
    periodEnd: string;
    expenseMethod: 'flat_rate' | 'actual_cost';
    incomePence: number;
    allowableExpensesPence: number;
    netProfitPence: number;
    taxableProfitPence: number;
    incomeTaxPence: number;
    class4NationalInsurancePence: number;
    estimatedTaxOwedPence: number;
    class2: {
      treatedAsPaid: boolean;
      voluntaryWeeklyPence: 365;
    };
    assumptions: string[];
    disclaimer: string;
  }
  
  const PERSONAL_ALLOWANCE_PENCE = 1_257_000;
  const BASIC_RATE_LIMIT_PENCE = 5_027_000;
  const ADDITIONAL_RATE_LIMIT_PENCE = 12_514_000;
  const CLASS2_THRESHOLD_PENCE = 710_500;
  
  const ASSUMPTIONS = [
    'Rates are for England, Wales, and Northern Ireland for 2026–27. Scottish Income Tax is not applied.',
    'Trading profit is treated as the user\'s only income. The personal allowance of £12,570 is applied in full and is not tapered.',
    'Cash basis: income counts when it is received, expenses when they are paid. Unpaid invoices are excluded.',
    'Student loans, pension contributions, Marriage Allowance, and other reliefs are not applied.',
    'Class 2 National Insurance is not included in estimated tax owed. At or above £7,105 it is treated as paid. Below that, voluntary Class 2 is £3.65 a week and is not added here.',
    'Flat-rate vehicle costs use simplified mileage for a car or van (55p then 25p). Motorcycle rates are not applied.',
  ];
  
  const DISCLAIMER =
    'TheraTax produces estimated tax figures for planning purposes only and is not a substitute for formal accounting or tax advice.';
  
  function sliceBetween(profitPence: number, fromPence: number, toPence: number): number {
    return Math.max(0, Math.min(profitPence, toPence) - fromPence);
  }
  
  function sliceAbove(profitPence: number, fromPence: number): number {
    return Math.max(0, profitPence - fromPence);
  }
  
  function roundToPenny(numerator: number): number {
    const quotient = Math.trunc(numerator / 100);
    const remainder = numerator % 100;
    if (remainder >= 50) {
      return quotient + 1;
    }
    return quotient;
  }
  
  export function calculateTaxSummary(input: TaxCalculationInput): TaxSummary {
    const netProfitPence = input.incomePence - input.allowableExpensesPence;
    const taxableProfitPence = Math.max(0, netProfitPence);
    const basicSlice = sliceBetween(
      taxableProfitPence,
      PERSONAL_ALLOWANCE_PENCE,
      BASIC_RATE_LIMIT_PENCE,
    );
    const higherSlice = sliceBetween(
      taxableProfitPence,
      BASIC_RATE_LIMIT_PENCE,
      ADDITIONAL_RATE_LIMIT_PENCE,
    );
    const additionalSlice = sliceAbove(taxableProfitPence, ADDITIONAL_RATE_LIMIT_PENCE);
    const incomeTaxPence =
      roundToPenny(basicSlice * 20) +
      roundToPenny(higherSlice * 40) +
      roundToPenny(additionalSlice * 45);
    const class4NationalInsurancePence =
      roundToPenny(basicSlice * 6) +
      roundToPenny(sliceAbove(taxableProfitPence, BASIC_RATE_LIMIT_PENCE) * 2);
  
    return {
      taxYear: '2026-27',
      periodStart: '06-04-2026',
      periodEnd: '05-04-2027',
      expenseMethod: input.expenseMethod,
      incomePence: input.incomePence,
      allowableExpensesPence: input.allowableExpensesPence,
      netProfitPence,
      taxableProfitPence,
      incomeTaxPence,
      class4NationalInsurancePence,
      estimatedTaxOwedPence: incomeTaxPence + class4NationalInsurancePence,
      class2: {
        treatedAsPaid: taxableProfitPence >= CLASS2_THRESHOLD_PENCE,
        voluntaryWeeklyPence: 365,
      },
      assumptions: ASSUMPTIONS,
      disclaimer: DISCLAIMER,
    };
  }