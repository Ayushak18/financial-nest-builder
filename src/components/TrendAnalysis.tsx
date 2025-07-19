import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface TrendData {
  month: string;
  income: number;
  expenses: number;
  net: number;
}

interface CategoryTrend {
  name: string;
  amount: number;
  color: string;
  change: number;
}

export function TrendAnalysis() {
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [categoryTrends, setCategoryTrends] = useState<CategoryTrend[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('6');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadTrendData();
  }, [selectedPeriod]);

  const loadTrendData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const monthsBack = parseInt(selectedPeriod);
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - monthsBack);

      // Get transactions for the period
      const { data: transactions, error: transError } = await supabase
        .from('transactions')
        .select(`
          *,
          budget_categories!inner(name, color)
        `)
        .eq('user_id', user.id)
        .gte('date', startDate.toISOString())
        .lte('date', endDate.toISOString());

      if (transError) throw transError;

      // Process monthly trends
      const monthlyData: { [key: string]: { income: number; expenses: number } } = {};
      const categoryData: { [key: string]: { amount: number; color: string; transactions: any[] } } = {};

      transactions?.forEach((transaction) => {
        const month = new Date(transaction.date).toISOString().slice(0, 7); // YYYY-MM format
        const categoryName = transaction.budget_categories.name;
        const amount = parseFloat(transaction.amount.toString());

        // Monthly data
        if (!monthlyData[month]) {
          monthlyData[month] = { income: 0, expenses: 0 };
        }

        if (transaction.type === 'income') {
          monthlyData[month].income += amount;
        } else {
          monthlyData[month].expenses += amount;
        }

        // Category data
        if (!categoryData[categoryName]) {
          categoryData[categoryName] = {
            amount: 0,
            color: transaction.budget_categories.color,
            transactions: []
          };
        }
        if (transaction.type === 'expense') {
          categoryData[categoryName].amount += amount;
          categoryData[categoryName].transactions.push(transaction);
        }
      });

      // Convert to chart format
      const trends: TrendData[] = Object.entries(monthlyData)
        .map(([month, data]) => ({
          month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          income: data.income,
          expenses: data.expenses,
          net: data.income - data.expenses
        }))
        .sort((a, b) => new Date(a.month + ', 01').getTime() - new Date(b.month + ', 01').getTime());

      setTrendData(trends);

      // Calculate category trends with month-over-month change
      const categoryTrendsList: CategoryTrend[] = Object.entries(categoryData)
        .map(([name, data]) => {
          // Calculate change (simplified - comparing recent vs earlier transactions)
          const midpoint = Math.floor(data.transactions.length / 2);
          const recentAmount = data.transactions.slice(0, midpoint).reduce((sum, t) => sum + parseFloat(t.amount), 0);
          const earlierAmount = data.transactions.slice(midpoint).reduce((sum, t) => sum + parseFloat(t.amount), 0);
          const change = earlierAmount > 0 ? ((recentAmount - earlierAmount) / earlierAmount) * 100 : 0;

          return {
            name,
            amount: data.amount,
            color: data.color,
            change
          };
        })
        .sort((a, b) => b.amount - a.amount);

      setCategoryTrends(categoryTrendsList);
    } catch (error) {
      toast({ title: "Error loading trend data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const totalIncome = trendData.reduce((sum, month) => sum + month.income, 0);
  const totalExpenses = trendData.reduce((sum, month) => sum + month.expenses, 0);
  const avgMonthlyNet = trendData.length > 0 ? trendData.reduce((sum, month) => sum + month.net, 0) / trendData.length : 0;

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Financial Trends
          </CardTitle>
          <CardDescription>
            Analyze your spending patterns and income trends over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-6">
            <div className="flex gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">${totalIncome.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">Total Income</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">${totalExpenses.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">Total Expenses</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${avgMonthlyNet >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${avgMonthlyNet.toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">Avg Monthly Net</div>
              </div>
            </div>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">Last 3 months</SelectItem>
                <SelectItem value="6">Last 6 months</SelectItem>
                <SelectItem value="12">Last 12 months</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, '']} />
                <Line 
                  type="monotone" 
                  dataKey="income" 
                  stroke="#22c55e" 
                  strokeWidth={2}
                  name="Income"
                />
                <Line 
                  type="monotone" 
                  dataKey="expenses" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  name="Expenses"
                />
                <Line 
                  type="monotone" 
                  dataKey="net" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  name="Net"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Category Breakdown</CardTitle>
            <CardDescription>Spending distribution by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryTrends}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="amount"
                    nameKey="name"
                  >
                    {categoryTrends.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Amount']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Category Trends</CardTitle>
            <CardDescription>Month-over-month changes by category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {categoryTrends.slice(0, 8).map((category) => (
                <div key={category.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="font-medium">{category.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">${category.amount.toFixed(2)}</span>
                    <Badge 
                      variant={category.change >= 0 ? 'destructive' : 'default'}
                      className="flex items-center gap-1"
                    >
                      {category.change >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {Math.abs(category.change).toFixed(1)}%
                    </Badge>
                  </div>
                </div>
              ))}
              {categoryTrends.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No category data available for the selected period.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}