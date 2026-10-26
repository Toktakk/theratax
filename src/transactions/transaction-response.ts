import type { MassageType } from './massage-type.js';

export interface TransactionResponse {
  id: number;
  type: 'income' | 'expense';
  occurredOn: string;
  amountPence: number;
  hasReceipt: boolean;
  createdAt: string;
  updatedAt: string;
  note?: string;
  categorySlug?: string;
  miles?: number;
  invoiceId?: number;
  massageType?: MassageType;
  customMassageType?: string;
  basePence?: number;
  additionalFeePence?: number;
  workplaceId?: number;
  clientId?: number;
}
  
export interface TransactionListResponse {
  items: TransactionResponse[];
  total: number;
  skip: number;
  limit: number;
}