import { BadRequestException } from '@nestjs/common';
import {
  addressLines,
  normaliseUkPostcode,
  readPostalAddress,
  storedAddress,
} from './postal-address.js';

describe('normaliseUkPostcode', () => {
  it('stores a standard UK postcode in uppercase with one space', () => {
    expect(normaliseUkPostcode('sw1a1aa')).toBe('SW1A 1AA');
    expect(normaliseUkPostcode(' ec1a 1bb ')).toBe('EC1A 1BB');
    expect(normaliseUkPostcode('M1 1AE')).toBe('M1 1AE');
    expect(normaliseUkPostcode('b338th')).toBe('B33 8TH');
    expect(normaliseUkPostcode('GIR 0AA')).toBe('GIR 0AA');
  });

  it('rejects a code that is not a UK postcode', () => {
    expect(normaliseUkPostcode('12345')).toBeNull();
    expect(normaliseUkPostcode('INVALID')).toBeNull();
    expect(normaliseUkPostcode('SW1A')).toBeNull();
  });
});

describe('readPostalAddress', () => {
  it('trims the lines and normalises the postcode', () => {
    expect(
      readPostalAddress({
        addressLine1: ' 12 High Street ',
        addressLine2: '  ',
        town: ' London ',
        postcode: 'sw1a1aa',
      }),
    ).toEqual({
      addressLine1: '12 High Street',
      town: 'London',
      postcode: 'SW1A 1AA',
    });
  });

  it('keeps a second line when one was typed', () => {
    expect(
      readPostalAddress({
        addressLine1: '12 High Street',
        addressLine2: 'Flat 2',
        town: 'London',
        postcode: 'SW1A 1AA',
      }).addressLine2,
    ).toBe('Flat 2');
  });

  it('rejects a blank town', () => {
    expect(() =>
      readPostalAddress({
        addressLine1: '12 High Street',
        town: '   ',
        postcode: 'SW1A 1AA',
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects a postcode that is not a UK postcode', () => {
    expect(() =>
      readPostalAddress({
        addressLine1: '12 High Street',
        town: 'London',
        postcode: 'not-a-code',
      }),
    ).toThrow('Enter a UK postcode');
  });
});

describe('storedAddress', () => {
  it('omits a blank second line and returns null until the address is complete', () => {
    expect(
      storedAddress({
        addressLine1: '12 High Street',
        addressLine2: null,
        town: 'London',
        postcode: 'SW1A 1AA',
      }),
    ).toEqual({
      addressLine1: '12 High Street',
      town: 'London',
      postcode: 'SW1A 1AA',
    });
    expect(
      storedAddress({
        addressLine1: null,
        addressLine2: null,
        town: null,
        postcode: null,
      }),
    ).toBeNull();
  });
});

describe('addressLines', () => {
  it('uses a placeholder when the invoice has no stored address', () => {
    expect(addressLines(null)).toEqual(['Address not recorded']);
  });
});
