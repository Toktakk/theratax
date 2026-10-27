import { readHourExtras } from './hour-extra.js';

describe('hour extras', () => {
  it('keeps several treatment extras and trims an other name', () => {
    const rows = readHourExtras([
      { massageType: 'pregnancy', extraPence: 200 },
      { massageType: 'request', extraPence: 200 },
      { massageType: 'body_scrub', extraPence: 500 },
      { massageType: 'other', customMassageType: '  Chair  ', extraPence: 300 },
    ]);

    expect(rows).toEqual([
      { massageType: 'pregnancy', customMassageType: null, extraPence: 200 },
      { massageType: 'request', customMassageType: null, extraPence: 200 },
      { massageType: 'body_scrub', customMassageType: null, extraPence: 500 },
      { massageType: 'other', customMassageType: 'Chair', extraPence: 300 },
    ]);
  });

  it('rejects a repeated type and the same other name with different capitals', () => {
    expect(() =>
      readHourExtras([
        { massageType: 'pregnancy', extraPence: 200 },
        { massageType: 'pregnancy', extraPence: 300 },
      ]),
    ).toThrow('Hour extra already set for this massage type');

    expect(() =>
      readHourExtras([
        { massageType: 'other', customMassageType: 'Chair', extraPence: 200 },
        { massageType: 'other', customMassageType: 'chair', extraPence: 300 },
      ]),
    ).toThrow('Hour extra already set for this massage type');
  });

  it('requires a custom name only for other', () => {
    expect(() => readHourExtras([{ massageType: 'other', extraPence: 200 }])).toThrow(
      'Custom massage type is required',
    );
    expect(() =>
      readHourExtras([{ massageType: 'request', customMassageType: 'Chair', extraPence: 200 }]),
    ).toThrow('Custom massage type is only valid for other');
  });
});
