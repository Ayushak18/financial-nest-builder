import React, { useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, Eye, Edit3, Trash2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PreviewStepProps {
  session: any;
  items: any[];
  onPreviewApproved: (approvedItems: any[]) => void;
  onBack: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const TRANSACTION_TYPES = [
  { value: 'income', label: 'Income', color: 'bg-green-100 text-green-800' },
  { value: 'expense', label: 'Expense', color: 'bg-red-100 text-red-800' },
  { value: 'savings', label: 'Savings', color: 'bg-blue-100 text-blue-800' },
];

const CATEGORIES = [
  'Food & Dining', 'Transportation', 'Shopping', 'Entertainment', 'Bills & Utilities',
  'Healthcare', 'Education', 'Travel', 'Groceries', 'Gas & Fuel', 'Salary', 'Freelance',
  'Investment', 'Business', 'Gift', 'Other'
];

export const PreviewStep: React.FC<PreviewStepProps> = ({
  session,
  items,
  onPreviewApproved,
  onBack,
  isLoading,
  setIsLoading,
}) => {
  const [editedItems, setEditedItems] = useState(items);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set(items.map(item => item.id)));
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const { toast } = useToast();

  const stats = useMemo(() => {
    const approved = editedItems.filter(item => selectedItems.has(item.id));
    const totalAmount = approved.reduce((sum, item) => sum + (item.parsed_data?.amount || 0), 0);
    const incomeAmount = approved
      .filter(item => item.parsed_data?.type === 'income')
      .reduce((sum, item) => sum + (item.parsed_data?.amount || 0), 0);
    const expenseAmount = approved
      .filter(item => item.parsed_data?.type === 'expense')
      .reduce((sum, item) => sum + (item.parsed_data?.amount || 0), 0);

    return {
      total: approved.length,
      totalAmount,
      income: incomeAmount,
      expense: expenseAmount,
      savings: totalAmount - incomeAmount - expenseAmount,
    };
  }, [editedItems, selectedItems]);

  const handleItemEdit = useCallback((itemId: string, field: string, value: any) => {
    setEditedItems(prev => prev.map(item => 
      item.id === itemId 
        ? {
            ...item,
            parsed_data: {
              ...item.parsed_data,
              [field]: value
            }
          }
        : item
    ));
  }, []);

  const handleItemToggle = useCallback((itemId: string, selected: boolean) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(itemId);
      } else {
        newSet.delete(itemId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedItems(new Set(editedItems.map(item => item.id)));
    } else {
      setSelectedItems(new Set());
    }
  }, [editedItems]);

  const handleDeleteItem = useCallback((itemId: string) => {
    setEditedItems(prev => prev.filter(item => item.id !== itemId));
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(itemId);
      return newSet;
    });
  }, []);

  const handleNext = useCallback(() => {
    const approvedItems = editedItems
      .filter(item => selectedItems.has(item.id))
      .map(item => ({
        ...item,
        status: 'approved'
      }));

    if (approvedItems.length === 0) {
      toast({
        title: "No Items Selected",
        description: "Please select at least one transaction to import.",
        variant: "destructive",
      });
      return;
    }

    onPreviewApproved(approvedItems);
  }, [editedItems, selectedItems, onPreviewApproved, toast]);

  const getTypeColor = (type: string) => {
    return TRANSACTION_TYPES.find(t => t.value === type)?.color || 'bg-gray-100 text-gray-800';
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR' 
    }).format(amount);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Preview & Edit Transactions
        </CardTitle>
        <CardDescription>
          Review and edit the imported transactions before adding them to your budget
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Selected Items</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{formatAmount(stats.income)}</div>
            <div className="text-sm text-muted-foreground">Income</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{formatAmount(stats.expense)}</div>
            <div className="text-sm text-muted-foreground">Expenses</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{formatAmount(stats.savings)}</div>
            <div className="text-sm text-muted-foreground">Savings</div>
          </div>
        </div>

        {/* Bulk Actions */}
        <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
          <Checkbox
            checked={selectedItems.size === editedItems.length}
            onCheckedChange={handleSelectAll}
          />
          <span className="text-sm font-medium">
            Select All ({selectedItems.size}/{editedItems.length})
          </span>
        </div>

        {/* Transaction List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {editedItems.map((item) => {
            const isSelected = selectedItems.has(item.id);
            const isEditing = editingItem === item.id;
            const data = item.parsed_data || {};

            return (
              <div
                key={item.id}
                className={`p-4 border rounded-lg transition-colors ${
                  isSelected ? 'bg-primary/5 border-primary/20' : 'bg-background'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => handleItemToggle(item.id, checked as boolean)}
                  />
                  
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-3 items-center">
                    {/* Date */}
                    <div>
                      {isEditing ? (
                        <Input
                          type="date"
                          value={data.date || ''}
                          onChange={(e) => handleItemEdit(item.id, 'date', e.target.value)}
                        />
                      ) : (
                        <div className="text-sm font-medium">
                          {new Date(data.date).toLocaleDateString()}
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    <div className="md:col-span-2">
                      {isEditing ? (
                        <Input
                          value={data.description || ''}
                          onChange={(e) => handleItemEdit(item.id, 'description', e.target.value)}
                          placeholder="Description"
                        />
                      ) : (
                        <div className="font-medium">{data.description}</div>
                      )}
                    </div>

                    {/* Type & Amount */}
                    <div className="flex items-center gap-2">
                      {isEditing ? (
                        <>
                          <Select
                            value={data.type || ''}
                            onValueChange={(value) => handleItemEdit(item.id, 'type', value)}
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {TRANSACTION_TYPES.map(type => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            value={data.amount || ''}
                            onChange={(e) => handleItemEdit(item.id, 'amount', parseFloat(e.target.value) || 0)}
                            className="w-24"
                          />
                        </>
                      ) : (
                        <>
                          <Badge className={getTypeColor(data.type)}>
                            {TRANSACTION_TYPES.find(t => t.value === data.type)?.label}
                          </Badge>
                          <span className="font-semibold">
                            {formatAmount(data.amount || 0)}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Category */}
                    <div>
                      {isEditing ? (
                        <Select
                          value={data.category || ''}
                          onValueChange={(value) => handleItemEdit(item.id, 'category', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Category" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">None</SelectItem>
                            {CATEGORIES.map(cat => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {data.category || 'No category'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingItem(isEditing ? null : item.id)}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {item.validation_errors && item.validation_errors.length > 0 && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{item.validation_errors.join(', ')}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {editedItems.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No transactions to preview
          </div>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button 
            onClick={handleNext} 
            disabled={isLoading || selectedItems.size === 0}
          >
            Import {selectedItems.size} Transactions
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};