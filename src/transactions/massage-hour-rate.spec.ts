import { basePenceFromMinutes, effectiveHourRatePence } from './massage-hour-rate.js';

const extras = [
  { massageType: 'pregnancy', extraPence: 200 },
  { massageType: 'request', extraPence: 200 },
  { massageType: 'body_scrub', extraPence: 500 },
  { massageType: 'other', customMassageType: 'Chair', extraPence: 300 },
];

describe('massage hour rate', () => {
  it('adds the matching treatment extra, then prices whole hours', () => {
    const pregnancy = effectiveHourRatePence(2500, extras, 'pregnancy');
    const request = effectiveHourRatePence(2500, extras, 'request');
    const bodyScrub = effectiveHourRatePence(2500, extras, 'body_scrub');
    const swedish = effectiveHourRatePence(2500, extras, 'swedish');

    expect(pregnancy).toBe(2700);
    expect(request).toBe(2700);
    expect(bodyScrub).toBe(3000);
    expect(swedish).toBe(2500);
    expect(basePenceFromMinutes(120, pregnancy)).toBe(5400);
    expect(basePenceFromMinutes(120, request)).toBe(5400);
    expect(basePenceFromMinutes(120, bodyScrub)).toBe(6000);
    expect(basePenceFromMinutes(120, swedish)).toBe(5000);
  });

  it('matches an other extra by custom name, ignoring case', () => {
    expect(effectiveHourRatePence(2500, extras, 'other', 'chair')).toBe(2800);
    expect(effectiveHourRatePence(2500, extras, 'other', 'Stone')).toBe(2500);
  });

  it('prices an hour and a half, and rounds a half pence up', () => {
    expect(basePenceFromMinutes(90, 2700)).toBe(4050);
    expect(basePenceFromMinutes(1, 30)).toBe(1);
    expect(basePenceFromMinutes(1, 29)).toBe(0);
  });
});
