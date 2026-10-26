import {
  buildInvoicePdf,
  formatInvoiceAmount,
  invoicePdfLines,
} from './invoice-pdf.js';
import type { InvoicePdfInput } from './invoice-pdf.js';

const issued: InvoicePdfInput = {
  therapistName: 'Ada Lovelace',
  number: 'TT-0001',
  issuedOn: '01-05-2026',
  clientName: 'North Clinic',
  service: 'Sports massage',
  amountPence: 6500,
  status: 'issued',
};

describe('formatInvoiceAmount', () => {
  it('uses a truncated quotient and a two-digit remainder', () => {
    expect(formatInvoiceAmount(6500)).toBe('£65.00');
    expect(formatInvoiceAmount(1)).toBe('£0.01');
    expect(formatInvoiceAmount(101)).toBe('£1.01');
    expect(formatInvoiceAmount(100_000_000)).toBe('£1000000.00');
  });
});

describe('invoicePdfLines', () => {
  it('lists an issued invoice without a paid date', () => {
    expect(invoicePdfLines(issued)).toEqual([
      'Therapist: Ada Lovelace',
      'Number: TT-0001',
      'Issued: 01-05-2026',
      'Client: North Clinic',
      'Service: Sports massage',
      'Amount: £65.00',
      'Status: issued',
    ]);
  });

  it('adds the paid date once the invoice is paid', () => {
    expect(
      invoicePdfLines({
        ...issued,
        status: 'paid',
        paidOn: '02-05-2026',
      }),
    ).toEqual([
      'Therapist: Ada Lovelace',
      'Number: TT-0001',
      'Issued: 01-05-2026',
      'Client: North Clinic',
      'Service: Sports massage',
      'Amount: £65.00',
      'Status: paid',
      'Paid: 02-05-2026',
    ]);
  });
});

describe('invoicePdfLines with stored lines', () => {
  it('draws the recipient, each line, and the 1500 pence total', () => {
    expect(
      invoicePdfLines({
        therapistName: 'Ada Lovelace',
        number: 'TT-0002',
        issuedOn: '02-05-2026',
        clientName: '',
        service: '',
        amountPence: 1500,
        status: 'issued',
        recipientName: 'North Spa',
        periodStart: '01-05-2026',
        periodEnd: '01-05-2026',
        lines: [
          {
            description: 'Swedish',
            quantity: 1,
            quantityUnit: 'session',
            ratePence: 1000,
            amountPence: 1000,
          },
          {
            description: 'Additional fee',
            quantity: 1,
            quantityUnit: 'session',
            ratePence: 200,
            amountPence: 200,
          },
          {
            description: 'Hourly bonus',
            quantity: 90,
            quantityUnit: 'minute',
            ratePence: 200,
            amountPence: 300,
          },
        ],
      }),
    ).toEqual([
      'Therapist: Ada Lovelace',
      'Number: TT-0002',
      'Issued: 02-05-2026',
      'Recipient: North Spa',
      'Period: 01-05-2026 to 01-05-2026',
      'Swedish, 1 session, £10.00, £10.00',
      'Additional fee, 1 session, £2.00, £2.00',
      'Hourly bonus, 90 minute, £2.00, £3.00',
      'Amount: £15.00',
      'Status: issued',
    ]);
  });
});

describe('buildInvoicePdf', () => {
  it('starts the file with %PDF', async () => {
    const bytes = await buildInvoicePdf({
      ...issued,
      status: 'paid',
      paidOn: '02-05-2026',
    });
    expect(Buffer.from(bytes.subarray(0, 4)).toString('ascii')).toBe('%PDF');
  });
});
