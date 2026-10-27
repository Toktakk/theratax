import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { addressLines } from '../postal-address/postal-address.js';
import type { PostalAddress } from '../postal-address/postal-address.js';

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 46;
const BOTTOM = 48;
const CONTENT_RIGHT = PAGE_WIDTH - MARGIN_X;
const CONTENT_WIDTH = CONTENT_RIGHT - MARGIN_X;

const INK = rgb(0.11, 0.15, 0.2);
const TEAL = rgb(0.08, 0.32, 0.34);
const MUTED = rgb(0.38, 0.42, 0.46);
const RULE = rgb(0.8, 0.84, 0.85);
const BAND = rgb(0.93, 0.95, 0.95);
const WHITE = rgb(1, 1, 1);

const VAT_NOTE =
  'Issued by a sole trader who is not registered for VAT. No VAT is charged.';
const CURRENCY_NOTE = 'Amounts are in pounds sterling (GBP).';

const COL_DATE = MARGIN_X + 4;
const COL_DESC = MARGIN_X + 78;
const COL_QTY = MARGIN_X + 300;
const RATE_RIGHT = MARGIN_X + 430;
const AMOUNT_RIGHT = CONTENT_RIGHT - 4;

export interface InvoicePdfLine {
  occurredOn: string;
  description: string;
  quantity: number;
  quantityUnit: string;
  ratePence: number;
  amountPence: number;
}

export interface InvoicePdfInput {
  therapistName: string;
  therapistEmail: string;
  therapistAddress: PostalAddress | null;
  number: string;
  issuedOn: string;
  recipientName: string;
  recipientAddress: PostalAddress | null;
  periodStart: string;
  periodEnd: string;
  amountPence: number;
  status: 'issued' | 'paid';
  paidOn?: string;
  lines: InvoicePdfLine[];
}

export function formatInvoiceAmount(amountPence: number): string {
  const pounds = Math.trunc(amountPence / 100);
  const pence = amountPence % 100;
  return `£${String(pounds)}.${String(pence).padStart(2, '0')}`;
}

export function statusLabel(status: 'issued' | 'paid'): string {
  return status === 'paid' ? 'Paid' : 'Issued';
}

export function invoicePdfLines(input: InvoicePdfInput): string[] {
  const lines = [
    'INVOICE',
    input.number,
    input.therapistName,
    ...addressLines(input.therapistAddress),
    input.therapistEmail,
    'BILL TO',
    input.recipientName,
    ...addressLines(input.recipientAddress),
    'Invoice date',
    input.issuedOn,
    'Supply period',
    `${input.periodStart} to ${input.periodEnd}`,
    'Status',
    statusLabel(input.status),
  ];
  if (input.paidOn !== undefined) {
    lines.push('Paid on', input.paidOn);
  }
  lines.push('Date', 'Description', 'Qty', 'Rate', 'Amount');
  for (const line of input.lines) {
    lines.push(
      line.occurredOn,
      line.description,
      `${String(line.quantity)} ${line.quantityUnit}`,
      formatInvoiceAmount(line.ratePence),
      formatInvoiceAmount(line.amountPence),
    );
  }
  lines.push('Total due', formatInvoiceAmount(input.amountPence), 'GBP', VAT_NOTE, CURRENCY_NOTE);
  return lines;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter((word) => word.length > 0);
  if (words.length === 0) {
    return [''];
  }
  const lines: string[] = [];
  let current = words[0] ?? '';
  for (const word of words.slice(1)) {
    const next = `${current} ${word}`;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
    } else {
      lines.push(current);
      current = word;
    }
  }
  lines.push(current);
  return lines;
}

function drawRight(
  page: PDFPage,
  text: string,
  right: number,
  y: number,
  size: number,
  font: PDFFont,
  color: ReturnType<typeof rgb>,
): void {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: right - width, y, size, font, color });
}

