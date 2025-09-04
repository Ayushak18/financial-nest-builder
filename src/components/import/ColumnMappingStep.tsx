import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ArrowRight, Columns } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ColumnMappingStepProps {
  session: any;
  onColumnMapped: (mapping: Record<string, string>, items: any[]) => void;
  onBack: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const REQUIRED_FIELDS = {
  amount: 'Amount',
  description: 'Description',
  date: 'Date',
  type: 'Transaction Type',
};

const OPTIONAL_FIELDS = {
  category: 'Category',
  account: 'Account',
};

export const ColumnMappingStep: React.FC<ColumnMappingStepProps> = ({
  session,
  onColumnMapped,
  onBack,
  isLoading,
  setIsLoading,
}) => {
  const [importItems, setImportItems] = useState<any[]>([]);
  const [sampleData, setSampleData] = useState<any[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const { toast } = useToast();

  // Load import items
  useEffect(() => {
    const loadImportItems = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('import_items')
          .select('*')
          .eq('session_id', session.id)
          .limit(5); // Get sample for column mapping

        if (error) throw error;
        
        setImportItems(data || []);
        setSampleData(data || []);

        // Extract available columns from raw data
        if (data && data.length > 0) {
          const columns = new Set<string>();
          data.forEach(item => {
            Object.keys(item.raw_data || {}).forEach(key => {
              columns.add(key);
            });
          });
          setAvailableColumns(Array.from(columns));

          // Auto-map common column names
          const autoMapping: Record<string, string> = {};
          Array.from(columns).forEach(col => {
            const lowerCol = col.toLowerCase();
            if (lowerCol.includes('amount') || lowerCol.includes('value') || lowerCol.includes('debit') || lowerCol.includes('credit')) {
              autoMapping.amount = col;
            } else if (lowerCol.includes('description') || lowerCol.includes('narration') || lowerCol.includes('details')) {
              autoMapping.description = col;
            } else if (lowerCol.includes('date') || lowerCol.includes('transaction date') || lowerCol.includes('value date')) {
              autoMapping.date = col;
            } else if (lowerCol.includes('type') || lowerCol.includes('dr/cr')) {
              autoMapping.type = col;
            } else if (lowerCol.includes('category')) {
              autoMapping.category = col;
            } else if (lowerCol.includes('account')) {
              autoMapping.account = col;
            }
          });
          setColumnMapping(autoMapping);
        }
      } catch (error) {
        console.error('Error loading import items:', error);
        toast({
          title: "Error Loading Data",
          description: "Failed to load import data for column mapping.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (session) {
      loadImportItems();
    }
  }, [session, setIsLoading, toast]);

  const handleMappingChange = useCallback((field: string, column: string) => {
    setColumnMapping(prev => ({
      ...prev,
      [field]: column
    }));
  }, []);

  const handleNext = useCallback(async () => {
    // Validate required fields are mapped
    const missingFields = Object.keys(REQUIRED_FIELDS).filter(field => !columnMapping[field]);
    if (missingFields.length > 0) {
      toast({
        title: "Missing Required Fields",
        description: `Please map the following required fields: ${missingFields.map(f => REQUIRED_FIELDS[f as keyof typeof REQUIRED_FIELDS]).join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Apply column mapping to all import items
      const { data: allItems, error } = await supabase
        .from('import_items')
        .select('*')
        .eq('session_id', session.id);

      if (error) throw error;

      const mappedItems = (allItems || []).map(item => {
        const rawData = item.raw_data || {};
        return {
          ...item,
          parsed_data: {
            amount: parseFloat(rawData[columnMapping.amount] || '0'),
            description: rawData[columnMapping.description] || 'Unknown',
            date: rawData[columnMapping.date] || new Date().toISOString().split('T')[0],
            type: determineTransactionType(rawData[columnMapping.type], parseFloat(rawData[columnMapping.amount] || '0')),
            category: rawData[columnMapping.category] || null,
            account: rawData[columnMapping.account] || null,
          }
        };
      });

      // Update session with column mapping
      await supabase
        .from('import_sessions')
        .update({ column_mapping: columnMapping })
        .eq('id', session.id);

      onColumnMapped(columnMapping, mappedItems);
    } catch (error) {
      console.error('Error applying column mapping:', error);
      toast({
        title: "Mapping Failed",
        description: "Failed to apply column mapping. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [columnMapping, session, onColumnMapped, setIsLoading, toast]);

  const determineTransactionType = (typeValue: string, amount: number): 'income' | 'expense' | 'savings' => {
    if (typeValue) {
      const lower = typeValue.toLowerCase();
      if (lower.includes('credit') || lower.includes('income') || lower.includes('deposit')) {
        return 'income';
      }
      if (lower.includes('debit') || lower.includes('expense') || lower.includes('withdrawal')) {
        return 'expense';
      }
    }
    
    // Fallback to amount sign
    return amount < 0 ? 'expense' : 'income';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading import data...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Columns className="h-5 w-5" />
          Map Columns
        </CardTitle>
        <CardDescription>
          Map the columns from your file to the required fields
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {availableColumns.length === 0 ? (
          <Alert>
            <AlertDescription>
              No data found in the uploaded file. Please go back and upload a valid file.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Sample Data Preview */}
            <div>
              <h3 className="font-semibold mb-3">Sample Data from Your File</h3>
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        {availableColumns.map(col => (
                          <th key={col} className="px-3 py-2 text-left font-medium">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sampleData.slice(0, 3).map((item, index) => (
                        <tr key={index} className="border-t">
                          {availableColumns.map(col => (
                            <td key={col} className="px-3 py-2">
                              {item.raw_data?.[col] || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Column Mapping */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-3">Required Fields</h3>
                <div className="space-y-3">
                  {Object.entries(REQUIRED_FIELDS).map(([field, label]) => (
                    <div key={field} className="space-y-1">
                      <Label htmlFor={field}>{label} *</Label>
                      <Select
                        value={columnMapping[field] || ''}
                        onValueChange={(value) => handleMappingChange(field, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={`Select column for ${label}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {availableColumns.map(col => (
                            <SelectItem key={col} value={col}>
                              {col}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Optional Fields</h3>
                <div className="space-y-3">
                  {Object.entries(OPTIONAL_FIELDS).map(([field, label]) => (
                    <div key={field} className="space-y-1">
                      <Label htmlFor={field}>{label}</Label>
                      <Select
                        value={columnMapping[field] || ''}
                        onValueChange={(value) => handleMappingChange(field, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={`Select column for ${label}`} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {availableColumns.map(col => (
                            <SelectItem key={col} value={col}>
                              {col}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <Button 
            onClick={handleNext} 
            disabled={isLoading || availableColumns.length === 0}
          >
            Next: Preview Data
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};