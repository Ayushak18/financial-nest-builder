import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, ArrowUpRight, ArrowDownLeft, Receipt } from 'lucide-react';
import { Transaction, BudgetCategory } from '@/types/budget';

interface TransactionListProps {
  transactions: Transaction[];
  categories: BudgetCategory[];
  onDeleteTransaction: (transactionId: string) => void;
}

export const TransactionList = ({ transactions, categories, onDeleteTransaction }: TransactionListProps) => {
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
              
              return (
                <div 
                  key={transaction.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${
                      isIncome ? 'bg-success/10' : 'bg-destructive/10'
                    }`}>
                      {isIncome ? (
                        <ArrowDownLeft className="h-4 w-4 text-success" />
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
                      <div className="text-sm text-muted-foreground">
                        {new Date(transaction.date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className={`font-bold ${
                      isIncome ? 'text-success' : 'text-destructive'
                    }`}>
                      {isIncome ? '+' : '-'}${transaction.amount.toLocaleString()}
                    </span>
                    
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