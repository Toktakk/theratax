export type PracticeType = 'mobile' | 'fixedLocation' | 'mixed';

export type ExpenseMethod = 'flat_rate' | 'actual_cost';

export type CategoryKind = 'general' | 'mileage' | 'vehicle_actual';

export interface User {
  id: number;
  email: string;
  name: string;
  practiceType: PracticeType | null;
  expenseMethod: ExpenseMethod | null;
  onboardedAt: string | null;
}

export interface ReadyUser {
  id: number;
  email: string;
  name: string;
  practiceType: PracticeType;
  expenseMethod: ExpenseMethod;
  onboardedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface ExpenseCategory {
  slug: string;
  name: string;
  keywords: string[];
  kind: CategoryKind;
}

export type MassageType =
  | 'deep_tissue'
  | 'thai_oil'
  | 'thai_yoga'
  | 'aroma'
  | 'pregnancy'
  | 'lymphatic'
  | 'foot'
  | 'swedish'
  | 'back_neck'
  | 'sport'
  | 'hot_stone'
  | 'body_scrub'
  | 'request'
  | 'other';

export type HourExtraType = 'pregnancy' | 'hot_stone' | 'body_scrub' | 'request' | 'other';

export interface HourExtra {
  massageType: HourExtraType;
  customMassageType?: string;
  extraPence: number;
}

export type WorkplaceKind = 'spa' | 'clinic';

export type RecipientKind = 'spa' | 'clinic' | 'client';

export type InvoicePeriod = 'day' | 'month';

export interface Workplace {
  id: number;
  name: string;
  kind: WorkplaceKind;
  hourRatePence: number;
  hourExtras: HourExtra[];
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: number;
  name: string;
  hourRatePence: number;
  hourExtras: HourExtra[];
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: number;
  type: 'income' | 'expense';
  occurredOn: string;
  amountPence: number;
  hasReceipt: boolean;
  note?: string;
  categorySlug?: string;
  miles?: number;
  invoiceId?: number;
  massageType?: MassageType;
  customMassageType?: string;
  basePence?: number;
  additionalFeePence?: number;
  bonusPence?: number;
  minutes?: number;
  workplaceId?: number;
  clientId?: number;
}

export interface WorkplaceDay {
  workplaceId: number;
  name: string;
  kind: WorkplaceKind;
  basePence: number;
  additionalFeePence: number;
  bonusPence: number;
  totalPence: number;
}

export interface MassageTypeDay {
  massageType: MassageType;
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

export interface ReceiptUrl {
  url: string;
  expiresAt: string;
}

export interface InvoiceLine {
  kind: string;
  description: string;
  quantity: number;
  quantityUnit: string;
  ratePence: number;
  amountPence: number;
  occurredOn: string;
  sourceTransactionId?: number;
}

export interface InvoicePreview {
  recipientKind: RecipientKind;
  recipientName: string;
  workplaceId?: number;
  clientId?: number;
  period: InvoicePeriod;
  periodStart: string;
  periodEnd: string;
  amountPence: number;
  lines: InvoiceLine[];
}

export interface InvoiceDraft {
  recipientKind: RecipientKind;
  workplaceId?: number;
  clientId?: number;
  period: InvoicePeriod;
  date?: string;
  month?: number;
  year?: number;
  issuedOn?: string;
}

export interface Invoice {
  id: number;
  number: string;
  amountPence: number;
  issuedOn: string;
  status: 'issued' | 'paid';
  paidOn?: string;
  clientName?: string;
  service?: string;
  transactionId?: number;
  recipientKind?: RecipientKind;
  recipientName?: string;
  workplaceId?: number;
  clientId?: number;
  period?: InvoicePeriod;
  periodStart?: string;
  periodEnd?: string;
  lines?: InvoiceLine[];
}

export interface TaxSummary {
  taxYear: string;
  periodStart: string;
  periodEnd: string;
  expenseMethod: ExpenseMethod;
  incomePence: number;
  allowableExpensesPence: number;
  netProfitPence: number;
  taxableProfitPence: number;
  incomeTaxPence: number;
  class4NationalInsurancePence: number;
  estimatedTaxOwedPence: number;
  class2: {
    treatedAsPaid: boolean;
    voluntaryWeeklyPence: number;
  };
  assumptions: string[];
  disclaimer: string;
}

export interface ListResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

export function asReadyUser(user: User): ReadyUser | null {
  if (
    user.onboardedAt === null ||
    user.practiceType === null ||
    user.expenseMethod === null
  ) {
    return null;
  }
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    practiceType: user.practiceType,
    expenseMethod: user.expenseMethod,
    onboardedAt: user.onboardedAt,
  };
}
