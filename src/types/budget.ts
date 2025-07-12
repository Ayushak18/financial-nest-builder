export interface BudgetCategory {
  id: string;
  name: string;
  type: 'fixed' | 'variable' | 'savings';
  budgetAmount: number;
  spent: number;
  color: string;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  categoryId: string;
  description: string;
  date: Date;
}

export interface MonthlyBudget {
  id: string;
  month: string;
  year: number;
  totalBudget: number;
  fixedBudget: number;
  variableBudget: number;
  savingsBudget: number;
  categories: BudgetCategory[];
  transactions: Transaction[];
}