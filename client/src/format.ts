import type { ExpenseMethod, PracticeType } from './types.ts';

export function formatPounds(amountPence: number): string {
  const negative = amountPence < 0;
  const absolute = Math.abs(amountPence);
  const pounds = Math.trunc(absolute / 100);
  const pence = absolute % 100;
  const body = `${pounds.toString()}.${pence.toString().padStart(2, '0')}`;
  return negative ? `-£${body}` : `£${body}`;
}

export function readAmountPence(
  poundsText: string,
  penceText: string,
): { ok: true; amountPence: number } | { ok: false; message: string } {
  const pounds = readPart(poundsText);
  const pence = readPart(penceText);
  if (pounds === null || pence === null || pence > 99) {
    return {
      ok: false,
      message: 'Enter whole pounds and pence from 0 to 99.',
    };
  }
  return { ok: true, amountPence: pounds * 100 + pence };
}

export function readWholeNumber(
  value: string,
): { ok: true; value: number | undefined } | { ok: false; message: string } {
  const trimmed = value.trim();
  if (trimmed === '') {
    return { ok: true, value: undefined };
  }
  if (!/^\d+$/.test(trimmed)) {
    return { ok: false, message: 'Enter miles as a whole number.' };
  }
  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed)) {
    return { ok: false, message: 'Enter miles as a whole number.' };
  }
  return { ok: true, value: parsed };
}

export function civilDateFromInput(value: string): string | undefined {
  if (value === '') {
    return undefined;
  }
  const parts = value.split('-');
  if (parts.length !== 3) {
    return undefined;
  }
  const [year, month, day] = parts;
  if (
    year === undefined ||
    month === undefined ||
    day === undefined ||
    !/^\d{4}$/.test(year) ||
    !/^\d{2}$/.test(month) ||
    !/^\d{2}$/.test(day)
  ) {
    return undefined;
  }
  return `${day}-${month}-${year}`;
}

export function expenseMethodLabel(method: ExpenseMethod): string {
  if (method === 'flat_rate') {
    return 'Single-rate mileage';
  }
  return 'Vehicle costs as actually paid';
}

export function practiceTypeLabel(practice: PracticeType): string {
  if (practice === 'mobile') {
    return 'Travels to the client';
  }
  if (practice === 'fixedLocation') {
    return 'Clinic';
  }
  return 'Both';
}

function readPart(value: string): number | null {
  const trimmed = value.trim();
  const raw = trimmed === '' ? '0' : trimmed;
  if (!/^\d+$/.test(raw)) {
    return null;
  }
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed)) {
    return null;
  }
  return parsed;
}
