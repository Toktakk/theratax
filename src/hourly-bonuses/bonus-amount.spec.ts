import { bonusTotalPence } from './bonus-amount.js';

describe('bonusTotalPence', () => {
  it('prices 90 minutes at 200 pence an hour as 300 pence', () => {
    expect(bonusTotalPence(90, 200)).toBe(300);
  });

  it('rounds a remainder of 40 up to the next penny', () => {
    expect(bonusTotalPence(1, 100)).toBe(2);
  });
});
