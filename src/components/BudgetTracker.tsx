import { useState, useEffect } from 'react';
import { useBudget } from '@/hooks/useBudget';
import { supabase } from '@/integrations/supabase/client';
import { BudgetOverview } from './BudgetOverview';
import { BudgetSetup } from './BudgetSetup';
import { CategoryManager } from './CategoryManager';
import { TransactionForm } from './TransactionForm';
import { TransactionList } from './TransactionList';
import { MonthSelector } from './MonthSelector';
import { UserProfileDropdown } from './UserProfileDropdown';
import { BudgetInsights } from './BudgetInsights';
import { ExportData } from './ExportData';
import { BankAccountManager } from './BankAccountManager';
import { InvestmentTracker } from './InvestmentTracker';
import { NetWorthDashboard } from './NetWorthDashboard';
import { DebtManager } from './DebtManager';
import { FinancialGoalsTracker } from './FinancialGoalsTracker';
import { AccountTransfer } from './AccountTransfer';
import { RecurringTransactionsManager } from './RecurringTransactionsManager';
import { BudgetAlertsManager } from './BudgetAlertsManager';
import { BillReminders } from './BillReminders';
import { TrendAnalysis } from './TrendAnalysis';
import { FinancialForecasting } from './FinancialForecasting';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

export const BudgetTracker = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [accounts, setAccounts] = useState([]);
  
  const {
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
  } = useBudget(selectedMonth, selectedYear);

  const fetchAccounts = async () => {
    if (!user) return;
    const { data } = await supabase.from('bank_accounts').select('*').eq('user_id', user.id).eq('is_active', true);
    setAccounts(data || []);
  };

  useEffect(() => {
    fetchAccounts();
  }, [user]);

  const handleMonthChange = (month: string, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  const totalSpent = getTotalSpent();
  const remainingBudget = getRemainingBudget();


  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <Skeleton className="h-12 w-96 mx-auto" />
            <Skeleton className="h-6 w-64 mx-auto" />
          </div>
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-primary to-success bg-clip-text text-transparent">
                Monthly Budget Tracker
              </CardTitle>
              <CardDescription className="text-lg">
                Take control of your finances with smart budget tracking
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                Please sign in to access your budget tracker and start managing your finances.
              </p>
              <Button onClick={() => window.location.href = '/auth'}>
                Sign In to Continue
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* User Profile & Header */}
        <div className="flex flex-col gap-6 xl:flex-row xl:justify-between xl:items-start">
          <div className="text-center xl:flex-1 space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-success bg-clip-text text-transparent">
              Monthly Budget Tracker
            </h1>
            <p className="text-muted-foreground text-base md:text-lg">
              Take control of your finances with smart budget tracking
            </p>
          </div>
          
          {/* User Profile Dropdown */}
          <div className="flex justify-center xl:justify-end">
            <UserProfileDropdown user={user} />
          </div>
        </div>

        {/* Month Selector */}
        <MonthSelector 
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onMonthChange={handleMonthChange}
        />

        {/* Budget Overview */}
        <BudgetOverview 
          budget={budget}
          totalSpent={totalSpent}
          remainingBudget={remainingBudget}
        />

        {/* Budget Setup */}
        <BudgetSetup 
          budget={budget}
          onUpdateBudget={updateBudget}
          getSpendingByType={getSpendingByType}
        />

        {/* Category Manager */}
        <CategoryManager 
          categories={budget.categories}
          onAddCategory={addCategory}
          onUpdateCategory={updateCategory}
          onDeleteCategory={deleteCategory}
          getCategoryProgress={getCategoryProgress}
        />

        {/* Transaction Form */}
        <TransactionForm 
          categories={budget.categories}
          onAddTransaction={addTransaction}
        />

        {/* Budget Insights */}
        <BudgetInsights
          categories={budget.categories}
          transactions={budget.transactions}
          totalBudget={budget.totalBudget}
          fixedBudget={budget.fixedBudget}
          variableBudget={budget.variableBudget}
          savingsBudget={budget.savingsBudget}
          getSpendingByType={getSpendingByType}
        />

        {/* Export Data */}
        <ExportData
          budget={budget}
          categories={budget.categories}
          transactions={budget.transactions}
          getSpendingByType={getSpendingByType}
        />

        {/* Financial Management Tabs */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-10 text-xs">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="accounts">Accounts</TabsTrigger>
            <TabsTrigger value="investments">Investments</TabsTrigger>
            <TabsTrigger value="net-worth">Net Worth</TabsTrigger>
            <TabsTrigger value="debt">Debt</TabsTrigger>
            <TabsTrigger value="goals">Goals</TabsTrigger>
            <TabsTrigger value="recurring">Recurring</TabsTrigger>
            <TabsTrigger value="bills">Bills</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="forecast">Forecast</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <BankAccountManager user={user} />
              <AccountTransfer user={user} accounts={accounts} onTransferComplete={fetchAccounts} />
            </div>
            <NetWorthDashboard user={user} />
          </TabsContent>
          
          <TabsContent value="accounts" className="space-y-6">
            <BankAccountManager user={user} />
            <AccountTransfer user={user} accounts={accounts} onTransferComplete={fetchAccounts} />
          </TabsContent>
          <TabsContent value="investments">
            <InvestmentTracker user={user} accounts={accounts} />
          </TabsContent>
          <TabsContent value="net-worth">
            <NetWorthDashboard user={user} />
          </TabsContent>
          <TabsContent value="debt">
            <DebtManager user={user} />
          </TabsContent>
          <TabsContent value="goals">
            <FinancialGoalsTracker user={user} />
          </TabsContent>
          <TabsContent value="recurring" className="space-y-6">
            <RecurringTransactionsManager />
            <BudgetAlertsManager />
          </TabsContent>
          <TabsContent value="bills">
            <BillReminders />
          </TabsContent>
          <TabsContent value="trends">
            <TrendAnalysis />
          </TabsContent>
          <TabsContent value="forecast">
            <FinancialForecasting />
          </TabsContent>
        </Tabs>

        {/* Transaction List */}
        <TransactionList 
          transactions={budget.transactions}
          categories={budget.categories}
          onDeleteTransaction={deleteTransaction}
          onUpdateTransaction={updateTransaction}
        />
      </div>
    </div>
  );
};