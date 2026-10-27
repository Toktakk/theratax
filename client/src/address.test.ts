import { describe, expect, it } from 'vitest';
import { addressError, addressPayload, emptyAddress, formatAddress, hasAddress } from './address.ts';

describe('address', () => {
  it('starts empty and asks for a complete address', () => {
    const draft = emptyAddress();
    expect(draft).toEqual({ addressLine1: '', addressLine2: '', town: '', postcode: '' });
    expect(addressError(draft)).toBe('Enter the address.');
    expect(hasAddress({})).toBe(false);
  });

  it('builds a payload, drops a blank second line, and formats the lines', () => {
    const payload = addressPayload({
      addressLine1: ' 12 High Street ',
      addressLine2: '   ',
      town: ' London ',
      postcode: ' SW1A 1AA ',
    });
    expect(payload).toEqual({
      addressLine1: '12 High Street',
      town: 'London',
      postcode: 'SW1A 1AA',
    });
    expect(addressError({ ...emptyAddress(), ...payload })).toBe('');
    expect(
      formatAddress({
        addressLine1: '12 High Street',
        addressLine2: 'Flat 2',
        town: 'London',
        postcode: 'SW1A 1AA',
      }),
    ).toBe('12 High Street, Flat 2, London, SW1A 1AA');
  });
});
