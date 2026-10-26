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
          massageType: 'sport',
          customMassageType: null,
        },
        {
          id: 1,
          occurredOn: '01-05-2026',
          amountPence: 1200,
          basePence: 1000,
          additionalFeePence: 200,
          massageType: 'swedish',
          customMassageType: null,
        },
      ],
      bonuses: [
        {
          id: 9,
          occurredOn: '01-05-2026',
          eligibleMinutes: 90,
          ratePencePerHour: 200,
          totalPence: 300,
        },
      ],
    });

    expect(lines.map((line) => line.description)).toEqual([
      'Swedish',
      'Additional fee',
      'Hourly bonus',
      'Sport Massage',
    ]);
    expect(lines.map((line) => line.occurredOn)).toEqual([
      '01-05-2026',
      '01-05-2026',
      '01-05-2026',
      '01-06-2026',
    ]);
    expect(invoiceLinesTotalPence(lines.filter((line) => line.occurredOn === '01-05-2026'))).toBe(1500);
    expect(lines[0]).toMatchObject({
      kind: 'service',
      quantity: 1,
      quantityUnit: 'session',
      ratePence: 1000,
      amountPence: 1000,
      sourceTransactionId: 1,
    });
    expect(lines[2]).toMatchObject({
      kind: 'hourly_bonus',
      quantity: 90,
      quantityUnit: 'minute',
      ratePence: 200,
      amountPence: 300,
      sourceBonusId: 9,
    });
  });
});
