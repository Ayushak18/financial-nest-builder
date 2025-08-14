import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Sparkles, TrendingUp, AlertTriangle, Calendar } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ForecastData {
  month: string;
  projectedIncome: number;
  projectedExpenses: number;
  projectedBalance: number;
  actual?: {
    income: number;
    expenses: number;
    balance: number;
  };
}

interface CashFlowProjection {
  account: string;
  currentBalance: number;
  projectedBalance: number;
  change: number;
  riskLevel: 'low' | 'medium' | 'high';
}

export function FinancialForecasting() {
  const [forecastData, setForecastData] = useState<ForecastData[]>([]);
  const [cashFlowProjections, setCashFlowProjections] = useState<CashFlowProjection[]>([]);
  const [forecastPeriod, setForecastPeriod] = useState('6');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    generateForecast();
  }, [forecastPeriod]);

  const generateForecast = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const months = parseInt(forecastPeriod);
      
      // Get historical data for trend analysis
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const [transactionsRes, recurringRes, accountsRes] = await Promise.all([
        supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', sixMonthsAgo.toISOString()),
        supabase
          .from('recurring_transactions')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true),
        supabase
          .from('bank_accounts')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
      ]);

      const transactions = transactionsRes.data || [];
      const recurringTransactions = recurringRes.data || [];
      const accounts = accountsRes.data || [];

      // Calculate historical averages
      const monthlyData: { [key: string]: { income: number; expenses: number } } = {};
      
      transactions.forEach((transaction) => {
        const month = new Date(transaction.date).toISOString().slice(0, 7);
        if (!monthlyData[month]) {
          monthlyData[month] = { income: 0, expenses: 0 };
        }
        
        const amount = parseFloat(transaction.amount.toString());
        if (transaction.type === 'income') {
          monthlyData[month].income += amount;
        } else {
          monthlyData[month].expenses += amount;
        }
      });

      // Calculate averages
      const monthlyEntries = Object.values(monthlyData);
      const avgMonthlyIncome = monthlyEntries.length > 0 
        ? monthlyEntries.reduce((sum, m) => sum + m.income, 0) / monthlyEntries.length 
        : 0;
      const avgMonthlyExpenses = monthlyEntries.length > 0 
        ? monthlyEntries.reduce((sum, m) => sum + m.expenses, 0) / monthlyEntries.length 
        : 0;

      // Calculate recurring income/expenses
      const monthlyRecurringIncome = recurringTransactions
        .filter(rt => rt.type === 'income')
        .reduce((sum, rt) => {
          const amount = parseFloat(rt.amount.toString());
          switch (rt.frequency) {
            case 'weekly': return sum + (amount * 4.33); // avg weeks per month
            case 'monthly': return sum + amount;
            case 'yearly': return sum + (amount / 12);
            case 'daily': return sum + (amount * 30);
            default: return sum;
          }
        }, 0);

      const monthlyRecurringExpenses = recurringTransactions
        .filter(rt => rt.type === 'expense')
        .reduce((sum, rt) => {
          const amount = parseFloat(rt.amount.toString());
          switch (rt.frequency) {
            case 'weekly': return sum + (amount * 4.33);
            case 'monthly': return sum + amount;
            case 'yearly': return sum + (amount / 12);
            case 'daily': return sum + (amount * 30);
            default: return sum;
          }
        }, 0);

      // Combine historical and recurring for projections
      const projectedMonthlyIncome = (avgMonthlyIncome * 0.7) + (monthlyRecurringIncome * 0.3);
      const projectedMonthlyExpenses = (avgMonthlyExpenses * 0.7) + (monthlyRecurringExpenses * 0.3);

      // Generate forecast data
      const forecastMonths: ForecastData[] = [];
      let runningBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance.toString()), 0);

      for (let i = 0; i < months; i++) {
        const forecastDate = new Date();
        forecastDate.setMonth(forecastDate.getMonth() + i + 1);
        
          const monthIncome = projectedMonthlyIncome * (0.95 + Math.random() * 0.1); // Add some variance
          const monthExpenses = projectedMonthlyExpenses * (0.95 + Math.random() * 0.1);
          
          runningBalance += monthIncome - monthExpenses;

          forecastMonths.push({
            month: forecastDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          projectedIncome: monthIncome,
          projectedExpenses: monthExpenses,
          projectedBalance: runningBalance
        });
      }

      setForecastData(forecastMonths);

      // Generate cash flow projections per account
      const projections: CashFlowProjection[] = accounts.map(account => {
        const currentBalance = parseFloat(account.balance.toString());
        const monthlyFlow = (projectedMonthlyIncome - projectedMonthlyExpenses) / accounts.length;
        const projectedBalance = currentBalance + (monthlyFlow * months);
        const change = ((projectedBalance - currentBalance) / currentBalance) * 100;
        
        let riskLevel: 'low' | 'medium' | 'high' = 'low';
        if (projectedBalance < 0) riskLevel = 'high';
        else if (projectedBalance < currentBalance * 0.5) riskLevel = 'medium';

        return {
          account: account.name,
          currentBalance,
          projectedBalance,
          change,
          riskLevel
        };
      });

      setCashFlowProjections(projections);
    } catch (error) {
      toast({ title: "Error generating forecast", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          Financial Forecasting
        </CardTitle>
          <CardDescription>
            AI-powered predictions based on your spending patterns and recurring transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-between items-center mb-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  ₹{forecastData.length > 0 ? forecastData[forecastData.length - 1].projectedBalance.toFixed(2) : '0.00'}
                </div>
                <div className="text-sm text-muted-foreground">Projected Balance</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  ₹{forecastData.reduce((sum, m) => sum + m.projectedIncome, 0).toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">Total Projected Income</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  ₹{forecastData.reduce((sum, m) => sum + m.projectedExpenses, 0).toFixed(2)}
                </div>
                <div className="text-sm text-muted-foreground">Total Projected Expenses</div>
              </div>
            </div>
            <Select value={forecastPeriod} onValueChange={setForecastPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 months</SelectItem>
                <SelectItem value="6">6 months</SelectItem>
                <SelectItem value="12">12 months</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="h-80 mb-6 w-full overflow-x-auto">
            <ResponsiveContainer width="100%" height="100%" minWidth={300}>
              <LineChart data={forecastData} margin={{ top: 20, right: 20, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value: number) => [`₹${value.toFixed(2)}`, '']} />
                <Line 
                  type="monotone" 
                  dataKey="projectedIncome" 
                  stroke="#22c55e" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Projected Income"
                />
                <Line 
                  type="monotone" 
                  dataKey="projectedExpenses" 
                  stroke="#ef4444" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  name="Projected Expenses"
                />
                <Line 
                  type="monotone" 
                  dataKey="projectedBalance" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  name="Projected Balance"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Account Projections
          </CardTitle>
          <CardDescription>
            Projected balance changes for each account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {cashFlowProjections.map((projection, index) => (
              <div key={index} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{projection.account}</span>
                    <Badge 
                      variant={
                        projection.riskLevel === 'high' ? 'destructive' :
                        projection.riskLevel === 'medium' ? 'secondary' : 'default'
                      }
                    >
                      {projection.riskLevel} risk
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {projection.change >= 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                    )}
                    <span className={projection.change >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {projection.change >= 0 ? '+' : ''}{projection.change.toFixed(1)}%
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Current Balance</div>
                    <div className="font-medium">₹{projection.currentBalance.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Projected Balance</div>
                    <div className="font-medium">₹{projection.projectedBalance.toFixed(2)}</div>
                  </div>
                </div>

                <div className="mt-3">
                  <Progress 
                    value={Math.max(0, Math.min(100, (projection.projectedBalance / Math.max(projection.currentBalance, projection.projectedBalance)) * 100))}
                    className="h-2"
                  />
                </div>
              </div>
            ))}
            {cashFlowProjections.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No accounts found. Add bank accounts to see projections.</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}