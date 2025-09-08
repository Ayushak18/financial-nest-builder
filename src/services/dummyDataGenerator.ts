import { supabase } from '@/integrations/supabase/client';

/**
 * Generates comprehensive dummy data for testing all app features
 */
export class DummyDataGenerator {
  static async generateAllData(userId: string) {
    console.log('Generating dummy data for user:', userId);
    
    try {
      // Clear existing data first
      console.log('Clearing existing user data...');
      await this.clearUserData(userId);
    
    // Generate data for current month
    const currentMonth = new Date().toLocaleString('default', { month: 'long' });
    const currentYear = new Date().getFullYear();
    
    // Create bank accounts
    const accounts = await this.createBankAccounts(userId);
    
    // Create monthly budget
    const budget = await this.createMonthlyBudget(userId, currentMonth, currentYear);
    
    // Create categories
    const categories = await this.createCategories(userId, budget.id);
    
    // Create transactions
    await this.createTransactions(userId, categories, accounts);
    
    // Create investments
    await this.createInvestments(userId, accounts);
    
    // Create debts
    await this.createDebts(userId);
    
    // Create financial goals
    await this.createFinancialGoals(userId);
    
    // Create bills
    await this.createBills(userId, accounts);
    
    // Create recurring transactions
    await this.createRecurringTransactions(userId, accounts, categories);
    
    console.log('Dummy data generation completed!');
    } catch (error) {
      console.error('Error generating dummy data:', error);
      throw error;
    }
  }

  private static async clearUserData(userId: string) {
    console.log('Clearing existing data for user:', userId);
    const tables = [
      'transactions',
      'budget_categories', 
      'monthly_budgets',
      'bank_accounts',
      'investments',
      'debts',
      'financial_goals',
      'bills',
      'recurring_transactions',
      'account_transfers'
    ];

    for (const table of tables) {
      console.log(`Clearing data from ${table}...`);
      const { error } = await supabase.from(table as any).delete().eq('user_id', userId);
      if (error) {
        console.error(`Error clearing ${table}:`, error);
        throw error;
      }
    }
    console.log('Data clearing completed');
  }

  private static async createBankAccounts(userId: string) {
    const accounts = [
      { name: 'Main Checking', type: 'checking', balance: 5000 },
      { name: 'Savings Account', type: 'savings', balance: 15000 },
      { name: 'Credit Card', type: 'credit', balance: -1200 },
      { name: 'Investment Account', type: 'investment', balance: 25000 },
      { name: 'Cash Wallet', type: 'cash', balance: 300 }
    ];

    const createdAccounts = [];
    for (const acc of accounts) {
      const { data, error } = await supabase
        .from('bank_accounts')
        .insert({
          user_id: userId,
          name: acc.name,
          account_type: acc.type,
          balance: acc.balance,
          currency: 'USD'
        })
        .select()
        .single();
      
      if (error) throw error;
      
      if (data) createdAccounts.push(data);
    }
    
    return createdAccounts;
  }

