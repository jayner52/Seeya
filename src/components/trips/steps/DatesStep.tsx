import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, CalendarDays } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { cn } from '@/lib/utils';

interface DatesStepProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  isFlexible: boolean;
  onFlexibleChange: (value: boolean) => void;
  flexibleMonth: string;
  onFlexibleMonthChange: (value: string) => void;
}

export function DatesStep({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  isFlexible,
  onFlexibleChange,
  flexibleMonth,
  onFlexibleMonthChange,
}: DatesStepProps) {
  const startDateObj = startDate ? parseISO(startDate) : undefined;
  const endDateObj = endDate ? parseISO(endDate) : undefined;

  // Generate next 12 months for flexible picker
  const upcomingMonths = Array.from({ length: 12 }, (_, i) => {
    const date = addMonths(new Date(), i);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy'),
      shortLabel: format(date, 'MMM'),
      year: format(date, 'yyyy'),
    };
  });

  const handleFlexibleMonthSelect = (month: string) => {
    onFlexibleMonthChange(month);
    // Auto-populate start/end dates with first/last day of month
    const monthDate = parseISO(`${month}-01`);
    onStartDateChange(format(startOfMonth(monthDate), 'yyyy-MM-dd'));
    onEndDateChange(format(endOfMonth(monthDate), 'yyyy-MM-dd'));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="font-display text-2xl font-semibold text-foreground">
          When are you going?
        </h2>
        <p className="text-muted-foreground mt-2">
          Select your travel dates
        </p>
      </div>

      {/* Flexible toggle */}
      <div className="flex gap-2 p-1 bg-secondary/50 rounded-lg">
        <Button
          type="button"
          variant={!isFlexible ? 'default' : 'ghost'}
          className={cn("flex-1 gap-2", !isFlexible ? '' : 'hover:bg-secondary')}
          onClick={() => onFlexibleChange(false)}
        >
          <CalendarIcon className="w-4 h-4" />
          Exact dates
        </Button>
        <Button
          type="button"
          variant={isFlexible ? 'default' : 'ghost'}
          className={cn("flex-1 gap-2", isFlexible ? '' : 'hover:bg-secondary')}
          onClick={() => onFlexibleChange(true)}
        >
          <CalendarDays className="w-4 h-4" />
          I'm flexible
        </Button>
      </div>

      {isFlexible ? (
        /* Flexible month picker */
        <div className="space-y-4">
          <Label className="text-center block">Pick a month</Label>
          <div className="grid grid-cols-3 gap-2">
            {upcomingMonths.map((month) => (
              <Button
                key={month.value}
                type="button"
                variant={flexibleMonth === month.value ? 'default' : 'outline'}
                className={cn(
                  "flex flex-col h-auto py-3",
                  flexibleMonth !== month.value && "bg-card hover:bg-secondary"
                )}
                onClick={() => handleFlexibleMonthSelect(month.value)}
              >
                <span className="text-sm font-medium">{month.shortLabel}</span>
                <span className="text-xs text-muted-foreground">{month.year}</span>
              </Button>
            ))}
          </div>
          
          {flexibleMonth && (
            <div className="text-center p-4 bg-secondary/50 rounded-lg">
              <p className="text-foreground">
                <span className="font-medium">
                  {format(parseISO(`${flexibleMonth}-01`), 'MMMM yyyy')}
                </span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Dates are flexible
              </p>
            </div>
          )}
        </div>
      ) : (
        /* Exact date pickers */
        <>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-card",
                      !startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(parseISO(startDate), "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDateObj}
                    onSelect={(date) => date && onStartDateChange(format(date, 'yyyy-MM-dd'))}
                    initialFocus
                    disabled={(date) => date < new Date()}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-card",
                      !endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(parseISO(endDate), "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDateObj}
                    defaultMonth={startDateObj || new Date()}
                    onSelect={(date) => date && onEndDateChange(format(date, 'yyyy-MM-dd'))}
                    initialFocus
                    disabled={(date) => startDate ? date < parseISO(startDate) : date < new Date()}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {startDate && endDate && (
            <div className="text-center p-4 bg-secondary/50 rounded-lg">
              <p className="text-foreground">
                <span className="font-medium">{format(parseISO(startDate), 'MMM d')}</span>
                {' → '}
                <span className="font-medium">{format(parseISO(endDate), 'MMM d, yyyy')}</span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {Math.ceil((parseISO(endDate).getTime() - parseISO(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} days
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
