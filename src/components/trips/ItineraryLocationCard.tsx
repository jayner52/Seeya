import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { 
  Users, 
  Pencil, 
  Trash2, 
  ChevronRight,
  Home,
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
  X,
  FolderOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tripbit, FlightMetadata, AccommodationMetadata, RentalCarMetadata, ReservationMetadata, ActivityMetadata } from '@/hooks/useTripbits';
import { TripLocation } from '@/hooks/useTripLocations';
import { format, parseISO } from 'date-fns';
import { getCategoryConfig } from '@/lib/tripbitCategoryConfig';

interface LocationParticipant {
  id: string;
  user_id: string;
  profile?: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface Traveler {
  user_id: string;
  profile?: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface ItineraryLocationCardProps {
  location: TripLocation;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  tripbits: Tripbit[];
  participants: LocationParticipant[];
  allTravelers: Traveler[];
  canEdit: boolean;
  isOwner: boolean;
  showDeleteButton: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggleParticipant: (locationId: string, userId: string) => Promise<{ error?: { message: string } }>;
  expandedTripbitId: string | null;
  onExpandTripbit: (id: string | null) => void;
  tripbitMetadata: Record<string, { image?: string; loading?: boolean }>;
}

export function ItineraryLocationCard({
  location,
  index,
  isFirst,
  isLast,
  tripbits,
  participants,
  allTravelers,
  canEdit,
  isOwner,
  showDeleteButton,
  onEdit,
  onDelete,
  onToggleParticipant,
  expandedTripbitId,
  onExpandTripbit,
  tripbitMetadata,
}: ItineraryLocationCardProps) {
  const [managingTravelers, setManagingTravelers] = useState(false);

  // Separate accommodation from other tripbits
  const accommodation = tripbits.find(t => t.category === 'accommodation');
  const otherTripbits = tripbits.filter(t => t.category !== 'accommodation');
  
  // Sort other tripbits by date and time
  const sortedTripbits = [...otherTripbits].sort((a, b) => {
    // First sort by date
    if (!a.start_date && !b.start_date) return 0;
    if (!a.start_date) return 1;
    if (!b.start_date) return -1;
    
    const dateCompare = new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
    if (dateCompare !== 0) return dateCompare;
    
    // If same date, sort by time
    const getTime = (tripbit: Tripbit): string | null => {
      const metadata = tripbit.metadata as Record<string, unknown> | null;
      if (!metadata) return null;
      return (metadata.time as string) || (metadata.departureTime as string) || (metadata.pickupTime as string) || null;
    };
    
    const timeA = getTime(a);
    const timeB = getTime(b);
    
    if (!timeA && !timeB) return 0;
    if (!timeA) return 1;
    if (!timeB) return -1;
    
    return timeA.localeCompare(timeB);
  });

  // Group tripbits by date
  const tripbitsByDate = sortedTripbits.reduce((acc, tripbit) => {
    const dateKey = tripbit.start_date 
      ? format(parseISO(tripbit.start_date), 'yyyy-MM-dd')
      : 'no-date';
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(tripbit);
    return acc;
  }, {} as Record<string, Tripbit[]>);

  const formatTime = (time: string | undefined) => {
    if (!time) return null;
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const renderMetadataDetails = (tripbit: Tripbit) => {
    const meta = tripbit.metadata as Record<string, unknown> | null;
    if (!meta) return null;

    switch (tripbit.category) {
      case 'flight': {
        const flight = meta as FlightMetadata;
        return (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {(flight.departureAirport || flight.arrivalAirport) && (
              <div className="col-span-2">
                <span className="text-muted-foreground">Route:</span>{' '}
                {flight.departureAirport || '???'} → {flight.arrivalAirport || '???'}
              </div>
            )}
            {flight.airline && <div><span className="text-muted-foreground">Airline:</span> {flight.airline}</div>}
            {flight.flightNumber && <div><span className="text-muted-foreground">Flight:</span> {flight.flightNumber}</div>}
            {flight.departureTime && <div><span className="text-muted-foreground">Departure:</span> {formatTime(flight.departureTime)}</div>}
            {flight.arrivalTime && <div><span className="text-muted-foreground">Arrival:</span> {formatTime(flight.arrivalTime)}</div>}
            {flight.confirmationNumber && <div className="col-span-2"><span className="text-muted-foreground">Confirmation:</span> {flight.confirmationNumber}</div>}
          </div>
        );
      }
      case 'accommodation': {
        const acc = meta as AccommodationMetadata;
        return (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {acc.checkInTime && <div><span className="text-muted-foreground">Check-in:</span> {formatTime(acc.checkInTime)}</div>}
            {acc.checkOutTime && <div><span className="text-muted-foreground">Check-out:</span> {formatTime(acc.checkOutTime)}</div>}
            {acc.confirmationNumber && <div className="col-span-2"><span className="text-muted-foreground">Confirmation:</span> {acc.confirmationNumber}</div>}
            {acc.address && <div className="col-span-2"><span className="text-muted-foreground">Address:</span> {acc.address}</div>}
          </div>
        );
      }
      case 'rental_car': {
        const car = meta as RentalCarMetadata;
        return (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {car.company && <div><span className="text-muted-foreground">Company:</span> {car.company}</div>}
            {car.confirmationNumber && <div><span className="text-muted-foreground">Confirmation:</span> {car.confirmationNumber}</div>}
            {car.pickupLocation && <div className="col-span-2"><span className="text-muted-foreground">Pick-up:</span> {car.pickupLocation} {car.pickupTime && `@ ${formatTime(car.pickupTime)}`}</div>}
            {car.dropoffLocation && <div className="col-span-2"><span className="text-muted-foreground">Drop-off:</span> {car.dropoffLocation} {car.dropoffTime && `@ ${formatTime(car.dropoffTime)}`}</div>}
          </div>
        );
      }
      case 'reservation': {
        const res = meta as ReservationMetadata;
        return (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {res.venue && <div><span className="text-muted-foreground">Venue:</span> {res.venue}</div>}
            {res.time && <div><span className="text-muted-foreground">Time:</span> {formatTime(res.time)}</div>}
            {res.partySize && <div><span className="text-muted-foreground">Party size:</span> {res.partySize}</div>}
            {res.confirmationNumber && <div><span className="text-muted-foreground">Confirmation:</span> {res.confirmationNumber}</div>}
            {res.address && <div className="col-span-2"><span className="text-muted-foreground">Address:</span> {res.address}</div>}
          </div>
        );
      }
      case 'activity': {
        const act = meta as ActivityMetadata;
        return (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            {act.time && <div><span className="text-muted-foreground">Time:</span> {formatTime(act.time)}</div>}
            {act.duration && <div><span className="text-muted-foreground">Duration:</span> {act.duration}</div>}
            {act.meetingPoint && <div className="col-span-2"><span className="text-muted-foreground">Meeting point:</span> {act.meetingPoint}</div>}
            {act.confirmationNumber && <div className="col-span-2"><span className="text-muted-foreground">Confirmation:</span> {act.confirmationNumber}</div>}
          </div>
        );
      }
      default:
        return null;
    }
  };

  const renderTripbitItem = (tripbit: Tripbit) => {
    const config = getCategoryConfig(tripbit.category);
    const TripbitIcon = config.icon;
    const categoryColor = config.colorClass;
    const isExpanded = expandedTripbitId === tripbit.id;
    const metadata = tripbitMetadata[tripbit.id];
    
    const hasDate = tripbit.start_date;
    const timeStr = tripbit.metadata && typeof tripbit.metadata === 'object' && 'time' in tripbit.metadata
      ? (tripbit.metadata as { time?: string }).time
      : tripbit.metadata && typeof tripbit.metadata === 'object' && 'departureTime' in tripbit.metadata
        ? (tripbit.metadata as { departureTime?: string }).departureTime
        : null;

    return (
      <div key={tripbit.id} className="space-y-2">
        <div 
          className={cn(
            "flex items-center gap-2 p-2 rounded-md bg-muted/50 cursor-pointer hover:bg-muted transition-colors"
          )}
          onClick={() => onExpandTripbit(isExpanded ? null : tripbit.id)}
        >
          <div className={cn("p-1 rounded", categoryColor)}>
            <TripbitIcon className="h-3 w-3 text-white shrink-0" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium truncate block">{tripbit.title}</span>
            {timeStr && (
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatTime(timeStr)}
              </span>
            )}
          </div>
          {tripbit.participants && tripbit.participants.length > 0 && (
            <div className="flex -space-x-1 shrink-0">
              {tripbit.participants.slice(0, 3).map((p) => (
                <Avatar key={p.id} className="h-5 w-5 border border-background">
                  <AvatarImage src={p.profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-[8px]">
                    {p.profile?.full_name?.[0] || p.profile?.username?.[0] || '?'}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
          )}
          <ChevronRight className={cn(
            "h-4 w-4 text-muted-foreground shrink-0 transition-transform",
            isExpanded && "rotate-90"
          )} />
        </div>
        
        {/* Expanded view */}
        {isExpanded && (
          <div className="ml-2 p-3 rounded-md bg-background border border-border space-y-3">
            {tripbit.url && metadata?.image && (
              <div className="w-full h-32 rounded-md overflow-hidden">
                <img 
                  src={metadata.image} 
                  alt={tripbit.title}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
            )}
            
            {/* Metadata details */}
            {renderMetadataDetails(tripbit)}
            
            {tripbit.description && (
              <div className="text-sm">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Notes</span>
                <p className="mt-1 text-muted-foreground">{tripbit.description}</p>
              </div>
            )}
            
            {/* Participants */}
            {tripbit.participants && tripbit.participants.length > 0 && (
              <div className="flex items-center gap-1.5 pt-2 border-t border-border/50">
                <Users className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <span className="text-xs text-muted-foreground">
                  {tripbit.participants
                    .map(p => p.profile?.full_name || p.profile?.username || 'Unknown')
                    .join(', ')}
                </span>
              </div>
            )}
            
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              {tripbit.url && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(tripbit.url!, '_blank');
                  }}
                >
                  <ExternalLink className="h-3 w-3" />
                  Open link
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onExpandTripbit(null);
                }}
              >
                <X className="h-3 w-3 mr-1" />
                Close
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="relative pl-8 pb-4 last:pb-0">
      {/* Vertical timeline line */}
      {!isLast && (
        <div className="absolute left-3 top-0 w-0.5 h-full bg-border" />
      )}
      
      {/* Location number indicator */}
      <div className={cn(
        "absolute left-1 top-1 w-5 h-5 rounded-full flex items-center justify-center",
        isFirst ? "bg-primary" : "bg-secondary"
      )}>
        <span className={cn("text-xs font-bold", isFirst && "text-primary-foreground")}>{index + 1}</span>
      </div>
      
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        {/* Location Header */}
        <div className="p-4 border-b border-border/50">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-medium">{location.destination.split(',')[0]}</p>
              {location.destination.split(',').length > 1 && (
                <p className="text-sm text-muted-foreground">
                  {location.destination.split(',').slice(1).join(',').trim()}
                </p>
              )}
              {location.start_date && location.end_date && (
                <p className="text-sm text-muted-foreground mt-1">
                  {format(parseISO(location.start_date), 'MMM d')} – {format(parseISO(location.end_date), 'MMM d')}
                </p>
              )}
              
              {/* Travelers for this leg */}
              <div className="flex items-center gap-2 mt-2">
                {participants.length > 0 ? (
                  <div className="flex -space-x-1">
                    {participants.slice(0, 4).map((p) => (
                      <Avatar key={p.id} className="h-6 w-6 border-2 border-background">
                        <AvatarImage src={p.profile?.avatar_url || undefined} />
                        <AvatarFallback className="text-[10px]">
                          {p.profile?.full_name?.[0] || p.profile?.username?.[0] || '?'}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {participants.length > 4 && (
                      <div className="h-6 w-6 rounded-full bg-muted border-2 border-background flex items-center justify-center">
                        <span className="text-[10px]">+{participants.length - 4}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">No travelers assigned</span>
                )}
                
                {canEdit && allTravelers.length > 0 && (
                  <Popover open={managingTravelers} onOpenChange={setManagingTravelers}>
                    <PopoverTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                        <Users className="w-3 h-3 mr-1" />
                        {participants.length > 0 ? 'Edit' : 'Assign'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-56 p-2" align="start">
                      <p className="text-sm font-medium mb-2">Who's going?</p>
                      <div className="space-y-1">
                        {allTravelers.map((traveler) => {
                          const isAssigned = participants.some(p => p.user_id === traveler.user_id);
                          return (
                            <div 
                              key={traveler.user_id}
                              className="flex items-center gap-2 p-2 rounded-md hover:bg-accent cursor-pointer"
                              onClick={async () => {
                                await onToggleParticipant(location.id, traveler.user_id);
                              }}
                            >
                              <Checkbox checked={isAssigned} />
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={traveler.profile?.avatar_url || undefined} />
                                <AvatarFallback className="text-[10px]">
                                  {traveler.profile?.full_name?.[0] || traveler.profile?.username?.[0] || '?'}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-sm truncate">
                                {traveler.profile?.full_name || traveler.profile?.username || 'Unknown'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </PopoverContent>
                  </Popover>
                )}
              </div>
            </div>
            
            {/* Edit/Delete buttons */}
            {canEdit && (
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                {showDeleteButton && (
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onDelete}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Accommodation */}
        {accommodation && (
          <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border-b border-border/50">
            <div className="flex items-center gap-2 text-sm">
              <Home className="h-4 w-4 text-blue-600" />
              <span className="font-medium">{accommodation.title}</span>
              {accommodation.url && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 ml-auto"
                  onClick={() => window.open(accommodation.url!, '_blank')}
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              )}
            </div>
            {(accommodation.metadata as AccommodationMetadata)?.address && (
              <p className="text-xs text-muted-foreground mt-1 ml-6">
                {(accommodation.metadata as AccommodationMetadata).address}
              </p>
            )}
          </div>
        )}
        
        {/* Tripbits by date */}
        {Object.keys(tripbitsByDate).length > 0 && (
          <div className="divide-y divide-border/50">
            {Object.entries(tripbitsByDate).map(([dateKey, dateTripbits]) => (
              <div key={dateKey} className="p-3">
                {dateKey !== 'no-date' && (
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">
                      {format(parseISO(dateKey), 'EEEE, MMM d')}
                    </span>
                  </div>
                )}
                <div className="space-y-2">
                  {dateTripbits.map(renderTripbitItem)}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Empty state */}
        {tripbits.length === 0 && (
          <div className="p-4 text-center text-sm text-muted-foreground">
            <FolderOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
            No tripbits for this location yet
          </div>
        )}
      </div>
    </div>
  );
}