  private static async createMonthlyBudget(userId: string, month: string, year: number) {
    console.log(`Creating monthly budget for ${month} ${year}...`);
    
    // First check if budget already exists
    const { data: existingBudget } = await supabase
      .from('monthly_budgets')
      .select('id')
      .eq('user_id', userId)
      .eq('month', month)
      .eq('year', year)
      .maybeSingle();
    
    if (existingBudget) {
      console.log('Monthly budget already exists, using existing one');
      const { data: budget, error } = await supabase
        .from('monthly_budgets')
        .select('*')
        .eq('id', existingBudget.id)
        .single();
      
      if (error) throw error;
      return budget;
    }
    
    console.log('Creating new monthly budget...');
    const { data, error } = await supabase
      .from('monthly_budgets')
      .insert({
        user_id: userId,
        month,
        year,
        total_budget: 5000,
        fixed_budget: 2000,
        variable_budget: 2000,
        savings_budget: 1000
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  private static async createCategories(userId: string, budgetId: string) {
    const categories = [
      // Fixed expenses
      { name: 'Rent', type: 'fixed', amount: 1200, color: '#ef4444' },
      { name: 'Insurance', type: 'fixed', amount: 300, color: '#f97316' },
      { name: 'Utilities', type: 'fixed', amount: 500, color: '#eab308' },
      
      // Variable expenses  
      { name: 'Groceries', type: 'variable', amount: 600, color: '#22c55e' },
      { name: 'Dining Out', type: 'variable', amount: 400, color: '#06b6d4' },
      { name: 'Entertainment', type: 'variable', amount: 300, color: '#8b5cf6' },
      { name: 'Shopping', type: 'variable', amount: 400, color: '#ec4899' },
      { name: 'Transportation', type: 'variable', amount: 300, color: '#f59e0b' },
      
      // Savings
      { name: 'Emergency Fund', type: 'savings', amount: 500, color: '#10b981' },
      { name: 'Retirement', type: 'savings', amount: 300, color: '#3b82f6' },
      { name: 'Vacation Fund', type: 'savings', amount: 200, color: '#8b5cf6' }
    ];

    const createdCategories = [];
    for (const cat of categories) {
      // Generate realistic spending (60-90% of budget)
      const spentPercentage = 0.6 + Math.random() * 0.3;
      const spent = Math.round(cat.amount * spentPercentage);
      
      const { data, error } = await supabase
        .from('budget_categories')
        .insert({
          user_id: userId,
          monthly_budget_id: budgetId,
          name: cat.name,
          type: cat.type,
          budget_amount: cat.amount,
          spent: spent,
          color: cat.color
        })
        .select()
        .single();
      
      if (error) throw error;
      
      if (data) createdCategories.push(data);
    }
    
    return createdCategories;
  }

  private static async createTransactions(userId: string, categories: any[], accounts: any[]) {
    const transactions = [];
    const checkingAccount = accounts.find(a => a.account_type === 'checking');
    const savingsAccount = accounts.find(a => a.account_type === 'savings');
    
    // Generate transactions for each category
    for (const category of categories) {
      const numTransactions = Math.floor(Math.random() * 5) + 2; // 2-6 transactions per category
      
      for (let i = 0; i < numTransactions; i++) {
        const daysAgo = Math.floor(Math.random() * 30);
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        
        let amount, type, description;
        
        if (category.type === 'savings') {
          amount = Math.floor(Math.random() * 200) + 50;
          type = 'savings';
          description = `Transfer to ${category.name}`;
        } else {
          amount = Math.floor(Math.random() * 150) + 25;
          type = 'expense';
          description = this.getRandomDescription(category.name);
        }
        
        transactions.push({
          user_id: userId,
          category_id: category.id,
          account_id: checkingAccount?.id,
          receiving_account_id: type === 'savings' ? savingsAccount?.id : null,
          description,
          amount,
          type,
          date: date.toISOString()
        });
      }
    }

    // Add some income transactions
    const incomeCategory = categories.find(c => c.name === 'Emergency Fund'); // Use any category for income
    for (let i = 0; i < 3; i++) {
      const daysAgo = i * 10;
      const date = new Date();
      date.setDate(date.getDate() - daysAgo);
      
      transactions.push({
        user_id: userId,
        category_id: incomeCategory?.id,
        account_id: checkingAccount?.id,
        receiving_account_id: null,
        description: 'Salary Payment',
        amount: 2000,
        type: 'income',
        date: date.toISOString()
      });
    }

    await supabase.from('transactions').insert(transactions);
  }

  private static async createInvestments(userId: string, accounts: any[]) {
    const investmentAccount = accounts.find(a => a.account_type === 'investment');
    if (!investmentAccount) return;

    const investments = [
      { symbol: 'AAPL', name: 'Apple Inc.', shares: 10, purchase_price: 150, current_price: 175, type: 'stock' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', shares: 5, purchase_price: 2500, current_price: 2700, type: 'stock' },
      { symbol: 'VTSAX', name: 'Vanguard Total Stock Market', shares: 50, purchase_price: 100, current_price: 110, type: 'mutual_fund' },
      { symbol: 'BTC', name: 'Bitcoin', shares: 0.5, purchase_price: 45000, current_price: 50000, type: 'crypto' }
    ];

    for (const inv of investments) {
      await supabase
        .from('investments')
        .insert({
          user_id: userId,
          account_id: investmentAccount.id,
          symbol: inv.symbol,
          name: inv.name,
          shares: inv.shares,
          purchase_price: inv.purchase_price,
          current_price: inv.current_price,
          investment_type: inv.type
        });
    }
  }

  private static async createDebts(userId: string) {
    const debts = [
      { name: 'Credit Card Debt', type: 'credit_card', balance: 1200, rate: 18.5, payment: 100, due: 15 },
      { name: 'Student Loan', type: 'student_loan', balance: 25000, rate: 4.5, payment: 300, due: 1 },
      { name: 'Car Loan', type: 'auto_loan', balance: 18000, rate: 5.2, payment: 350, due: 20 }
    ];

    for (const debt of debts) {
      await supabase
        .from('debts')
        .insert({
          user_id: userId,
          name: debt.name,
          debt_type: debt.type,
          balance: debt.balance,
          interest_rate: debt.rate,
          minimum_payment: debt.payment,
          due_date: debt.due
        });
    }
  }

  private static async createFinancialGoals(userId: string) {
    const goals = [
      { name: 'Emergency Fund', type: 'emergency_fund', target: 10000, current: 6000, date: '2024-12-31' },
      { name: 'Vacation to Europe', type: 'savings', target: 5000, current: 1200, date: '2025-06-01' },
      { name: 'Pay Off Credit Card', type: 'debt_payoff', target: 1200, current: 0, date: '2024-09-30' },
      { name: 'Retirement Fund', type: 'investment', target: 100000, current: 25000, date: '2030-01-01' }
    ];

    for (const goal of goals) {
      await supabase
        .from('financial_goals')
        .insert({
          user_id: userId,
          name: goal.name,
          goal_type: goal.type,
          target_amount: goal.target,
          current_amount: goal.current,
          target_date: goal.date,
          priority: Math.floor(Math.random() * 5) + 1
        });
    }
  }

  private static async createBills(userId: string, accounts: any[]) {
    const checkingAccount = accounts.find(a => a.account_type === 'checking');
    if (!checkingAccount) return;

    const bills = [
      { name: 'Electric Bill', amount: 120, due: 15, category: 'Utilities' },
      { name: 'Internet Bill', amount: 80, due: 1, category: 'Utilities' },
      { name: 'Phone Bill', amount: 65, due: 10, category: 'Utilities' },
      { name: 'Streaming Services', amount: 45, due: 20, category: 'Entertainment' },
      { name: 'Gym Membership', amount: 30, due: 5, category: 'Health' }
    ];

    for (const bill of bills) {
      await supabase
        .from('bills')
        .insert({
          user_id: userId,
          account_id: checkingAccount.id,
          name: bill.name,
          amount: bill.amount,
          due_date: bill.due,
          category: bill.category,
          reminder_days: 3
        });
    }
  }

  private static async createRecurringTransactions(userId: string, accounts: any[], categories: any[]) {
    const checkingAccount = accounts.find(a => a.account_type === 'checking');
    const rentCategory = categories.find(c => c.name === 'Rent');
    
    if (!checkingAccount || !rentCategory) return;

    const recurring = [
      { 
        category_id: rentCategory.id,
        type: 'expense',
        amount: 1200,
        description: 'Monthly Rent',
        frequency: 'monthly',
        start_date: '2024-01-01'
      }
    ];

    for (const rec of recurring) {
      const startDate = new Date(rec.start_date);
      const nextDate = new Date();
      nextDate.setDate(1); // First of next month
      if (nextDate <= new Date()) {
        nextDate.setMonth(nextDate.getMonth() + 1);
      }

      await supabase
        .from('recurring_transactions')
        .insert({
          user_id: userId,
          account_id: checkingAccount.id,
          category_id: rec.category_id,
          type: rec.type,
          amount: rec.amount,
          description: rec.description,
          frequency: rec.frequency,
          start_date: rec.start_date,
          next_occurrence: nextDate.toISOString().split('T')[0]
        });
    }
  }

  private static getRandomDescription(categoryName: string): string {
    const descriptions: { [key: string]: string[] } = {
      'Groceries': ['Supermarket', 'Whole Foods', 'Local Grocery', 'Farmers Market'],
      'Dining Out': ['Restaurant', 'Coffee Shop', 'Fast Food', 'Food Delivery'],
      'Entertainment': ['Movie Theater', 'Concert', 'Streaming', 'Books'],
      'Shopping': ['Amazon', 'Department Store', 'Online Purchase', 'Mall'],
      'Transportation': ['Gas Station', 'Public Transit', 'Uber/Lyft', 'Parking'],
      'Utilities': ['Electric Bill', 'Water Bill', 'Internet', 'Phone'],
      'Insurance': ['Health Insurance', 'Car Insurance', 'Home Insurance'],
      'Rent': ['Monthly Rent', 'Apartment Rent']
    };

    const categoryDescriptions = descriptions[categoryName] || ['General Expense'];
    return categoryDescriptions[Math.floor(Math.random() * categoryDescriptions.length)];
  }
}