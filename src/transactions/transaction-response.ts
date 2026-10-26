export interface TransactionResponse {
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
  
  export interface TransactionListResponse {
    items: TransactionResponse[];
    total: number;
    skip: number;
    limit: number;
  }