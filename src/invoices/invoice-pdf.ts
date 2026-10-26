import { PDFDocument, StandardFonts } from 'pdf-lib';

export interface InvoicePdfInput {
  therapistName: string;
  number: string;
  issuedOn: string;
  clientName: string;
  service: string;
  amountPence: number;
  status: 'issued' | 'paid';
  paidOn?: string;
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
    `Client: ${input.clientName}`,
    `Service: ${input.service}`,
    `Amount: ${formatInvoiceAmount(input.amountPence)}`,
    `Status: ${input.status}`,
  ];
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
