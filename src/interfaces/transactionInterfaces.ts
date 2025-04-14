export interface TransactionInput {
    idempotentKey: string;
    userId: string;
    amount: string;
    type: 'credit' | 'debit';
  }
  