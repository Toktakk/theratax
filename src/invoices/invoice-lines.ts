import { MASSAGE_TYPES, massageTypeName } from '../transactions/massage-type.js';

export interface InvoiceSourceIncome {
  id: number;
  occurredOn: string;
  amountPence: number;
  basePence: number | null;
  additionalFeePence: number | null;
  massageType: string | null;
  customMassageType: string | null;
}

export interface InvoiceSourceBonus {
  id: number;
  occurredOn: string;
  eligibleMinutes: number;
  ratePencePerHour: number;
  totalPence: number;
}

export interface BuiltInvoiceLine {
  kind: 'service' | 'additional_fee' | 'hourly_bonus';
  description: string;
  quantity: number;
  quantityUnit: 'session' | 'minute';
  ratePence: number;
  amountPence: number;
  occurredOn: string;
  sourceTransactionId?: number;
  sourceBonusId?: number;
}

const KIND_ORDER: Record<BuiltInvoiceLine['kind'], number> = {
  service: 0,
  additional_fee: 1,
  hourly_bonus: 2,
};

function serviceDescription(income: InvoiceSourceIncome): string {
  if (income.massageType === null) {
    return 'Income';
  }
  if (income.massageType === 'other') {
    return income.customMassageType ?? 'Other';
  }
  for (const massageType of MASSAGE_TYPES) {
    if (massageType === income.massageType) {
      return massageTypeName(massageType);
    }
  }
  return 'Income';
}

function civilTime(value: string): number {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);
  if (match === null) {
    return 0;
  }
  return Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
}

export function buildInvoiceLines(input: {
  incomes: InvoiceSourceIncome[];
  bonuses: InvoiceSourceBonus[];
}): BuiltInvoiceLine[] {
  const lines: BuiltInvoiceLine[] = [];
  for (const income of input.incomes) {
    const serviceAmount = income.basePence ?? income.amountPence;
    lines.push({
      kind: 'service',
      description: serviceDescription(income),
      quantity: 1,
      quantityUnit: 'session',
      ratePence: serviceAmount,
      amountPence: serviceAmount,
      occurredOn: income.occurredOn,
      sourceTransactionId: income.id,
    });
    const fee = income.additionalFeePence ?? 0;
    if (fee > 0) {
      lines.push({
        kind: 'additional_fee',
        description: 'Additional fee',
        quantity: 1,
        quantityUnit: 'session',
        ratePence: fee,
        amountPence: fee,
        occurredOn: income.occurredOn,
        sourceTransactionId: income.id,
      });
    }
  }
  for (const bonus of input.bonuses) {
    lines.push({
      kind: 'hourly_bonus',
      description: 'Hourly bonus',
      quantity: bonus.eligibleMinutes,
      quantityUnit: 'minute',
      ratePence: bonus.ratePencePerHour,
      amountPence: bonus.totalPence,
      occurredOn: bonus.occurredOn,
      sourceBonusId: bonus.id,
    });
  }
  lines.sort((left, right) => {
    const byDate = civilTime(left.occurredOn) - civilTime(right.occurredOn);
    if (byDate !== 0) {
      return byDate;
    }
    const byKind = KIND_ORDER[left.kind] - KIND_ORDER[right.kind];
    if (byKind !== 0) {
      return byKind;
    }
    const leftId = left.sourceTransactionId ?? left.sourceBonusId ?? 0;
    const rightId = right.sourceTransactionId ?? right.sourceBonusId ?? 0;
    return leftId - rightId;
  });
  return lines;
}

export function invoiceLinesTotalPence(lines: BuiltInvoiceLine[]): number {
  return lines.reduce((sum, line) => sum + line.amountPence, 0);
}
