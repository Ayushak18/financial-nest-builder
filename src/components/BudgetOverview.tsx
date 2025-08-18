import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { MonthlyBudget } from '@/types/budget';

interface BudgetOverviewProps {
  budget: MonthlyBudget;
  totalSpent: number;
  remainingBudget: number;
  onReconcile?: () => void;
}

export const BudgetOverview = ({ budget, totalSpent, remainingBudget, onReconcile }: BudgetOverviewProps) => {
  const progressPercentage = budget.totalBudget > 0 ? (totalSpent / budget.totalBudget) * 100 : 0;
  const isOverBudget = totalSpent > budget.totalBudget;

  return (
    <div className="space-y-4">
      {onReconcile && (
        <div className="flex justify-end">
          <Button onClick={onReconcile} variant="outline" size="sm">
            <Target className="w-4 h-4 mr-2" />
            Reconcile Budget
          </Button>
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <Card className="shadow-soft border-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Budget
          </CardTitle>
          <DollarSign className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            ₹{budget.totalBudget.toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            {budget.month} {budget.year}
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-soft border-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Spent
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            ₹{totalSpent.toLocaleString()}
          </div>
          <div className="flex items-center space-x-2 mt-2">
            <Progress 
              value={Math.min(progressPercentage, 100)} 
              className="flex-1 h-2"
            />
            <Badge variant={isOverBudget ? "destructive" : "secondary"} className="text-xs">
              {progressPercentage.toFixed(1)}%
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-soft border-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Remaining
          </CardTitle>
          <TrendingDown className={`h-4 w-4 ${remainingBudget >= 0 ? 'text-success' : 'text-destructive'}`} />
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${remainingBudget >= 0 ? 'text-success' : 'text-destructive'}`}>
            ₹{Math.abs(remainingBudget).toLocaleString()}
          </div>
          <p className="text-xs text-muted-foreground">
            {remainingBudget >= 0 ? 'Under budget' : 'Over budget'}
          </p>
        </CardContent>
      </Card>

      <Card className="shadow-soft border-0">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Categories
          </CardTitle>
          <Target className="h-4 w-4 text-info" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">
            {budget.categories.length}
          </div>
          <p className="text-xs text-muted-foreground">
            Active categories
          </p>
        </CardContent>
      </Card>
      </div>
    </div>
  );
};