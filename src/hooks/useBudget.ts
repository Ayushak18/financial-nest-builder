import { useState, useEffect } from 'react';
import { BudgetCategory, Transaction, MonthlyBudget } from '@/types/budget';

export const useBudget = () => {
  const [budget, setBudget] = useState<MonthlyBudget>({
    id: '1',
    month: new Date().toLocaleString('default', { month: 'long' }),
    year: new Date().getFullYear(),
    totalBudget: 0,
    fixedBudget: 0,
    variableBudget: 0,
    savingsBudget: 0,
    categories: [],
    transactions: []
  });

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('monthlyBudget');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Convert date strings back to Date objects
      parsed.transactions = parsed.transactions.map((t: any) => ({
        ...t,
        date: new Date(t.date)
      }));
      setBudget(parsed);
    }
  }, []);

  // Save to localStorage whenever budget changes
  useEffect(() => {
    localStorage.setItem('monthlyBudget', JSON.stringify(budget));
  }, [budget]);

  const updateBudget = (updates: Partial<MonthlyBudget>) => {
    setBudget(prev => ({ ...prev, ...updates }));
  };

  const addCategory = (category: Omit<BudgetCategory, 'id' | 'spent'>) => {
    const newCategory: BudgetCategory = {
      ...category,
      id: Date.now().toString(),
      spent: 0
    };
    setBudget(prev => ({
      ...prev,
      categories: [...prev.categories, newCategory]
    }));
  };

  const updateCategory = (categoryId: string, updates: Partial<BudgetCategory>) => {
    setBudget(prev => ({
      ...prev,
      categories: prev.categories.map(cat => 
        cat.id === categoryId ? { ...cat, ...updates } : cat
      )
    }));
  };

  const deleteCategory = (categoryId: string) => {
    setBudget(prev => ({
      ...prev,
      categories: prev.categories.filter(cat => cat.id !== categoryId),
      transactions: prev.transactions.filter(t => t.categoryId !== categoryId)
    }));
  };

  const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: Date.now().toString()
    };

    setBudget(prev => {
      // Update category spent amount
      const updatedCategories = prev.categories.map(cat => {
        if (cat.id === transaction.categoryId) {
          const newSpent = transaction.type === 'expense' 
            ? cat.spent + transaction.amount
            : Math.max(0, cat.spent - transaction.amount);
          return { ...cat, spent: newSpent };
        }
        return cat;
      });

      return {
        ...prev,
        categories: updatedCategories,
        transactions: [...prev.transactions, newTransaction]
      };
    });
  };

  const deleteTransaction = (transactionId: string) => {
    setBudget(prev => {
      const transaction = prev.transactions.find(t => t.id === transactionId);
      if (!transaction) return prev;

      // Update category spent amount
      const updatedCategories = prev.categories.map(cat => {
        if (cat.id === transaction.categoryId) {
          const newSpent = transaction.type === 'expense'
            ? Math.max(0, cat.spent - transaction.amount)
            : cat.spent + transaction.amount;
          return { ...cat, spent: newSpent };
        }
        return cat;
      });

      return {
        ...prev,
        categories: updatedCategories,
        transactions: prev.transactions.filter(t => t.id !== transactionId)
      };
    });
  };

  const getTotalSpent = () => {
    return budget.categories.reduce((total, cat) => total + cat.spent, 0);
  };

  const getRemainingBudget = () => {
    return budget.totalBudget - getTotalSpent();
  };

  const getCategoryProgress = (category: BudgetCategory) => {
    if (category.budgetAmount === 0) return 0;
    return Math.min((category.spent / category.budgetAmount) * 100, 100);
  };

  return {
    budget,
    updateBudget,
    addCategory,
    updateCategory,
    deleteCategory,
    addTransaction,
    deleteTransaction,
    getTotalSpent,
    getRemainingBudget,
    getCategoryProgress
  };
};