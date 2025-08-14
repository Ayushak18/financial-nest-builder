import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, FolderOpen, Target, Edit, Check, X } from 'lucide-react';
import { BudgetCategory } from '@/types/budget';

interface CategoryManagerProps {
  categories: BudgetCategory[];
  onAddCategory: (category: Omit<BudgetCategory, 'id' | 'spent'>) => void;
  onUpdateCategory: (categoryId: string, updates: Partial<BudgetCategory>) => void;
  onDeleteCategory: (categoryId: string) => void;
  getCategoryProgress: (category: BudgetCategory) => number;
}

const categoryColors = [
  'hsl(var(--category-fixed))',
  'hsl(var(--category-variable))',
  'hsl(var(--category-savings))',
  'hsl(var(--category-entertainment))',
  'hsl(var(--category-food))',
  'hsl(var(--category-transport))',
];

const defaultCategories = [
  { name: 'Rent/Mortgage', type: 'fixed' as const },
  { name: 'Utilities', type: 'fixed' as const },
  { name: 'Groceries', type: 'variable' as const },
  { name: 'Transportation', type: 'variable' as const },
  { name: 'Entertainment', type: 'variable' as const },
  { name: 'Emergency Fund', type: 'savings' as const },
];

export const CategoryManager = ({ 
  categories, 
  onAddCategory, 
  onUpdateCategory, 
  onDeleteCategory, 
  getCategoryProgress 
}: CategoryManagerProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState({
    name: '',
    type: 'variable' as 'fixed' | 'variable' | 'savings',
    budgetAmount: 0,
    color: categoryColors[0]
  });
  const [editCategory, setEditCategory] = useState<Partial<BudgetCategory>>({});

  const handleAddCategory = () => {
    if (newCategory.name && newCategory.budgetAmount > 0) {
      onAddCategory(newCategory);
      setNewCategory({
        name: '',
        type: 'variable',
        budgetAmount: 0,
        color: categoryColors[0]
      });
      setIsAdding(false);
    }
  };

  const addDefaultCategory = (defaultCat: typeof defaultCategories[0]) => {
    const colorIndex = categories.length % categoryColors.length;
    onAddCategory({
      ...defaultCat,
      budgetAmount: 0,
      color: categoryColors[colorIndex]
    });
  };

  const handleEditCategory = (category: BudgetCategory) => {
    setEditingId(category.id);
    setEditCategory({
      name: category.name,
      budgetAmount: category.budgetAmount,
      type: category.type,
      color: category.color
    });
  };

  const handleSaveEdit = () => {
    if (editingId && editCategory) {
      onUpdateCategory(editingId, editCategory);
      setEditingId(null);
      setEditCategory({});
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditCategory({});
  };

  return (
    <Card className="shadow-soft border-0 mb-8">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FolderOpen className="h-5 w-5 text-primary" />
          Budget Categories
        </CardTitle>
        <Button 
          size="sm" 
          onClick={() => setIsAdding(true)}
          disabled={isAdding}
          className="bg-gradient-to-r from-primary to-success"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Category
        </Button>
      </CardHeader>
      <CardContent>
        {/* Quick Add Default Categories */}
        {categories.length === 0 && (
          <div className="mb-6 p-4 bg-accent rounded-lg">
            <h4 className="font-medium mb-3">Quick Start - Add Common Categories:</h4>
            <div className="flex flex-wrap gap-2">
              {defaultCategories.map((cat, index) => (
                <Button
                  key={index}
                  variant="outline"
                  size="sm"
                  onClick={() => addDefaultCategory(cat)}
                  className="text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {cat.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Add New Category Form */}
        {isAdding && (
          <div className="mb-6 p-4 border rounded-lg bg-card">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <Label htmlFor="categoryName">Category Name</Label>
                <Input
                  id="categoryName"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  placeholder="e.g., Groceries"
                />
              </div>
              <div>
                <Label htmlFor="categoryType">Type</Label>
                <Select
                  value={newCategory.type}
                  onValueChange={(value: 'fixed' | 'variable' | 'savings') => 
                    setNewCategory({ ...newCategory, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fixed">Fixed</SelectItem>
                    <SelectItem value="variable">Variable</SelectItem>
                    <SelectItem value="savings">Savings</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="categoryBudget">Budget Amount</Label>
                <Input
                  id="categoryBudget"
                  type="number"
                  value={newCategory.budgetAmount}
                  onChange={(e) => setNewCategory({ 
                    ...newCategory, 
                    budgetAmount: Number(e.target.value) 
                  })}
                  placeholder="0"
                />
              </div>
              <div>
                <Label htmlFor="categoryColor">Color</Label>
                <Select
                  value={newCategory.color}
                  onValueChange={(value) => setNewCategory({ ...newCategory, color: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryColors.map((color, index) => (
                      <SelectItem key={index} value={color}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: color }}
                          />
                          Color {index + 1}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleAddCategory}
                disabled={!newCategory.name || newCategory.budgetAmount <= 0}
              >
                Add Category
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setIsAdding(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Categories List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => {
            const progress = getCategoryProgress(category);
            const isOverBudget = category.spent > category.budgetAmount;
            const isEditing = editingId === category.id;
            
            return (
              <Card key={category.id} className="border shadow-soft">
                <CardContent className="p-4">
                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs">Name</Label>
                        <Input
                          value={editCategory.name || ''}
                          onChange={(e) => setEditCategory({ ...editCategory, name: e.target.value })}
                          className="text-sm"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Budget</Label>
                          <Input
                            type="number"
                            value={editCategory.budgetAmount || ''}
                            onChange={(e) => setEditCategory({ ...editCategory, budgetAmount: Number(e.target.value) })}
                            className="text-sm"
                          />
                        </div>
                        
                        <div>
                          <Label className="text-xs">Type</Label>
                          <Select
                            value={editCategory.type || category.type}
                            onValueChange={(value: 'fixed' | 'variable' | 'savings') => 
                              setEditCategory({ ...editCategory, type: value })
                            }
                          >
                            <SelectTrigger className="text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fixed">Fixed</SelectItem>
                              <SelectItem value="variable">Variable</SelectItem>
                              <SelectItem value="savings">Savings</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="flex justify-between">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleSaveEdit}
                          className="text-success hover:text-success"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelEdit}
                          className="text-muted-foreground hover:text-muted-foreground"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                          <h4 className="font-medium">{category.name}</h4>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs">
                            {category.type}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditCategory(category)}
                            className="h-6 w-6 p-0 text-primary hover:text-primary"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteCategory(category.id)}
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Spent: ₹{category.spent.toLocaleString()}</span>
                          <span>Budget: ₹{category.budgetAmount.toLocaleString()}</span>
                        </div>
                        
                        <Progress 
                          value={Math.min(progress, 100)} 
                          className="h-2"
                        />
                        
                        <div className="flex justify-between items-center">
                          <span className={`text-xs ${isOverBudget ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {progress.toFixed(1)}% used
                          </span>
                          <span className={`text-xs font-medium ${
                            isOverBudget ? 'text-destructive' : 'text-success'
                          }`}>
                            ₹{Math.abs(category.budgetAmount - category.spent).toLocaleString()} {
                              isOverBudget ? 'over' : 'remaining'
                            }
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {categories.length === 0 && !isAdding && (
          <div className="text-center py-8 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No categories yet. Add your first category to get started!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};