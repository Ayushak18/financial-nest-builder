-- Create import sessions table
CREATE TABLE public.import_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL CHECK (file_type IN ('excel', 'csv', 'pdf')),
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'parsed', 'reviewed', 'imported', 'failed')),
  column_mapping JSONB,
  total_items INTEGER DEFAULT 0,
  processed_items INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create import items table  
CREATE TABLE public.import_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.import_sessions(id) ON DELETE CASCADE,
  raw_data JSONB NOT NULL,
  parsed_data JSONB,
  transaction_type TEXT CHECK (transaction_type IN ('income', 'expense', 'savings')),
  amount NUMERIC,
  description TEXT,
  date DATE,
  category_name TEXT,
  account_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'imported')),
  validation_errors TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.import_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for import_sessions
CREATE POLICY "Users can view their own import sessions" 
ON public.import_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own import sessions" 
ON public.import_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own import sessions" 
ON public.import_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own import sessions" 
ON public.import_sessions 
FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for import_items
CREATE POLICY "Users can view their own import items" 
ON public.import_items 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.import_sessions 
  WHERE import_sessions.id = import_items.session_id 
  AND import_sessions.user_id = auth.uid()
));

CREATE POLICY "Users can create import items for their sessions" 
ON public.import_items 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.import_sessions 
  WHERE import_sessions.id = import_items.session_id 
  AND import_sessions.user_id = auth.uid()
));

CREATE POLICY "Users can update import items for their sessions" 
ON public.import_items 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.import_sessions 
  WHERE import_sessions.id = import_items.session_id 
  AND import_sessions.user_id = auth.uid()
));

CREATE POLICY "Users can delete import items for their sessions" 
ON public.import_items 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.import_sessions 
  WHERE import_sessions.id = import_items.session_id 
  AND import_sessions.user_id = auth.uid()
));

-- Create storage bucket for imports
INSERT INTO storage.buckets (id, name, public) VALUES ('imports', 'imports', false);

-- Storage policies for imports bucket
CREATE POLICY "Users can upload their own import files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'imports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own import files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'imports' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own import files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'imports' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Update trigger for import sessions
CREATE TRIGGER update_import_sessions_updated_at
BEFORE UPDATE ON public.import_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();