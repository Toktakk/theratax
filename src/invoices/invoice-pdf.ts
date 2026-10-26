import { PDFDocument, StandardFonts } from 'pdf-lib';

export interface InvoicePdfLine {
  description: string;
  quantity: number;
  quantityUnit: string;
  ratePence: number;
  amountPence: number;
}

export interface InvoicePdfInput {
  therapistName: string;
  number: string;
  issuedOn: string;
  clientName: string;
  service: string;
  amountPence: number;
  status: 'issued' | 'paid';
  paidOn?: string;
  recipientName?: string;
  periodStart?: string;
  periodEnd?: string;
  lines?: InvoicePdfLine[];
}

export function formatInvoiceAmount(amountPence: number): string {
  const pounds = Math.trunc(amountPence / 100);
  const pence = amountPence % 100;
  return `£${String(pounds)}.${String(pence).padStart(2, '0')}`;
}

export function invoicePdfLines(input: InvoicePdfInput): string[] {
  const lines = [
    `Therapist: ${input.therapistName}`,
    `Number: ${input.number}`,
    `Issued: ${input.issuedOn}`,
  ];
  if (input.lines !== undefined && input.lines.length > 0) {
    const periodStart = input.periodStart ?? input.issuedOn;
    const periodEnd = input.periodEnd ?? input.issuedOn;
    lines.push(`Recipient: ${input.recipientName ?? input.clientName}`);
    lines.push(`Period: ${periodStart} to ${periodEnd}`);
    for (const line of input.lines) {
      lines.push(
        `${line.description}, ${line.quantity} ${line.quantityUnit}, ${formatInvoiceAmount(line.ratePence)}, ${formatInvoiceAmount(line.amountPence)}`,
      );
    }
  } else {
    lines.push(`Client: ${input.clientName}`);
    lines.push(`Service: ${input.service}`);
  }
  lines.push(`Amount: ${formatInvoiceAmount(input.amountPence)}`);
  lines.push(`Status: ${input.status}`);
  if (input.paidOn !== undefined) {
    lines.push(`Paid: ${input.paidOn}`);
  }
  return lines;
}

export async function buildInvoicePdf(
  input: InvoicePdfInput,
): Promise<Uint8Array> {
  const lines = invoicePdfLines(input);
  const document = await PDFDocument.create();
  const page = document.addPage();
  const font = await document.embedFont(StandardFonts.Helvetica);
  const { height } = page.getSize();
  let y = height - 72;
  for (const line of lines) {
    page.drawText(line, { x: 50, y, size: 12, font });
    y -= 20;
  }
  return document.save();
}
