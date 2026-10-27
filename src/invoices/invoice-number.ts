export function nextInvoiceNumber(existing: readonly string[]): string {
  let max = 0;
  for (const number of existing) {
    const match = /^TT-(\d+)$/.exec(number);
    if (match === null) {
      continue;
    }
    const value = Number(match[1]);
    if (Number.isSafeInteger(value) && value > max) {
      max = value;
    }
  }
  return `TT-${String(max + 1).padStart(4, '0')}`;
}
