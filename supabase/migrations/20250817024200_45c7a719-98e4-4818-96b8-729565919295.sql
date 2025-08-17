-- Add receiving_account_id column to transactions table for savings transfers
ALTER TABLE public.transactions 
ADD COLUMN receiving_account_id UUID REFERENCES public.bank_accounts(id) ON DELETE SET NULL;