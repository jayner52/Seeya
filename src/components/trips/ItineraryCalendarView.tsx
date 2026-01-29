import { useState, useMemo } from 'react';
import {
  format,
  parseISO,
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  isSameDay,
  getDay,
  addMonths,
  isWithinInterval,
  startOfWeek,
  endOfWeek,
  isBefore,
  isAfter,
} from 'date-fns';
import { Tripbit } from '@/hooks/useTripbits';
import { TripLocation } from '@/hooks/useTripLocations';
import { getCategoryConfig } from '@/lib/tripbitCategoryConfig';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Clock, ExternalLink, MapPin } from 'lucide-react';

interface ItineraryCalendarViewProps {
  tripbits: Tripbit[];
  locations: TripLocation[];
  startDate: string;
  endDate: string;
  selectedTravelers: string[];
}

const LOCATION_COLORS = [
  { bg: 'bg-amber-200/60', border: 'border-amber-400', text: 'text-amber-900' },
  { bg: 'bg-sky-200/60', border: 'border-sky-400', text: 'text-sky-900' },
  { bg: 'bg-rose-200/60', border: 'border-rose-400', text: 'text-rose-900' },
  { bg: 'bg-emerald-200/60', border: 'border-emerald-400', text: 'text-emerald-900' },
  { bg: 'bg-violet-200/60', border: 'border-violet-400', text: 'text-violet-900' },
  { bg: 'bg-orange-200/60', border: 'border-orange-400', text: 'text-orange-900' },
];

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatTime = (time: string | undefined) => {
  if (!time) return null;
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
};

const getTripbitTime = (tripbit: Tripbit): string | null => {
  const meta = tripbit.metadata as Record<string, unknown> | null;
  if (!meta) return null;
  return (
    (meta.time as string) ||
    (meta.departureTime as string) ||
    (meta.pickupTime as string) ||
    (meta.checkInTime as string) ||
    null
  );
};

