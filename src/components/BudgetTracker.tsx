import { useState, useEffect } from 'react';
import { useBudget } from '@/hooks/useBudget';
import { supabase } from '@/integrations/supabase/client';
import { BudgetOverview } from './BudgetOverview';
import { BudgetSetup } from './BudgetSetup';
import { CategoryManager } from './CategoryManager';
import { TransactionForm } from './TransactionForm';
import { TransactionList } from './TransactionList';
import { CompactMonthSelector } from './CompactMonthSelector';
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
import { AppSidebar, type SidebarSection } from './AppSidebar';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { SidebarProvider, SidebarTrigger } from './ui/sidebar';

export const BudgetTracker = () => {
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [accounts, setAccounts] = useState([]);
  const [activeSection, setActiveSection] = useState<SidebarSection>("budget");
  
  const {
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

  const renderActiveSection = () => {
    switch (activeSection) {
      case "budget":
        return (
          <div className="space-y-8">
            <BudgetOverview budget={budget} totalSpent={totalSpent} remainingBudget={remainingBudget} />
            <BudgetSetup budget={budget} onUpdateBudget={updateBudget} getSpendingByType={getSpendingByType} />
            <CategoryManager categories={budget.categories} onAddCategory={addCategory} onUpdateCategory={updateCategory} onDeleteCategory={deleteCategory} getCategoryProgress={getCategoryProgress} />
          </div>
        );
      case "transactions":
        return (
          <div className="space-y-6">
            <TransactionForm categories={budget.categories} bankAccounts={bankAccounts} onAddTransaction={addTransaction} />
            <TransactionList transactions={budget.transactions} categories={budget.categories} onDeleteTransaction={deleteTransaction} onUpdateTransaction={updateTransaction} />
          </div>
        );
      case "insights":
        return <BudgetInsights categories={budget.categories} transactions={budget.transactions} totalBudget={budget.totalBudget} fixedBudget={budget.fixedBudget} variableBudget={budget.variableBudget} savingsBudget={budget.savingsBudget} getSpendingByType={getSpendingByType} />;
      case "accounts":
        return (
          <div className="space-y-6">
            <BankAccountManager user={user} />
            <AccountTransfer user={user} accounts={accounts} onTransferComplete={fetchAccounts} />
          </div>
        );
      case "investments":
        return <InvestmentTracker user={user} accounts={accounts} />;
      case "net-worth":
        return <NetWorthDashboard user={user} />;
      case "debt":
        return <DebtManager user={user} />;
      case "goals":
        return <FinancialGoalsTracker user={user} />;
      case "recurring":
        return (
          <div className="space-y-6">
            <RecurringTransactionsManager />
            <BudgetAlertsManager />
          </div>
        );
      case "bills":
        return <BillReminders />;
      case "trends":
        return <TrendAnalysis />;
      case "forecast":
        return <FinancialForecasting />;
      case "export":
        return <ExportData budget={budget} categories={budget.categories} transactions={budget.transactions} getSpendingByType={getSpendingByType} />;
      default:
        return (
          <div className="space-y-8">
            <BudgetOverview budget={budget} totalSpent={totalSpent} remainingBudget={remainingBudget} />
            <BudgetSetup budget={budget} onUpdateBudget={updateBudget} getSpendingByType={getSpendingByType} />
            <CategoryManager categories={budget.categories} onAddCategory={addCategory} onUpdateCategory={updateCategory} onDeleteCategory={deleteCategory} getCategoryProgress={getCategoryProgress} />
          </div>
        );
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div>
                <h1 className="text-xl font-semibold">Monthly Budget Tracker</h1>
                <p className="text-sm text-muted-foreground">Take control of your finances</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <CompactMonthSelector 
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                onMonthChange={handleMonthChange}
              />
              <UserProfileDropdown user={user} />
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-4 lg:p-6 overflow-auto">
            <div className="max-w-7xl mx-auto">
              {renderActiveSection()}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};