import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { FileUploadStep } from '@/components/import/FileUploadStep';
import { ColumnMappingStep } from '@/components/import/ColumnMappingStep';
import { PreviewStep } from '@/components/import/PreviewStep';
import { ImportResultStep } from '@/components/import/ImportResultStep';
import { useToast } from '@/hooks/use-toast';

interface ImportSession {
  id: string;
  file_name: string;
  file_type: string;
  status: string;
  total_items: number;
  column_mapping?: Record<string, string>;
}

interface ImportItem {
  id: string;
  raw_data: any;
  parsed_data: any;
  transaction_type: 'income' | 'expense' | 'savings';
  amount: number;
  description: string;
  date: string;
  category_name?: string;
  account_name?: string;
  status: 'pending' | 'approved' | 'rejected';
  validation_errors?: string[];
}

const STEPS = [
  { id: 1, name: 'Upload', icon: Upload },
  { id: 2, name: 'Map Columns', icon: FileText },
  { id: 3, name: 'Preview & Edit', icon: CheckCircle },
  { id: 4, name: 'Import', icon: AlertCircle },
];

export const ImportWizard: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [session, setSession] = useState<ImportSession | null>(null);
  const [importItems, setImportItems] = useState<ImportItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleFileUploaded = useCallback((newSession: ImportSession) => {
    setSession(newSession);
    setCurrentStep(2);
  }, []);

  const handleColumnMapped = useCallback((columnMapping: Record<string, string>, items: ImportItem[]) => {
    if (session) {
      setSession({ ...session, column_mapping: columnMapping });
      setImportItems(items);
      setCurrentStep(3);
    }
  }, [session]);

  const handlePreviewApproved = useCallback((approvedItems: ImportItem[]) => {
    setImportItems(approvedItems);
    setCurrentStep(4);
  }, []);

  const handleImportComplete = useCallback(() => {
    toast({
      title: "Import Complete",
      description: "All transactions have been successfully imported.",
    });
    // Reset wizard or redirect to main app
    setCurrentStep(1);
    setSession(null);
    setImportItems([]);
  }, [toast]);

  const handleReset = useCallback(() => {
    setCurrentStep(1);
    setSession(null);
    setImportItems([]);
  }, []);

  const progress = ((currentStep - 1) / (STEPS.length - 1)) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Import Wizard
            {session && (
              <span className="text-sm font-normal text-muted-foreground">
                • {session.file_name}
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Step {currentStep} of {STEPS.length}: {STEPS[currentStep - 1].name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Progress value={progress} className="w-full" />
            <div className="flex justify-between items-center">
              {STEPS.map((step, index) => {
                const Icon = step.icon;
                const isActive = currentStep === step.id;
                const isCompleted = currentStep > step.id;
                
                return (
                  <div
                    key={step.id}
                    className={`flex items-center gap-2 ${
                      isActive
                        ? 'text-primary'
                        : isCompleted
                        ? 'text-green-600'
                        : 'text-muted-foreground'
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="text-sm font-medium">{step.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      <div className="space-y-6">
        {currentStep === 1 && (
          <FileUploadStep
            onFileUploaded={handleFileUploaded}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        )}

        {currentStep === 2 && session && (
          <ColumnMappingStep
            session={session}
            onColumnMapped={handleColumnMapped}
            onBack={() => setCurrentStep(1)}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        )}

        {currentStep === 3 && session && importItems.length > 0 && (
          <PreviewStep
            session={session}
            items={importItems}
            onPreviewApproved={handlePreviewApproved}
            onBack={() => setCurrentStep(2)}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        )}

        {currentStep === 4 && session && importItems.length > 0 && (
          <ImportResultStep
            session={session}
            items={importItems}
            onImportComplete={handleImportComplete}
            onBack={() => setCurrentStep(3)}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
          />
        )}
      </div>

      {/* Reset Button */}
      {currentStep > 1 && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={handleReset}>
            Start Over
          </Button>
        </div>
      )}
    </div>
  );
};