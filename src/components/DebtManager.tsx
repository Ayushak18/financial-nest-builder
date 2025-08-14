import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Debt } from '@/types/financial';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, Trash2, CreditCard, AlertCircle, Calculator } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from './ui/progress';

interface DebtManagerProps {
  user: any;
}

export const DebtManager = ({ user }: DebtManagerProps) => {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [isAddingDebt, setIsAddingDebt] = useState(false);
  const [newDebt, setNewDebt] = useState({
    name: '',
    debt_type: 'credit_card' as const,
    balance: 0,
    interest_rate: 0,
    minimum_payment: 0,
    due_date: 1
  });
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchDebts();
    }
  }, [user]);

  const fetchDebts = async () => {
    try {
      const { data, error } = await supabase
        .from('debts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('balance', { ascending: false });

      if (error) throw error;
      setDebts((data || []) as Debt[]);
    } catch (error) {
      console.error('Error fetching debts:', error);
      toast({
        title: "Error",
        description: "Failed to fetch debts",
        variant: "destructive",
      });
    }
  };

  const addDebt = async () => {
    try {
      const { error } = await supabase
        .from('debts')
        .insert([
          {
            ...newDebt,
            user_id: user.id,
          }
        ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Debt added successfully",
      });
      
      setIsAddingDebt(false);
      setNewDebt({
        name: '',
        debt_type: 'credit_card',
        balance: 0,
        interest_rate: 0,
        minimum_payment: 0,
        due_date: 1
      });
      fetchDebts();
    } catch (error) {
      console.error('Error adding debt:', error);
      toast({
        title: "Error",
        description: "Failed to add debt",
        variant: "destructive",
      });
    }
  };

  const deleteDebt = async (debtId: string) => {
    try {
      const { error } = await supabase
        .from('debts')
        .update({ is_active: false })
        .eq('id', debtId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Debt deleted successfully",
      });
      
      fetchDebts();
    } catch (error) {
      console.error('Error deleting debt:', error);
      toast({
        title: "Error",
        description: "Failed to delete debt",
        variant: "destructive",
      });
    }
  };

  const calculatePayoffTime = (debt: Debt) => {
    if (debt.minimum_payment <= 0 || debt.interest_rate < 0) return null;
    
    const monthlyRate = debt.interest_rate / 100 / 12;
    const payment = debt.minimum_payment;
    const balance = debt.balance;
    
    if (payment <= balance * monthlyRate) {
      return null; // Payment too low to pay off debt
    }
    
    const months = Math.ceil(
      -Math.log(1 - (balance * monthlyRate) / payment) / Math.log(1 + monthlyRate)
    );
    
    return months;
  };

  const totalDebt = debts.reduce((sum, debt) => sum + debt.balance, 0);
  const totalMinimumPayments = debts.reduce((sum, debt) => sum + debt.minimum_payment, 0);
  const averageInterestRate = debts.length > 0 
    ? debts.reduce((sum, debt) => sum + debt.interest_rate, 0) / debts.length 
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Debt Management
        </CardTitle>
        <CardDescription>
          Track and manage your debts and payment schedules
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-2xl font-bold text-red-700">₹{totalDebt.toFixed(2)}</div>
            <div className="text-sm text-red-600">Total Debt</div>
          </div>
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <div className="text-2xl font-bold text-orange-700">₹{totalMinimumPayments.toFixed(2)}</div>
            <div className="text-sm text-orange-600">Min. Payments/Month</div>
          </div>
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="text-2xl font-bold text-yellow-700">{averageInterestRate.toFixed(1)}%</div>
            <div className="text-sm text-yellow-600">Avg. Interest Rate</div>
          </div>
        </div>

        {/* Add Debt Form */}
        {isAddingDebt && (
          <div className="p-4 border rounded-lg space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="debt-name">Debt Name</Label>
                <Input
                  id="debt-name"
                  value={newDebt.name}
                  onChange={(e) => setNewDebt({ ...newDebt, name: e.target.value })}
                  placeholder="Credit Card - Chase"
                />
              </div>
              <div>
                <Label htmlFor="debt-type">Debt Type</Label>
                <Select value={newDebt.debt_type} onValueChange={(value) => setNewDebt({ ...newDebt, debt_type: value as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="credit_card">Credit Card</SelectItem>
                    <SelectItem value="personal_loan">Personal Loan</SelectItem>
                    <SelectItem value="mortgage">Mortgage</SelectItem>
                    <SelectItem value="student_loan">Student Loan</SelectItem>
                    <SelectItem value="auto_loan">Auto Loan</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="balance">Current Balance</Label>
                <Input
                  id="balance"
                  type="number"
                  step="0.01"
                  value={newDebt.balance}
                  onChange={(e) => setNewDebt({ ...newDebt, balance: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="interest-rate">Interest Rate (%)</Label>
                <Input
                  id="interest-rate"
                  type="number"
                  step="0.01"
                  value={newDebt.interest_rate}
                  onChange={(e) => setNewDebt({ ...newDebt, interest_rate: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="minimum-payment">Minimum Payment</Label>
                <Input
                  id="minimum-payment"
                  type="number"
                  step="0.01"
                  value={newDebt.minimum_payment}
                  onChange={(e) => setNewDebt({ ...newDebt, minimum_payment: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="due-date">Due Date (Day of Month)</Label>
                <Select value={newDebt.due_date.toString()} onValueChange={(value) => setNewDebt({ ...newDebt, due_date: parseInt(value) })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                      <SelectItem key={day} value={day.toString()}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={addDebt}>Add Debt</Button>
              <Button variant="outline" onClick={() => setIsAddingDebt(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Add Debt Button */}
        {!isAddingDebt && (
          <Button onClick={() => setIsAddingDebt(true)} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Debt
          </Button>
        )}

        {/* Debts List */}
        <div className="space-y-4">
          {debts.map((debt) => {
            const payoffMonths = calculatePayoffTime(debt);
            const payoffYears = payoffMonths ? Math.floor(payoffMonths / 12) : null;
            const remainingMonths = payoffMonths ? payoffMonths % 12 : null;
            
            return (
              <div key={debt.id} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{debt.name}</div>
                    <div className="text-sm text-muted-foreground capitalize">
                      {debt.debt_type.replace('_', ' ')} • Due: {debt.due_date}th of month
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-medium text-red-600">₹{debt.balance.toFixed(2)}</div>
                      <div className="text-sm text-muted-foreground">
                        {debt.interest_rate}% APR
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteDebt(debt.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Minimum Payment</div>
                    <div className="font-medium">₹{debt.minimum_payment.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Payoff Time</div>
                    <div className="font-medium">
                      {payoffMonths ? (
                        payoffYears && payoffYears > 0 ? 
                          `${payoffYears}y ${remainingMonths}m` : 
                          `${payoffMonths}m`
                      ) : (
                        <span className="text-red-500 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          Payment too low
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress bar showing how much of total debt this represents */}
                <div>
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Share of total debt</span>
                    <span>{((debt.balance / totalDebt) * 100).toFixed(1)}%</span>
                  </div>
                  <Progress value={(debt.balance / totalDebt) * 100} className="h-2" />
                </div>
              </div>
            );
          })}
        </div>

        {debts.length === 0 && !isAddingDebt && (
          <div className="text-center py-8 text-muted-foreground">
            No debts tracked yet. Add your debts to create a payoff plan.
          </div>
        )}

        {/* Debt Payoff Strategy Tips */}
        {debts.length > 1 && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Calculator className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-800">Payoff Strategy Tips</span>
            </div>
            <div className="text-sm text-blue-700 space-y-1">
              <div>• <strong>Avalanche Method:</strong> Pay minimums on all debts, then focus extra payments on highest interest rate debt</div>
              <div>• <strong>Snowball Method:</strong> Pay minimums on all debts, then focus extra payments on smallest balance debt</div>
              <div>• Consider debt consolidation if you qualify for a lower interest rate</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};