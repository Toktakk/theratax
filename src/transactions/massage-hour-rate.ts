import type { MassageType } from './massage-type.js';

export function effectiveHourRatePence(
  hourRatePence: number,
  pregnancyExtraPence: number,
  massageType: MassageType,
): number {
  if (massageType === 'pregnancy') {
    return hourRatePence + pregnancyExtraPence;
  }
  return hourRatePence;
}

export function basePenceFromMinutes(minutes: number, effectiveRatePence: number): number {
  return Math.floor((minutes * effectiveRatePence + 30) / 60);
}
