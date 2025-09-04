import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BankAccount } from '@/types/financial';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, Trash2, Building2, CreditCard, Wallet, TrendingUp, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { FinancialCalculations } from '@/services/financialCalculations';

interface BankAccountManagerProps {
  user: any;
}

export const BankAccountManager = ({ user }: BankAccountManagerProps) => {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [newAccount, setNewAccount] = useState({
    name: '',
    account_type: 'checking' as const,
    balance: 0,
    currency: 'USD'
  });
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchAccounts();
    }
  }, [user]);

  const fetchAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAccounts((data || []) as BankAccount[]);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch bank accounts",
        variant: "destructive",
      });
    }
  };

  const addAccount = async () => {
    try {
      const { error } = await supabase
        .from('bank_accounts')
        .insert([
          {
            ...newAccount,
            user_id: user.id,
          }
        ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Bank account added successfully",
      });
      
      setIsAddingAccount(false);
      setNewAccount({ name: '', account_type: 'checking', balance: 0, currency: 'USD' });
      fetchAccounts();
    } catch (error) {
      console.error('Error adding account:', error);
      toast({
        title: "Error",
        description: "Failed to add bank account",
        variant: "destructive",
      });
    }
  };

  const deleteAccount = async (accountId: string) => {
    try {
      const { error } = await supabase
        .from('bank_accounts')
        .update({ is_active: false })
        .eq('id', accountId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Bank account deleted successfully",
      });
      
      fetchAccounts();
    } catch (error) {
      console.error('Error deleting account:', error);
      toast({
        title: "Error",
        description: "Failed to delete bank account",
        variant: "destructive",
      });
    }
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'checking':
        return Building2;
      case 'savings':
        return DollarSign;
      case 'credit':
        return CreditCard;
      case 'investment':
        return TrendingUp;
      case 'cash':
        return Wallet;
      default:
        return Building2;
    }
  };

  const totalBalance = FinancialCalculations.getTotalAccountBalance(accounts);
  
  // Debug logging
  console.log('BankAccountManager Debug:', {
    totalBalance,
    accountCount: accounts.length,
    accounts: accounts.map(a => ({ name: a.name, balance: a.balance }))
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Bank Accounts
        </CardTitle>
        <CardDescription>
          Manage your bank accounts and track balances
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="p-4 bg-accent rounded-lg">
          <div className="text-2xl font-bold">₹{totalBalance.toFixed(2)}</div>
          <div className="text-sm text-muted-foreground">Total Balance</div>
        </div>

        {/* Add Account Form */}
        {isAddingAccount && (
          <div className="p-4 border rounded-lg space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="account-name">Account Name</Label>
                <Input
                  id="account-name"
                  value={newAccount.name}
                  onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
                  placeholder="Main Checking"
                />
              </div>
              <div>
                <Label htmlFor="account-type">Account Type</Label>
                <Select value={newAccount.account_type} onValueChange={(value) => setNewAccount({ ...newAccount, account_type: value as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checking">Checking</SelectItem>
                    <SelectItem value="savings">Savings</SelectItem>
                    <SelectItem value="credit">Credit Card</SelectItem>
                    <SelectItem value="investment">Investment</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="balance">Current Balance</Label>
                <Input
                  id="balance"
                  type="number"
                  step="0.01"
                  value={newAccount.balance}
                  onChange={(e) => setNewAccount({ ...newAccount, balance: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select value={newAccount.currency} onValueChange={(value) => setNewAccount({ ...newAccount, currency: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="CAD">CAD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={addAccount}>Add Account</Button>
              <Button variant="outline" onClick={() => setIsAddingAccount(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Add Account Button */}
        {!isAddingAccount && (
          <Button onClick={() => setIsAddingAccount(true)} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Bank Account
          </Button>
        )}

        {/* Accounts List */}
        <div className="space-y-3">
          {accounts.map((account) => {
            const IconComponent = getAccountIcon(account.account_type);
            return (
              <div key={account.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <IconComponent className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{account.name}</div>
                    <div className="text-sm text-muted-foreground capitalize">
                      {account.account_type.replace('_', ' ')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-medium">
                      ₹{account.balance.toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {account.currency}
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteAccount(account.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {accounts.length === 0 && !isAddingAccount && (
          <div className="text-center py-8 text-muted-foreground">
            No bank accounts added yet. Add your first account to get started.
          </div>
        )}
      </CardContent>
    </Card>
  );
};