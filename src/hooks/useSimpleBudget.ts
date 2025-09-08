import { useState, useEffect } from 'react';
import { BudgetCategory, Transaction, MonthlyBudget } from '@/types/budget';
import { BankAccount } from '@/types/financial';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { SimpleCalculations } from '@/services/simpleCalculations';
import { DummyDataGenerator } from '@/services/dummyDataGenerator';

export const useSimpleBudget = (selectedMonth?: string, selectedYear?: number) => {
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

  useEffect(() => {
    loadData();
  }, [selectedMonth, selectedYear]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      setUser(user);
      await loadBudgetData(user.id);
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

  const loadBudgetData = async (userId: string) => {
    const targetMonth = selectedMonth || new Date().toLocaleString('default', { month: 'long' });
    const targetYear = selectedYear || new Date().getFullYear();

    // Load budget
    let { data: monthlyBudget } = await supabase
      .from('monthly_budgets')
      .select('*')
      .eq('user_id', userId)
      .eq('month', targetMonth)
      .eq('year', targetYear)
      .maybeSingle();

    if (!monthlyBudget) {
      const { data: newBudget } = await supabase
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
      monthlyBudget = newBudget;
    }

    // Load all related data
    const [categoriesResult, transactionsResult, accountsResult] = await Promise.all([
      supabase.from('budget_categories').select('*').eq('monthly_budget_id', monthlyBudget?.id),
      supabase.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false }),
      supabase.from('bank_accounts').select('*').eq('user_id', userId).eq('is_active', true)
    ]);

    // Transform data
    setBankAccounts(accountsResult.data?.map(acc => ({
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
      id: monthlyBudget?.id || '',
      month: monthlyBudget?.month || targetMonth,
      year: monthlyBudget?.year || targetYear,
      totalBudget: Number(monthlyBudget?.total_budget || 0),
      fixedBudget: Number(monthlyBudget?.fixed_budget || 0),
      variableBudget: Number(monthlyBudget?.variable_budget || 0),
      savingsBudget: Number(monthlyBudget?.savings_budget || 0),
      categories: categoriesResult.data?.map(cat => ({
        id: cat.id,
        name: cat.name,
        budgetAmount: Number(cat.budget_amount),
        spent: Number(cat.spent),
        type: cat.type as 'fixed' | 'variable' | 'savings',
        color: cat.color
      })) || [],
      transactions: transactionsResult.data?.map(t => ({
        id: t.id,
        categoryId: t.category_id,
        description: t.description,
        amount: Number(t.amount),
        type: t.type as 'income' | 'expense' | 'savings',
        date: new Date(t.date),
        accountId: t.account_id,
        receivingAccountId: t.receiving_account_id
      })) || []
    });
  };

  const generateDummyData = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to generate demo data",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    try {
      console.log('Starting dummy data generation for user:', user.id);
      await DummyDataGenerator.generateAllData(user.id);
      console.log('Dummy data generation completed, reloading data...');
      await loadBudgetData(user.id);
      toast({
        title: "Success",
        description: "Demo data generated successfully!",
      });
    } catch (error) {
      console.error('Error generating dummy data:', error);
      toast({
        title: "Error",
        description: `Failed to generate demo data: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addTransaction = async (transaction: Omit<Transaction, 'id'> & { accountId?: string; receivingAccountId?: string }) => {
    if (!user || !budget.id) return;

    try {
      // Calculate transaction impact
      const impact = SimpleCalculations.getTransactionImpact({
        id: '',
        categoryId: transaction.categoryId,
        description: transaction.description,
        amount: transaction.amount,
        type: transaction.type,
        date: transaction.date,
        accountId: transaction.accountId,
        receivingAccountId: transaction.receivingAccountId
      }, true);

      // Add transaction to database
      const { data: newTransaction } = await supabase
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

      // Update account balance
      if (transaction.accountId && impact.accountChange !== 0) {
        const account = bankAccounts.find(a => a.id === transaction.accountId);
        if (account) {
          const newBalance = account.balance + impact.accountChange;
          await supabase
            .from('bank_accounts')
            .update({ balance: newBalance })
            .eq('id', transaction.accountId);

          setBankAccounts(prev => prev.map(a => 
            a.id === transaction.accountId ? { ...a, balance: newBalance } : a
          ));
        }
      }

      // Update receiving account for savings
      if (transaction.type === 'savings' && transaction.receivingAccountId) {
        const receivingAccount = bankAccounts.find(a => a.id === transaction.receivingAccountId);
        if (receivingAccount) {
          const newBalance = receivingAccount.balance + transaction.amount;
          await supabase
            .from('bank_accounts')
            .update({ balance: newBalance })
            .eq('id', transaction.receivingAccountId);

          setBankAccounts(prev => prev.map(a => 
            a.id === transaction.receivingAccountId ? { ...a, balance: newBalance } : a
          ));
        }
      }

      // Update category spending
      if (impact.categoryChange !== 0) {
        const category = budget.categories.find(c => c.id === transaction.categoryId);
        if (category) {
          const newSpent = category.spent + impact.categoryChange;
          await supabase
            .from('budget_categories')
            .update({ spent: newSpent })
            .eq('id', transaction.categoryId);

          setBudget(prev => ({
            ...prev,
            categories: prev.categories.map(c =>
              c.id === transaction.categoryId ? { ...c, spent: newSpent } : c
            ),
            transactions: [
              {
                id: newTransaction?.id || '',
                categoryId: transaction.categoryId,
                description: transaction.description,
                amount: transaction.amount,
                type: transaction.type,
                date: transaction.date,
                accountId: transaction.accountId,
                receivingAccountId: transaction.receivingAccountId
              },
              ...prev.transactions
            ]
          }));
        }
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

  const updateBudget = async (updates: Partial<MonthlyBudget>) => {
    if (!user || !budget.id) return;

    try {
      await supabase
        .from('monthly_budgets')
        .update({
          total_budget: updates.totalBudget,
          fixed_budget: updates.fixedBudget,
          variable_budget: updates.variableBudget,
          savings_budget: updates.savingsBudget
        })
        .eq('id', budget.id);

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
      const { data } = await supabase
        .from('budget_categories')
        .insert({
          monthly_budget_id: budget.id,
          user_id: user.id,
          name: category.name,
          budget_amount: category.budgetAmount,
          type: category.type as string,
          color: category.color,
          spent: 0
        })
        .select()
        .single();

      if (data) {
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
      }
    } catch (error) {
      console.error('Error adding category:', error);
      toast({
        title: "Error",
        description: "Failed to add category",
        variant: "destructive",
      });
    }
  };

  const deleteCategory = async (categoryId: string) => {
    if (!user) return;

    try {
      await supabase.from('budget_categories').delete().eq('id', categoryId);
      setBudget(prev => ({
        ...prev,
        categories: prev.categories.filter(c => c.id !== categoryId),
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

  // Calculation functions
  const getTotalSpent = () => SimpleCalculations.getTotalSpent(budget.categories);
  const getRemainingBudget = () => SimpleCalculations.getRemainingBudget(budget.totalBudget, getTotalSpent());
  const getCategoryProgress = (category: BudgetCategory) => SimpleCalculations.getCategoryProgress(category);
  const getSpendingByType = () => SimpleCalculations.getSpendingByType(budget.categories);
  const getTotalAccountBalance = () => SimpleCalculations.getTotalBalance(bankAccounts);

  return {
    budget,
    bankAccounts,
    loading,
    user,
    generateDummyData,
    addTransaction,
    updateBudget,
    addCategory,
    deleteCategory,
    calculations: {
      getTotalSpent,
      getRemainingBudget,
      getCategoryProgress,
      getSpendingByType,
      getTotalAccountBalance
    }
  };
};