export function bonusTotalPence(eligibleMinutes: number, ratePencePerHour: number): number {
  const product = eligibleMinutes * ratePencePerHour;
  const quotient = Math.trunc(product / 60);
  const remainder = product % 60;
  if (remainder >= 30) {
    return quotient + 1;
  }
  return quotient;
}
