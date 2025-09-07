import { useState, useEffect } from 'react';
import { useSimpleBudget } from '@/hooks/useSimpleBudget';
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
import { ImportWizard } from './ImportWizard';
import { AppSidebar, type SidebarSection } from './AppSidebar';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { SidebarProvider, SidebarTrigger } from './ui/sidebar';
import { Plus } from 'lucide-react';

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
    generateDummyData,
    addTransaction,
    updateBudget,
    addCategory,
    deleteCategory,
    calculations
  } = useSimpleBudget(selectedMonth, selectedYear);

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

  if (loading) {
    return (
      <div className="min-h-screen flex w-full bg-background">
        <div className="flex-1 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="max-w-md w-full space-y-6 p-6">
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Budget Tracker</CardTitle>
              <CardDescription>
                Please sign in to access your financial dashboard
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-center">
              <p className="text-muted-foreground">
                Track your budget, manage transactions, and achieve your financial goals.
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
            <BudgetOverview 
              budget={budget} 
              totalSpent={calculations.getTotalSpent()} 
              remainingBudget={calculations.getRemainingBudget()} 
            />
            <BudgetSetup 
              budget={budget} 
              onUpdateBudget={updateBudget} 
              getSpendingByType={calculations.getSpendingByType} 
            />
            <CategoryManager 
              categories={budget.categories} 
              onAddCategory={addCategory} 
              onUpdateCategory={() => {}} 
              onDeleteCategory={deleteCategory} 
              getCategoryProgress={calculations.getCategoryProgress}
              currentMonth={selectedMonth}
              currentYear={selectedYear}
              onCategoriesChange={() => {}}
            />
          </div>
        );
      case "transactions":
        return (
          <div className="space-y-6">
            <TransactionForm 
              categories={budget.categories} 
              bankAccounts={bankAccounts} 
              onAddTransaction={addTransaction} 
            />
            <TransactionList 
              transactions={budget.transactions} 
              categories={budget.categories}
              bankAccounts={bankAccounts}
              onDeleteTransaction={() => {}}
              onUpdateTransaction={() => {}}
            />
          </div>
        );
      case "insights":
        return (
          <BudgetInsights 
            categories={budget.categories} 
            transactions={budget.transactions} 
            totalBudget={budget.totalBudget} 
            fixedBudget={budget.fixedBudget} 
            variableBudget={budget.variableBudget} 
            savingsBudget={budget.savingsBudget} 
          />
        );
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
        return (
          <ExportData 
            budget={budget} 
            categories={budget.categories} 
            transactions={budget.transactions} 
            getSpendingByType={calculations.getSpendingByType} 
          />
        );
      case "import":
        return <ImportWizard />;
      default:
        return (
          <div className="space-y-8">
            <BudgetOverview 
              budget={budget} 
              totalSpent={calculations.getTotalSpent()} 
              remainingBudget={calculations.getRemainingBudget()} 
            />
            <BudgetSetup 
              budget={budget} 
              onUpdateBudget={updateBudget} 
              getSpendingByType={calculations.getSpendingByType} 
            />
            <CategoryManager 
              categories={budget.categories} 
              onAddCategory={addCategory} 
              onUpdateCategory={() => {}} 
              onDeleteCategory={deleteCategory} 
              getCategoryProgress={calculations.getCategoryProgress}
              currentMonth={selectedMonth}
              currentYear={selectedYear}
              onCategoriesChange={() => {}}
            />
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
              <h1 className="text-lg font-semibold">Financial Dashboard</h1>
            </div>
            
            <div className="flex items-center gap-4">
              <CompactMonthSelector
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                onMonthChange={handleMonthChange}
              />
              <Button 
                onClick={generateDummyData}
                variant="outline"
                size="sm"
                className="ml-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                Generate Demo Data
              </Button>
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