import { useState, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface QuickDateEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  tripName: string;
  onSuccess?: () => void;
  initialStartDate?: string | null;
  initialEndDate?: string | null;
  initialFlexibleMonth?: string | null;
  initialIsFlexible?: boolean;
}

type DatePrecision = 'exact' | 'approximate';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 30 }, (_, i) => currentYear - i);

// Parse flexible_month string to extract month and year
function parseFlexibleMonth(flexibleMonth: string | null | undefined): { month: string; year: string } {
  if (!flexibleMonth) return { month: '', year: '' };
  
  // Try to find a month name
  const foundMonth = MONTHS.find(m => flexibleMonth.includes(m));
  
  // Try to find a year (4 digits)
  const yearMatch = flexibleMonth.match(/\b(19|20)\d{2}\b/);
  const foundYear = yearMatch ? yearMatch[0] : '';
  
  return { month: foundMonth || '', year: foundYear };
}

export function QuickDateEditDialog({
  open,
  onOpenChange,
  tripId,
  tripName,
  onSuccess,
  initialStartDate,
  initialEndDate,
  initialFlexibleMonth,
  initialIsFlexible,
}: QuickDateEditDialogProps) {
  const [precision, setPrecision] = useState<DatePrecision>('exact');
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize state when dialog opens
  useEffect(() => {
    if (open) {
      if (initialIsFlexible) {
        setPrecision('approximate');
        const parsed = parseFlexibleMonth(initialFlexibleMonth);
        setSelectedMonth(parsed.month);
        setSelectedYear(parsed.year);
        setStartDate(undefined);
        setEndDate(undefined);
      } else {
        setPrecision('exact');
        setStartDate(initialStartDate ? parseISO(initialStartDate) : undefined);
        setEndDate(initialEndDate ? parseISO(initialEndDate) : undefined);
        setSelectedMonth('');
        setSelectedYear('');
      }
    }
  }, [open, initialStartDate, initialEndDate, initialFlexibleMonth, initialIsFlexible]);

  const handleSave = async () => {
    if (precision === 'exact') {
      if (!startDate) {
        toast.error('Please select at least a start date');
        return;
      }
      
      const finalStartDate = format(startDate, 'yyyy-MM-dd');
      const finalEndDate = endDate ? format(endDate, 'yyyy-MM-dd') : finalStartDate;

      setIsSubmitting(true);
      try {
        const { error } = await supabase
          .from('trips')
          .update({
            start_date: finalStartDate,
            end_date: finalEndDate,
            is_flexible_dates: false,
            flexible_month: null,
          })
          .eq('id', tripId);

        if (error) throw error;

        toast.success('Trip dates updated!');
        onOpenChange(false);
        onSuccess?.();
      } catch (error) {
        console.error('Error updating trip dates:', error);
        toast.error('Failed to update dates');
      } finally {
        setIsSubmitting(false);
      }
    } else {
      // Approximate mode - build flexible_month string
      let flexibleMonth = '';
      if (selectedMonth && selectedYear) {
        flexibleMonth = `${selectedMonth} ${selectedYear}`;
      } else if (selectedMonth) {
        flexibleMonth = selectedMonth;
      } else if (selectedYear) {
        flexibleMonth = selectedYear;
      }

      if (!flexibleMonth) {
        toast.error('Please select at least a month or year');
        return;
      }

      setIsSubmitting(true);
      try {
        const { error } = await supabase
          .from('trips')
          .update({
            start_date: null,
            end_date: null,
            is_flexible_dates: true,
            flexible_month: flexibleMonth,
          })
          .eq('id', tripId);

        if (error) throw error;

        toast.success('Trip dates updated!');
        onOpenChange(false);
        onSuccess?.();
      } catch (error) {
        console.error('Error updating trip dates:', error);
        toast.error('Failed to update dates');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const canSave = () => {
    if (precision === 'exact') return !!startDate;
    return !!selectedMonth || !!selectedYear;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-md"
        onClick={(e) => e.stopPropagation()}
        onPointerDownOutside={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle>When did you visit?</DialogTitle>
        </DialogHeader>
        
        <p className="text-sm text-muted-foreground">
          Add dates for <span className="font-medium text-foreground">{tripName}</span>
        </p>

        <div className="grid gap-4 py-4">
          {/* Precision selector - 2 options */}
          <div className="space-y-2">
            <label className="text-sm font-medium">How specific are your dates?</label>
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPrecision('exact');
                }}
                className={cn(
                  "flex-1 px-3 py-1.5 text-sm rounded-md transition-all",
                  precision === 'exact'
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Exact Dates
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPrecision('approximate');
                }}
                className={cn(
                  "flex-1 px-3 py-1.5 text-sm rounded-md transition-all",
                  precision === 'approximate'
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Approximate
              </button>
            </div>
          </div>

          {/* Exact dates UI */}
          {precision === 'exact' && (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !startDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                      className="pointer-events-auto"
                      disabled={(date) => date > new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !endDate && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                      className="pointer-events-auto"
                      disabled={(date) => 
                        date > new Date() || (startDate ? date < startDate : false)
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </>
          )}

          {/* Approximate mode - both optional */}
          {precision === 'approximate' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Month <span className="text-muted-foreground font-normal">(optional)</span></label>
                  <Select 
                    value={selectedMonth} 
                    onValueChange={(val) => setSelectedMonth(val === '_clear' ? '' : val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select month" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_clear">Clear</SelectItem>
                      {MONTHS.map((month) => (
                        <SelectItem key={month} value={month}>
                          {month}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Year <span className="text-muted-foreground font-normal">(optional)</span></label>
                  <Select 
                    value={selectedYear} 
                    onValueChange={(val) => setSelectedYear(val === '_clear' ? '' : val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_clear">Clear</SelectItem>
                      {YEARS.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Fill in what you remember! You can select just a month, just a year, or both.
              </p>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting || !canSave()}>
            {isSubmitting ? 'Saving...' : 'Save Dates'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
