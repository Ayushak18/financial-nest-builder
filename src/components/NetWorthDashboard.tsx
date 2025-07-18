import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BankAccount, Investment, Debt, NetWorthSummary } from '@/types/financial';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { TrendingUp, TrendingDown, DollarSign, Target } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis } from 'recharts';

interface NetWorthDashboardProps {
  user: any;
}

export const NetWorthDashboard = ({ user }: NetWorthDashboardProps) => {
  const [netWorthData, setNetWorthData] = useState<NetWorthSummary>({
    totalAssets: 0,
    totalDebts: 0,
    netWorth: 0,
    liquidAssets: 0,
    investments: 0
  });
  const [assetBreakdown, setAssetBreakdown] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      calculateNetWorth();
    }
  }, [user]);

  const calculateNetWorth = async () => {
    try {
      setLoading(true);

      // Fetch bank accounts
      const { data: accounts } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      // Fetch investments
      const { data: investments } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', user.id);

      // Fetch debts
      const { data: debts } = await supabase
        .from('debts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true);

      const bankAccounts: BankAccount[] = (accounts || []) as BankAccount[];
      const investmentData: Investment[] = (investments || []) as Investment[];
      const debtData: Debt[] = (debts || []) as Debt[];

      // Calculate liquid assets (checking, savings, cash)
      const liquidAssets = bankAccounts
        .filter(account => ['checking', 'savings', 'cash'].includes(account.account_type))
        .reduce((sum, account) => sum + account.balance, 0);

      // Calculate investment value
      const investmentValue = investmentData.reduce((sum, investment) => {
        return sum + (investment.shares * investment.current_price);
      }, 0);

      // Add investment account balances
      const investmentAccounts = bankAccounts
        .filter(account => account.account_type === 'investment')
        .reduce((sum, account) => sum + account.balance, 0);

      const totalInvestments = investmentValue + investmentAccounts;

      // Calculate total assets
      const totalAssets = liquidAssets + totalInvestments;

      // Calculate total debts
      const totalDebts = debtData.reduce((sum, debt) => sum + debt.balance, 0);

      // Calculate net worth
      const netWorth = totalAssets - totalDebts;

      setNetWorthData({
        totalAssets,
        totalDebts,
        netWorth,
        liquidAssets,
        investments: totalInvestments
      });

      // Prepare asset breakdown for chart
      const breakdown = [
        { name: 'Liquid Assets', value: liquidAssets, color: '#3b82f6' },
        { name: 'Investments', value: totalInvestments, color: '#10b981' },
        { name: 'Debts', value: totalDebts, color: '#ef4444' }
      ].filter(item => item.value > 0);

      setAssetBreakdown(breakdown);
    } catch (error) {
      console.error('Error calculating net worth:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const debtToAssetRatio = netWorthData.totalAssets > 0 ? (netWorthData.totalDebts / netWorthData.totalAssets) * 100 : 0;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Net Worth Dashboard</CardTitle>
          <CardDescription>Loading your financial overview...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-20 bg-muted animate-pulse rounded" />
            <div className="h-32 bg-muted animate-pulse rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Net Worth Dashboard
        </CardTitle>
        <CardDescription>
          Your complete financial overview
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Net Worth Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-6 bg-gradient-to-r from-green-50 to-green-100 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-800">Net Worth</span>
            </div>
            <div className={`text-3xl font-bold ${netWorthData.netWorth >= 0 ? 'text-green-700' : 'text-red-700'}`}>
              {formatCurrency(netWorthData.netWorth)}
            </div>
          </div>

          <div className="p-6 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Total Assets</span>
            </div>
            <div className="text-3xl font-bold text-blue-700">
              {formatCurrency(netWorthData.totalAssets)}
            </div>
          </div>

          <div className="p-6 bg-gradient-to-r from-red-50 to-red-100 rounded-lg border border-red-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              <span className="text-sm font-medium text-red-800">Total Debts</span>
            </div>
            <div className="text-3xl font-bold text-red-700">
              {formatCurrency(netWorthData.totalDebts)}
            </div>
          </div>
        </div>

        {/* Asset Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-semibold mb-4">Asset Breakdown</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Liquid Assets</span>
                  <span className="text-sm text-muted-foreground">
                    {formatCurrency(netWorthData.liquidAssets)}
                  </span>
                </div>
                <Progress 
                  value={netWorthData.totalAssets > 0 ? (netWorthData.liquidAssets / netWorthData.totalAssets) * 100 : 0} 
                  className="h-2"
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Investments</span>
                  <span className="text-sm text-muted-foreground">
                    {formatCurrency(netWorthData.investments)}
                  </span>
                </div>
                <Progress 
                  value={netWorthData.totalAssets > 0 ? (netWorthData.investments / netWorthData.totalAssets) * 100 : 0} 
                  className="h-2"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold mb-4">Financial Health</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Debt-to-Asset Ratio</span>
                  <span className="text-sm text-muted-foreground">
                    {debtToAssetRatio.toFixed(1)}%
                  </span>
                </div>
                <Progress 
                  value={debtToAssetRatio} 
                  className="h-2"
                />
                <div className="text-xs text-muted-foreground mt-1">
                  {debtToAssetRatio < 20 ? 'Excellent' : 
                   debtToAssetRatio < 40 ? 'Good' : 
                   debtToAssetRatio < 60 ? 'Fair' : 'Needs Improvement'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Asset Distribution Chart */}
        {assetBreakdown.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Asset Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={assetBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {assetBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {assetBreakdown.map((item, index) => (
                <div key={index} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {netWorthData.totalAssets === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Add bank accounts, investments, or debts to see your net worth analysis.
          </div>
        )}
      </CardContent>
    </Card>
  );
};