import { summariseDay } from './summarise-day.js';

describe('summariseDay', () => {
  it('adds base, fee, and bonus once and does not add amountPence again', () => {
    const summary = summariseDay({
      date: '01-05-2026',
      incomes: [
        {
          amountPence: 1200,
          basePence: 1000,
          additionalFeePence: 200,
          massageType: 'swedish',
          customMassageType: null,
          workplaceId: 1,
        },
      ],
      bonuses: [{ totalPence: 300, workplaceId: 1 }],
      workplaces: [{ id: 1, name: 'North Spa', kind: 'spa' }],
    });

    expect(summary.totalPence).toBe(1500);
    expect(summary.basePence).toBe(1000);
    expect(summary.additionalFeePence).toBe(200);
    expect(summary.hourlyBonusPence).toBe(300);
    expect(summary.byMassageType).toEqual([
      { massageType: 'swedish', basePence: 1000, additionalFeePence: 200, totalPence: 1200 },
    ]);
    expect(summary.byWorkplace[0]?.totalPence).toBe(1500);
  });
});
