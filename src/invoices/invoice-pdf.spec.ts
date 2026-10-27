import { inflateSync } from 'node:zlib';
import {
  buildInvoicePdf,
  formatInvoiceAmount,
  invoicePdfLines,
} from './invoice-pdf.js';
import type { InvoicePdfInput } from './invoice-pdf.js';

function pdfText(bytes: Uint8Array): string {
  const raw = Buffer.from(bytes);
  const parts = [raw.toString('latin1')];
  const marker = Buffer.from('stream');
  let searchFrom = 0;
  while (searchFrom < raw.length) {
    const start = raw.indexOf(marker, searchFrom);
    if (start < 0) {
      break;
    }
    if (raw[start - 1] === 0x64) {
      searchFrom = start + marker.length;
      continue;
    }
    let dataStart = start + marker.length;
    const first = raw[dataStart];
    const second = raw[dataStart + 1];
    if (first === 0x0d && second === 0x0a) {
      dataStart += 2;
    } else if (first === 0x0a) {
      dataStart += 1;
    }
    const before = raw.subarray(Math.max(0, start - 120), start).toString('latin1');
    const lengthMatch = /\/Length (\d+)/.exec(before);
    if (lengthMatch !== null) {
      const length = Number(lengthMatch[1]);
      const slice = raw.subarray(dataStart, dataStart + length);
      try {
        parts.push(decodePdfStrings(inflateSync(slice).toString('latin1')));
      } catch {
        parts.push(slice.toString('latin1'));
      }
    }
    searchFrom = dataStart + 1;
  }
  return parts.join('\n');
}

function decodePdfStrings(content: string): string {
  return content.replace(/<([0-9A-Fa-f]+)>/g, (match) => {
    const hex = match.slice(1, -1);
    let decoded = '';
    for (let index = 0; index < hex.length; index += 2) {
      decoded += String.fromCharCode(Number.parseInt(hex.slice(index, index + 2), 16));
    }
    return decoded;
  });
}

const issued: InvoicePdfInput = {
  therapistName: 'Ada Lovelace',
  therapistEmail: 'ada@example.com',
  therapistAddress: {
    addressLine1: '12 High Street',
    town: 'London',
    postcode: 'SW1A 1AA',
  },
  number: 'TT-0001',
  issuedOn: '01-05-2026',
  recipientName: 'North Clinic',
  recipientAddress: {
    addressLine1: '1 Clinic Road',
    town: 'Manchester',
    postcode: 'M1 1AE',
  },
  periodStart: '01-05-2026',
  periodEnd: '01-05-2026',
  amountPence: 6500,
  status: 'issued',
  lines: [
    {
      occurredOn: '01-05-2026',
      description: 'Sports massage',
      quantity: 1,
      quantityUnit: 'session',
      ratePence: 6500,
      amountPence: 6500,
    },
  ],
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
      'INVOICE',
      'TT-0001',
      'Ada Lovelace',
      '12 High Street',
      'London',
      'SW1A 1AA',
      'ada@example.com',
      'BILL TO',
      'North Clinic',
      '1 Clinic Road',
      'Manchester',
      'M1 1AE',
      'Invoice date',
      '01-05-2026',
      'Supply period',
      '01-05-2026 to 01-05-2026',
      'Status',
      'Issued',
      'Date',
      'Description',
      'Qty',
      'Rate',
      'Amount',
      '01-05-2026',
      'Sports massage',
      '1 session',
      '£65.00',
      '£65.00',
      'Total due',
      '£65.00',
      'GBP',
      'Issued by a sole trader who is not registered for VAT. No VAT is charged.',
      'Amounts are in pounds sterling (GBP).',
    ]);
  });

  it('adds the paid date once the invoice is paid', () => {
    expect(
      invoicePdfLines({
        ...issued,
        status: 'paid',
        paidOn: '02-05-2026',
      }),
    ).toContain('Paid');
    expect(
      invoicePdfLines({
        ...issued,
        status: 'paid',
        paidOn: '02-05-2026',
      }),
    ).toContain('02-05-2026');
  });

  it('uses a placeholder when an older invoice has no address', () => {
    const lines = invoicePdfLines({
      ...issued,
      therapistAddress: null,
      recipientAddress: null,
    });
    expect(lines.filter((line) => line === 'Address not recorded')).toHaveLength(2);
  });
});

describe('invoicePdfLines with stored lines', () => {
  it('draws the recipient, each line, and the 6700 pence total', () => {
    const lines = invoicePdfLines({
      therapistName: 'Ada Lovelace',
      therapistEmail: 'ada@example.com',
      therapistAddress: {
        addressLine1: '12 High Street',
        addressLine2: 'Flat 2',
        town: 'London',
        postcode: 'SW1A 1AA',
      },
      number: 'TT-0002',
      issuedOn: '02-05-2026',
      recipientName: 'North Spa',
      recipientAddress: {
        addressLine1: '4 Spa Lane',
        town: 'Leeds',
        postcode: 'LS1 4AP',
      },
      periodStart: '01-05-2026',
      periodEnd: '01-05-2026',
      amountPence: 6700,
      status: 'issued',
      lines: [
        {
          occurredOn: '01-05-2026',
          description: 'Swedish',
          quantity: 1,
          quantityUnit: 'session',
          ratePence: 6000,
          amountPence: 6000,
        },
        {
          occurredOn: '01-05-2026',
          description: 'Additional Massage Fee',
          quantity: 1,
          quantityUnit: 'session',
          ratePence: 200,
          amountPence: 200,
        },
        {
          occurredOn: '01-05-2026',
          description: 'Bonus',
          quantity: 1,
          quantityUnit: 'session',
          ratePence: 500,
          amountPence: 500,
        },
      ],
    });
    expect(lines).toContain('Flat 2');
    expect(lines).toContain('North Spa');
    expect(lines).toContain('Swedish');
    expect(lines).toContain('Additional Massage Fee');
    expect(lines).toContain('Bonus');
    expect(lines).toContain('£60.00');
    expect(lines).toContain('£2.00');
    expect(lines).toContain('£5.00');
    expect(lines).toContain('£67.00');
    expect(lines.filter((line) => line === '£67.00')).toHaveLength(1);
  });
});

describe('buildInvoicePdf', () => {
  it('starts the file with %PDF and includes the invoice wording', async () => {
    const bytes = await buildInvoicePdf({
      ...issued,
      status: 'paid',
      paidOn: '02-05-2026',
    });
    const text = pdfText(bytes);
    expect(text.slice(0, 4)).toBe('%PDF');
    expect(text).toContain('INVOICE');
    expect(text).toContain('TT-0001');
    expect(text).toContain('Ada Lovelace');
    expect(text).toContain('North Clinic');
    expect(text).toContain('Sports massage');
    expect(text).toContain('not registered for VAT');
  });

  it('keeps a long month of lines inside the file', async () => {
    const lines = Array.from({ length: 40 }, (_, index) => ({
      occurredOn: '01-05-2026',
      description: `Session ${String(index + 1)}`,
      quantity: 1,
      quantityUnit: 'session',
      ratePence: 2500,
      amountPence: 2500,
    }));
    const bytes = await buildInvoicePdf({
      ...issued,
      amountPence: 100_000,
      lines,
    });
    expect(Buffer.from(bytes.subarray(0, 4)).toString('ascii')).toBe('%PDF');
    expect(pdfText(bytes)).toContain('Page 2 of');
  });
});
