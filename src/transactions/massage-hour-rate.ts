export interface HourExtraRate {
  massageType: string;
  customMassageType?: string | null;
  extraPence: number;
}

export function effectiveHourRatePence(
  hourRatePence: number,
  hourExtras: readonly HourExtraRate[],
  massageType: string,
  customMassageType?: string | null,
): number {
  return hourRatePence + extraPenceFor(hourExtras, massageType, customMassageType);
}

export function basePenceFromMinutes(minutes: number, effectiveRatePence: number): number {
  return Math.floor((minutes * effectiveRatePence + 30) / 60);
}

function extraPenceFor(
  hourExtras: readonly HourExtraRate[],
  massageType: string,
  customMassageType?: string | null,
): number {
  if (massageType === 'other') {
    const name = (customMassageType ?? '').trim().toLowerCase();
    const found = hourExtras.find(
      (row) =>
        row.massageType === 'other' && (row.customMassageType ?? '').trim().toLowerCase() === name,
    );
    return found === undefined ? 0 : found.extraPence;
  }
  const found = hourExtras.find((row) => row.massageType === massageType);
  return found === undefined ? 0 : found.extraPence;
}
