import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Investment, BankAccount } from '@/types/financial';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InvestmentTrackerProps {
  user: any;
  accounts: BankAccount[];
}

export const InvestmentTracker = ({ user, accounts }: InvestmentTrackerProps) => {
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isAddingInvestment, setIsAddingInvestment] = useState(false);
  const [newInvestment, setNewInvestment] = useState({
    account_id: '',
    symbol: '',
    name: '',
    shares: 0,
    purchase_price: 0,
    current_price: 0,
    investment_type: 'stock' as const
  });
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchInvestments();
    }
  }, [user]);

  const fetchInvestments = async () => {
    try {
      const { data, error } = await supabase
        .from('investments')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvestments((data || []) as Investment[]);
    } catch (error) {
      console.error('Error fetching investments:', error);
      toast({
        title: "Error",
        description: "Failed to fetch investments",
        variant: "destructive",
      });
    }
  };

  const addInvestment = async () => {
    try {
      const { error } = await supabase
        .from('investments')
        .insert([
          {
            ...newInvestment,
            user_id: user.id,
          }
        ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Investment added successfully",
      });
      
      setIsAddingInvestment(false);
      setNewInvestment({
        account_id: '',
        symbol: '',
        name: '',
        shares: 0,
        purchase_price: 0,
        current_price: 0,
        investment_type: 'stock'
      });
      fetchInvestments();
    } catch (error) {
      console.error('Error adding investment:', error);
      toast({
        title: "Error",
        description: "Failed to add investment",
        variant: "destructive",
      });
    }
  };

  const deleteInvestment = async (investmentId: string) => {
    try {
      const { error } = await supabase
        .from('investments')
        .delete()
        .eq('id', investmentId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Investment deleted successfully",
      });
      
      fetchInvestments();
    } catch (error) {
      console.error('Error deleting investment:', error);
      toast({
        title: "Error",
        description: "Failed to delete investment",
        variant: "destructive",
      });
    }
  };

  const calculateGainLoss = (investment: Investment) => {
    const totalCost = investment.shares * investment.purchase_price;
    const currentValue = investment.shares * investment.current_price;
    const gainLoss = currentValue - totalCost;
    const percentage = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;
    return { gainLoss, percentage, currentValue };
  };

  const totalInvestmentValue = investments.reduce((sum, investment) => {
    const { currentValue } = calculateGainLoss(investment);
    return sum + currentValue;
  }, 0);

  const totalGainLoss = investments.reduce((sum, investment) => {
    const { gainLoss } = calculateGainLoss(investment);
    return sum + gainLoss;
  }, 0);

  const investmentAccounts = accounts.filter(account => account.account_type === 'investment');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Investment Portfolio
        </CardTitle>
        <CardDescription>
          Track your investments and monitor performance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-accent rounded-lg">
            <div className="text-2xl font-bold">${totalInvestmentValue.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">Total Value</div>
          </div>
          <div className="p-4 bg-accent rounded-lg">
            <div className={`text-2xl font-bold ${totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalGainLoss >= 0 ? '+' : ''}${totalGainLoss.toFixed(2)}
            </div>
            <div className="text-sm text-muted-foreground">Total Gain/Loss</div>
          </div>
        </div>

        {/* Add Investment Form */}
        {isAddingInvestment && (
          <div className="p-4 border rounded-lg space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="investment-account">Investment Account</Label>
                <Select value={newInvestment.account_id} onValueChange={(value) => setNewInvestment({ ...newInvestment, account_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {investmentAccounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="investment-type">Investment Type</Label>
                <Select value={newInvestment.investment_type} onValueChange={(value) => setNewInvestment({ ...newInvestment, investment_type: value as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stock">Stock</SelectItem>
                    <SelectItem value="bond">Bond</SelectItem>
                    <SelectItem value="mutual_fund">Mutual Fund</SelectItem>
                    <SelectItem value="etf">ETF</SelectItem>
                    <SelectItem value="crypto">Cryptocurrency</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="symbol">Symbol</Label>
                <Input
                  id="symbol"
                  value={newInvestment.symbol}
                  onChange={(e) => setNewInvestment({ ...newInvestment, symbol: e.target.value.toUpperCase() })}
                  placeholder="AAPL"
                />
              </div>
              <div>
                <Label htmlFor="investment-name">Investment Name</Label>
                <Input
                  id="investment-name"
                  value={newInvestment.name}
                  onChange={(e) => setNewInvestment({ ...newInvestment, name: e.target.value })}
                  placeholder="Apple Inc."
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="shares">Shares</Label>
                <Input
                  id="shares"
                  type="number"
                  step="0.001"
                  value={newInvestment.shares}
                  onChange={(e) => setNewInvestment({ ...newInvestment, shares: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="purchase-price">Purchase Price</Label>
                <Input
                  id="purchase-price"
                  type="number"
                  step="0.01"
                  value={newInvestment.purchase_price}
                  onChange={(e) => setNewInvestment({ ...newInvestment, purchase_price: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="current-price">Current Price</Label>
                <Input
                  id="current-price"
                  type="number"
                  step="0.01"
                  value={newInvestment.current_price}
                  onChange={(e) => setNewInvestment({ ...newInvestment, current_price: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={addInvestment} disabled={!newInvestment.account_id || !newInvestment.symbol}>
                Add Investment
              </Button>
              <Button variant="outline" onClick={() => setIsAddingInvestment(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Add Investment Button */}
        {!isAddingInvestment && investmentAccounts.length > 0 && (
          <Button onClick={() => setIsAddingInvestment(true)} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Investment
          </Button>
        )}

        {investmentAccounts.length === 0 && (
          <div className="text-center py-4 text-muted-foreground">
            Create an investment account first to track investments.
          </div>
        )}

        {/* Investments List */}
        <div className="space-y-3">
          {investments.map((investment) => {
            const { gainLoss, percentage, currentValue } = calculateGainLoss(investment);
            const isPositive = gainLoss >= 0;
            
            return (
              <div key={investment.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${isPositive ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {isPositive ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className="font-medium">{investment.symbol}</div>
                    <div className="text-sm text-muted-foreground">{investment.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {investment.shares} shares • {investment.investment_type.replace('_', ' ')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-medium">${currentValue.toFixed(2)}</div>
                    <div className={`text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {isPositive ? '+' : ''}${gainLoss.toFixed(2)} ({isPositive ? '+' : ''}{percentage.toFixed(2)}%)
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteInvestment(investment.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {investments.length === 0 && !isAddingInvestment && investmentAccounts.length > 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No investments tracked yet. Add your first investment to get started.
          </div>
        )}
      </CardContent>
    </Card>
  );
};