const TripbitPopover = ({ tripbit, children }: { tripbit: Tripbit; children: React.ReactNode }) => {
  const config = getCategoryConfig(tripbit.category);
  const Icon = config.icon;
  
  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <div className={cn("p-3 border-b", config.bgClass)}>
          <div className="flex items-center gap-2">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", config.colorClass)}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className={cn("text-xs uppercase tracking-wide", config.textClass)}>
                {tripbit.category.replace('_', ' ')}
              </p>
              <h4 className="font-medium text-foreground">{tripbit.title}</h4>
            </div>
          </div>
        </div>
        <div className="p-3 space-y-2">
          {tripbit.start_date && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>
                {format(parseISO(tripbit.start_date), 'MMM d, yyyy')}
                {tripbit.end_date && tripbit.end_date !== tripbit.start_date && (
                  <> – {format(parseISO(tripbit.end_date), 'MMM d, yyyy')}</>
                )}
                {getTripbitTime(tripbit) && (
                  <> • {formatTime(getTripbitTime(tripbit) || undefined)}</>
                )}
              </span>
            </div>
          )}
          {tripbit.description && (
            <p className="text-sm text-muted-foreground">{tripbit.description}</p>
          )}
          {tripbit.url && (
            <a
              href={tripbit.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" />
              View link
            </a>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export function ItineraryCalendarView({
  tripbits,
  locations,
  startDate,
  endDate,
  selectedTravelers,
}: ItineraryCalendarViewProps) {
  // Filter tripbits based on selected travelers
  const filteredTripbits = useMemo(() => {
    if (selectedTravelers.length === 0) return tripbits;
    return tripbits.filter(r => {
      if (!r.participants || r.participants.length === 0) return true;
      return r.participants.some(p => selectedTravelers.includes(p.user_id));
    });
  }, [tripbits, selectedTravelers]);

  // Get all months between start and end date, extending to include any tripbits outside the range
  const months = useMemo(() => {
    let minDate = parseISO(startDate);
    let maxDate = parseISO(endDate);
    
    // Extend date range to include any tripbits that fall outside the trip dates
    filteredTripbits.forEach(tripbit => {
      if (tripbit.start_date) {
        const tStart = parseISO(tripbit.start_date);
        if (isBefore(tStart, minDate)) minDate = tStart;
      }
      if (tripbit.end_date) {
        const tEnd = parseISO(tripbit.end_date);
        if (isAfter(tEnd, maxDate)) maxDate = tEnd;
      }
    });
    
    const result: Date[] = [];
    let current = startOfMonth(minDate);
    const lastMonth = startOfMonth(maxDate);
    
    while (current <= lastMonth) {
      result.push(current);
      current = addMonths(current, 1);
    }
    
    return result;
  }, [startDate, endDate, filteredTripbits]);

  // Check if tripbit spans multiple days
  const isMultiDay = (tripbit: Tripbit) => {
    if (!tripbit.start_date || !tripbit.end_date) return false;
    return tripbit.start_date !== tripbit.end_date;
  };

  // Get single-day tripbits for a specific day
  const getSingleDayTripbitsForDay = (day: Date) => {
    return filteredTripbits.filter(tripbit => {
      if (!tripbit.start_date) return false;
      if (isMultiDay(tripbit)) return false;
      return isSameDay(parseISO(tripbit.start_date), day);
    });
  };

  // Get multi-day tripbits that appear in a given week
  const getMultiDayTripbitsForWeek = (week: (Date | null)[]) => {
    const validDays = week.filter((d): d is Date => d !== null);
    if (validDays.length === 0) return [];
    
    const weekStart = validDays[0];
    const weekEnd = validDays[validDays.length - 1];
    
    return filteredTripbits.filter(tripbit => {
      if (!tripbit.start_date || !isMultiDay(tripbit)) return false;
      
      const tripbitStart = parseISO(tripbit.start_date);
      const tripbitEnd = tripbit.end_date ? parseISO(tripbit.end_date) : tripbitStart;
      
      // Check if tripbit overlaps with this week
      return !(isAfter(tripbitStart, weekEnd) || isBefore(tripbitEnd, weekStart));
    });
  };

  // Calculate the grid column position and span for a multi-day tripbit within a week
  const getMultiDayPosition = (tripbit: Tripbit, week: (Date | null)[]) => {
    if (!tripbit.start_date) return null;
    
    const tripbitStart = parseISO(tripbit.start_date);
    const tripbitEnd = tripbit.end_date ? parseISO(tripbit.end_date) : tripbitStart;
    
    // Find actual start and end within this week
    let startCol = 0;
    let endCol = 6;
    let isStartInWeek = false;
    let isEndInWeek = false;
    
    for (let i = 0; i < 7; i++) {
      const day = week[i];
      if (!day) continue;
      
      if (isSameDay(day, tripbitStart)) {
        startCol = i;
        isStartInWeek = true;
      }
      if (isSameDay(day, tripbitEnd)) {
        endCol = i;
        isEndInWeek = true;
      }
    }
    
    // If tripbit started before this week, start at first valid day
    if (!isStartInWeek) {
      for (let i = 0; i < 7; i++) {
        if (week[i]) {
          startCol = i;
          break;
        }
      }
    }
    
    // If tripbit ends after this week, end at last valid day
    if (!isEndInWeek) {
      for (let i = 6; i >= 0; i--) {
        if (week[i]) {
          endCol = i;
          break;
        }
      }
    }
    
    const span = endCol - startCol + 1;
    
    return {
      startCol: startCol + 1, // CSS grid is 1-indexed
      span,
      isStartInWeek,
      isEndInWeek,
    };
  };

  // Get location bar positions for a given week
  const getLocationsForWeek = (week: (Date | null)[]) => {
    const validDays = week.filter((d): d is Date => d !== null);
    if (validDays.length === 0) return [];
    
    const weekStart = validDays[0];
    const weekEnd = validDays[validDays.length - 1];
    
    return locations
      .filter(location => {
        if (!location.start_date || !location.end_date) return false;
        const locStart = parseISO(location.start_date);
        const locEnd = parseISO(location.end_date);
        // Check if location overlaps with this week
        return !(isAfter(locStart, weekEnd) || isBefore(locEnd, weekStart));
      })
      .map((location, idx) => {
        const locStart = parseISO(location.start_date!);
        const locEnd = parseISO(location.end_date!);
        
        let startCol = 0;
        let endCol = 6;
        let isStartInWeek = false;
        let isEndInWeek = false;
        
        for (let i = 0; i < 7; i++) {
          const day = week[i];
          if (!day) continue;
          
          if (isSameDay(day, locStart)) {
            startCol = i;
            isStartInWeek = true;
          }
          if (isSameDay(day, locEnd)) {
            endCol = i;
            isEndInWeek = true;
          }
        }
        
        // If location started before this week, start at first valid day
        if (!isStartInWeek) {
          for (let i = 0; i < 7; i++) {
            if (week[i]) {
              startCol = i;
              break;
            }
          }
        }
        
        // If location ends after this week, end at last valid day
        if (!isEndInWeek) {
          for (let i = 6; i >= 0; i--) {
            if (week[i]) {
              endCol = i;
              break;
            }
          }
        }
        
        const colorIndex = locations.findIndex(l => l.id === location.id) % LOCATION_COLORS.length;
        
        return {
          location,
          startCol: startCol + 1,
          span: endCol - startCol + 1,
          isStartInWeek,
          isEndInWeek,
          colors: LOCATION_COLORS[colorIndex],
        };
      });
  };

  const tripStart = parseISO(startDate);
  const tripEnd = parseISO(endDate);

  return (
    <div className="space-y-8">
      {months.map((monthStart) => {
        const monthEnd = endOfMonth(monthStart);
        const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
        const firstDayOfWeek = getDay(monthStart);
        
        // Create weeks array
        const weeks: (Date | null)[][] = [];
        let currentWeek: (Date | null)[] = [];
        
        // Add empty cells for days before the first day of month
        for (let i = 0; i < firstDayOfWeek; i++) {
          currentWeek.push(null);
        }
        
        daysInMonth.forEach((day) => {
          currentWeek.push(day);
          if (currentWeek.length === 7) {
            weeks.push(currentWeek);
            currentWeek = [];
          }
        });
        
        // Fill remaining days
        if (currentWeek.length > 0) {
          while (currentWeek.length < 7) {
            currentWeek.push(null);
          }
          weeks.push(currentWeek);
        }

        return (
          <div key={monthStart.toISOString()} className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Month Header */}
            <div className="bg-muted/50 px-6 py-4 border-b border-border">
              <h3 className="font-display text-xl font-semibold text-foreground">
                {format(monthStart, 'MMMM yyyy')}
              </h3>
            </div>
            
            {/* Calendar Grid */}
            <div className="p-4">
              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {DAYS_OF_WEEK.map(day => (
                  <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                    {day}
                  </div>
                ))}
              </div>
              
              {/* Weeks */}
              <div className="space-y-1">
                {weeks.map((week, weekIdx) => {
                  const multiDayTripbits = getMultiDayTripbitsForWeek(week);
                  const weekLocations = getLocationsForWeek(week);
                  
                  return (
                    <div key={weekIdx} className="relative">
                      {/* Location bars layer */}
                      {weekLocations.length > 0 && (
                        <div className="grid grid-cols-7 gap-1 mb-1">
                          {weekLocations.map((locData) => (
                            <div
                              key={locData.location.id}
                              className={cn(
                                "h-5 text-[10px] px-2 flex items-center gap-1 truncate border",
                                locData.colors.bg,
                                locData.colors.border,
                                locData.colors.text,
                                locData.isStartInWeek ? "rounded-l-md" : "rounded-l-none border-l-0",
                                locData.isEndInWeek ? "rounded-r-md" : "rounded-r-none border-r-0"
                              )}
                              style={{
                                gridColumn: `${locData.startCol} / span ${locData.span}`,
                              }}
                            >
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate font-medium">{locData.location.destination}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Multi-day events layer */}
                      {multiDayTripbits.length > 0 && (
                        <div className="grid grid-cols-7 gap-1 mb-1">
                          {multiDayTripbits.map((tripbit, idx) => {
                            const position = getMultiDayPosition(tripbit, week);
                            if (!position) return null;
                            
                            const config = getCategoryConfig(tripbit.category);
                            const Icon = config.icon;
                            
                            return (
                              <TripbitPopover key={tripbit.id} tripbit={tripbit}>
                                <button
                                  className={cn(
                                    "h-6 text-[10px] px-1.5 flex items-center gap-1 truncate",
                                    "hover:opacity-80 transition-opacity cursor-pointer",
                                    config.colorClass,
                                    "text-white",
                                    position.isStartInWeek ? "rounded-l-md" : "rounded-l-none",
                                    position.isEndInWeek ? "rounded-r-md" : "rounded-r-none"
                                  )}
                                  style={{
                                    gridColumn: `${position.startCol} / span ${position.span}`,
                                  }}
                                >
                                  <Icon className="w-3 h-3 flex-shrink-0" />
                                  <span className="truncate">{tripbit.title}</span>
                                </button>
                              </TripbitPopover>
                            );
                          })}
                        </div>
                      )}
                      
                      {/* Day cells */}
                      <div className="grid grid-cols-7 gap-1">
                        {week.map((day, dayIdx) => {
                          if (!day) {
                            return <div key={dayIdx} className="min-h-[80px] bg-muted/20 rounded-lg" />;
                          }
                          
                          const isInTripRange = isWithinInterval(day, { start: tripStart, end: tripEnd });
                          const singleDayTripbits = getSingleDayTripbitsForDay(day);
                          
                          return (
                            <div
                              key={dayIdx}
                              className={cn(
                                "min-h-[80px] rounded-lg p-1 relative",
                                isInTripRange ? "bg-primary/5 border border-primary/20" : "bg-muted/20",
                                isSameDay(day, tripStart) && "ring-2 ring-primary/50",
                                isSameDay(day, tripEnd) && "ring-2 ring-primary/50"
                              )}
                            >
                              {/* Day Number */}
                              <div className={cn(
                                "text-xs font-medium mb-1",
                                isInTripRange ? "text-foreground" : "text-muted-foreground"
                              )}>
                                {format(day, 'd')}
                              </div>
                              
                              {/* Single-day Tripbits */}
                              <div className="space-y-0.5 overflow-hidden">
                                {singleDayTripbits.slice(0, 3).map((tripbit) => {
                                  const config = getCategoryConfig(tripbit.category);
                                  const Icon = config.icon;
                                  
                                  return (
                                    <TripbitPopover key={tripbit.id} tripbit={tripbit}>
                                      <button
                                        className={cn(
                                          "w-full text-left text-[10px] px-1.5 py-0.5 rounded truncate flex items-center gap-1",
                                          "hover:opacity-80 transition-opacity cursor-pointer",
                                          config.colorClass,
                                          "text-white"
                                        )}
                                      >
                                        <Icon className="w-3 h-3 flex-shrink-0" />
                                        <span className="truncate">{tripbit.title}</span>
                                      </button>
                                    </TripbitPopover>
                                  );
                                })}
                                {singleDayTripbits.length > 3 && (
                                  <div className="text-[10px] text-muted-foreground px-1">
                                    +{singleDayTripbits.length - 3} more
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
      
      {filteredTripbits.filter(t => !t.start_date).length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="bg-muted/50 px-6 py-4 border-b border-border">
            <h3 className="font-display text-lg font-semibold text-foreground">
              Unscheduled Items
            </h3>
          </div>
          <div className="p-4 flex flex-wrap gap-2">
            {filteredTripbits.filter(t => !t.start_date).map(tripbit => {
              const config = getCategoryConfig(tripbit.category);
              const Icon = config.icon;
              
              return (
                <TripbitPopover key={tripbit.id} tripbit={tripbit}>
                  <button
                    className={cn(
                      "text-xs px-2 py-1 rounded-full flex items-center gap-1.5",
                      "hover:opacity-80 transition-opacity cursor-pointer",
                      config.bgClass,
                      config.textClass
                    )}
                  >
                    <Icon className="w-3 h-3" />
                    <span>{tripbit.title}</span>
                  </button>
                </TripbitPopover>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
