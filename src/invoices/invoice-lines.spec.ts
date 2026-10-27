import { buildInvoiceLines, invoiceLinesTotalPence } from './invoice-lines.js';

describe('buildInvoiceLines', () => {
  it('snapshots service, fee, and bonus once, ordered by date then kind', () => {
    const lines = buildInvoiceLines({
      incomes: [
        {
          id: 2,
          occurredOn: '01-06-2026',
          amountPence: 400,
          basePence: 400,
          additionalFeePence: 0,
          bonusPence: 0,
          massageType: 'sport',
          customMassageType: null,
        },
        {
          id: 1,
          occurredOn: '01-05-2026',
          amountPence: 6700,
          basePence: 6000,
          additionalFeePence: 200,
          bonusPence: 500,
          massageType: 'swedish',
          customMassageType: null,
        },
      ],
    });

    expect(lines.map((line) => line.description)).toEqual([
      'Swedish',
      'Additional Massage Fee',
      'Bonus',
      'Sport Massage',
    ]);
    expect(lines.map((line) => line.occurredOn)).toEqual([
      '01-05-2026',
      '01-05-2026',
      '01-05-2026',
      '01-06-2026',
    ]);
    expect(invoiceLinesTotalPence(lines.filter((line) => line.occurredOn === '01-05-2026'))).toBe(
      6700,
    );
    expect(lines[0]).toMatchObject({
      kind: 'service',
      quantity: 1,
      quantityUnit: 'session',
      ratePence: 6000,
      amountPence: 6000,
      sourceTransactionId: 1,
    });
    expect(lines[2]).toMatchObject({
      kind: 'bonus',
      quantity: 1,
      quantityUnit: 'session',
      ratePence: 500,
      amountPence: 500,
      sourceTransactionId: 1,
    });
  });
});
