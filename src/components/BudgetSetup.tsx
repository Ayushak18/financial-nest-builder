import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Save } from 'lucide-react';
import { MonthlyBudget } from '@/types/budget';

interface BudgetSetupProps {
  budget: MonthlyBudget;
  onUpdateBudget: (updates: Partial<MonthlyBudget>) => void;
  getSpendingByType: () => { fixedSpent: number; variableSpent: number; savingsSpent: number; };
}

export const BudgetSetup = ({ budget, onUpdateBudget, getSpendingByType }: BudgetSetupProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    totalBudget: budget.totalBudget,
    fixedBudget: budget.fixedBudget,
    variableBudget: budget.variableBudget,
    savingsBudget: budget.savingsBudget
  });

  const handleSave = () => {
    onUpdateBudget(formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      totalBudget: budget.totalBudget,
      fixedBudget: budget.fixedBudget,
      variableBudget: budget.variableBudget,
      savingsBudget: budget.savingsBudget
    });
    setIsEditing(false);
  };

  const { fixedSpent, variableSpent, savingsSpent } = getSpendingByType();

  return (
    <Card className="shadow-soft border-0 mb-8">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          Monthly Budget Setup
        </CardTitle>
        {!isEditing ? (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsEditing(true)}
          >
            Edit Budget
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button 
              size="sm" 
              onClick={handleSave}
              className="bg-gradient-to-r from-primary to-success"
            >
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label htmlFor="totalBudget">Total Monthly Budget</Label>
            {isEditing ? (
              <Input
                id="totalBudget"
                type="number"
                value={formData.totalBudget}
                onChange={(e) => setFormData({
                  ...formData,
                  totalBudget: Number(e.target.value)
                })}
                placeholder="0"
              />
            ) : (
              <div className="text-2xl font-bold text-primary">
                ${budget.totalBudget.toLocaleString()}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="fixedBudget">Fixed Expenses</Label>
            {isEditing ? (
              <Input
                id="fixedBudget"
                type="number"
                value={formData.fixedBudget}
                onChange={(e) => setFormData({
                  ...formData,
                  fixedBudget: Number(e.target.value)
                })}
                placeholder="0"
              />
            ) : (
              <div className="space-y-1">
                <div className="text-2xl font-bold" style={{ color: 'hsl(var(--category-fixed))' }}>
                  ${budget.fixedBudget.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">
                  Spent: ${fixedSpent.toLocaleString()}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="variableBudget">Variable Expenses</Label>
            {isEditing ? (
              <Input
                id="variableBudget"
                type="number"
                value={formData.variableBudget}
                onChange={(e) => setFormData({
                  ...formData,
                  variableBudget: Number(e.target.value)
                })}
                placeholder="0"
              />
            ) : (
              <div className="space-y-1">
                <div className="text-2xl font-bold" style={{ color: 'hsl(var(--category-variable))' }}>
                  ${budget.variableBudget.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">
                  Spent: ${variableSpent.toLocaleString()}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="savingsBudget">Savings Goal</Label>
            {isEditing ? (
              <Input
                id="savingsBudget"
                type="number"
                value={formData.savingsBudget}
                onChange={(e) => setFormData({
                  ...formData,
                  savingsBudget: Number(e.target.value)
                })}
                placeholder="0"
              />
            ) : (
              <div className="space-y-1">
                <div className="text-2xl font-bold" style={{ color: 'hsl(var(--category-savings))' }}>
                  ${budget.savingsBudget.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">
                  Contributed: ${savingsSpent.toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};