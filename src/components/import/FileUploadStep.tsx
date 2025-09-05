import React, { useCallback, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, File, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface FileUploadStepProps {
  onFileUploaded: (session: any) => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}

const ACCEPTED_TYPES = {
  'text/csv': '.csv',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/pdf': '.pdf',
};

export const FileUploadStep: React.FC<FileUploadStepProps> = ({
  onFileUploaded,
  isLoading,
  setIsLoading,
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, []);

  const handleFileSelect = useCallback((file: File) => {
    if (!Object.keys(ACCEPTED_TYPES).includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a CSV, Excel, or PDF file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
  }, [toast]);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Upload file to storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${selectedFile.name}`;
      const filePath = `${user.id}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('imports')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Create import session
      const fileType = selectedFile.type.includes('csv') ? 'csv' 
                    : selectedFile.type.includes('excel') || selectedFile.type.includes('sheet') ? 'excel'
                    : 'pdf';

      const { data: session, error: sessionError } = await supabase
        .from('import_sessions')
        .insert({
          user_id: user.id,
          file_name: selectedFile.name,
          file_path: filePath,
          file_type: fileType,
          status: 'uploaded'
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Parse file using Edge Function
      const { data: parseData, error: parseError } = await supabase.functions
        .invoke('parse-import-file', {
          body: {
            sessionId: session.id,
            filePath: filePath
          }
        });

      if (parseError) throw parseError;

      toast({
        title: "File Uploaded Successfully",
        description: `Found ${parseData.itemCount} transactions to import.`,
      });

      onFileUploaded(session);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : 'An error occurred during upload.',
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedFile, setIsLoading, toast, onFileUploaded]);

  const getFileIcon = (type: string) => {
    if (type.includes('csv')) return FileText;
    if (type.includes('excel') || type.includes('sheet')) return File;
    if (type.includes('pdf')) return FileText;
    return File;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Transaction File
        </CardTitle>
        <CardDescription>
          Upload a CSV, Excel, or PDF file containing your transaction data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Supported formats: CSV (.csv), Excel (.xls, .xlsx), PDF (.pdf). 
            Maximum file size: 10MB. Make sure your file contains transaction data with dates, amounts, and descriptions.
          </AlertDescription>
        </Alert>

        {!selectedFile ? (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">
              Drop your file here, or browse
            </h3>
            <p className="text-muted-foreground mb-4">
              Supports CSV, Excel (XLS/XLSX), and PDF files
            </p>
            <Button 
              variant="outline" 
              className="cursor-pointer"
              onClick={() => document.getElementById('file-upload')?.click()}
            >
              Choose File
            </Button>
            <Input
              id="file-upload"
              type="file"
              accept=".csv,.xls,.xlsx,.pdf"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              {React.createElement(getFileIcon(selectedFile.type), { 
                className: "h-8 w-8 text-primary" 
              })}
              <div className="flex-1">
                <p className="font-medium">{selectedFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedFile(null)}
              >
                Remove
              </Button>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleUpload}
                disabled={isLoading}
                className="flex-1"
              >
                {isLoading ? 'Uploading...' : 'Upload & Parse File'}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};