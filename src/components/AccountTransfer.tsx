import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BankAccount } from '@/types/financial';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ArrowRightLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AccountTransferProps {
  user: any;
  accounts: BankAccount[];
  onTransferComplete: () => void;
}

export const AccountTransfer = ({ user, accounts, onTransferComplete }: AccountTransferProps) => {
  const [transfer, setTransfer] = useState({
    from_account_id: '',
    to_account_id: '',
    amount: 0,
    description: ''
  });
  const { toast } = useToast();

  const processTransfer = async () => {
    if (!transfer.from_account_id || !transfer.to_account_id || transfer.amount <= 0) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (transfer.from_account_id === transfer.to_account_id) {
      toast({
        title: "Error",
        description: "Cannot transfer to the same account",
        variant: "destructive",
      });
      return;
    }

    try {
      // Record the transfer
      const { error: transferError } = await supabase
        .from('account_transfers')
        .insert([{
          ...transfer,
          user_id: user.id,
        }]);

      if (transferError) throw transferError;

      // Update account balances
      const fromAccount = accounts.find(a => a.id === transfer.from_account_id);
      const toAccount = accounts.find(a => a.id === transfer.to_account_id);

      if (fromAccount && toAccount) {
        const { error: fromError } = await supabase
          .from('bank_accounts')
          .update({ balance: fromAccount.balance - transfer.amount })
          .eq('id', transfer.from_account_id);

        if (fromError) throw fromError;

        const { error: toError } = await supabase
          .from('bank_accounts')
          .update({ balance: toAccount.balance + transfer.amount })
          .eq('id', transfer.to_account_id);

        if (toError) throw toError;
      }

      toast({
        title: "Success",
        description: "Transfer completed successfully",
      });

      setTransfer({ from_account_id: '', to_account_id: '', amount: 0, description: '' });
      onTransferComplete();
    } catch (error) {
      console.error('Error processing transfer:', error);
      toast({
        title: "Error",
        description: "Failed to process transfer",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5" />
          Account Transfer
        </CardTitle>
        <CardDescription>Transfer money between your accounts</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>From Account</Label>
            <Select value={transfer.from_account_id} onValueChange={(value) => setTransfer({ ...transfer, from_account_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                     {account.name} (₹{account.balance.toFixed(2)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>To Account</Label>
            <Select value={transfer.to_account_id} onValueChange={(value) => setTransfer({ ...transfer, to_account_id: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    {account.name} (₹{account.balance.toFixed(2)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label>Amount</Label>
          <Input
            type="number"
            step="0.01"
            value={transfer.amount}
            onChange={(e) => setTransfer({ ...transfer, amount: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div>
          <Label>Description (Optional)</Label>
          <Input
            value={transfer.description}
            onChange={(e) => setTransfer({ ...transfer, description: e.target.value })}
            placeholder="Transfer reason"
          />
        </div>
        <Button onClick={processTransfer} className="w-full">
          Process Transfer
        </Button>
      </CardContent>
    </Card>
  );
};