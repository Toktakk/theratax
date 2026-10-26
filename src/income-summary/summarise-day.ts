export interface SummaryIncome {
  amountPence: number;
  basePence: number | null;
  additionalFeePence: number | null;
  massageType: string | null;
  customMassageType: string | null;
  workplaceId: number | null;
}

export interface SummaryBonus {
  totalPence: number;
  workplaceId: number;
}

export interface SummaryWorkplace {
  id: number;
  name: string;
  kind: 'spa' | 'clinic';
}

export interface WorkplaceDay {
  workplaceId: number;
  name: string;
  kind: 'spa' | 'clinic';
  basePence: number;
  additionalFeePence: number;
  hourlyBonusPence: number;
  totalPence: number;
}

export interface MassageTypeDay {
  massageType: string;
  customMassageType?: string;
  basePence: number;
  additionalFeePence: number;
  totalPence: number;
}

export interface DailyIncomeSummary {
  date: string;
  basePence: number;
  additionalFeePence: number;
  hourlyBonusPence: number;
  totalPence: number;
  byWorkplace: WorkplaceDay[];
  byMassageType: MassageTypeDay[];
}

interface PenceParts {
  basePence: number;
  additionalFeePence: number;
}

function incomeParts(income: SummaryIncome): PenceParts {
  if (income.basePence !== null) {
    return {
      basePence: income.basePence,
      additionalFeePence: income.additionalFeePence ?? 0,
    };
  }
  return { basePence: income.amountPence, additionalFeePence: 0 };
}

export function summariseDay(input: {
  date: string;
  incomes: SummaryIncome[];
  bonuses: SummaryBonus[];
  workplaces: SummaryWorkplace[];
}): DailyIncomeSummary {
  const workplacesById = new Map(input.workplaces.map((workplace) => [workplace.id, workplace]));
  const workplaceTotals = new Map<
    number,
    PenceParts & { hourlyBonusPence: number }
  >();
  const massageTotals = new Map<string, PenceParts & { massageType: string; customMassageType: string | null }>();
  let basePence = 0;
  let additionalFeePence = 0;
  let hourlyBonusPence = 0;

  for (const income of input.incomes) {
    const parts = incomeParts(income);
    basePence += parts.basePence;
    additionalFeePence += parts.additionalFeePence;
    if (income.workplaceId !== null && workplacesById.has(income.workplaceId)) {
      const current = workplaceTotals.get(income.workplaceId) ?? {
        basePence: 0,
        additionalFeePence: 0,
        hourlyBonusPence: 0,
      };
      current.basePence += parts.basePence;
      current.additionalFeePence += parts.additionalFeePence;
      workplaceTotals.set(income.workplaceId, current);
    }
    if (income.massageType !== null) {
      const custom = income.customMassageType;
      const key = `${income.massageType}\u0000${custom ?? ''}`;
      const current = massageTotals.get(key) ?? {
        massageType: income.massageType,
        customMassageType: custom,
        basePence: 0,
        additionalFeePence: 0,
      };
      current.basePence += parts.basePence;
      current.additionalFeePence += parts.additionalFeePence;
      massageTotals.set(key, current);
    }
  }

  for (const bonus of input.bonuses) {
    hourlyBonusPence += bonus.totalPence;
    if (workplacesById.has(bonus.workplaceId)) {
      const current = workplaceTotals.get(bonus.workplaceId) ?? {
        basePence: 0,
        additionalFeePence: 0,
        hourlyBonusPence: 0,
      };
      current.hourlyBonusPence += bonus.totalPence;
      workplaceTotals.set(bonus.workplaceId, current);
    }
  }

  const byWorkplace = [...workplaceTotals.entries()]
    .map(([workplaceId, totals]) => {
      const workplace = workplacesById.get(workplaceId);
      if (workplace === undefined) {
        return null;
      }
      return {
        workplaceId,
        name: workplace.name,
        kind: workplace.kind,
        basePence: totals.basePence,
        additionalFeePence: totals.additionalFeePence,
        hourlyBonusPence: totals.hourlyBonusPence,
        totalPence: totals.basePence + totals.additionalFeePence + totals.hourlyBonusPence,
      };
    })
    .filter((row): row is WorkplaceDay => row !== null)
    .sort((left, right) => left.name.localeCompare(right.name) || left.workplaceId - right.workplaceId);

  const byMassageType = [...massageTotals.values()]
    .map((totals) => {
      const row: MassageTypeDay = {
        massageType: totals.massageType,
        basePence: totals.basePence,
        additionalFeePence: totals.additionalFeePence,
        totalPence: totals.basePence + totals.additionalFeePence,
      };
      if (totals.customMassageType !== null && totals.customMassageType.length > 0) {
        row.customMassageType = totals.customMassageType;
      }
      return row;
    })
    .sort(
      (left, right) =>
        left.massageType.localeCompare(right.massageType) ||
        (left.customMassageType ?? '').localeCompare(right.customMassageType ?? ''),
    );

  return {
    date: input.date,
    basePence,
    additionalFeePence,
    hourlyBonusPence,
    totalPence: basePence + additionalFeePence + hourlyBonusPence,
    byWorkplace,
    byMassageType,
  };
}
