import { Button } from './ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface CompactMonthSelectorProps {
  selectedMonth: string;
  selectedYear: number;
  onMonthChange: (month: string, year: number) => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const YEARS = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i);

export const CompactMonthSelector = ({ selectedMonth, selectedYear, onMonthChange }: CompactMonthSelectorProps) => {
  const goToPrevMonth = () => {
    const currentIndex = MONTHS.indexOf(selectedMonth);
    if (currentIndex === 0) {
      onMonthChange(MONTHS[11], selectedYear - 1);
    } else {
      onMonthChange(MONTHS[currentIndex - 1], selectedYear);
    }
  };

  const goToNextMonth = () => {
    const currentIndex = MONTHS.indexOf(selectedMonth);
    if (currentIndex === 11) {
      onMonthChange(MONTHS[0], selectedYear + 1);
    } else {
      onMonthChange(MONTHS[currentIndex + 1], selectedYear);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="sm"
        onClick={goToPrevMonth}
        className="h-8 w-8 p-0"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      
      <div className="flex items-center gap-1">
        <Select
          value={selectedMonth}
          onValueChange={(month) => onMonthChange(month, selectedYear)}
        >
          <SelectTrigger className="h-8 w-32 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((month) => (
              <SelectItem key={month} value={month}>
                {month}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select
          value={selectedYear.toString()}
          onValueChange={(year) => onMonthChange(selectedMonth, parseInt(year))}
        >
          <SelectTrigger className="h-8 w-20 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <Button
        variant="ghost"
        size="sm"
        onClick={goToNextMonth}
        className="h-8 w-8 p-0"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
};