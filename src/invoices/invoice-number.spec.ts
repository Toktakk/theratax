import { nextInvoiceNumber } from './invoice-number.js';

describe('nextInvoiceNumber', () => {
  it('starts at TT-0001 when nothing has been issued', () => {
    expect(nextInvoiceNumber([])).toBe('TT-0001');
  });

  it('continues after the highest number, including numbers from other users', () => {
    expect(nextInvoiceNumber(['TT-0001', 'TT-0001', 'TT-0003'])).toBe('TT-0004');
  });

  it('ignores a gap and does not reuse a lower number', () => {
    expect(nextInvoiceNumber(['TT-0001', 'TT-0008'])).toBe('TT-0009');
  });

  it('pads past four digits', () => {
    expect(nextInvoiceNumber(['TT-9999'])).toBe('TT-10000');
  });
});
