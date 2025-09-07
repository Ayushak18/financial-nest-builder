import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Copy, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CopyCategoriesModalProps {
  currentMonth: string;
  currentYear: number;
  onCopyComplete: () => void;
}

interface AvailableMonth {
  month: string;
  year: number;
  categoryCount: number;
}

export const CopyCategoriesModal = ({ currentMonth, currentYear, onCopyComplete }: CopyCategoriesModalProps) => {
  const [open, setOpen] = useState(false);
  const [availableMonths, setAvailableMonths] = useState<AvailableMonth[]>([]);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState<number>();
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadAvailableMonths();
    }
  }, [open]);

  const loadAvailableMonths = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all monthly budgets with categories
      const { data: budgets, error } = await supabase
        .from('monthly_budgets')
        .select(`
          month, 
          year, 
          budget_categories!inner(id)
        `)
        .eq('user_id', user.id)
        .neq('month', currentMonth)
        .neq('year', currentYear);

      if (error) throw error;

      // Count categories for each month
      const monthsWithCategories = budgets?.reduce((acc: AvailableMonth[], budget) => {
        const existing = acc.find(m => m.month === budget.month && m.year === budget.year);
        if (existing) {
          existing.categoryCount++;
        } else {
          acc.push({
            month: budget.month,
            year: budget.year,
            categoryCount: 1
          });
        }
        return acc;
      }, []) || [];

      // Sort by year and month
      monthsWithCategories.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        const monthOrder = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];
        return monthOrder.indexOf(b.month) - monthOrder.indexOf(a.month);
      });

      setAvailableMonths(monthsWithCategories);
    } catch (error) {
      console.error('Error loading months:', error);
      toast({
        title: "Error",
        description: "Failed to load available months",
        variant: "destructive",
      });
    }
  };

  const handleCopyCategories = async () => {
    if (!selectedMonth || !selectedYear) return;

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get current month budget
      const { data: currentBudget, error: currentBudgetError } = await supabase
        .from('monthly_budgets')
        .select('id')
        .eq('user_id', user.id)
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .single();

      if (currentBudgetError) throw currentBudgetError;

      // Get source month budget
      const { data: sourceBudget, error: sourceBudgetError } = await supabase
        .from('monthly_budgets')
        .select('id')
        .eq('user_id', user.id)
        .eq('month', selectedMonth)
        .eq('year', selectedYear)
        .single();

      if (sourceBudgetError) throw sourceBudgetError;

      // Get categories from source month
      const { data: sourceCategories, error: categoriesError } = await supabase
        .from('budget_categories')
        .select('name, type, budget_amount, color')
        .eq('monthly_budget_id', sourceBudget.id);

      if (categoriesError) throw categoriesError;

      if (!sourceCategories || sourceCategories.length === 0) {
        toast({
          title: "No categories found",
          description: "The selected month has no categories to copy",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Check if current month already has categories
      const { data: existingCategories, error: existingError } = await supabase
        .from('budget_categories')
        .select('id')
        .eq('monthly_budget_id', currentBudget.id);

      if (existingError) throw existingError;

      if (existingCategories && existingCategories.length > 0) {
        if (!confirm('This will replace all existing categories. Continue?')) {
          setLoading(false);
          return;
        }

        // Delete existing categories
        const { error: deleteError } = await supabase
          .from('budget_categories')
          .delete()
          .eq('monthly_budget_id', currentBudget.id);

        if (deleteError) throw deleteError;
      }

      // Copy categories to current month
      const categoriesToInsert = sourceCategories.map(cat => ({
        user_id: user.id,
        monthly_budget_id: currentBudget.id,
        name: cat.name,
        type: cat.type,
        budget_amount: cat.budget_amount,
        color: cat.color,
        spent: 0
      }));

      const { error: insertError } = await supabase
        .from('budget_categories')
        .insert(categoriesToInsert);

      if (insertError) throw insertError;

      toast({
        title: "Categories copied successfully",
        description: `Copied ${sourceCategories.length} categories from ${selectedMonth} ${selectedYear}`,
        variant: "default",
      });

      setOpen(false);
      onCopyComplete();
    } catch (error) {
      console.error('Error copying categories:', error);
      toast({
        title: "Error",
        description: "Failed to copy categories",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Copy className="h-4 w-4 mr-1" />
          Copy Categories
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Copy Categories from Another Month
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-sm text-muted-foreground">
            Copy categories from another month to {currentMonth} {currentYear}
          </div>

          {availableMonths.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No other months with categories found</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Select Month to Copy From</Label>
                <Select 
                  value={selectedMonth ? `${selectedMonth}-${selectedYear}` : ''} 
                  onValueChange={(value) => {
                    const [month, year] = value.split('-');
                    setSelectedMonth(month);
                    setSelectedYear(parseInt(year));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a month..." />
                  </SelectTrigger>
                  <SelectContent>
                    {availableMonths.map((month) => (
                      <SelectItem 
                        key={`${month.month}-${month.year}`} 
                        value={`${month.month}-${month.year}`}
                      >
                        {month.month} {month.year} ({month.categoryCount} categories)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCopyCategories}
                  disabled={!selectedMonth || !selectedYear || loading}
                >
                  {loading ? 'Copying...' : 'Copy Categories'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};