import { BudgetCategory, Transaction, MonthlyBudget } from '@/types/budget';
import { BankAccount } from '@/types/financial';
import { supabase } from '@/integrations/supabase/client';

/**
 * Centralized financial calculations service
 * Single source of truth for all balance and budget calculations
 */
export class FinancialCalculations {
  /**
   * Calculate total spent across all categories
   */
  static getTotalSpent(categories: BudgetCategory[]): number {
    return categories.reduce((total, cat) => total + cat.spent, 0);
  }

  /**
   * Calculate remaining budget
   */
  static getRemainingBudget(totalBudget: number, categories: BudgetCategory[]): number {
    const totalSpent = this.getTotalSpent(categories);
    return totalBudget - totalSpent;
  }

  /**
   * Calculate spending by budget type (fixed, variable, savings)
   */
  static getSpendingByType(categories: BudgetCategory[]): { fixed: number; variable: number; savings: number } {
    return {
      fixed: categories.filter(cat => cat.type === 'fixed').reduce((total, cat) => total + cat.spent, 0),
      variable: categories.filter(cat => cat.type === 'variable').reduce((total, cat) => total + cat.spent, 0),
      savings: categories.filter(cat => cat.type === 'savings').reduce((total, cat) => total + cat.spent, 0)
    };
  }

  /**
   * Calculate category progress percentage
   */
  static getCategoryProgress(category: BudgetCategory): number {
    if (category.budgetAmount === 0) return 0;
    return Math.min((category.spent / category.budgetAmount) * 100, 100);
  }

  /**
   * Calculate total account balance
   */
  static getTotalAccountBalance(accounts: BankAccount[]): number {
    return accounts.reduce((total, account) => total + account.balance, 0);
  }

  /**
   * Calculate how a transaction affects an account balance
   */
  static calculateAccountBalanceChange(
    transaction: { type: 'income' | 'expense' | 'savings'; amount: number },
    isSourceAccount: boolean = true
  ): number {
    if (transaction.type === 'savings' && !isSourceAccount) {
      // Receiving account in savings transfer gets the amount
      return transaction.amount;
    } else if (transaction.type === 'savings' && isSourceAccount) {
      // Source account in savings transfer loses the amount
      return -transaction.amount;
    } else if (transaction.type === 'income') {
      return transaction.amount;
    } else {
      // expense
      return -transaction.amount;
    }
  }

  /**
   * Calculate how a transaction affects category spent amount
   */
  static calculateCategorySpentChange(
    transaction: { type: 'income' | 'expense' | 'savings'; amount: number },
    isAdding: boolean = true
  ): number {
    const multiplier = isAdding ? 1 : -1;
    
    if (transaction.type === 'expense' || transaction.type === 'savings') {
      return transaction.amount * multiplier;
    }
    // Income doesn't affect spent amount
    return 0;
  }

  /**
   * Calculate how a transaction affects budget amounts
   */
  static calculateBudgetChange(
    transaction: { type: 'income' | 'expense' | 'savings'; amount: number },
    isAdding: boolean = true
  ): number {
    const multiplier = isAdding ? 1 : -1;
    
    if (transaction.type === 'income') {
      return transaction.amount * multiplier;
    }
    // Expenses and savings don't affect budget amounts
    return 0;
  }

  /**
   * Reconcile category spent amounts from actual transactions
   */
  static async reconcileCategory(categoryId: string, userId: string): Promise<number> {
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('amount, type')
      .eq('category_id', categoryId)
      .eq('user_id', userId);

    if (error) throw error;

    let actualSpent = 0;
    transactions?.forEach(transaction => {
      if (transaction.type === 'expense' || transaction.type === 'savings') {
        actualSpent += Number(transaction.amount);
      }
    });

    return actualSpent;
  }

  /**
   * Reconcile account balance from actual transactions and transfers
   */
  static async reconcileAccountBalance(accountId: string, userId: string, initialBalance: number = 0): Promise<number> {
    // Get all transactions for this account
    const { data: transactions, error: transError } = await supabase
      .from('transactions')
      .select('amount, type, account_id, receiving_account_id')
      .or(`account_id.eq.${accountId},receiving_account_id.eq.${accountId}`)
      .eq('user_id', userId);

    if (transError) throw transError;

    // Get all account transfers
    const { data: transfers, error: transferError } = await supabase
      .from('account_transfers')
      .select('amount, from_account_id, to_account_id')
      .or(`from_account_id.eq.${accountId},to_account_id.eq.${accountId}`)
      .eq('user_id', userId);

    if (transferError) throw transferError;

    let calculatedBalance = initialBalance;

    // Process transactions
    transactions?.forEach(transaction => {
      const amount = Number(transaction.amount);
      
      if (transaction.account_id === accountId) {
        // This account is the source
        if (transaction.type === 'income') {
          calculatedBalance += amount;
        } else if (transaction.type === 'expense') {
          calculatedBalance -= amount;
        } else if (transaction.type === 'savings' && transaction.receiving_account_id) {
          calculatedBalance -= amount; // Transfer out
        }
      } else if (transaction.receiving_account_id === accountId) {
        // This account is the receiver (savings transfers)
        if (transaction.type === 'savings') {
          calculatedBalance += amount; // Transfer in
        }
      }
    });

    // Process account transfers
    transfers?.forEach(transfer => {
      const amount = Number(transfer.amount);
      
      if (transfer.from_account_id === accountId) {
        calculatedBalance -= amount; // Transfer out
      } else if (transfer.to_account_id === accountId) {
        calculatedBalance += amount; // Transfer in
      }
    });

    return calculatedBalance;
  }

  /**
   * Validate budget consistency
   */
  static validateBudgetConsistency(budget: MonthlyBudget): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];
    
    // Check if total budget equals sum of type budgets
    const calculatedTotal = budget.fixedBudget + budget.variableBudget + budget.savingsBudget;
    if (Math.abs(budget.totalBudget - calculatedTotal) > 0.01) {
      errors.push(`Total budget (${budget.totalBudget}) doesn't match sum of type budgets (${calculatedTotal})`);
    }

    // Check if category budgets match type budgets
    const categoryTotals = this.getSpendingByType(budget.categories);
    const categoryBudgets = {
      fixed: budget.categories.filter(cat => cat.type === 'fixed').reduce((total, cat) => total + cat.budgetAmount, 0),
      variable: budget.categories.filter(cat => cat.type === 'variable').reduce((total, cat) => total + cat.budgetAmount, 0),
      savings: budget.categories.filter(cat => cat.type === 'savings').reduce((total, cat) => total + cat.budgetAmount, 0)
    };

    if (Math.abs(budget.fixedBudget - categoryBudgets.fixed) > 0.01) {
      errors.push(`Fixed budget total doesn't match category sum`);
    }
    if (Math.abs(budget.variableBudget - categoryBudgets.variable) > 0.01) {
      errors.push(`Variable budget total doesn't match category sum`);
    }
    if (Math.abs(budget.savingsBudget - categoryBudgets.savings) > 0.01) {
      errors.push(`Savings budget total doesn't match category sum`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Calculate net worth from all accounts
   */
  static calculateNetWorth(
    bankAccounts: BankAccount[],
    investments: { current_value: number }[] = [],
    debts: { balance: number }[] = []
  ): number {
    const totalAssets = this.getTotalAccountBalance(bankAccounts) + 
                        investments.reduce((total, inv) => total + inv.current_value, 0);
    const totalDebts = debts.reduce((total, debt) => total + debt.balance, 0);
    
    return totalAssets - totalDebts;
  }
}