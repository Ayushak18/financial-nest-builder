import { useState } from 'react';
import { useBudget } from '@/hooks/useBudget';
import { BudgetOverview } from './BudgetOverview';
import { BudgetSetup } from './BudgetSetup';
import { CategoryManager } from './CategoryManager';
import { TransactionForm } from './TransactionForm';
import { TransactionList } from './TransactionList';
import { MonthSelector } from './MonthSelector';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { LogOut, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const BudgetTracker = () => {
  const { toast } = useToast();
  const [selectedMonth, setSelectedMonth] = useState(new Date().toLocaleString('default', { month: 'long' }));
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const {
    budget,
    loading,
    user,
    updateBudget,
    addCategory,
    updateCategory,
    deleteCategory,
    addTransaction,
    deleteTransaction,
    getTotalSpent,
    getRemainingBudget,
    getCategoryProgress
  } = useBudget(selectedMonth, selectedYear);

  const handleMonthChange = (month: string, year: number) => {
    setSelectedMonth(month);
    setSelectedYear(year);
  };

  const totalSpent = getTotalSpent();
  const remainingBudget = getRemainingBudget();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed Out",
        description: "You have been successfully signed out.",
      });
      window.location.href = '/auth';
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

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
          
          {/* User Profile Card */}
          <Card className="w-full xl:w-80">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-full">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-lg">Welcome back!</CardTitle>
                  <CardDescription className="text-sm truncate">
                    {user.email}
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  className="flex items-center gap-2 shrink-0"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </div>
            </CardHeader>
          </Card>
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

        {/* Transaction List */}
        <TransactionList 
          transactions={budget.transactions}
          categories={budget.categories}
          onDeleteTransaction={deleteTransaction}
        />
      </div>
    </div>
  );
};