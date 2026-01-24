import { ExternalLink, Trash2, Calendar, MapPin, Pencil, ChevronDown, ChevronUp, Share2, Users, GripVertical } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tripbit, FlightMetadata, AccommodationMetadata, RentalCarMetadata, ReservationMetadata, ActivityMetadata, PhotosMetadata } from '@/hooks/useTripbits';
import { useAuth } from '@/hooks/useAuth';
import { format, parseISO, isPast } from 'date-fns';
import { cn } from '@/lib/utils';
import { categoryConfig as centralCategoryConfig, getCategoryConfig } from '@/lib/tripbitCategoryConfig';

interface TripbitCardProps {
  tripbit: Tripbit;
  onDelete: (tripbit: Tripbit) => void;
  onEdit?: (tripbit: Tripbit) => void;
  locationName?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  compact?: boolean;
  tripEndDate?: string;
  cityId?: string;
  onRateAndShare?: (tripbit: Tripbit) => void;
  isShared?: boolean;
  showDragHandle?: boolean;
  hideIcon?: boolean;
}

// Re-export for backwards compatibility
export const categoryConfig = centralCategoryConfig;

export function TripbitCard({ tripbit, onDelete, onEdit, locationName, isExpanded = true, onToggleExpand, compact, tripEndDate, cityId, onRateAndShare, isShared, showDragHandle, hideIcon }: TripbitCardProps) {
  const { user } = useAuth();
  const config = getCategoryConfig(tripbit.category);
  const Icon = config.icon;
  const isOwner = user?.id === tripbit.user_id;
  const metadata = tripbit.metadata as Record<string, unknown> | null;
  
  // Check if trip/tripbit date has passed for Rate & Share button
  const canRateAndShare = (() => {
    if (!isOwner || !cityId || isShared) return false;
    const dateToCheck = tripbit.end_date || tripbit.start_date || tripEndDate;
    if (!dateToCheck) return false;
    return isPast(parseISO(dateToCheck));
  })();

  const handleClick = () => {
    if (onToggleExpand) {
      onToggleExpand();
    } else if (onEdit) {
      onEdit(tripbit);
    }
  };

  const handleOpenUrl = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (tripbit.url) {
      window.open(tripbit.url, '_blank', 'noopener,noreferrer');
    }
  };

  const formatDateRange = () => {
    if (!tripbit.start_date) return null;
    const start = parseISO(tripbit.start_date);
    if (!tripbit.end_date || tripbit.start_date === tripbit.end_date) {
      return format(start, 'MMM d');
    }
    const end = parseISO(tripbit.end_date);
    return `${format(start, 'MMM d')} – ${format(end, 'MMM d')}`;
  };

  const formatTime = (time: string | undefined) => {
    if (!time) return null;
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  // Inline metadata for compact display - returns array of strings
  const getInlineMetadata = (): string[] => {
    if (!metadata) return [];
    const parts: string[] = [];

    switch (tripbit.category) {
      case 'flight': {
        const flight = metadata as FlightMetadata;
        if (flight.departureAirport || flight.arrivalAirport) {
          parts.push(`${flight.departureAirport || '???'} → ${flight.arrivalAirport || '???'}`);
        }
        if (flight.airline) parts.push(flight.airline);
        if (flight.flightNumber) parts.push(flight.flightNumber);
        if (flight.departureTime) parts.push(formatTime(flight.departureTime) || '');
        break;
      }
      case 'accommodation': {
        const acc = metadata as AccommodationMetadata;
        if (acc.checkInTime) parts.push(`Check-in ${formatTime(acc.checkInTime)}`);
        if (acc.checkOutTime) parts.push(`Check-out ${formatTime(acc.checkOutTime)}`);
        if (acc.confirmationNumber) parts.push(`#${acc.confirmationNumber}`);
        break;
      }
      case 'rental_car': {
        const car = metadata as RentalCarMetadata;
        if (car.company) parts.push(car.company);
        if (car.pickupLocation) parts.push(`Pick-up: ${car.pickupLocation}`);
        if (car.pickupTime) parts.push(formatTime(car.pickupTime) || '');
        break;
      }
      case 'reservation': {
        const res = metadata as ReservationMetadata;
        if (res.venue) parts.push(res.venue);
        if (res.time) parts.push(formatTime(res.time) || '');
        if (res.partySize) parts.push(`${res.partySize} guests`);
        break;
      }
      case 'activity': {
        const act = metadata as ActivityMetadata;
        if (act.time) parts.push(formatTime(act.time) || '');
        if (act.duration) parts.push(act.duration);
        if (act.meetingPoint) parts.push(act.meetingPoint);
        break;
      }
      case 'photos': {
        const photos = metadata as PhotosMetadata;
        if (photos.service) parts.push(photos.service);
        if (photos.albumName) parts.push(`"${photos.albumName}"`);
        break;
      }
    }
    return parts.filter(Boolean);
  };

  const dateRange = formatDateRange();

  // Collapsed view - compact row
  if (!isExpanded && onToggleExpand) {
    return (
      <Card 
        className="group relative overflow-hidden transition-all hover:shadow-md cursor-pointer"
        onClick={handleClick}
      >
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            {!hideIcon && (
              <div className={cn(config.colorClass, "p-1.5 rounded-lg shrink-0")}>
                <Icon className="h-4 w-4 text-white" />
              </div>
            )}
            
            <div className="flex-1 min-w-0 flex items-center gap-3">
              <h4 className="font-medium text-foreground truncate flex-1">{tripbit.title}</h4>
              
              {dateRange && (
                <span className="text-xs text-muted-foreground shrink-0">{dateRange}</span>
              )}
              
              {locationName && (
                <span className="text-xs text-muted-foreground shrink-0 hidden sm:flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {locationName}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {tripbit.url && (
                <button
                  onClick={handleOpenUrl}
                  className="p-1 hover:bg-accent rounded transition-colors"
                  title="Open link"
                >
                  <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Expanded view - compact 2-line layout
  const inlineMetadata = getInlineMetadata();
  
  return (
    <Card 
      className={cn(
        "group relative overflow-hidden transition-all hover:shadow-md",
        onToggleExpand && "cursor-pointer",
        !onToggleExpand && onEdit && "cursor-pointer hover:ring-2 hover:ring-foreground/20"
      )}
      onClick={handleClick}
    >
      <CardContent className="p-3">
        {/* Row 1: Icon, Title, Category Badge, Date, Actions */}
        <div className="flex items-center gap-2.5">
          {showDragHandle && (
            <div className="cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          {!hideIcon && (
            <div className={cn(config.colorClass, "p-1.5 rounded-lg shrink-0")}>
              <Icon className="h-4 w-4 text-white" />
            </div>
          )}
          
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <h4 className="font-medium text-foreground truncate">{tripbit.title}</h4>
            {!hideIcon && (
              <span className={cn("text-[10px] px-1.5 py-0.5 rounded shrink-0", config.bgClass, config.textClass)}>
                {config.label}
              </span>
            )}
          </div>
          
          {dateRange && (
            <span className="text-xs text-muted-foreground shrink-0 hidden sm:flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {dateRange}
            </span>
          )}
          
          <div className="flex items-center gap-1 shrink-0">
            {tripbit.url && (
              <button
                onClick={handleOpenUrl}
                className="p-1 hover:bg-accent rounded transition-colors"
                title="Open link"
              >
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
            {canRateAndShare && onRateAndShare && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 gap-1 text-primary hover:text-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  onRateAndShare(tripbit);
                }}
                title="Rate & share with friends"
              >
                <Share2 className="h-3 w-3" />
                <span className="text-[10px] hidden sm:inline">Share</span>
              </Button>
            )}
            {isOwner && (
              <div className="flex items-center gap-0.5">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 opacity-60 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(tripbit);
                    }}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(tripbit);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
            {onToggleExpand && (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
        
        {/* Row 2: Inline metadata, location, participants */}
        <div className="flex items-center gap-2 mt-1.5 text-xs text-muted-foreground flex-wrap">
          {/* Date on mobile */}
          {dateRange && (
            <span className="flex sm:hidden items-center gap-1">
              <Calendar className="h-3 w-3" />
              {dateRange}
            </span>
          )}
          
          {/* Inline metadata */}
          {inlineMetadata.length > 0 && (
            <span className="truncate max-w-[300px]">
              {inlineMetadata.join(' • ')}
            </span>
          )}
          
          {locationName && (
            <span className="flex items-center gap-1 shrink-0">
              <MapPin className="h-3 w-3" />
              {locationName}
            </span>
          )}
          
        </div>
        
        {/* Optional Row 3: Description (truncated) */}
        {tripbit.description && (
          <p className="text-xs text-muted-foreground mt-1.5 truncate">
            {tripbit.description}
          </p>
        )}
        
        {/* Money category hint - kept but more compact */}
        {tripbit.category === 'money' && !tripbit.url && (
          <p className="text-xs text-muted-foreground mt-1.5 italic">
            💡 Link Venmo or Splitwise to track shared expenses
          </p>
        )}
        
        {/* Photos category hint */}
        {tripbit.category === 'photos' && !tripbit.url && (
          <p className="text-xs text-muted-foreground mt-1.5 italic">
            📸 Link your shared album from Google Photos, iCloud, Dropbox, or other services
          </p>
        )}
        
        {/* Row 4: Participant names at bottom */}
        {tripbit.participants && tripbit.participants.length > 0 && (
          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/50">
            <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground">
              {tripbit.participants
                .map(p => p.profile?.full_name || p.profile?.username || 'Unknown')
                .join(', ')}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
