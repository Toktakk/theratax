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
}

export interface ReceiptUrl {
  url: string;
  expiresAt: string;
}

export interface Invoice {
  id: number;
  number: string;
  clientName: string;
  service: string;
  amountPence: number;
  issuedOn: string;
  status: 'issued' | 'paid';
  paidOn?: string;
  transactionId?: number;
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
