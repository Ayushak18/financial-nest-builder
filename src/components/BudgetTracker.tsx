import { useBudget } from '@/hooks/useBudget';
import { BudgetOverview } from './BudgetOverview';
import { BudgetSetup } from './BudgetSetup';
import { CategoryManager } from './CategoryManager';
import { TransactionForm } from './TransactionForm';
import { TransactionList } from './TransactionList';

export const BudgetTracker = () => {
  const {
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
  } = useBudget();

  const totalSpent = getTotalSpent();
  const remainingBudget = getRemainingBudget();

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-success bg-clip-text text-transparent">
            Monthly Budget Tracker
          </h1>
          <p className="text-muted-foreground text-lg">
            Take control of your finances with smart budget tracking
          </p>
        </div>

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