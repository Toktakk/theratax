import type { ExpenseMethod, MassageType, PracticeType } from './types.ts';

export const MASSAGE_OPTIONS: readonly { value: MassageType; label: string }[] = [
  { value: 'deep_tissue', label: 'Deep Tissue' },
  { value: 'thai_oil', label: 'Thai Oil Massage' },
  { value: 'thai_yoga', label: 'Thai Yoga' },
  { value: 'aroma', label: 'Aroma' },
  { value: 'pregnancy', label: 'Pregnancy' },
  { value: 'lymphatic', label: 'Lymphatic' },
  { value: 'foot', label: 'Foot Massage' },
  { value: 'swedish', label: 'Swedish' },
  { value: 'back_neck', label: 'Back & Neck' },
  { value: 'sport', label: 'Sport Massage' },
  { value: 'hot_stone', label: 'Hot Stone' },
  { value: 'body_scrub', label: 'Body Scrub' },
  { value: 'other', label: 'Other' },
];

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

export function readOptionalAmount(
  poundsText: string,
  penceText: string,
): { ok: true; amountPence: number | undefined } | { ok: false; message: string } {
  if (poundsText.trim() === '' && penceText.trim() === '') {
    return { ok: true, amountPence: undefined };
  }
  const money = readAmountPence(poundsText, penceText);
  if (!money.ok || money.amountPence === 0) {
    return money.ok ? { ok: true, amountPence: undefined } : money;
  }
  return money;
}

export function isMassageType(value: string): value is MassageType {
  return MASSAGE_OPTIONS.some((option) => option.value === value);
}

export function massageTypeLabel(massageType: string, customMassageType?: string): string {
  if (massageType === 'other' && customMassageType !== undefined && customMassageType !== '') {
    return customMassageType;
  }
  const found = MASSAGE_OPTIONS.find((option) => option.value === massageType);
  return found === undefined ? massageType : found.label;
}

export function effectiveHourRatePence(
  hourRatePence: number,
  pregnancyExtraPence: number,
  massageType: string,
): number {
  if (massageType === 'pregnancy') {
    return hourRatePence + pregnancyExtraPence;
  }
  return hourRatePence;
}

export function basePenceFromMinutes(minutes: number, effectiveRatePence: number): number {
  return Math.floor((minutes * effectiveRatePence + 30) / 60);
}

export function formatHours(minutes: number): string {
  const whole = Math.trunc(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) {
    return whole.toString();
  }
  const hundredths = (rest * 100) / 60;
  if (hundredths % 10 === 0) {
    return `${whole.toString()}.${(hundredths / 10).toString()}`;
  }
  return `${whole.toString()}.${Math.trunc(hundredths).toString().padStart(2, '0')}`;
}

export function hoursLabel(minutes: number): string {
  const text = formatHours(minutes);
  return minutes === 60 ? `${text} hour` : `${text} hours`;
}

export function readHours(
  value: string,
): { ok: true; minutes: number | undefined } | { ok: false; message: string } {
  const trimmed = value.trim();
  if (trimmed === '') {
    return { ok: true, minutes: undefined };
  }
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(trimmed);
  if (match === null) {
    return { ok: false, message: 'Enter hours with up to two decimal places.' };
  }
  const wholeText = match[1];
  const fraction = match[2];
  if (wholeText === undefined) {
    return { ok: false, message: 'Enter hours with up to two decimal places.' };
  }
  const whole = Number(wholeText);
  if (!Number.isSafeInteger(whole)) {
    return { ok: false, message: 'Enter hours with up to two decimal places.' };
  }
  let minutes = whole * 60;
  if (fraction !== undefined) {
    if (fraction.length === 1) {
      minutes += Number(fraction) * 6;
    } else {
      const hundredths = Number(fraction);
      if ((hundredths * 60) % 100 !== 0) {
        return { ok: false, message: 'Enter hours that make whole minutes.' };
      }
      minutes += (hundredths * 60) / 100;
    }
  }
  if (!Number.isSafeInteger(minutes)) {
    return { ok: false, message: 'Enter hours with up to two decimal places.' };
  }
  return { ok: true, minutes };
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
