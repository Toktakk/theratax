import { basePenceFromMinutes, effectiveHourRatePence } from './massage-hour-rate.js';

describe('massage hour rate', () => {
  it('adds the pregnancy extra onto the hourly rate, then prices whole hours', () => {
    const pregnancy = effectiveHourRatePence(2500, 200, 'pregnancy');
    const swedish = effectiveHourRatePence(2500, 200, 'swedish');

    expect(pregnancy).toBe(2700);
    expect(swedish).toBe(2500);
    expect(basePenceFromMinutes(120, pregnancy)).toBe(5400);
    expect(basePenceFromMinutes(120, swedish)).toBe(5000);
  });

  it('prices an hour and a half, and rounds a half pence up', () => {
    expect(basePenceFromMinutes(90, 2700)).toBe(4050);
    expect(basePenceFromMinutes(1, 30)).toBe(1);
    expect(basePenceFromMinutes(1, 29)).toBe(0);
  });
});
