import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Wallet } from 'lucide-react';
import { BudgetCategory, Transaction } from '@/types/budget';
import { BankAccount } from '@/types/financial';
import { useToast } from '@/hooks/use-toast';

interface TransactionFormProps {
  categories: BudgetCategory[];
  bankAccounts: BankAccount[];
  onAddTransaction: (transaction: Omit<Transaction, 'id'> & { accountId?: string }) => void;
}

export const TransactionForm = ({ categories, bankAccounts, onAddTransaction }: TransactionFormProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    type: 'expense' as 'income' | 'expense',
    amount: '',
    categoryId: '',
    accountId: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = () => {
    if (!formData.amount || !formData.categoryId || Number(formData.amount) <= 0) {
      toast({
        title: "Invalid transaction",
        description: "Please fill in all required fields with valid values.",
        variant: "destructive"
      });
      return;
    }

    const category = categories.find(c => c.id === formData.categoryId);
    
    onAddTransaction({
      type: formData.type,
      amount: Number(formData.amount),
      categoryId: formData.categoryId,
      accountId: formData.accountId || undefined,
      description: formData.description || `${formData.type} - ${category?.name}`,
      date: new Date(formData.date)
    });

    // Reset form
    setFormData({
      type: 'expense',
      amount: '',
      categoryId: '',
      accountId: '',
      description: '',
      date: new Date().toISOString().split('T')[0]
    });

    toast({
      title: "Transaction added",
      description: `Successfully added ${formData.type} of ₹${formData.amount}`,
      variant: "default"
    });
  };

  return (
    <Card className="shadow-soft border-0 mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          Add Transaction
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-4">
          <div>
            <Label htmlFor="transactionType">Type</Label>
            <Select
              value={formData.type}
              onValueChange={(value: 'income' | 'expense') => 
                setFormData({ ...formData, type: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="transactionAmount">Amount</Label>
            <Input
              id="transactionAmount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="transactionCategory">Category</Label>
            <Select
              value={formData.categoryId}
              onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: category.color }}
                      />
                      {category.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="transactionDate">Date</Label>
            <Input
              id="transactionDate"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            />
          </div>

          <div>
            <Label htmlFor="transactionAccount">Account (Optional)</Label>
            <Select
              value={formData.accountId}
              onValueChange={(value) => setFormData({ ...formData, accountId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <div className="flex items-center gap-2">
                      <span className="capitalize">{account.account_type}</span>
                      <span>•</span>
                      <span>{account.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end">
            <Button 
              onClick={handleSubmit}
              disabled={!formData.amount || !formData.categoryId || categories.length === 0}
              className="w-full bg-gradient-to-r from-primary to-success"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        </div>

        <div>
          <Label htmlFor="transactionDescription">Description (Optional)</Label>
          <Textarea
            id="transactionDescription"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Add a note about this transaction..."
            className="h-20"
          />
        </div>

        {categories.length === 0 && (
          <div className="mt-4 p-3 bg-warning/10 border border-warning/20 rounded-lg">
            <p className="text-sm text-warning-foreground">
              Please add at least one category before creating transactions.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};