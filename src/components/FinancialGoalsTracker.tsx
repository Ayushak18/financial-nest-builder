import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FinancialGoal } from '@/types/financial';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Plus, Trash2, Target, Trophy, Calendar, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';

interface FinancialGoalsTrackerProps {
  user: any;
}

export const FinancialGoalsTracker = ({ user }: FinancialGoalsTrackerProps) => {
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [editingGoal, setEditingGoal] = useState<string | null>(null);
  const [newGoal, setNewGoal] = useState({
    name: '',
    goal_type: 'savings' as const,
    target_amount: 0,
    current_amount: 0,
    target_date: '',
    priority: 1
  });
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchGoals();
    }
  }, [user]);

  const fetchGoals = async () => {
    try {
      const { data, error } = await supabase
        .from('financial_goals')
        .select('*')
        .eq('user_id', user.id)
        .order('priority', { ascending: true });

      if (error) throw error;
      setGoals((data || []) as FinancialGoal[]);
    } catch (error) {
      console.error('Error fetching goals:', error);
      toast({
        title: "Error",
        description: "Failed to fetch financial goals",
        variant: "destructive",
      });
    }
  };

  const addGoal = async () => {
    try {
      const { error } = await supabase
        .from('financial_goals')
        .insert([
          {
            ...newGoal,
            user_id: user.id,
            target_date: newGoal.target_date || null,
          }
        ]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Financial goal added successfully",
      });
      
      setIsAddingGoal(false);
      setNewGoal({
        name: '',
        goal_type: 'savings',
        target_amount: 0,
        current_amount: 0,
        target_date: '',
        priority: 1
      });
      fetchGoals();
    } catch (error) {
      console.error('Error adding goal:', error);
      toast({
        title: "Error",
        description: "Failed to add financial goal",
        variant: "destructive",
      });
    }
  };

  const updateGoalProgress = async (goalId: string, newAmount: number) => {
    try {
      const goal = goals.find(g => g.id === goalId);
      if (!goal) return;

      const isAchieved = newAmount >= goal.target_amount;

      const { error } = await supabase
        .from('financial_goals')
        .update({ 
          current_amount: newAmount,
          is_achieved: isAchieved
        })
        .eq('id', goalId);

      if (error) throw error;

      if (isAchieved && !goal.is_achieved) {
        toast({
          title: "🎉 Goal Achieved!",
          description: `Congratulations! You've reached your goal: ${goal.name}`,
        });
      }

      fetchGoals();
    } catch (error) {
      console.error('Error updating goal:', error);
      toast({
        title: "Error",
        description: "Failed to update goal progress",
        variant: "destructive",
      });
    }
  };

  const deleteGoal = async (goalId: string) => {
    try {
      const { error } = await supabase
        .from('financial_goals')
        .delete()
        .eq('id', goalId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Financial goal deleted successfully",
      });
      
      fetchGoals();
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast({
        title: "Error",
        description: "Failed to delete financial goal",
        variant: "destructive",
      });
    }
  };

  const calculateDaysToTarget = (targetDate: string) => {
    if (!targetDate) return null;
    const target = new Date(targetDate);
    const today = new Date();
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getGoalTypeIcon = (type: string) => {
    switch (type) {
      case 'savings':
        return DollarSign;
      case 'debt_payoff':
        return Target;
      case 'investment':
        return Target;
      case 'emergency_fund':
        return Target;
      default:
        return Target;
    }
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1:
        return 'bg-red-100 text-red-800 border-red-200';
      case 2:
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 3:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 4:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 5:
        return 'bg-gray-100 text-gray-800 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const activeGoals = goals.filter(goal => !goal.is_achieved);
  const achievedGoals = goals.filter(goal => goal.is_achieved);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Financial Goals
        </CardTitle>
        <CardDescription>
          Set and track your financial objectives
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-2xl font-bold text-blue-700">{activeGoals.length}</div>
            <div className="text-sm text-blue-600">Active Goals</div>
          </div>
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-2xl font-bold text-green-700">{achievedGoals.length}</div>
            <div className="text-sm text-green-600">Achieved Goals</div>
          </div>
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="text-2xl font-bold text-purple-700">
              ${activeGoals.reduce((sum, goal) => sum + goal.target_amount, 0).toFixed(0)}
            </div>
            <div className="text-sm text-purple-600">Total Target</div>
          </div>
        </div>

        {/* Add Goal Form */}
        {isAddingGoal && (
          <div className="p-4 border rounded-lg space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="goal-name">Goal Name</Label>
                <Input
                  id="goal-name"
                  value={newGoal.name}
                  onChange={(e) => setNewGoal({ ...newGoal, name: e.target.value })}
                  placeholder="Emergency Fund"
                />
              </div>
              <div>
                <Label htmlFor="goal-type">Goal Type</Label>
                <Select value={newGoal.goal_type} onValueChange={(value) => setNewGoal({ ...newGoal, goal_type: value as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="savings">Savings</SelectItem>
                    <SelectItem value="debt_payoff">Debt Payoff</SelectItem>
                    <SelectItem value="investment">Investment</SelectItem>
                    <SelectItem value="emergency_fund">Emergency Fund</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="target-amount">Target Amount</Label>
                <Input
                  id="target-amount"
                  type="number"
                  step="0.01"
                  value={newGoal.target_amount}
                  onChange={(e) => setNewGoal({ ...newGoal, target_amount: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="current-amount">Current Amount</Label>
                <Input
                  id="current-amount"
                  type="number"
                  step="0.01"
                  value={newGoal.current_amount}
                  onChange={(e) => setNewGoal({ ...newGoal, current_amount: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="target-date">Target Date (Optional)</Label>
                <Input
                  id="target-date"
                  type="date"
                  value={newGoal.target_date}
                  onChange={(e) => setNewGoal({ ...newGoal, target_date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <Select value={newGoal.priority.toString()} onValueChange={(value) => setNewGoal({ ...newGoal, priority: parseInt(value) })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Highest</SelectItem>
                    <SelectItem value="2">2 - High</SelectItem>
                    <SelectItem value="3">3 - Medium</SelectItem>
                    <SelectItem value="4">4 - Low</SelectItem>
                    <SelectItem value="5">5 - Lowest</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={addGoal}>Add Goal</Button>
              <Button variant="outline" onClick={() => setIsAddingGoal(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {/* Add Goal Button */}
        {!isAddingGoal && (
          <Button onClick={() => setIsAddingGoal(true)} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Financial Goal
          </Button>
        )}

        {/* Active Goals */}
        {activeGoals.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Active Goals</h3>
            <div className="space-y-4">
              {activeGoals.map((goal) => {
                const progress = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount) * 100 : 0;
                const daysToTarget = calculateDaysToTarget(goal.target_date || '');
                const IconComponent = getGoalTypeIcon(goal.goal_type);
                
                return (
                  <div key={goal.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <IconComponent className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{goal.name}</div>
                          <div className="text-sm text-muted-foreground capitalize">
                            {goal.goal_type.replace('_', ' ')}
                          </div>
                        </div>
                        <Badge className={getPriorityColor(goal.priority)}>
                          Priority {goal.priority}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        {goal.target_date && (
                          <div className="text-right text-sm">
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {daysToTarget !== null && daysToTarget >= 0 ? `${daysToTarget} days` : 'Overdue'}
                            </div>
                          </div>
                        )}
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteGoal(goal.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Progress</span>
                        <span className="text-sm font-medium">
                          ${goal.current_amount.toFixed(2)} / ${goal.target_amount.toFixed(2)}
                        </span>
                      </div>
                      <Progress value={Math.min(progress, 100)} className="h-3" />
                      <div className="text-xs text-muted-foreground">
                        {progress.toFixed(1)}% complete • ${(goal.target_amount - goal.current_amount).toFixed(2)} remaining
                      </div>
                    </div>

                    {editingGoal === goal.id ? (
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Update current amount"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const newAmount = parseFloat((e.target as HTMLInputElement).value);
                              if (!isNaN(newAmount)) {
                                updateGoalProgress(goal.id, newAmount);
                                setEditingGoal(null);
                              }
                            }
                          }}
                        />
                        <Button size="sm" onClick={() => setEditingGoal(null)}>Cancel</Button>
                      </div>
                    ) : (
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setEditingGoal(goal.id)}
                      >
                        Update Progress
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Achieved Goals */}
        {achievedGoals.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Achieved Goals
            </h3>
            <div className="space-y-3">
              {achievedGoals.map((goal) => (
                <div key={goal.id} className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Trophy className="h-4 w-4 text-green-600" />
                      <div>
                        <div className="font-medium text-green-800">{goal.name}</div>
                        <div className="text-sm text-green-600">
                          ${goal.current_amount.toFixed(2)} / ${goal.target_amount.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteGoal(goal.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {goals.length === 0 && !isAddingGoal && (
          <div className="text-center py-8 text-muted-foreground">
            No financial goals set yet. Add your first goal to start tracking your progress.
          </div>
        )}
      </CardContent>
    </Card>
  );
};