export async function buildInvoicePdf(input: InvoicePdfInput): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const pages: PDFPage[] = [];

  function openPage(): { page: PDFPage; y: number } {
    const page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pages.push(page);
    page.drawRectangle({
      x: 0,
      y: PAGE_HEIGHT - 8,
      width: PAGE_WIDTH,
      height: 8,
      color: TEAL,
    });
    return { page, y: PAGE_HEIGHT - 40 };
  }

  let cursor = openPage();

  function gap(amount: number): void {
    cursor.y -= amount;
  }

  function ensure(height: number): void {
    if (cursor.y - height < BOTTOM) {
      cursor = openPage();
      cursor.page.drawText(input.number, {
        x: MARGIN_X,
        y: cursor.y,
        size: 9,
        font: regular,
        color: MUTED,
      });
      gap(18);
    }
  }

  cursor.page.drawText('INVOICE', {
    x: MARGIN_X,
    y: cursor.y,
    size: 22,
    font: bold,
    color: TEAL,
  });
  drawRight(cursor.page, input.number, CONTENT_RIGHT, cursor.y, 14, bold, INK);
  gap(22);
  cursor.page.drawText(input.therapistName, {
    x: MARGIN_X,
    y: cursor.y,
    size: 12,
    font: bold,
    color: INK,
  });
  gap(16);
  for (const line of addressLines(input.therapistAddress)) {
    cursor.page.drawText(line, {
      x: MARGIN_X,
      y: cursor.y,
      size: 10,
      font: regular,
      color: INK,
    });
    gap(13);
  }
  cursor.page.drawText(input.therapistEmail, {
    x: MARGIN_X,
    y: cursor.y,
    size: 10,
    font: regular,
    color: MUTED,
  });
  gap(18);
  cursor.page.drawLine({
    start: { x: MARGIN_X, y: cursor.y },
    end: { x: CONTENT_RIGHT, y: cursor.y },
    thickness: 1,
    color: RULE,
  });
  gap(20);

  const columnTop = cursor.y;
  cursor.page.drawText('BILL TO', {
    x: MARGIN_X,
    y: cursor.y,
    size: 8,
    font: bold,
    color: TEAL,
  });
  gap(14);
  cursor.page.drawText(input.recipientName, {
    x: MARGIN_X,
    y: cursor.y,
    size: 12,
    font: bold,
    color: INK,
  });
  gap(15);
  for (const line of addressLines(input.recipientAddress)) {
    cursor.page.drawText(line, {
      x: MARGIN_X,
      y: cursor.y,
      size: 10,
      font: regular,
      color: INK,
    });
    gap(13);
  }
  const afterRecipient = cursor.y;

  const metaX = MARGIN_X + 280;
  let metaY = columnTop;
  const metaRows: Array<[string, string]> = [
    ['Invoice date', input.issuedOn],
    ['Supply period', `${input.periodStart} to ${input.periodEnd}`],
    ['Status', statusLabel(input.status)],
  ];
  if (input.paidOn !== undefined) {
    metaRows.push(['Paid on', input.paidOn]);
  }
  for (const [label, value] of metaRows) {
    cursor.page.drawText(label, {
      x: metaX,
      y: metaY,
      size: 8,
      font: bold,
      color: MUTED,
    });
    cursor.page.drawText(value, {
      x: metaX,
      y: metaY - 13,
      size: 10,
      font: regular,
      color: INK,
    });
    metaY -= 30;
  }

  cursor.y = Math.min(afterRecipient, metaY) - 8;

  function drawTableHeader(): void {
    ensure(28);
    cursor.page.drawRectangle({
      x: MARGIN_X,
      y: cursor.y - 6,
      width: CONTENT_WIDTH,
      height: 20,
      color: BAND,
    });
    const headerY = cursor.y;
    const headers: Array<[string, number]> = [
      ['Date', COL_DATE],
      ['Description', COL_DESC],
      ['Qty', COL_QTY],
      ['Rate', RATE_RIGHT],
      ['Amount', AMOUNT_RIGHT],
    ];
    for (const [label, x] of headers) {
      if (label === 'Amount' || label === 'Rate') {
        drawRight(cursor.page, label, x, headerY, 8, bold, TEAL);
      } else {
        cursor.page.drawText(label, {
          x,
          y: headerY,
          size: 8,
          font: bold,
          color: TEAL,
        });
      }
    }
    gap(22);
  }

  drawTableHeader();
  let rowIndex = 0;
  for (const line of input.lines) {
    const description = wrapText(line.description, regular, 10, COL_QTY - COL_DESC - 12);
    const rowHeight = Math.max(18, description.length * 13 + 6);
    if (cursor.y - rowHeight < BOTTOM) {
      cursor = openPage();
      cursor.page.drawText(input.number, {
        x: MARGIN_X,
        y: cursor.y,
        size: 9,
        font: regular,
        color: MUTED,
      });
      gap(18);
      drawTableHeader();
    }
    if (rowIndex % 2 === 1) {
      cursor.page.drawRectangle({
        x: MARGIN_X,
        y: cursor.y - rowHeight + 12,
        width: CONTENT_WIDTH,
        height: rowHeight,
        color: rgb(0.975, 0.98, 0.98),
      });
    }
    const textY = cursor.y;
    cursor.page.drawText(line.occurredOn, {
      x: COL_DATE,
      y: textY,
      size: 9,
      font: regular,
      color: INK,
    });
    description.forEach((part, index) => {
      cursor.page.drawText(part, {
        x: COL_DESC,
        y: textY - index * 13,
        size: 10,
        font: regular,
        color: INK,
      });
    });
    cursor.page.drawText(`${String(line.quantity)} ${line.quantityUnit}`, {
      x: COL_QTY,
      y: textY,
      size: 9,
      font: regular,
      color: INK,
    });
    drawRight(
      cursor.page,
      formatInvoiceAmount(line.ratePence),
      RATE_RIGHT,
      textY,
      9,
      regular,
      INK,
    );
    drawRight(
      cursor.page,
      formatInvoiceAmount(line.amountPence),
      AMOUNT_RIGHT,
      textY,
      9,
      regular,
      INK,
    );
    cursor.y -= rowHeight;
    rowIndex += 1;
  }

  gap(8);
  cursor.page.drawLine({
    start: { x: MARGIN_X, y: cursor.y },
    end: { x: CONTENT_RIGHT, y: cursor.y },
    thickness: 0.6,
    color: RULE,
  });
  gap(16);
  ensure(56);
  const boxWidth = 168;
  const boxHeight = 42;
  const boxX = CONTENT_RIGHT - boxWidth;
  const boxY = cursor.y - 28;
  cursor.page.drawRectangle({
    x: boxX,
    y: boxY,
    width: boxWidth,
    height: boxHeight,
    color: TEAL,
  });
  cursor.page.drawText('Total due', {
    x: boxX + 12,
    y: boxY + 26,
    size: 8,
    font: bold,
    color: WHITE,
  });
  cursor.page.drawText('GBP', {
    x: boxX + 12,
    y: boxY + 10,
    size: 8,
    font: regular,
    color: WHITE,
  });
  drawRight(
    cursor.page,
    formatInvoiceAmount(input.amountPence),
    CONTENT_RIGHT - 12,
    boxY + 14,
    13,
    bold,
    WHITE,
  );
  cursor.y = boxY - 22;

  const notes = [VAT_NOTE, CURRENCY_NOTE];
  for (const note of notes) {
    const wrapped = wrapText(note, regular, 9, CONTENT_WIDTH);
    ensure(wrapped.length * 12 + 4);
    for (const part of wrapped) {
      cursor.page.drawText(part, {
        x: MARGIN_X,
        y: cursor.y,
        size: 9,
        font: regular,
        color: MUTED,
      });
      gap(12);
    }
  }

  pages.forEach((page, index) => {
    const label = `Page ${String(index + 1)} of ${String(pages.length)}`;
    drawRight(page, label, CONTENT_RIGHT, 28, 8, regular, MUTED);
  });

  return document.save();
}
