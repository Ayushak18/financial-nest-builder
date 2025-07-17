import { useState, useEffect } from 'react';
import { BudgetCategory, Transaction, MonthlyBudget } from '@/types/budget';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useBudget = (selectedMonth?: string, selectedYear?: number) => {
  const { toast } = useToast();
  const [budget, setBudget] = useState<MonthlyBudget>({
    id: '',
    month: selectedMonth || new Date().toLocaleString('default', { month: 'long' }),
    year: selectedYear || new Date().getFullYear(),
    totalBudget: 0,
    fixedBudget: 0,
    variableBudget: 0,
    savingsBudget: 0,
    categories: [],
    transactions: []
  });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  // Check authentication and load data
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }
        setUser(user);
        await loadBudgetData(user.id, selectedMonth, selectedYear);
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: "Error",
          description: "Failed to load budget data",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedMonth, selectedYear]);

  const loadBudgetData = async (userId: string, month?: string, year?: number) => {
    const targetMonth = month || new Date().toLocaleString('default', { month: 'long' });
    const targetYear = year || new Date().getFullYear();

    // Load or create target month's budget
    let { data: monthlyBudget, error: budgetError } = await supabase
      .from('monthly_budgets')
      .select('*')
      .eq('user_id', userId)
      .eq('month', targetMonth)
      .eq('year', targetYear)
      .single();

    if (budgetError && budgetError.code === 'PGRST116') {
      // Create new budget if it doesn't exist
      const { data: newBudget, error: createError } = await supabase
        .from('monthly_budgets')
        .insert({
          user_id: userId,
          month: targetMonth,
          year: targetYear,
          total_budget: 0,
          fixed_budget: 0,
          variable_budget: 0,
          savings_budget: 0
        })
        .select()
        .single();

      if (createError) throw createError;
      monthlyBudget = newBudget;
    } else if (budgetError) {
      throw budgetError;
    }

    // Load categories
    const { data: categories, error: categoriesError } = await supabase
      .from('budget_categories')
      .select('*')
      .eq('budget_id', monthlyBudget.id);

    if (categoriesError) throw categoriesError;

    // Load transactions
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('budget_id', monthlyBudget.id)
      .order('created_at', { ascending: false });

    if (transactionsError) throw transactionsError;

    // Transform data to match our types
    setBudget({
      id: monthlyBudget.id,
      month: monthlyBudget.month,
      year: monthlyBudget.year,
      totalBudget: Number(monthlyBudget.total_budget),
      fixedBudget: Number(monthlyBudget.fixed_budget),
      variableBudget: Number(monthlyBudget.variable_budget),
      savingsBudget: Number(monthlyBudget.savings_budget),
      categories: categories?.map(cat => ({
        id: cat.id,
        name: cat.name,
        budgetAmount: Number(cat.budget_amount),
        spent: Number(cat.spent),
        type: cat.type as 'fixed' | 'variable' | 'savings',
        color: cat.color
      })) || [],
      transactions: transactions?.map(t => ({
        id: t.id,
        categoryId: t.category_id,
        description: t.description,
        amount: Number(t.amount),
        type: t.type as 'expense' | 'income',
        date: new Date(t.date)
      })) || []
    });
  };

  const updateBudget = async (updates: Partial<MonthlyBudget>) => {
    if (!user || !budget.id) return;

    try {
      const { error } = await supabase
        .from('monthly_budgets')
        .update({
          total_budget: updates.totalBudget,
          fixed_budget: updates.fixedBudget,
          variable_budget: updates.variableBudget,
          savings_budget: updates.savingsBudget
        })
        .eq('id', budget.id);

      if (error) throw error;

      setBudget(prev => ({ ...prev, ...updates }));
      toast({
        title: "Success",
        description: "Budget updated successfully",
      });
    } catch (error) {
      console.error('Error updating budget:', error);
      toast({
        title: "Error",
        description: "Failed to update budget",
        variant: "destructive",
      });
    }
  };

  const addCategory = async (category: Omit<BudgetCategory, 'id' | 'spent'>) => {
    if (!user || !budget.id) return;

    try {
      const { data, error } = await supabase
        .from('budget_categories')
        .insert({
          budget_id: budget.id,
          user_id: user.id,
          name: category.name,
          budget_amount: category.budgetAmount,
          type: category.type,
          color: category.color,
          spent: 0
        })
        .select()
        .single();

      if (error) throw error;

      const newCategory: BudgetCategory = {
        id: data.id,
        name: data.name,
        budgetAmount: Number(data.budget_amount),
        spent: 0,
        type: data.type as 'fixed' | 'variable' | 'savings',
        color: data.color
      };

      setBudget(prev => ({
        ...prev,
        categories: [...prev.categories, newCategory]
      }));

      toast({
        title: "Success",
        description: "Category added successfully",
      });
    } catch (error) {
      console.error('Error adding category:', error);
      toast({
        title: "Error",
        description: "Failed to add category",
        variant: "destructive",
      });
    }
  };

  const updateCategory = async (categoryId: string, updates: Partial<BudgetCategory>) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('budget_categories')
        .update({
          name: updates.name,
          budget_amount: updates.budgetAmount,
          type: updates.type
        })
        .eq('id', categoryId);

      if (error) throw error;

      setBudget(prev => ({
        ...prev,
        categories: prev.categories.map(cat => 
          cat.id === categoryId ? { ...cat, ...updates } : cat
        )
      }));

      toast({
        title: "Success",
        description: "Category updated successfully",
      });
    } catch (error) {
      console.error('Error updating category:', error);
      toast({
        title: "Error",
        description: "Failed to update category",
        variant: "destructive",
      });
    }
  };

  const deleteCategory = async (categoryId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('budget_categories')
        .delete()
        .eq('id', categoryId);

      if (error) throw error;

      setBudget(prev => ({
        ...prev,
        categories: prev.categories.filter(cat => cat.id !== categoryId),
        transactions: prev.transactions.filter(t => t.categoryId !== categoryId)
      }));

      toast({
        title: "Success",
        description: "Category deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting category:', error);
      toast({
        title: "Error",
        description: "Failed to delete category",
        variant: "destructive",
      });
    }
  };

  const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    if (!user || !budget.id) return;

    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          budget_id: budget.id,
          category_id: transaction.categoryId,
          user_id: user.id,
          description: transaction.description,
          amount: transaction.amount,
          type: transaction.type,
          date: transaction.date.toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Update category spent amount
      const category = budget.categories.find(cat => cat.id === transaction.categoryId);
      if (category) {
        const newSpent = transaction.type === 'expense' 
          ? category.spent + transaction.amount
          : Math.max(0, category.spent - transaction.amount);

        await supabase
          .from('budget_categories')
          .update({ spent: newSpent })
          .eq('id', transaction.categoryId);

        setBudget(prev => {
          const updatedCategories = prev.categories.map(cat => 
            cat.id === transaction.categoryId ? { ...cat, spent: newSpent } : cat
          );

          const newTransaction: Transaction = {
            id: data.id,
            categoryId: data.category_id,
            description: data.description,
            amount: Number(data.amount),
            type: data.type as 'expense' | 'income',
            date: new Date(data.date)
          };

          return {
            ...prev,
            categories: updatedCategories,
            transactions: [newTransaction, ...prev.transactions]
          };
        });
      }

      toast({
        title: "Success",
        description: "Transaction added successfully",
      });
    } catch (error) {
      console.error('Error adding transaction:', error);
      toast({
        title: "Error",
        description: "Failed to add transaction",
        variant: "destructive",
      });
    }
  };

  const updateTransaction = async (transactionId: string, updates: Partial<Transaction>) => {
    if (!user) return;

    try {
      const oldTransaction = budget.transactions.find(t => t.id === transactionId);
      if (!oldTransaction) return;

      // Update transaction in database
      const { error } = await supabase
        .from('transactions')
        .update({
          description: updates.description,
          amount: updates.amount,
          type: updates.type,
          category_id: updates.categoryId,
          date: updates.date?.toISOString()
        })
        .eq('id', transactionId);

      if (error) throw error;

      // Update category spent amounts
      const oldCategory = budget.categories.find(cat => cat.id === oldTransaction.categoryId);
      const newCategory = budget.categories.find(cat => cat.id === (updates.categoryId || oldTransaction.categoryId));

      if (oldCategory && newCategory) {
        // Revert old transaction effect
        const oldCategoryNewSpent = oldTransaction.type === 'expense'
          ? Math.max(0, oldCategory.spent - oldTransaction.amount)
          : oldCategory.spent + oldTransaction.amount;

        // Apply new transaction effect
        const newTransactionAmount = updates.amount ?? oldTransaction.amount;
        const newTransactionType = updates.type ?? oldTransaction.type;
        const newCategoryUpdatedSpent = newTransactionType === 'expense'
          ? newCategory.spent + newTransactionAmount
          : Math.max(0, newCategory.spent - newTransactionAmount);

        // Update both categories if they're different
        if (oldCategory.id !== newCategory.id) {
          await Promise.all([
            supabase.from('budget_categories').update({ spent: oldCategoryNewSpent }).eq('id', oldCategory.id),
            supabase.from('budget_categories').update({ spent: newCategoryUpdatedSpent }).eq('id', newCategory.id)
          ]);
        } else {
          // Same category, calculate net change
          const netSpent = oldCategoryNewSpent + (newTransactionType === 'expense' ? newTransactionAmount : -newTransactionAmount);
          await supabase.from('budget_categories').update({ spent: Math.max(0, netSpent) }).eq('id', newCategory.id);
        }

        setBudget(prev => ({
          ...prev,
          categories: prev.categories.map(cat => {
            if (cat.id === oldCategory.id && cat.id === newCategory.id) {
              // Same category
              const netSpent = oldCategoryNewSpent + (newTransactionType === 'expense' ? newTransactionAmount : -newTransactionAmount);
              return { ...cat, spent: Math.max(0, netSpent) };
            } else if (cat.id === oldCategory.id) {
              return { ...cat, spent: oldCategoryNewSpent };
            } else if (cat.id === newCategory.id) {
              return { ...cat, spent: newCategoryUpdatedSpent };
            }
            return cat;
          }),
          transactions: prev.transactions.map(t =>
            t.id === transactionId ? { ...t, ...updates } : t
          )
        }));
      }

      toast({
        title: "Success",
        description: "Transaction updated successfully",
      });
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast({
        title: "Error",
        description: "Failed to update transaction",
        variant: "destructive",
      });
    }
  };

  const deleteTransaction = async (transactionId: string) => {
    if (!user) return;

    try {
      const transaction = budget.transactions.find(t => t.id === transactionId);
      if (!transaction) return;

      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId);

      if (error) throw error;

      // Update category spent amount
      const category = budget.categories.find(cat => cat.id === transaction.categoryId);
      if (category) {
        const newSpent = transaction.type === 'expense'
          ? Math.max(0, category.spent - transaction.amount)
          : category.spent + transaction.amount;

        await supabase
          .from('budget_categories')
          .update({ spent: newSpent })
          .eq('id', transaction.categoryId);

        setBudget(prev => ({
          ...prev,
          categories: prev.categories.map(cat => 
            cat.id === transaction.categoryId ? { ...cat, spent: newSpent } : cat
          ),
          transactions: prev.transactions.filter(t => t.id !== transactionId)
        }));
      }

      toast({
        title: "Success",
        description: "Transaction deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast({
        title: "Error",
        description: "Failed to delete transaction",
        variant: "destructive",
      });
    }
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

  const getSpendingByType = () => {
    const fixedSpent = budget.categories
      .filter(cat => cat.type === 'fixed')
      .reduce((total, cat) => total + cat.spent, 0);
    
    const variableSpent = budget.categories
      .filter(cat => cat.type === 'variable')
      .reduce((total, cat) => total + cat.spent, 0);
    
    const savingsSpent = budget.categories
      .filter(cat => cat.type === 'savings')
      .reduce((total, cat) => total + cat.spent, 0);

    return {
      fixed: fixedSpent,
      variable: variableSpent,
      savings: savingsSpent
    };
  };

  return {
    budget,
    loading,
    user,
    updateBudget,
    addCategory,
    updateCategory,
    deleteCategory,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    getTotalSpent,
    getRemainingBudget,
    getCategoryProgress,
    getSpendingByType
  };
};