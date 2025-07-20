import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from './ui/chart';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, LineChart, Line } from 'recharts';
import { BudgetCategory, Transaction } from '@/types/budget';

interface BudgetInsightsProps {
  categories: BudgetCategory[];
  transactions: Transaction[];
  totalBudget: number;
  fixedBudget: number;
  variableBudget: number;
  savingsBudget: number;
  getSpendingByType: () => { fixed: number; variable: number; savings: number };
}

export const BudgetInsights = ({
  categories,
  transactions,
  totalBudget,
  fixedBudget,
  variableBudget,
  savingsBudget,
  getSpendingByType
}: BudgetInsightsProps) => {
  const spendingByType = getSpendingByType();
  
  // Prepare data for charts
  const categorySpendingData = categories.map(category => ({
    name: category.name,
    spent: category.spent,
    budget: category.budgetAmount,
    fill: category.color
  }));

  const budgetTypeData = [
    { type: 'Fixed', budget: fixedBudget, spent: spendingByType.fixed, fill: '#ef4444' },
    { type: 'Variable', budget: variableBudget, spent: spendingByType.variable, fill: '#f59e0b' },
    { type: 'Savings', budget: savingsBudget, spent: spendingByType.savings, fill: '#10b981' }
  ];

  const pieChartData = categories.filter(cat => cat.spent > 0).map(category => ({
    name: category.name,
    value: category.spent,
    fill: category.color
  }));

  // Daily spending trend (last 7 days)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toISOString().split('T')[0];
  }).reverse();

  const dailySpendingData = last7Days.map(dateStr => {
    const dayTransactions = transactions.filter(t => 
      t.type === 'expense' && 
      new Date(t.date).toISOString().split('T')[0] === dateStr
    );
    const totalSpent = dayTransactions.reduce((sum, t) => sum + t.amount, 0);
    return {
      date: new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' }),
      spent: totalSpent
    };
  });

  const chartConfig = {
    spent: { label: "Spent", color: "hsl(var(--chart-1))" },
    budget: { label: "Budget", color: "hsl(var(--chart-2))" },
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Spending vs Budget */}
        <Card>
          <CardHeader>
            <CardTitle>Category Spending vs Budget</CardTitle>
            <CardDescription>Compare your spending against budget for each category</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categorySpendingData} margin={{ top: 20, right: 10, left: 10, bottom: 5 }}>
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 10 }} 
                    angle={-45}
                    textAnchor="end"
                    height={60}
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 10 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="budget" fill="hsl(var(--muted))" name="Budget" />
                  <Bar dataKey="spent" fill="hsl(var(--primary))" name="Spent" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Budget Type Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Budget Type Performance</CardTitle>
            <CardDescription>Fixed, Variable, and Savings spending breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={budgetTypeData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <XAxis dataKey="type" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="budget" fill="hsl(var(--muted))" name="Budget" />
                  <Bar dataKey="spent" fill="hsl(var(--primary))" name="Spent" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Spending Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Spending Distribution</CardTitle>
            <CardDescription>Breakdown of spending by category</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    outerRadius="70%"
                    dataKey="value"
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Daily Spending Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Spending Trend</CardTitle>
            <CardDescription>Your spending pattern over the last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailySpendingData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="spent" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary">
              ${(totalBudget - (spendingByType.fixed + spendingByType.variable + spendingByType.savings)).toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground">Remaining Budget</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">
              ${spendingByType.savings.toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground">Total Savings</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">
              {categories.length}
            </div>
            <p className="text-sm text-muted-foreground">Active Categories</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">
              {transactions.filter(t => t.type === 'expense').length}
            </div>
            <p className="text-sm text-muted-foreground">Transactions</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};