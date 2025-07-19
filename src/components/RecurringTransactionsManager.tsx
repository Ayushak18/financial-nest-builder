import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { RecurringTransaction, BankAccount } from '@/types/financial';

export function RecurringTransactionsManager() {
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [budgetCategories, setBudgetCategories] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [newTransaction, setNewTransaction] = useState({
    account_id: '',
    category_id: '',
    type: 'expense' as 'income' | 'expense',
    amount: '',
    description: '',
    frequency: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [recurringRes, accountsRes, categoriesRes] = await Promise.all([
        supabase.from('recurring_transactions').select('*').eq('user_id', user.id).eq('is_active', true),
        supabase.from('bank_accounts').select('*').eq('user_id', user.id).eq('is_active', true),
        supabase.from('budget_categories').select('*').eq('user_id', user.id)
      ]);

      if (recurringRes.data) setRecurringTransactions(recurringRes.data as RecurringTransaction[]);
      if (accountsRes.data) setBankAccounts(accountsRes.data as BankAccount[]);
      if (categoriesRes.data) setBudgetCategories(categoriesRes.data);
    } catch (error) {
      toast({ title: "Error loading data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const addRecurringTransaction = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const nextOccurrence = calculateNextOccurrence(newTransaction.start_date, newTransaction.frequency);

      const { error } = await supabase.from('recurring_transactions').insert({
        user_id: user.id,
        account_id: newTransaction.account_id,
        category_id: newTransaction.category_id,
        type: newTransaction.type,
        amount: parseFloat(newTransaction.amount),
        description: newTransaction.description,
        frequency: newTransaction.frequency,
        start_date: newTransaction.start_date,
        end_date: newTransaction.end_date || null,
        next_occurrence: nextOccurrence,
        is_active: true
      });

      if (error) throw error;

      toast({ title: "Recurring transaction added successfully" });
      setIsDialogOpen(false);
      setNewTransaction({
        account_id: '',
        category_id: '',
        type: 'expense',
        amount: '',
        description: '',
        frequency: 'monthly',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
      });
      loadData();
    } catch (error) {
      toast({ title: "Error adding recurring transaction", variant: "destructive" });
    }
  };

  const deleteRecurringTransaction = async (id: string) => {
    try {
      const { error } = await supabase.from('recurring_transactions').update({ is_active: false }).eq('id', id);
      if (error) throw error;
      toast({ title: "Recurring transaction deleted" });
      loadData();
    } catch (error) {
      toast({ title: "Error deleting recurring transaction", variant: "destructive" });
    }
  };

  const calculateNextOccurrence = (startDate: string, frequency: string): string => {
    const date = new Date(startDate);
    switch (frequency) {
      case 'daily':
        date.setDate(date.getDate() + 1);
        break;
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1);
        break;
    }
    return date.toISOString().split('T')[0];
  };

  if (loading) return <div>Loading...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Recurring Transactions
        </CardTitle>
        <CardDescription>
          Manage your recurring income and expenses
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm text-muted-foreground">
            {recurringTransactions.length} active recurring transactions
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Recurring Transaction
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Recurring Transaction</DialogTitle>
                <DialogDescription>
                  Set up a transaction that repeats automatically
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type">Type</Label>
                    <Select value={newTransaction.type} onValueChange={(value: 'income' | 'expense') => 
                      setNewTransaction({ ...newTransaction, type: value })
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newTransaction.amount}
                      onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    value={newTransaction.description}
                    onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="account">Account</Label>
                    <Select value={newTransaction.account_id} onValueChange={(value) => 
                      setNewTransaction({ ...newTransaction, account_id: value })
                    }>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        {bankAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Select value={newTransaction.category_id} onValueChange={(value) => 
                      setNewTransaction({ ...newTransaction, category_id: value })
                    }>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {budgetCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="frequency">Frequency</Label>
                    <Select value={newTransaction.frequency} onValueChange={(value: 'daily' | 'weekly' | 'monthly' | 'yearly') => 
                      setNewTransaction({ ...newTransaction, frequency: value })
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      type="date"
                      value={newTransaction.start_date}
                      onChange={(e) => setNewTransaction({ ...newTransaction, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_date">End Date (Optional)</Label>
                    <Input
                      type="date"
                      value={newTransaction.end_date}
                      onChange={(e) => setNewTransaction({ ...newTransaction, end_date: e.target.value })}
                    />
                  </div>
                </div>

                <Button onClick={addRecurringTransaction} className="w-full">
                  Add Recurring Transaction
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          {recurringTransactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{transaction.description}</span>
                  <Badge variant={transaction.type === 'income' ? 'default' : 'secondary'}>
                    {transaction.type}
                  </Badge>
                  <Badge variant="outline">
                    {transaction.frequency}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  Amount: ${transaction.amount} • Next: {new Date(transaction.next_occurrence).toLocaleDateString()}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => deleteRecurringTransaction(transaction.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {recurringTransactions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No recurring transactions yet. Add one to get started.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}