import { summariseDay } from './summarise-day.js';

describe('summariseDay', () => {
  it('adds base, fee, and bonus once and does not add amountPence again', () => {
    const summary = summariseDay({
      date: '01-05-2026',
      incomes: [
        {
          amountPence: 6700,
          basePence: 6000,
          additionalFeePence: 200,
          bonusPence: 500,
          massageType: 'swedish',
          customMassageType: null,
          workplaceId: 1,
        },
      ],
      workplaces: [{ id: 1, name: 'North Spa', kind: 'spa' }],
    });

    expect(summary.totalPence).toBe(6700);
    expect(summary.basePence).toBe(6000);
    expect(summary.additionalFeePence).toBe(200);
    expect(summary.bonusPence).toBe(500);
    expect(summary.byMassageType).toEqual([
      {
        massageType: 'swedish',
        basePence: 6000,
        additionalFeePence: 200,
        bonusPence: 500,
        totalPence: 6700,
      },
    ]);
    expect(summary.byWorkplace[0]?.bonusPence).toBe(500);
    expect(summary.byWorkplace[0]?.totalPence).toBe(6700);
  });

  it('counts cash income as base and leaves both breakdowns empty', () => {
    const summary = summariseDay({
      date: '02-05-2026',
      incomes: [
        {
          amountPence: 4000,
          basePence: null,
          additionalFeePence: null,
          bonusPence: 500,
          massageType: null,
          customMassageType: null,
          workplaceId: null,
        },
      ],
      workplaces: [],
    });

    expect(summary.basePence).toBe(4000);
    expect(summary.additionalFeePence).toBe(0);
    expect(summary.bonusPence).toBe(0);
    expect(summary.totalPence).toBe(4000);
    expect(summary.byWorkplace).toEqual([]);
    expect(summary.byMassageType).toEqual([]);
  });

  it('groups two workplaces and merges rows of the same massage type', () => {
    const summary = summariseDay({
      date: '01-05-2026',
      incomes: [
        {
          amountPence: 1200,
          basePence: 1000,
          additionalFeePence: 200,
          bonusPence: 0,
          massageType: 'swedish',
          customMassageType: null,
          workplaceId: 1,
        },
        {
          amountPence: 1500,
          basePence: 1500,
          additionalFeePence: 0,
          bonusPence: 0,
          massageType: 'swedish',
          customMassageType: null,
          workplaceId: 2,
        },
      ],
      workplaces: [
        { id: 2, name: 'City Clinic', kind: 'clinic' },
        { id: 1, name: 'North Spa', kind: 'spa' },
      ],
    });

    expect(summary.totalPence).toBe(2700);
    expect(summary.byWorkplace.map((workplace) => workplace.name)).toEqual([
      'City Clinic',
      'North Spa',
    ]);
    expect(summary.byMassageType).toEqual([
      {
        massageType: 'swedish',
        basePence: 2500,
        additionalFeePence: 200,
        bonusPence: 0,
        totalPence: 2700,
      },
    ]);
  });
});
