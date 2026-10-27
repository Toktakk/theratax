export interface SummaryIncome {
  amountPence: number;
  basePence: number | null;
  additionalFeePence: number | null;
  bonusPence: number | null;
  massageType: string | null;
  customMassageType: string | null;
  workplaceId: number | null;
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
  bonusPence: number;
  totalPence: number;
}

export interface MassageTypeDay {
  massageType: string;
  customMassageType?: string;
  basePence: number;
  additionalFeePence: number;
  bonusPence: number;
  totalPence: number;
}

export interface DailyIncomeSummary {
  date: string;
  basePence: number;
  additionalFeePence: number;
  bonusPence: number;
  totalPence: number;
  byWorkplace: WorkplaceDay[];
  byMassageType: MassageTypeDay[];
}

interface PenceParts {
  basePence: number;
  additionalFeePence: number;
  bonusPence: number;
}

function incomeParts(income: SummaryIncome): PenceParts {
  if (income.basePence !== null) {
    return {
      basePence: income.basePence,
      additionalFeePence: income.additionalFeePence ?? 0,
      bonusPence: income.bonusPence ?? 0,
    };
  }
  return { basePence: income.amountPence, additionalFeePence: 0, bonusPence: 0 };
}

function emptyParts(): PenceParts {
  return { basePence: 0, additionalFeePence: 0, bonusPence: 0 };
}

function addParts(current: PenceParts, parts: PenceParts): void {
  current.basePence += parts.basePence;
  current.additionalFeePence += parts.additionalFeePence;
  current.bonusPence += parts.bonusPence;
}

export function summariseDay(input: {
  date: string;
  incomes: SummaryIncome[];
  workplaces: SummaryWorkplace[];
}): DailyIncomeSummary {
  const workplacesById = new Map(input.workplaces.map((workplace) => [workplace.id, workplace]));
  const workplaceTotals = new Map<number, PenceParts>();
  const massageTotals = new Map<
    string,
    PenceParts & { massageType: string; customMassageType: string | null }
  >();
  const totals = emptyParts();

  for (const income of input.incomes) {
    const parts = incomeParts(income);
    addParts(totals, parts);
    if (income.workplaceId !== null && workplacesById.has(income.workplaceId)) {
      const current = workplaceTotals.get(income.workplaceId) ?? emptyParts();
      addParts(current, parts);
      workplaceTotals.set(income.workplaceId, current);
    }
    if (income.massageType !== null) {
      const custom = income.customMassageType;
      const key = `${income.massageType}\u0000${custom ?? ''}`;
      const current = massageTotals.get(key) ?? {
        ...emptyParts(),
        massageType: income.massageType,
        customMassageType: custom,
      };
      addParts(current, parts);
      massageTotals.set(key, current);
    }
  }

  const byWorkplace = [...workplaceTotals.entries()]
    .map(([workplaceId, parts]) => {
      const workplace = workplacesById.get(workplaceId);
      if (workplace === undefined) {
        return null;
      }
      return {
        workplaceId,
        name: workplace.name,
        kind: workplace.kind,
        basePence: parts.basePence,
        additionalFeePence: parts.additionalFeePence,
        bonusPence: parts.bonusPence,
        totalPence: parts.basePence + parts.additionalFeePence + parts.bonusPence,
      };
    })
    .filter((row): row is WorkplaceDay => row !== null)
    .sort((left, right) => left.name.localeCompare(right.name) || left.workplaceId - right.workplaceId);

  const byMassageType = [...massageTotals.values()]
    .map((parts) => {
      const row: MassageTypeDay = {
        massageType: parts.massageType,
        basePence: parts.basePence,
        additionalFeePence: parts.additionalFeePence,
        bonusPence: parts.bonusPence,
        totalPence: parts.basePence + parts.additionalFeePence + parts.bonusPence,
      };
      if (parts.customMassageType !== null && parts.customMassageType.length > 0) {
        row.customMassageType = parts.customMassageType;
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
    basePence: totals.basePence,
    additionalFeePence: totals.additionalFeePence,
    bonusPence: totals.bonusPence,
    totalPence: totals.basePence + totals.additionalFeePence + totals.bonusPence,
    byWorkplace,
    byMassageType,
  };
}
