import { BudgetCategory, Transaction, MonthlyBudget } from '@/types/budget';
import { BankAccount } from '@/types/financial';

/**
 * Simplified financial calculations service
 * Clean, straightforward calculations without complex logic
 */
export class SimpleCalculations {
  // Basic budget calculations
  static getTotalSpent(categories: BudgetCategory[]): number {
    return categories.reduce((sum, cat) => sum + cat.spent, 0);
  }

  static getRemainingBudget(totalBudget: number, totalSpent: number): number {
    return totalBudget - totalSpent;
  }

  static getCategoryProgress(category: BudgetCategory): number {
    if (category.budgetAmount <= 0) return 0;
    return Math.round((category.spent / category.budgetAmount) * 100);
  }

  // Account calculations
  static getTotalBalance(accounts: BankAccount[]): number {
    return accounts.reduce((sum, acc) => sum + acc.balance, 0);
  }

  // Transaction impact calculations
  static getTransactionImpact(transaction: Transaction, isAdding: boolean = true): {
    accountChange: number;
    categoryChange: number;
    budgetChange: number;
  } {
    const multiplier = isAdding ? 1 : -1;
    
    switch (transaction.type) {
      case 'income':
        return {
          accountChange: transaction.amount * multiplier,
          categoryChange: 0, // Income doesn't count as spending
          budgetChange: transaction.amount * multiplier
        };
      case 'expense':
        return {
          accountChange: -transaction.amount * multiplier,
          categoryChange: transaction.amount * multiplier,
          budgetChange: 0
        };
      case 'savings':
        return {
          accountChange: -transaction.amount * multiplier, // From source account
          categoryChange: transaction.amount * multiplier,
          budgetChange: 0
        };
      default:
        return { accountChange: 0, categoryChange: 0, budgetChange: 0 };
    }
  }

  // Spending by category type
  static getSpendingByType(categories: BudgetCategory[]): {
    fixed: number;
    variable: number;
    savings: number;
  } {
    return {
      fixed: categories.filter(c => c.type === 'fixed').reduce((sum, c) => sum + c.spent, 0),
      variable: categories.filter(c => c.type === 'variable').reduce((sum, c) => sum + c.spent, 0),
      savings: categories.filter(c => c.type === 'savings').reduce((sum, c) => sum + c.spent, 0)
    };
  }

  // Budget validation
  static validateBudget(budget: MonthlyBudget): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    const totalByType = budget.fixedBudget + budget.variableBudget + budget.savingsBudget;
    if (Math.abs(budget.totalBudget - totalByType) > 0.01) {
      errors.push('Total budget does not match sum of category budgets');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Net worth calculation
  static calculateNetWorth(assets: number, debts: number): number {
    return assets - debts;
  }
}