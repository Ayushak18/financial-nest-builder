export interface BankAccount {
  id: string;
  user_id: string;
  name: string;
  account_type: 'checking' | 'savings' | 'credit' | 'investment' | 'cash';
  balance: number;
  currency: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Investment {
  id: string;
  user_id: string;
  account_id: string;
  symbol: string;
  name: string;
  shares: number;
  purchase_price: number;
  current_price: number;
  investment_type: 'stock' | 'bond' | 'mutual_fund' | 'etf' | 'crypto' | 'other';
  created_at: string;
  updated_at: string;
}

export interface Debt {
  id: string;
  user_id: string;
  name: string;
  debt_type: 'credit_card' | 'personal_loan' | 'mortgage' | 'student_loan' | 'auto_loan' | 'other';
  balance: number;
  interest_rate: number;
  minimum_payment: number;
  due_date: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RecurringTransaction {
  id: string;
  user_id: string;
  account_id: string;
  category_id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  start_date: string;
  end_date?: string;
  next_occurrence: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Bill {
  id: string;
  user_id: string;
  account_id: string;
  name: string;
  amount: number;
  due_date: number;
  category: string;
  is_recurring: boolean;
  reminder_days: number;
  is_paid: boolean;
  last_paid_date?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FinancialGoal {
  id: string;
  user_id: string;
  name: string;
  goal_type: 'savings' | 'debt_payoff' | 'investment' | 'emergency_fund' | 'other';
  target_amount: number;
  current_amount: number;
  target_date?: string;
  priority: number;
  is_achieved: boolean;
  created_at: string;
  updated_at: string;
}

export interface AccountTransfer {
  id: string;
  user_id: string;
  from_account_id: string;
  to_account_id: string;
  amount: number;
  description?: string;
  transfer_date: string;
  created_at: string;
}

export interface NetWorthSummary {
  totalAssets: number;
  totalDebts: number;
  netWorth: number;
  liquidAssets: number;
  investments: number;
}