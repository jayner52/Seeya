import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, parseISO, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TripData } from '@/hooks/useTrips';
import { Database } from '@/integrations/supabase/types';

type VisibilityLevel = Database['public']['Enums']['visibility_level'];

interface EditTripDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: TripData;
  onSave: (data: {
    name: string;
    description: string | null;
    visibility: VisibilityLevel;
    start_date: string;
    end_date: string;
    is_flexible_dates: boolean;
    flexible_month: string | null;
  }) => Promise<{ error: any }>;
}

const visibilityOptions: { value: VisibilityLevel; label: string; description: string }[] = [
  { value: 'full_details', label: 'Full Details', description: 'Show all trip info' },
  { value: 'dates_only', label: 'Dates Only', description: 'Show only when' },
  { value: 'location_only', label: 'Location Only', description: 'Show only where' },
  { value: 'busy_only', label: 'Busy Only', description: 'Show as busy' },
  { value: 'only_me', label: 'Only Me', description: 'Hidden from friends' },
];

export function EditTripDialog({ open, onOpenChange, trip, onSave }: EditTripDialogProps) {
  const [name, setName] = useState(trip.name);
  const [description, setDescription] = useState(trip.description || '');
  const [visibility, setVisibility] = useState<VisibilityLevel>(trip.visibility);
  const [startDate, setStartDate] = useState<Date | undefined>(trip.start_date ? parseISO(trip.start_date) : undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(trip.end_date ? parseISO(trip.end_date) : undefined);
  const [isFlexible, setIsFlexible] = useState(trip.is_flexible_dates);
  const [flexibleMonth, setFlexibleMonth] = useState<string | null>(trip.flexible_month);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setName(trip.name);
      setDescription(trip.description || '');
      setVisibility(trip.visibility);
      setStartDate(trip.start_date ? parseISO(trip.start_date) : undefined);
      setEndDate(trip.end_date ? parseISO(trip.end_date) : undefined);
      setIsFlexible(trip.is_flexible_dates);
      setFlexibleMonth(trip.flexible_month);
    }
  }, [open, trip]);

  const upcomingMonths = Array.from({ length: 12 }, (_, i) => {
    const date = addMonths(new Date(), i);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy'),
    };
  });

  const handleFlexibleMonthChange = (month: string) => {
    setFlexibleMonth(month);
    const monthDate = parseISO(`${month}-01`);
    setStartDate(startOfMonth(monthDate));
    setEndDate(endOfMonth(monthDate));
  };

  const handleSave = async () => {
    if (!startDate || !endDate) return;
    
    setSaving(true);
    const result = await onSave({
      name,
      description: description || null,
      visibility,
      start_date: format(startDate, 'yyyy-MM-dd'),
      end_date: format(endDate, 'yyyy-MM-dd'),
      is_flexible_dates: isFlexible,
      flexible_month: isFlexible ? flexibleMonth : null,
    });
    setSaving(false);

    if (!result.error) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Trip</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Trip Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional trip description..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Visibility</Label>
            <Select value={visibility} onValueChange={(v) => setVisibility(v as VisibilityLevel)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {visibilityOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div>
                      <span className="font-medium">{opt.label}</span>
                      <span className="text-muted-foreground ml-2 text-sm">{opt.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <Label>Dates</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={!isFlexible ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsFlexible(false)}
              >
                Exact dates
              </Button>
              <Button
                type="button"
                variant={isFlexible ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsFlexible(true)}
              >
                I'm flexible
              </Button>
            </div>

            {!isFlexible ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Start</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('w-full justify-start text-left font-normal')}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, 'MMM d, yyyy') : 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">End</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('w-full justify-start text-left font-normal')}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, 'MMM d, yyyy') : 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        disabled={(date) => startDate ? date < startDate : false}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            ) : (
              <Select value={flexibleMonth || ''} onValueChange={handleFlexibleMonthChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a month" />
                </SelectTrigger>
                <SelectContent>
                  {upcomingMonths.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !name || !startDate || !endDate}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
