const PERIOD_START = Date.UTC(2026, 3, 6);
const PERIOD_END = Date.UTC(2027, 3, 5);

export function parseTaxYearDate(value: string): Date | null {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);
  if (match === null) {
    return null;
  }
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  const time = date.getTime();
  if (time < PERIOD_START || time > PERIOD_END) {
    return null;
  }
  return date;
}

export function formatCivilDate(value: Date): string {
  const day = String(value.getUTCDate()).padStart(2, '0');
  const month = String(value.getUTCMonth() + 1).padStart(2, '0');
  const year = String(value.getUTCFullYear());
  return `${day}-${month}-${year}`;
}

export function todayCivilDate(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(now);
  const day = parts.find((part) => part.type === 'day')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const year = parts.find((part) => part.type === 'year')?.value;
  if (day === undefined || month === undefined || year === undefined) {
    throw new Error('Could not format the London date');
  }
  return `${day}-${month}-${year}`;
}