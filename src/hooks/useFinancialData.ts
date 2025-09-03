import { useState, useEffect, useCallback } from 'react';
import { BudgetCategory, Transaction, MonthlyBudget } from '@/types/budget';
import { BankAccount } from '@/types/financial';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FinancialCalculations } from '@/services/financialCalculations';

export const useFinancialData = (selectedMonth?: string, selectedYear?: number) => {
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

  // Initialize data
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
          description: "Failed to load financial data",
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

    // Load or create budget
    let { data: monthlyBudget, error: budgetError } = await supabase
      .from('monthly_budgets')
      .select('*')
      .eq('user_id', userId)
      .eq('month', targetMonth)
      .eq('year', targetYear)
      .single();

    if (budgetError && budgetError.code === 'PGRST116') {
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

    // Load all related data
    const [
      { data: categories, error: categoriesError },
      { data: transactions, error: transactionsError },
      { data: accounts, error: accountsError }
    ] = await Promise.all([
      supabase.from('budget_categories').select('*').eq('monthly_budget_id', monthlyBudget.id),
      supabase.from('transactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('bank_accounts').select('*').eq('user_id', userId).eq('is_active', true)
    ]);

    if (categoriesError) throw categoriesError;
    if (transactionsError) throw transactionsError;
    if (accountsError) throw accountsError;

    // Transform and set data
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

  // Transaction management with centralized calculations
  const addTransaction = async (transaction: Omit<Transaction, 'id'> & { accountId?: string; receivingAccountId?: string }) => {
    if (!user || !budget.id) return;

    try {
      // Add transaction to database
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

      // Update account balances using centralized calculation
      if (transaction.accountId) {
        const account = bankAccounts.find(a => a.id === transaction.accountId);
        if (account) {
          const balanceChange = FinancialCalculations.calculateAccountBalanceChange(transaction, true);
          const newBalance = account.balance + balanceChange;

          await supabase
            .from('bank_accounts')
            .update({ balance: newBalance })
            .eq('id', transaction.accountId);

          setBankAccounts(prev => prev.map(a => 
            a.id === transaction.accountId 
              ? { ...a, balance: newBalance }
              : a
          ));
        }
      }

      // Handle receiving account for savings transfers
      if (transaction.type === 'savings' && transaction.receivingAccountId) {
        const receivingAccount = bankAccounts.find(a => a.id === transaction.receivingAccountId);
        if (receivingAccount) {
          const balanceChange = FinancialCalculations.calculateAccountBalanceChange(transaction, false);
          const newBalance = receivingAccount.balance + balanceChange;

          await supabase
            .from('bank_accounts')
            .update({ balance: newBalance })
            .eq('id', transaction.receivingAccountId);

          setBankAccounts(prev => prev.map(a => 
            a.id === transaction.receivingAccountId 
              ? { ...a, balance: newBalance }
              : a
          ));
        }
      }

      // Update category and budget using centralized calculations
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

        // Update monthly budget totals for income
        if (transaction.type === 'income') {
          const newTotalBudget = budget.totalBudget + transaction.amount;
          let budgetTypeField: string;
          let currentBudgetTypeAmount: number;

          if (category.type === 'fixed') {
            budgetTypeField = 'fixed_budget';
            currentBudgetTypeAmount = budget.fixedBudget;
          } else if (category.type === 'variable') {
            budgetTypeField = 'variable_budget';
            currentBudgetTypeAmount = budget.variableBudget;
          } else {
            budgetTypeField = 'savings_budget';
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

        // Update local state
        setBudget(prev => {
          const updatedCategories = prev.categories.map(cat => 
            cat.id === transaction.categoryId ? { 
              ...cat, 
              spent: newSpent,
              budgetAmount: newBudgetAmount
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

          let updatedBudget = { ...prev };
          if (transaction.type === 'income') {
            updatedBudget.totalBudget = prev.totalBudget + transaction.amount;
            if (category.type === 'fixed') {
              updatedBudget.fixedBudget = prev.fixedBudget + transaction.amount;
            } else if (category.type === 'variable') {
              updatedBudget.variableBudget = prev.variableBudget + transaction.amount;
            } else {
              updatedBudget.savingsBudget = prev.savingsBudget + transaction.amount;
            }
          }

          return {
            ...updatedBudget,
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

  // Reconciliation using centralized calculations
  const reconcileBudget = useCallback(async () => {
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

  // Calculation helpers using centralized service
  const calculations = {
    getTotalSpent: () => FinancialCalculations.getTotalSpent(budget.categories),
    getRemainingBudget: () => FinancialCalculations.getRemainingBudget(budget.totalBudget, budget.categories),
    getSpendingByType: () => FinancialCalculations.getSpendingByType(budget.categories),
    getCategoryProgress: (category: BudgetCategory) => FinancialCalculations.getCategoryProgress(category),
    getTotalAccountBalance: () => FinancialCalculations.getTotalAccountBalance(bankAccounts),
    validateBudgetConsistency: () => FinancialCalculations.validateBudgetConsistency(budget)
  };

  return {
    budget,
    bankAccounts,
    loading,
    user,
    addTransaction,
    reconcileBudget,
    loadBudgetData,
    calculations,
    // Keep existing methods for backward compatibility
    getTotalSpent: calculations.getTotalSpent,
    getRemainingBudget: calculations.getRemainingBudget,
    getSpendingByType: calculations.getSpendingByType,
    getCategoryProgress: calculations.getCategoryProgress
  };
};
