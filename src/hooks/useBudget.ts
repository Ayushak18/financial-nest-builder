import { useState, useEffect, useCallback } from 'react';
import { BudgetCategory, Transaction, MonthlyBudget } from '@/types/budget';
import { BankAccount } from '@/types/financial';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FinancialCalculations } from '@/services/financialCalculations';

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
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
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
      .eq('monthly_budget_id', monthlyBudget.id);

    if (categoriesError) throw categoriesError;

    // Load transactions
    const { data: transactions, error: transactionsError } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (transactionsError) throw transactionsError;

    // Load bank accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('bank_accounts')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (accountsError) throw accountsError;

    setBankAccounts(accounts?.map(acc => ({
      id: acc.id,
      user_id: acc.user_id,
      name: acc.name,
      account_type: acc.account_type as 'checking' | 'savings' | 'credit' | 'investment' | 'cash',
      balance: Number(acc.balance),
      currency: acc.currency,
      is_active: acc.is_active,
      created_at: acc.created_at,
      updated_at: acc.updated_at
    })) || []);

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
        type: t.type as 'expense' | 'income' | 'savings',
        date: new Date(t.date),
        accountId: t.account_id,
        receivingAccountId: t.receiving_account_id
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
          monthly_budget_id: budget.id,
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

  const addTransaction = async (transaction: Omit<Transaction, 'id'> & { accountId?: string; receivingAccountId?: string }) => {
    if (!user || !budget.id) return;

    try {
      const { data, error } = await supabase
        .from('transactions')
        .insert({
          category_id: transaction.categoryId,
          user_id: user.id,
          account_id: transaction.accountId || null,
          receiving_account_id: transaction.receivingAccountId || null,
          description: transaction.description,
          amount: transaction.amount,
          type: transaction.type,
          date: transaction.date.toISOString()
        })
        .select()
        .single();

      if (error) throw error;

      // Update account balance using centralized calculation
      if (transaction.accountId) {
        const account = bankAccounts.find(a => a.id === transaction.accountId);
        if (account) {
          const balanceChange = FinancialCalculations.calculateAccountBalanceChange(transaction, true);
          const newBalance = account.balance + balanceChange;
          
          await supabase
            .from('bank_accounts')
            .update({ balance: newBalance })
            .eq('id', transaction.accountId);

          // Update local bank accounts state
          setBankAccounts(prev => prev.map(a => 
            a.id === transaction.accountId 
              ? { ...a, balance: newBalance }
              : a
          ));
        }
      }

      // Handle receiving account for savings transfers using centralized calculation
      if (transaction.type === 'savings' && transaction.receivingAccountId) {
        const receivingAccount = bankAccounts.find(a => a.id === transaction.receivingAccountId);
        if (receivingAccount) {
          const balanceChange = FinancialCalculations.calculateAccountBalanceChange(transaction, false);
          const newBalance = receivingAccount.balance + balanceChange;
          
          await supabase
            .from('bank_accounts')
            .update({ balance: newBalance })
            .eq('id', transaction.receivingAccountId);

          // Update local bank accounts state
          setBankAccounts(prev => prev.map(a => 
            a.id === transaction.receivingAccountId 
              ? { ...a, balance: newBalance }
              : a
          ));
        }
      }

      // Update category spent amount and budget using centralized calculations
      const category = budget.categories.find(cat => cat.id === transaction.categoryId);
      if (category) {
        const spentChange = FinancialCalculations.calculateCategorySpentChange(transaction, true);
        const budgetChange = FinancialCalculations.calculateBudgetChange(transaction, true);
        
        const newSpent = category.spent + spentChange;
        const newBudgetAmount = category.budgetAmount + budgetChange;

        const updateData: any = { spent: newSpent };
        if (budgetChange !== 0) {
          updateData.budget_amount = newBudgetAmount;
        }

        await supabase
          .from('budget_categories')
          .update(updateData)
          .eq('id', transaction.categoryId);

        // Update overall budget if it's income
        if (budgetChange !== 0) {
          const newTotalBudget = budget.totalBudget + transaction.amount;
          let budgetTypeField: string;
          
          if (category.type === 'fixed') {
            budgetTypeField = 'fixed_budget';
          } else if (category.type === 'variable') {
            budgetTypeField = 'variable_budget';
          } else {
            budgetTypeField = 'savings_budget';
          }

          let currentBudgetTypeAmount: number;
          if (category.type === 'fixed') {
            currentBudgetTypeAmount = budget.fixedBudget;
          } else if (category.type === 'variable') {
            currentBudgetTypeAmount = budget.variableBudget;
          } else {
            currentBudgetTypeAmount = budget.savingsBudget;
          }

          await supabase
            .from('monthly_budgets')
            .update({ 
              total_budget: newTotalBudget,
              [budgetTypeField]: currentBudgetTypeAmount + transaction.amount
            })
            .eq('id', budget.id);
        }

        setBudget(prev => {
          const updatedCategories = prev.categories.map(cat => 
            cat.id === transaction.categoryId ? { 
              ...cat, 
              spent: newSpent,
              budgetAmount: transaction.type === 'income' ? newBudgetAmount : cat.budgetAmount
            } : cat
          );

          const newTransaction: Transaction = {
            id: data.id,
            categoryId: data.category_id,
            description: data.description,
            amount: Number(data.amount),
            type: data.type as 'expense' | 'income' | 'savings',
            date: new Date(data.date),
            accountId: data.account_id,
            receivingAccountId: data.receiving_account_id
          };

          // Update overall budget amounts for income
          let updatedBudget = { ...prev };
          if (budgetChange !== 0) {
            updatedBudget.totalBudget = prev.totalBudget + budgetChange;
            if (category.type === 'fixed') {
              updatedBudget.fixedBudget = prev.fixedBudget + budgetChange;
            } else if (category.type === 'variable') {
              updatedBudget.variableBudget = prev.variableBudget + budgetChange;
            } else {
              updatedBudget.savingsBudget = prev.savingsBudget + budgetChange;
            }
          }

          return {
            ...updatedBudget,
            categories: updatedCategories.map(cat => 
              cat.id === transaction.categoryId ? { 
                ...cat, 
                spent: newSpent,
                budgetAmount: newBudgetAmount
              } : cat
            ),
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

  const updateTransaction = async (transactionId: string, updates: Partial<Transaction> & { accountId?: string }) => {
    if (!user) return;

    try {
      const oldTransaction = budget.transactions.find(t => t.id === transactionId);
      if (!oldTransaction) return;

      // Get current account_id from database
      const { data: dbTransaction } = await supabase
        .from('transactions')
        .select('account_id')
        .eq('id', transactionId)
        .single();

      const oldAccountId = dbTransaction?.account_id;
      const newAccountId = updates.accountId !== undefined ? updates.accountId : oldAccountId;
      const oldAmount = oldTransaction.amount;
      const newAmount = updates.amount || oldTransaction.amount;
      const oldType = oldTransaction.type;
      const newType = updates.type || oldTransaction.type;

      // Handle account balance changes
      if (oldAccountId || newAccountId) {
        // Revert old account balance
        if (oldAccountId) {
          const oldAccount = bankAccounts.find(a => a.id === oldAccountId);
          if (oldAccount) {
            const revertChange = oldType === 'income' ? -oldAmount : oldAmount;
            const revertedBalance = oldAccount.balance + revertChange;
            
            await supabase
              .from('bank_accounts')
              .update({ balance: revertedBalance })
              .eq('id', oldAccountId);

            setBankAccounts(prev => prev.map(a => 
              a.id === oldAccountId 
                ? { ...a, balance: revertedBalance }
                : a
            ));
          }
        }

        // Apply new account balance
        if (newAccountId) {
          const newAccount = bankAccounts.find(a => a.id === newAccountId);
          if (newAccount) {
            const balanceChange = newType === 'income' ? newAmount : -newAmount;
            const newBalance = newAccount.balance + balanceChange;
            
            await supabase
              .from('bank_accounts')
              .update({ balance: newBalance })
              .eq('id', newAccountId);

            setBankAccounts(prev => prev.map(a => 
              a.id === newAccountId 
                ? { ...a, balance: newBalance }
                : a
            ));
          }
        }
      }

      // Update transaction in database
      const { error } = await supabase
        .from('transactions')
        .update({
          description: updates.description,
          amount: updates.amount,
          type: updates.type,
          category_id: updates.categoryId,
          account_id: updates.accountId !== undefined ? updates.accountId : oldAccountId,
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

      // First check if transaction has account_id and receiving_account_id in the database
      const { data: dbTransaction } = await supabase
        .from('transactions')
        .select('account_id, receiving_account_id')
        .eq('id', transactionId)
        .single();

      // Revert account balance if account is specified
      if (dbTransaction?.account_id) {
        const account = bankAccounts.find(a => a.id === dbTransaction.account_id);
        if (account) {
          let balanceRevert: number;
          
          if (transaction.type === 'savings' && dbTransaction.receiving_account_id) {
            // For savings transfers, add back to source account
            balanceRevert = transaction.amount;
          } else {
            // For regular transactions
            balanceRevert = transaction.type === 'income' ? -transaction.amount : transaction.amount;
          }
          
          const newBalance = account.balance + balanceRevert;
          
          await supabase
            .from('bank_accounts')
            .update({ balance: newBalance })
            .eq('id', dbTransaction.account_id);

          // Update local bank accounts state
          setBankAccounts(prev => prev.map(a => 
            a.id === dbTransaction.account_id 
              ? { ...a, balance: newBalance }
              : a
          ));
        }
      }

      // Revert receiving account balance for savings transfers
      if (transaction.type === 'savings' && dbTransaction?.receiving_account_id) {
        const receivingAccount = bankAccounts.find(a => a.id === dbTransaction.receiving_account_id);
        if (receivingAccount) {
          const newBalance = receivingAccount.balance - transaction.amount;
          
          await supabase
            .from('bank_accounts')
            .update({ balance: newBalance })
            .eq('id', dbTransaction.receiving_account_id);

          // Update local bank accounts state
          setBankAccounts(prev => prev.map(a => 
            a.id === dbTransaction.receiving_account_id 
              ? { ...a, balance: newBalance }
              : a
          ));
        }
      }

      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', transactionId);

      if (error) throw error;

      // Update category spent amount and budget for income deletion
      const category = budget.categories.find(cat => cat.id === transaction.categoryId);
      if (category) {
        let newSpent: number;
        let newBudgetAmount = category.budgetAmount;
        
        if (transaction.type === 'expense') {
          newSpent = Math.max(0, category.spent - transaction.amount);
        } else if (transaction.type === 'savings') {
          // For savings, subtract from the spent amount (it was "contributed")
          newSpent = Math.max(0, category.spent - transaction.amount);
        } else {
          // For income, don't change spent amount, only decrease budget
          newSpent = category.spent;
          newBudgetAmount = Math.max(0, category.budgetAmount - transaction.amount);
        }

        const updateData: any = { spent: newSpent };
        if (transaction.type === 'income') {
          updateData.budget_amount = newBudgetAmount;
        }

        await supabase
          .from('budget_categories')
          .update(updateData)
          .eq('id', transaction.categoryId);

        // Update overall budget if it's income
        if (transaction.type === 'income') {
          const newTotalBudget = Math.max(0, budget.totalBudget - transaction.amount);
          let budgetTypeField: string;
          
          if (category.type === 'fixed') {
            budgetTypeField = 'fixed_budget';
          } else if (category.type === 'variable') {
            budgetTypeField = 'variable_budget';
          } else {
            budgetTypeField = 'savings_budget';
          }

          let currentBudgetTypeAmount: number;
          if (category.type === 'fixed') {
            currentBudgetTypeAmount = budget.fixedBudget;
          } else if (category.type === 'variable') {
            currentBudgetTypeAmount = budget.variableBudget;
          } else {
            currentBudgetTypeAmount = budget.savingsBudget;
          }

          await supabase
            .from('monthly_budgets')
            .update({ 
              total_budget: newTotalBudget,
              [budgetTypeField]: Math.max(0, currentBudgetTypeAmount - transaction.amount)
            })
            .eq('id', budget.id);
        }

        setBudget(prev => {
          const updatedCategories = prev.categories.map(cat => 
            cat.id === transaction.categoryId ? { 
              ...cat, 
              spent: newSpent,
              budgetAmount: transaction.type === 'income' ? newBudgetAmount : cat.budgetAmount
            } : cat
          );

          // Update overall budget amounts for income deletion
          let updatedBudget = { ...prev };
          if (transaction.type === 'income') {
            updatedBudget.totalBudget = Math.max(0, prev.totalBudget - transaction.amount);
            if (category.type === 'fixed') {
              updatedBudget.fixedBudget = Math.max(0, prev.fixedBudget - transaction.amount);
            } else if (category.type === 'variable') {
              updatedBudget.variableBudget = Math.max(0, prev.variableBudget - transaction.amount);
            } else {
              updatedBudget.savingsBudget = Math.max(0, prev.savingsBudget - transaction.amount);
            }
          }

          return {
            ...updatedBudget,
            categories: updatedCategories,
            transactions: prev.transactions.filter(t => t.id !== transactionId)
          };
        });
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
    return FinancialCalculations.getTotalSpent(budget.categories);
  };

  const getRemainingBudget = () => {
    const remaining = FinancialCalculations.getRemainingBudget(budget.totalBudget, budget.categories);
    
    // Debug logging for calculation verification
    console.log('Budget Calculation Debug:', {
      totalBudget: budget.totalBudget,
      totalSpent: FinancialCalculations.getTotalSpent(budget.categories),
      remainingBudget: remaining,
      categories: budget.categories.map(cat => ({
        name: cat.name,
        type: cat.type,
        budgetAmount: cat.budgetAmount,
        spent: cat.spent
      }))
    });
    
    return remaining;
  };

  const getCategoryProgress = (category: BudgetCategory) => {
    return FinancialCalculations.getCategoryProgress(category);
  };

  const getSpendingByType = () => {
    return FinancialCalculations.getSpendingByType(budget.categories);
  };

  // Reconciliation using centralized calculations
  const reconcileCategorySpent = useCallback(async () => {
    if (!user || !budget.id) return;

    try {
      const updatedCategories = await Promise.all(
        budget.categories.map(async (category) => {
          const actualSpent = await FinancialCalculations.reconcileCategory(category.id, user.id);
          
          if (Math.abs(actualSpent - category.spent) > 0.01) {
            await supabase
              .from('budget_categories')
              .update({ spent: actualSpent })
              .eq('id', category.id);
          }

          return { ...category, spent: actualSpent };
        })
      );

      setBudget(prev => ({
        ...prev,
        categories: updatedCategories
      }));

      toast({
        title: "Success",
        description: "Budget reconciled successfully",
      });
    } catch (error) {
      console.error('Error reconciling budget:', error);
      toast({
        title: "Error",
        description: "Failed to reconcile budget",
        variant: "destructive",
      });
    }
  }, [user, budget.categories, budget.id]);

  return {
    budget,
    bankAccounts,
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
    getSpendingByType,
    reconcileCategorySpent
  };
};