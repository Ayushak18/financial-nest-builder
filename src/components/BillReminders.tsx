import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Calendar, Plus, Trash2, Clock, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Bill, BankAccount } from '@/types/financial';

export function BillReminders() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const [newBill, setNewBill] = useState({
    account_id: '',
    name: '',
    amount: '',
    due_date: 1,
    category: '',
    is_recurring: true,
    reminder_days: 3,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [billsRes, accountsRes] = await Promise.all([
        supabase.from('bills').select('*').eq('user_id', user.id).eq('is_active', true),
        supabase.from('bank_accounts').select('*').eq('user_id', user.id).eq('is_active', true)
      ]);

      if (billsRes.data) setBills(billsRes.data as Bill[]);
      if (accountsRes.data) setBankAccounts(accountsRes.data as BankAccount[]);
    } catch (error) {
      toast({ title: "Error loading data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const addBill = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('bills').insert({
        user_id: user.id,
        account_id: newBill.account_id,
        name: newBill.name,
        amount: parseFloat(newBill.amount),
        due_date: newBill.due_date,
        category: newBill.category,
        is_recurring: newBill.is_recurring,
        reminder_days: newBill.reminder_days,
        is_paid: false,
        is_active: true
      });

      if (error) throw error;

      toast({ title: "Bill added successfully" });
      setIsDialogOpen(false);
      setNewBill({
        account_id: '',
        name: '',
        amount: '',
        due_date: 1,
        category: '',
        is_recurring: true,
        reminder_days: 3,
      });
      loadData();
    } catch (error) {
      toast({ title: "Error adding bill", variant: "destructive" });
    }
  };

  const markAsPaid = async (billId: string) => {
    try {
      const { error } = await supabase
        .from('bills')
        .update({ 
          is_paid: true,
          last_paid_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', billId);

      if (error) throw error;
      toast({ title: "Bill marked as paid" });
      loadData();
    } catch (error) {
      toast({ title: "Error updating bill", variant: "destructive" });
    }
  };

  const deleteBill = async (billId: string) => {
    try {
      const { error } = await supabase.from('bills').update({ is_active: false }).eq('id', billId);
      if (error) throw error;
      toast({ title: "Bill deleted" });
      loadData();
    } catch (error) {
      toast({ title: "Error deleting bill", variant: "destructive" });
    }
  };

  const getDaysUntilDue = (dueDate: number): number => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    const billDueDate = new Date(currentYear, currentMonth, dueDate);
    
    if (billDueDate < today) {
      // If the due date has passed this month, check next month
      billDueDate.setMonth(currentMonth + 1);
    }
    
    const diffTime = billDueDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getBillStatus = (bill: Bill) => {
    if (bill.is_paid) return 'paid';
    const daysUntilDue = getDaysUntilDue(bill.due_date);
    if (daysUntilDue <= 0) return 'overdue';
    if (daysUntilDue <= bill.reminder_days) return 'due-soon';
    return 'upcoming';
  };

  if (loading) return <div>Loading...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Bill Reminders
        </CardTitle>
        <CardDescription>
          Track and manage your recurring bills and payments
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <div className="text-sm text-muted-foreground">
            {bills.filter(b => !b.is_paid).length} pending bills
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Bill
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Bill</DialogTitle>
                <DialogDescription>
                  Set up a bill reminder to track your payments
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Bill Name</Label>
                  <Input
                    value={newBill.name}
                    onChange={(e) => setNewBill({ ...newBill, name: e.target.value })}
                    placeholder="e.g., Electricity Bill"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={newBill.amount}
                      onChange={(e) => setNewBill({ ...newBill, amount: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="due_date">Due Date (Day of Month)</Label>
                    <Select value={newBill.due_date.toString()} onValueChange={(value) => 
                      setNewBill({ ...newBill, due_date: parseInt(value) })
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                          <SelectItem key={day} value={day.toString()}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Input
                      value={newBill.category}
                      onChange={(e) => setNewBill({ ...newBill, category: e.target.value })}
                      placeholder="e.g., Utilities"
                    />
                  </div>
                  <div>
                    <Label htmlFor="account">Account</Label>
                    <Select value={newBill.account_id} onValueChange={(value) => 
                      setNewBill({ ...newBill, account_id: value })
                    }>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                      <SelectContent>
                        {bankAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            {account.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="reminder_days">Reminder Days</Label>
                    <Select value={newBill.reminder_days.toString()} onValueChange={(value) => 
                      setNewBill({ ...newBill, reminder_days: parseInt(value) })
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 day</SelectItem>
                        <SelectItem value="3">3 days</SelectItem>
                        <SelectItem value="7">7 days</SelectItem>
                        <SelectItem value="14">14 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2 pt-6">
                    <Switch
                      id="is_recurring"
                      checked={newBill.is_recurring}
                      onCheckedChange={(checked) => setNewBill({ ...newBill, is_recurring: checked })}
                    />
                    <Label htmlFor="is_recurring">Recurring</Label>
                  </div>
                </div>

                <Button onClick={addBill} className="w-full">
                  Add Bill
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-3">
          {bills.map((bill) => {
            const status = getBillStatus(bill);
            const daysUntilDue = getDaysUntilDue(bill.due_date);

            return (
              <div key={bill.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{bill.name}</span>
                    <Badge 
                      variant={
                        status === 'paid' ? 'default' : 
                        status === 'overdue' ? 'destructive' : 
                        status === 'due-soon' ? 'secondary' : 'outline'
                      }
                    >
                      {status === 'paid' ? 'Paid' :
                       status === 'overdue' ? 'Overdue' :
                       status === 'due-soon' ? 'Due Soon' : 'Upcoming'}
                    </Badge>
                    {bill.is_recurring && (
                      <Badge variant="outline">Recurring</Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    ${bill.amount} • Due on {bill.due_date}th • {bill.category}
                    {!bill.is_paid && (
                      <span className="ml-2">
                        {daysUntilDue > 0 ? `${daysUntilDue} days remaining` : 'Overdue'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!bill.is_paid && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => markAsPaid(bill.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Mark Paid
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteBill(bill.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
          {bills.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No bills added yet. Add your first bill to get started.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}