
export enum TransactionType {
  BAKI = 'বাকি (বাকী)',
  BKASH_BAKI = 'বিকাশ বাকি',
  BKASH_JOMA = 'বিকাশ জমা',
  CASH_PAYMENT = 'নগদ পরিশোধ'
}

export interface Transaction {
  id: string;
  name: string;
  amount: number;
  type: TransactionType;
  date: string;
  note?: string;
}

export interface DashboardStats {
  totalGiven: number;
  totalReceived: number;
  totalRemaining: number;
  recentCount: number;
}
