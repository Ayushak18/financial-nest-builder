import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, AlertCircle, ArrowLeft, Home, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useFinancialData } from '@/hooks/useFinancialData';
import { useNavigate } from 'react-router-dom';

interface ImportResultStepProps {
  session: any;
  items: any[];
  onImportComplete: () => void;
  onBack: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

interface ImportProgress {
  processed: number;
  total: number;
  current: string;
  errors: Array<{ item: string; error: string }>;
}

export const ImportResultStep: React.FC<ImportResultStepProps> = ({
  session,
  items,
  onImportComplete,
  onBack,
  isLoading,
  setIsLoading,
}) => {
  const [progress, setProgress] = useState<ImportProgress>({
    processed: 0,
    total: items.length,
    current: '',
    errors: []
  });
  const [isComplete, setIsComplete] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const {
    addTransaction,
    addCategory,
    budget,
    bankAccounts,
    reconcileBudget
  } = useFinancialData();

  const processImport = useCallback(async () => {
    if (hasStarted) return;
    
    setHasStarted(true);
    setIsLoading(true);
    
    const errors: Array<{ item: string; error: string }> = [];
    
    try {
      // Get or create default accounts/categories
      const defaultAccount = bankAccounts.find(acc => acc.account_type === 'checking') || bankAccounts[0];
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const data = item.parsed_data;
        
        setProgress(prev => ({
          ...prev,
          processed: i + 1,
          current: data.description || 'Processing transaction...'
        }));

        try {
          // Find or create category
          let categoryId = '';
          if (data.category) {
            let category = budget.categories.find(c => 
              c.name.toLowerCase() === data.category.toLowerCase()
            );
            
            if (!category) {
              // Create new category
              await addCategory({
                name: data.category,
                type: data.type === 'income' ? 'fixed' : 'variable',
                budgetAmount: 0,
                color: '#3B82F6'
              });
              // Find the newly created category
              category = budget.categories.find(c => 
                c.name.toLowerCase() === data.category.toLowerCase()
              );
              categoryId = category?.id || budget.categories[0]?.id || '';
            } else {
              categoryId = category.id;
            }
          } else {
            // Use first available category or create default
            if (budget.categories.length === 0) {
              await addCategory({
                name: 'Imported',
                type: 'variable',
                budgetAmount: 0,
                color: '#3B82F6'
              });
              // Find the newly created category
              const importedCategory = budget.categories.find(c => c.name === 'Imported');
              categoryId = importedCategory?.id || '';
            } else {
              categoryId = budget.categories[0].id;
            }
          }

          // Add transaction
          await addTransaction({
            type: data.type,
            amount: data.amount,
            categoryId,
            description: data.description,
            date: new Date(data.date),
            accountId: defaultAccount?.id
          });

          // Mark as imported
          await supabase
            .from('import_items')
            .update({ status: 'imported' })
            .eq('id', item.id);

        } catch (error) {
          console.error(`Error processing item ${i}:`, error);
          errors.push({
            item: data.description || `Item ${i + 1}`,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          
          // Mark as failed
          await supabase
            .from('import_items')
            .update({ 
              status: 'rejected',
              validation_errors: [error instanceof Error ? error.message : 'Import failed']
            })
            .eq('id', item.id);
        }

        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Reconcile budget after import
      await reconcileBudget();

      // Update session status
      await supabase
        .from('import_sessions')
        .update({ 
          status: 'imported',
          processed_items: items.length - errors.length
        })
        .eq('id', session.id);

      setProgress(prev => ({ ...prev, errors }));
      setIsComplete(true);

      if (errors.length === 0) {
        toast({
          title: "Import Successful",
          description: `Successfully imported ${items.length} transactions.`,
        });
      } else {
        toast({
          title: "Import Completed with Errors",
          description: `Imported ${items.length - errors.length} of ${items.length} transactions.`,
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('Import process failed:', error);
      toast({
        title: "Import Failed",
        description: "An error occurred during the import process.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    hasStarted, items, addTransaction, addCategory, budget.categories, 
    bankAccounts, reconcileBudget, session.id, setIsLoading, toast
  ]);

  useEffect(() => {
    if (!hasStarted) {
      // Auto-start import after component mounts
      const timer = setTimeout(processImport, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasStarted, processImport]);

  const progressPercentage = progress.total > 0 ? (progress.processed / progress.total) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isComplete ? (
            progress.errors.length === 0 ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-600" />
            )
          ) : (
            <RefreshCw className="h-5 w-5 animate-spin" />
          )}
          Import Progress
        </CardTitle>
        <CardDescription>
          {isComplete 
            ? `Import completed. ${progress.processed - progress.errors.length} of ${progress.total} transactions imported successfully.`
            : `Importing transactions... ${progress.processed} of ${progress.total} processed.`
          }
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="w-full" />
        </div>

        {/* Current Processing */}
        {!isComplete && progress.current && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Currently processing:</p>
            <p className="font-medium">{progress.current}</p>
          </div>
        )}

        {/* Results Summary */}
        {isComplete && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {progress.processed - progress.errors.length}
              </div>
              <div className="text-sm text-muted-foreground">Successful</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {progress.errors.length}
              </div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {progress.total}
              </div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
          </div>
        )}

        {/* Error Details */}
        {progress.errors.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold text-red-600">Import Errors</h3>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {progress.errors.map((error, index) => (
                <div key={index} className="p-2 bg-red-50 rounded text-sm">
                  <span className="font-medium">{error.item}:</span> {error.error}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={onBack}
            disabled={!isComplete}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          {isComplete && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate('/')}
              >
                <Home className="h-4 w-4 mr-2" />
                Go to Dashboard
              </Button>
              <Button onClick={onImportComplete}>
                Import Another File
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};