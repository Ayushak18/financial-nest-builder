import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, ArrowUpRight, ArrowDownLeft, Receipt, Edit, Check, X, Banknote } from 'lucide-react';
import { Transaction, BudgetCategory } from '@/types/budget';
import { BankAccount } from '@/types/financial';

interface TransactionListProps {
  transactions: Transaction[];
  categories: BudgetCategory[];
  bankAccounts: BankAccount[];
  onDeleteTransaction: (transactionId: string) => void;
  onUpdateTransaction: (transactionId: string, updates: Partial<Transaction>) => void;
}

export const TransactionList = ({ transactions, categories, bankAccounts, onDeleteTransaction, onUpdateTransaction }: TransactionListProps) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Transaction>>({});
  const sortedTransactions = [...transactions].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Unknown Category';
  };

  const getCategoryColor = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.color || 'hsl(var(--muted))';
  };

  const getAccountName = (accountId?: string) => {
    if (!accountId) return 'No Account';
    const account = bankAccounts.find(a => a.id === accountId);
    return account?.name || 'Unknown Account';
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingId(transaction.id);
    setEditForm({
      description: transaction.description,
      amount: transaction.amount,
      type: transaction.type,
      categoryId: transaction.categoryId,
      date: transaction.date
    });
  };

  const handleSaveEdit = () => {
    if (editingId && editForm) {
      onUpdateTransaction(editingId, editForm);
      setEditingId(null);
      setEditForm({});
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  return (
    <Card className="shadow-soft border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5 text-primary" />
          Recent Transactions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sortedTransactions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Receipt className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No transactions yet. Add your first transaction above!</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {sortedTransactions.map((transaction) => {
              const isIncome = transaction.type === 'income';
              const isSavings = transaction.type === 'savings';
              const isEditing = editingId === transaction.id;
              
              if (isEditing) {
                return (
                  <div 
                    key={transaction.id}
                    className="p-3 border rounded-lg bg-accent/30"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                      <div>
                        <Input
                          value={editForm.description || ''}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          placeholder="Description"
                          className="text-sm"
                        />
                      </div>
                      
                      <div>
                        <Input
                          type="number"
                          value={editForm.amount || ''}
                          onChange={(e) => setEditForm({ ...editForm, amount: Number(e.target.value) })}
                          placeholder="Amount"
                          className="text-sm"
                        />
                      </div>
                      
                      <div>
                        <Select
                          value={editForm.type || transaction.type}
                          onValueChange={(value: 'income' | 'expense' | 'savings') => setEditForm({ ...editForm, type: value })}
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="expense">Expense</SelectItem>
                            <SelectItem value="income">Income</SelectItem>
                            <SelectItem value="savings">Savings</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Select
                          value={editForm.categoryId || transaction.categoryId}
                          onValueChange={(value) => setEditForm({ ...editForm, categoryId: value })}
                        >
                          <SelectTrigger className="text-sm">
                            <SelectValue />
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
                      
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleSaveEdit}
                          className="h-8 w-8 p-0 text-success hover:text-success"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelEdit}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-muted-foreground"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              }
              
              return (
                <div 
                  key={transaction.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      isIncome ? 'bg-success/10' : isSavings ? 'bg-primary/10' : 'bg-destructive/10'
                    }`}>
                      {isIncome ? (
                        <ArrowDownLeft className="h-4 w-4 text-success" />
                      ) : isSavings ? (
                        <ArrowDownLeft className="h-4 w-4 text-primary" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{transaction.description}</span>
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: getCategoryColor(transaction.categoryId) }}
                        />
                        <Badge variant="outline" className="text-xs">
                          {getCategoryName(transaction.categoryId)}
                        </Badge>
                      </div>
                       <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <span>
                          {new Date(transaction.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                        <span>•</span>
                        <div className="flex items-center gap-1">
                          <Banknote className="h-3 w-3" />
                          <span>{getAccountName(transaction.accountId)}</span>
                          {transaction.type === 'savings' && transaction.receivingAccountId && (
                            <>
                              <span>→</span>
                              <span>{getAccountName(transaction.receivingAccountId)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className={`font-bold ${
                      isIncome ? 'text-success' : isSavings ? 'text-primary' : 'text-destructive'
                    }`}>
                      {isIncome ? '+' : isSavings ? '=' : '-'}₹{transaction.amount.toLocaleString()}
                    </span>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(transaction)}
                      className="h-8 w-8 p-0 text-primary hover:text-primary"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteTransaction(transaction.id)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};