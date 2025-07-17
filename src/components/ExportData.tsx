import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Download, Calendar } from 'lucide-react';
import { BudgetCategory, Transaction, MonthlyBudget } from '@/types/budget';
import * as XLSX from 'xlsx';

interface ExportDataProps {
  budget: MonthlyBudget;
  categories: BudgetCategory[];
  transactions: Transaction[];
  getSpendingByType: () => { fixed: number; variable: number; savings: number };
}

export const ExportData = ({ budget, categories, transactions, getSpendingByType }: ExportDataProps) => {
  const [exportType, setExportType] = useState<'current' | 'year' | 'custom'>('current');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const generateExcelReport = () => {
    const workbook = XLSX.utils.book_new();
    
    // Filter transactions based on export type
    let filteredTransactions = transactions;
    let reportTitle = `Budget Report - ${budget.month} ${budget.year}`;
    
    if (exportType === 'year') {
      filteredTransactions = transactions.filter(t => 
        new Date(t.date).getFullYear() === budget.year
      );
      reportTitle = `Budget Report - Year ${budget.year}`;
    } else if (exportType === 'custom' && startDate && endDate) {
      filteredTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        return transactionDate >= new Date(startDate) && transactionDate <= new Date(endDate);
      });
      reportTitle = `Budget Report - ${startDate} to ${endDate}`;
    }

    // Summary Sheet
    const spendingByType = getSpendingByType();
    const summaryData = [
      ['Budget Summary', '', '', ''],
      ['Report Period', reportTitle, '', ''],
      ['', '', '', ''],
      ['Budget Type', 'Allocated', 'Spent', 'Remaining'],
      ['Fixed Budget', budget.fixedBudget, spendingByType.fixed, budget.fixedBudget - spendingByType.fixed],
      ['Variable Budget', budget.variableBudget, spendingByType.variable, budget.variableBudget - spendingByType.variable],
      ['Savings Budget', budget.savingsBudget, spendingByType.savings, budget.savingsBudget - spendingByType.savings],
      ['Total Budget', budget.totalBudget, spendingByType.fixed + spendingByType.variable + spendingByType.savings, budget.totalBudget - (spendingByType.fixed + spendingByType.variable + spendingByType.savings)],
      ['', '', '', ''],
      ['Categories Overview', '', '', ''],
      ['Category', 'Type', 'Budget', 'Spent', 'Remaining'],
      ...categories.map(cat => [
        cat.name,
        cat.type,
        cat.budgetAmount,
        cat.spent,
        cat.budgetAmount - cat.spent
      ])
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Transactions Sheet
    const transactionData = [
      ['Transaction ID', 'Date', 'Type', 'Category', 'Description', 'Amount'],
      ...filteredTransactions.map(t => {
        const category = categories.find(c => c.id === t.categoryId);
        return [
          t.id,
          new Date(t.date).toLocaleDateString(),
          t.type,
          category?.name || 'Unknown',
          t.description,
          t.amount
        ];
      })
    ];

    const transactionSheet = XLSX.utils.aoa_to_sheet(transactionData);
    XLSX.utils.book_append_sheet(workbook, transactionSheet, 'Transactions');

    // Categories Detail Sheet
    const categoryData = [
      ['Category Details', '', '', '', '', ''],
      ['Category', 'Type', 'Budget Amount', 'Spent', 'Remaining', 'Percentage Used'],
      ...categories.map(cat => [
        cat.name,
        cat.type,
        cat.budgetAmount,
        cat.spent,
        cat.budgetAmount - cat.spent,
        cat.budgetAmount > 0 ? `${((cat.spent / cat.budgetAmount) * 100).toFixed(2)}%` : '0%'
      ])
    ];

    const categorySheet = XLSX.utils.aoa_to_sheet(categoryData);
    XLSX.utils.book_append_sheet(workbook, categorySheet, 'Categories');

    // Generate filename
    const currentDate = new Date().toISOString().split('T')[0];
    const filename = `budget-report-${exportType === 'current' ? `${budget.month}-${budget.year}` : 
      exportType === 'year' ? budget.year : 
      `${startDate}-to-${endDate}`}-${currentDate}.xlsx`;

    // Save file
    XLSX.writeFile(workbook, filename);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export Budget Data
        </CardTitle>
        <CardDescription>
          Generate Excel reports for your budget and transaction data
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="export-type">Export Period</Label>
          <Select value={exportType} onValueChange={(value: 'current' | 'year' | 'custom') => setExportType(value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select export period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Current Month ({budget.month} {budget.year})</SelectItem>
              <SelectItem value="year">Entire Year ({budget.year})</SelectItem>
              <SelectItem value="custom">Custom Date Range</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {exportType === 'custom' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        )}

        <div className="pt-4">
          <Button 
            onClick={generateExcelReport}
            className="w-full"
            disabled={exportType === 'custom' && (!startDate || !endDate)}
          >
            <Download className="h-4 w-4 mr-2" />
            Generate Excel Report
          </Button>
        </div>

        <div className="text-sm text-muted-foreground">
          <p>The Excel file will include:</p>
          <ul className="list-disc list-inside mt-1 space-y-1">
            <li>Budget summary with spending breakdown</li>
            <li>Detailed transaction history</li>
            <li>Category performance analysis</li>
            <li>Financial insights and statistics</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};