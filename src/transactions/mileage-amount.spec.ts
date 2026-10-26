import { mileageAmountPence } from './mileage-amount.js';

describe('mileageAmountPence', () => {
  it('prices 11,000 miles in one row at 55p then 25p', () => {
    const amounts = mileageAmountPence([
      { id: 1, occurredOn: new Date(Date.UTC(2026, 3, 6)), miles: 11_000 },
    ]);

    expect(amounts.get(1)).toBe(575_000);
  });

  it('continues the running total on the next row', () => {
    const amounts = mileageAmountPence([
      { id: 2, occurredOn: new Date(Date.UTC(2026, 3, 7)), miles: 5_000 },
      { id: 1, occurredOn: new Date(Date.UTC(2026, 3, 6)), miles: 6_000 },
    ]);

    expect(amounts.get(1)).toBe(330_000);
    expect(amounts.get(2)).toBe(245_000);
  });
});