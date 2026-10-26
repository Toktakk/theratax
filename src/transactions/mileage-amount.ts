export interface MileageRow {
    id: number;
    occurredOn: Date;
    miles: number;
  }
  
  export function mileageAmountPence(rows: readonly MileageRow[]): Map<number, number> {
    const ordered = [...rows].sort((left, right) => {
      const byDate = left.occurredOn.getTime() - right.occurredOn.getTime();
      if (byDate !== 0) {
        return byDate;
      }
      return left.id - right.id;
    });
    const amounts = new Map<number, number>();
    let usedMiles = 0;
    for (const row of ordered) {
      const milesAt55 = Math.min(row.miles, Math.max(0, 10_000 - usedMiles));
      const milesAt25 = row.miles - milesAt55;
      amounts.set(row.id, milesAt55 * 55 + milesAt25 * 25);
      usedMiles += row.miles;
    }
    return amounts;
  }