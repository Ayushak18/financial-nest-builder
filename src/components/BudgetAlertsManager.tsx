import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertTriangle, TrendingUp, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BudgetAlert {
  id: string;
  categoryName: string;
  budgetAmount: number;
  spent: number;
  percentage: number;
  severity: 'warning' | 'danger';
}

export function BudgetAlertsManager() {
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (alertsEnabled) {
      loadBudgetAlerts();
    }
  }, [alertsEnabled]);

  const loadBudgetAlerts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: categories, error } = await supabase
        .from('budget_categories')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      if (categories) {
        const budgetAlerts: BudgetAlert[] = categories
          .filter(category => {
            const percentage = (category.spent / category.budget_amount) * 100;
            return percentage >= 80; // Alert when 80% or more of budget is spent
          })
          .map(category => {
            const percentage = (category.spent / category.budget_amount) * 100;
            return {
              id: category.id,
              categoryName: category.name,
              budgetAmount: category.budget_amount,
              spent: category.spent,
              percentage,
              severity: percentage >= 100 ? 'danger' : 'warning'
            };
          });

        setAlerts(budgetAlerts);
      }
    } catch (error) {
      toast({ title: "Error loading budget alerts", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(alerts.filter(alert => alert.id !== alertId));
  };

  if (loading) return <div>Loading...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Budget Alerts
        </CardTitle>
        <CardDescription>
          Get notified when you're approaching or exceeding your budget limits
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="alerts-enabled"
              checked={alertsEnabled}
              onCheckedChange={setAlertsEnabled}
            />
            <Label htmlFor="alerts-enabled">Enable Budget Alerts</Label>
          </div>
          <Badge variant="outline">
            {alerts.length} active alert{alerts.length !== 1 ? 's' : ''}
          </Badge>
        </div>

        {alertsEnabled && (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <Alert key={alert.id} variant={alert.severity === 'danger' ? 'destructive' : 'default'}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="font-medium">{alert.categoryName}</span>
                      <Badge variant={alert.severity === 'danger' ? 'destructive' : 'secondary'}>
                        {alert.percentage.toFixed(1)}% spent
                      </Badge>
                    </div>
                    <AlertDescription>
                      You've spent ${alert.spent.toFixed(2)} of your ${alert.budgetAmount.toFixed(2)} budget.
                      {alert.severity === 'danger' 
                        ? ' You have exceeded your budget limit!'
                        : ' You\'re approaching your budget limit.'
                      }
                    </AlertDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => dismissAlert(alert.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </Alert>
            ))}
            {alerts.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Great job! You're staying within your budget limits.</p>
              </div>
            )}
          </div>
        )}

        {!alertsEnabled && (
          <div className="text-center py-8 text-muted-foreground">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Budget alerts are disabled. Enable them to get notifications.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}