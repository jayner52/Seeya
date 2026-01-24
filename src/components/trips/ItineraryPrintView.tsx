import { useState } from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tripbit, FlightMetadata, AccommodationMetadata, RentalCarMetadata, ReservationMetadata, ActivityMetadata } from '@/hooks/useTripbits';
import { TripLocation } from '@/hooks/useTripLocations';
import { LocationParticipant } from '@/hooks/useLocationParticipants';
import { 
  MapPin, 
  Calendar, 
  CalendarPlus,
  Users, 
  Clock,
  ChevronDown,
  ChevronUp,
  Printer,
  Download,
  ExternalLink,
  Check,
  List,
  CalendarDays,
  Crown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getCategoryConfig } from '@/lib/tripbitCategoryConfig';
import { PremiumBadge } from '@/components/premium/PremiumBadge';
import {
  generateTripICS,
  generateSingleEventICS,
  generateGoogleCalendarURL,
  downloadICS,
  generateTripFilename,
} from '@/lib/calendarExport';
import { toast } from 'sonner';
import { ItineraryCalendarView } from './ItineraryCalendarView';

interface TravelerProfile {
  id: string;
  user_id: string;
  status: string;
  profile: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface ItineraryPrintViewProps {
  trip: {
    name: string;
    destination: string;
    start_date: string;
    end_date: string;
    description?: string | null;
    is_flexible_dates?: boolean;
    flexible_month?: string | null;
    ownerProfile?: {
      id: string;
      username: string;
      full_name: string | null;
      avatar_url: string | null;
    } | null;
  };
  locations: TripLocation[];
  tripbits: Tripbit[];
  travelers: TravelerProfile[];
  getLocationParticipants: (locationId: string) => LocationParticipant[];
  expandAll: boolean;
  onExpandAllChange: (expanded: boolean) => void;
  onPrint: () => void;
  currentUserId?: string;
  canExportICS?: boolean;
  canExportPDF?: boolean;
  onUpgrade?: () => void;
}

export function ItineraryPrintView({
  trip,
  locations,
  tripbits,
  travelers,
  getLocationParticipants,
  expandAll,
  onExpandAllChange,
  onPrint,
  currentUserId,
  canExportICS = true,
  canExportPDF = true,
  onUpgrade,
}: ItineraryPrintViewProps) {
  // Filter state: empty array = show all
  const [selectedTravelers, setSelectedTravelers] = useState<string[]>([]);
  // View mode: list or calendar
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  // Individual tripbit expand state
  const [expandedTripbits, setExpandedTripbits] = useState<Set<string>>(new Set());

  const toggleTraveler = (userId: string) => {
    setSelectedTravelers(prev => {
      if (prev.includes(userId)) {
        return prev.filter(id => id !== userId);
      }
      return [...prev, userId];
    });
  };

  const toggleTripbitExpand = (tripbitId: string) => {
    setExpandedTripbits(prev => {
      const next = new Set(prev);
      if (next.has(tripbitId)) {
        next.delete(tripbitId);
      } else {
        next.add(tripbitId);
      }
      return next;
    });
  };

  const isTripbitExpanded = (tripbitId: string) => {
    return expandAll || expandedTripbits.has(tripbitId);
  };

  // Check if current user is a traveler
  const currentUserIsTraveler = currentUserId && (
    travelers.some(t => t.user_id === currentUserId) || 
    trip.ownerProfile?.id === currentUserId
  );

  // Filter locations based on selected travelers
  const filteredLocations = selectedTravelers.length === 0
    ? locations
    : locations.filter(loc => {
        const locParticipants = getLocationParticipants(loc.id);
        // Show if no participants assigned (unassigned legs) OR if any selected traveler is assigned
        if (locParticipants.length === 0) return true;
        return locParticipants.some(p => selectedTravelers.includes(p.user_id));
      });

  // Filter tripbits based on selected travelers
  const getFilteredLocationTripbits = (locationId: string) => {
    const location = locations.find(l => l.id === locationId);
    
    // Get tripbits explicitly assigned to this location
    let locTripbits = tripbits.filter(r => r.location_id === locationId);
    
    // Also include tripbits with dates that fall within this location's date range but have no location_id
    if (location?.start_date && location?.end_date) {
      const locStart = new Date(location.start_date);
      const locEnd = new Date(location.end_date);
      
      const locationIds = locations.map(l => l.id);
      const datedUnassigned = tripbits.filter(r => {
        if (!r.start_date) return false;
        if (r.location_id && locationIds.includes(r.location_id)) return false; // Already assigned to a location
        
        const tripbitDate = new Date(r.start_date);
        return tripbitDate >= locStart && tripbitDate <= locEnd;
      });
      
      locTripbits = [...locTripbits, ...datedUnassigned];
    }
    
    const filtered = selectedTravelers.length === 0
      ? locTripbits
      : locTripbits.filter(r => {
          // Show if no participants assigned OR if any selected traveler is assigned
          if (!r.participants || r.participants.length === 0) return true;
          return r.participants.some(p => selectedTravelers.includes(p.user_id));
        });

    return [...filtered].sort((a, b) => {
      // date first
      if (!a.start_date && !b.start_date) return 0;
      if (!a.start_date) return 1;
      if (!b.start_date) return -1;
      const d = new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
      if (d !== 0) return d;

      // time within date
      const tA = getTripbitTimeString(a);
      const tB = getTripbitTimeString(b);
      if (!tA && !tB) return 0;
      if (!tA) return 1;
      if (!tB) return -1;
      return tA.localeCompare(tB);
    });
  };

  // General tripbits: items WITHOUT dates (like shared photo albums)
  const getFilteredUnassignedTripbits = () => {
    const locationIds = locations.map(l => l.id);
    // Only return tripbits that have NO date
    const unassigned = tripbits.filter(r => 
      (!r.location_id || !locationIds.includes(r.location_id)) && !r.start_date
    );
    const filtered = selectedTravelers.length === 0
      ? unassigned
      : unassigned.filter(r => {
          if (!r.participants || r.participants.length === 0) return true;
          return r.participants.some(p => selectedTravelers.includes(p.user_id));
        });

    return filtered;
  };

  // Dated tripbits not assigned to any location AND not matching any location's date range
  const getDatedUnassignedTripbits = () => {
    const locationIds = locations.map(l => l.id);
    
    // Return tripbits that HAVE a date but don't fit any location
    const dated = tripbits.filter(r => {
      if (!r.start_date) return false;
      if (r.location_id && locationIds.includes(r.location_id)) return false; // Explicitly assigned
      
      // Check if this tripbit's date falls within any location's date range
      const tripbitDate = new Date(r.start_date);
      const fitsAnyLocation = locations.some(loc => {
        if (!loc.start_date || !loc.end_date) return false;
        const locStart = new Date(loc.start_date);
        const locEnd = new Date(loc.end_date);
        return tripbitDate >= locStart && tripbitDate <= locEnd;
      });
      
      return !fitsAnyLocation; // Only show if it doesn't fit any location
    });
    
    const filtered = selectedTravelers.length === 0
      ? dated
      : dated.filter(r => {
          if (!r.participants || r.participants.length === 0) return true;
          return r.participants.some(p => selectedTravelers.includes(p.user_id));
        });

    return [...filtered].sort((a, b) => {
      const d = new Date(a.start_date!).getTime() - new Date(b.start_date!).getTime();
      if (d !== 0) return d;

      const tA = getTripbitTimeString(a);
      const tB = getTripbitTimeString(b);
      if (!tA && !tB) return 0;
      if (!tA) return 1;
      if (!tB) return -1;
      return tA.localeCompare(tB);
    });
  };
  const shortenUrl = (url: string, maxLength = 35) => {
    try {
      const urlObj = new URL(url);
      const display = urlObj.hostname + urlObj.pathname;
      return display.length > maxLength ? display.slice(0, maxLength) + '...' : display;
    } catch {
      return url.length > maxLength ? url.slice(0, maxLength) + '...' : url;
    }
  };

  const formatTime = (time: string | undefined) => {
    if (!time) return null;
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  const getTripbitTimeString = (tripbit: Tripbit): string | null => {
    const meta = tripbit.metadata as Record<string, unknown> | null;
    if (!meta) return null;
    return (
      (meta.time as string) ||
      (meta.departureTime as string) ||
      (meta.pickupTime as string) ||
      null
    );
  };

  const renderMetadataDetails = (tripbit: Tripbit) => {
    const meta = tripbit.metadata as Record<string, unknown> | null;
    if (!meta) return null;

    switch (tripbit.category) {
      case 'flight': {
        const flight = meta as FlightMetadata;
        return (
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mt-2">
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
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mt-2">
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
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mt-2">
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
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mt-2">
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
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm mt-2">
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

  const getInitials = (fullName: string | null, username: string) => {
    if (fullName) {
      return fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return username.slice(0, 2).toUpperCase();
  };

  const formatDateRange = () => {
    if (trip.is_flexible_dates && trip.flexible_month) {
      const monthDate = parseISO(`${trip.flexible_month}-01`);
      return `${format(monthDate, 'MMMM yyyy')} (flexible)`;
    }
    const start = parseISO(trip.start_date);
    const end = parseISO(trip.end_date);
    return `${format(start, 'MMMM d')} – ${format(end, 'MMMM d, yyyy')}`;
  };

  const getTripDuration = () => {
    const start = parseISO(trip.start_date);
    const end = parseISO(trip.end_date);
    const days = differenceInDays(end, start) + 1;
    const nights = days - 1;
    return `${days} days, ${nights} nights`;
  };

  const getLocationTripbits = (locationId: string) => {
    return tripbits.filter(r => r.location_id === locationId);
  };

  const getUnassignedTripbits = () => {
    const locationIds = locations.map(l => l.id);
    return tripbits.filter(r => !r.location_id || !locationIds.includes(r.location_id));
  };

  const getLocationDuration = (loc: TripLocation) => {
    if (loc.start_date && loc.end_date) {
      const start = parseISO(loc.start_date);
      const end = parseISO(loc.end_date);
      const nights = differenceInDays(end, start);
      return `${nights} night${nights !== 1 ? 's' : ''}`;
    }
    return null;
  };

  const allDestinations = [trip.destination, ...locations.map(l => l.destination)];

  const handleExportAll = () => {
    try {
      const icsContent = generateTripICS(trip, locations, tripbits);
      const filename = generateTripFilename(trip.name, trip.start_date);
      downloadICS(icsContent, filename);
      toast.success('Calendar file downloaded');
    } catch (error) {
      toast.error('Failed to export calendar');
    }
  };

  const handleExportTripbit = (tripbit: Tripbit) => {
    try {
      const icsContent = generateSingleEventICS(tripbit);
      const filename = `${tripbit.title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
      downloadICS(icsContent, filename);
      toast.success('Event downloaded');
    } catch (error) {
      toast.error('Tripbit needs a date to export');
    }
  };

  const handleGoogleCalendar = (tripbit: Tripbit) => {
    try {
      const url = generateGoogleCalendarURL(tripbit);
      window.open(url, '_blank');
    } catch (error) {
      toast.error('Tripbit needs a date to add to calendar');
    }
  };

  return (
    <div className="itinerary-print-view space-y-8">
      {/* Print Controls - hidden in print */}
      <div className="flex items-center justify-between gap-3 print:hidden flex-wrap">
        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
            className="gap-2 h-8"
          >
            <List className="w-4 h-4" />
            List
          </Button>
          <Button
            variant={viewMode === 'calendar' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('calendar')}
            className="gap-2 h-8"
          >
            <CalendarDays className="w-4 h-4" />
            Calendar
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {viewMode === 'list' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onExpandAllChange(!expandAll)}
              className="gap-2"
            >
              {expandAll ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Collapse All
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Expand All
                </>
              )}
            </Button>
          )}
        
          {canExportICS ? (
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <CalendarPlus className="w-4 h-4" />
                    Export to Calendar
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportAll} className="gap-2">
                    <Download className="w-4 h-4" />
                    Download .ics File (All Events)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <PremiumBadge />
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
              onClick={onUpgrade}
            >
              <CalendarPlus className="w-4 h-4" />
              Export
              <Badge className="ml-1 bg-amber-500/10 text-amber-600 text-[10px] border-0">PRO</Badge>
            </Button>
          )}

          {canExportPDF ? (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={onPrint}
                className="gap-2"
              >
                <Printer className="w-4 h-4" />
                Print Itinerary
              </Button>
              <PremiumBadge />
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="gap-2 border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
              onClick={onUpgrade}
            >
              <Printer className="w-4 h-4" />
              Print
              <Badge className="ml-1 bg-amber-500/10 text-amber-600 text-[10px] border-0">PRO</Badge>
            </Button>
          )}
        </div>
      </div>

      {/* Traveler Filter - hidden in print */}
      {travelers.length > 0 && (
        <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg print:hidden flex-wrap">
          <span className="text-sm font-medium text-muted-foreground">Show for:</span>
          <div className="flex flex-wrap items-center gap-2">
            {/* All button */}
            <Button 
              variant={selectedTravelers.length === 0 ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTravelers([])}
              className="h-8"
            >
              All
            </Button>
            
            {/* Me button (if current user is a traveler) */}
            {currentUserIsTraveler && currentUserId && (
              <Button
                variant={selectedTravelers.length === 1 && selectedTravelers[0] === currentUserId ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTravelers([currentUserId])}
                className="h-8"
              >
                Me
              </Button>
            )}
            
            {/* Individual travelers - multi-select */}
            {trip.ownerProfile && (
              <button
                key={trip.ownerProfile.id}
                onClick={() => toggleTraveler(trip.ownerProfile!.id)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border transition-colors",
                  selectedTravelers.includes(trip.ownerProfile.id) 
                    ? "border-primary bg-primary/10" 
                    : "border-border hover:border-primary/50"
                )}
              >
                <Avatar className="w-5 h-5">
                  <AvatarImage src={trip.ownerProfile.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px]">
                    {getInitials(trip.ownerProfile.full_name, trip.ownerProfile.username)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">
                  {trip.ownerProfile.full_name?.split(' ')[0] || trip.ownerProfile.username}
                </span>
                {selectedTravelers.includes(trip.ownerProfile.id) && (
                  <Check className="w-3 h-3 text-primary" />
                )}
              </button>
            )}
            {travelers.filter(t => t.user_id !== trip.ownerProfile?.id).map((traveler) => (
              <button
                key={traveler.user_id}
                onClick={() => toggleTraveler(traveler.user_id)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border transition-colors",
                  selectedTravelers.includes(traveler.user_id) 
                    ? "border-primary bg-primary/10" 
                    : "border-border hover:border-primary/50"
                )}
              >
                <Avatar className="w-5 h-5">
                  <AvatarImage src={traveler.profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px]">
                    {getInitials(traveler.profile?.full_name || null, traveler.profile?.username || '')}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm">
                  {traveler.profile?.full_name?.split(' ')[0] || traveler.profile?.username}
                </span>
                {selectedTravelers.includes(traveler.user_id) && (
                  <Check className="w-3 h-3 text-primary" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Trip Header */}
      <div className="bg-card border border-border rounded-xl p-6 print:border-none print:p-0 print:bg-transparent">
        <h1 className="font-display text-3xl font-bold text-foreground mb-4">{trip.name}</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-foreground/80 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wide">Destinations</p>
              <p className="font-medium text-foreground">
                {allDestinations.join(' → ')}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-foreground/80 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-muted-foreground text-xs uppercase tracking-wide">Dates</p>
              <p className="font-medium text-foreground">{formatDateRange()}</p>
              <p className="text-muted-foreground text-xs">{getTripDuration()}</p>
            </div>
          </div>
        </div>

        {trip.description && (
          <p className="text-muted-foreground mt-4 text-sm">{trip.description}</p>
        )}
      </div>

      {/* Travelers Section */}
      <div className="bg-card border border-border rounded-xl p-6 print:border print:border-border">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-full bg-foreground/80 flex items-center justify-center">
            <Users className="w-4 h-4 text-primary" />
          </div>
          <h2 className="font-display text-xl font-semibold">Who's Traveling</h2>
        </div>
        
        <div className="flex flex-wrap gap-4">
          {trip.ownerProfile && (
            <div className="flex items-center gap-3 bg-muted/50 rounded-lg px-4 py-2">
              <Avatar className="w-10 h-10">
                <AvatarImage src={trip.ownerProfile.avatar_url || undefined} />
                <AvatarFallback className="text-sm bg-primary text-primary-foreground">
                  {getInitials(trip.ownerProfile.full_name, trip.ownerProfile.username)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-foreground text-sm">
                  {trip.ownerProfile.full_name || trip.ownerProfile.username}
                </p>
                <p className="text-xs text-muted-foreground">Organizer</p>
              </div>
            </div>
          )}
          
          {travelers.filter(t => t.profile?.id !== trip.ownerProfile?.id).map((traveler) => (
            <div key={traveler.id} className="flex items-center gap-3 bg-muted/50 rounded-lg px-4 py-2">
              <Avatar className="w-10 h-10">
                <AvatarImage src={traveler.profile?.avatar_url || undefined} />
                <AvatarFallback className="text-sm">
                  {getInitials(traveler.profile?.full_name || null, traveler.profile?.username || '')}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-foreground text-sm">
                  {traveler.profile?.full_name || traveler.profile?.username}
                </p>
              </div>
            </div>
          ))}
        </div>
        
        <p className="text-muted-foreground text-sm mt-4">
          {travelers.length} traveler{travelers.length !== 1 ? 's' : ''} total
        </p>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && !trip.is_flexible_dates && trip.start_date && trip.end_date && (
        <ItineraryCalendarView
          tripbits={tripbits}
          locations={filteredLocations}
          startDate={trip.start_date}
          endDate={trip.end_date}
          selectedTravelers={selectedTravelers}
        />
      )}

      {/* List View - Itinerary by Location */}
      {viewMode === 'list' && filteredLocations.length > 0 && (
        <div className="space-y-6">
          <h2 className="font-display text-xl font-semibold flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-foreground/80 flex items-center justify-center">
              <MapPin className="w-4 h-4 text-primary" />
            </div>
            Itinerary
            {selectedTravelers.length > 0 && (
              <Badge variant="secondary" className="ml-2 text-xs">
                Filtered
              </Badge>
            )}
          </h2>
          
          {filteredLocations.map((loc, idx) => {
            const locTripbits = getFilteredLocationTripbits(loc.id);
            const duration = getLocationDuration(loc);
            const locParticipants = getLocationParticipants(loc.id);
            
            return (
              <div 
                key={loc.id} 
                className="bg-card border border-border rounded-xl overflow-hidden print:break-inside-avoid"
              >
                {/* Location Header */}
                <div className="bg-muted/50 px-6 py-4 border-b border-border">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          Leg {idx + 1}
                        </Badge>
                        {duration && (
                          <span className="text-xs text-muted-foreground">{duration}</span>
                        )}
                      </div>
                      <h3 className="font-display text-lg font-semibold text-foreground">
                        {loc.destination}
                      </h3>
                    </div>
                    {loc.start_date && loc.end_date && (
                      <div className="text-right text-sm">
                        <p className="text-muted-foreground">
                          {format(parseISO(loc.start_date), 'MMM d')} – {format(parseISO(loc.end_date), 'MMM d')}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Location Participants */}
                  {locParticipants.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">Travelers:</span>
                        <div className="flex items-center gap-2 flex-wrap">
                          {locParticipants.map((p) => (
                            <div key={p.id} className="flex items-center gap-1.5 bg-background/50 rounded-full px-2 py-0.5">
                              <Avatar className="w-5 h-5">
                                <AvatarImage src={p.profile?.avatar_url || undefined} />
                                <AvatarFallback className="text-[10px]">
                                  {getInitials(p.profile?.full_name || null, p.profile?.username || '')}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs font-medium">
                                {p.profile?.full_name?.split(' ')[0] || p.profile?.username}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Location Tripbits */}
                <div className="p-6">
                  {locTripbits.length > 0 ? (
                    <div className="space-y-3">
                      {locTripbits.map((tripbit) => {
                        const config = getCategoryConfig(tripbit.category);
                        const Icon = config.icon;
                        const isExpanded = isTripbitExpanded(tripbit.id);
                        return (
                          <div 
                            key={tripbit.id}
                            className={cn(
                              "rounded-lg border border-border/50 transition-colors",
                              isExpanded ? "bg-muted/30" : "hover:bg-muted/10"
                            )}
                          >
                            <button
                              onClick={() => toggleTripbitExpand(tripbit.id)}
                              className="w-full flex items-start gap-4 p-4 text-left cursor-pointer"
                            >
                              <div className={cn(
                                "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                                config.bgClass, config.textClass
                              )}>
                                <Icon className="w-5 h-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                                    {tripbit.category.replace('_', ' ')}
                                  </span>
                                  {tripbit.start_date && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {format(parseISO(tripbit.start_date), 'MMM d')}
                                      {getTripbitTimeString(tripbit) && (
                                        <span>• {formatTime(getTripbitTimeString(tripbit) || undefined)}</span>
                                      )}
                                    </span>
                                  )}
                                </div>
                                <h4 className="font-medium text-foreground">{tripbit.title}</h4>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                )}
                              </div>
                            </button>
                            
                            {/* Expanded Content */}
                            {isExpanded && (
                              <div className="px-4 pb-4 pl-[72px]">
                                {renderMetadataDetails(tripbit)}
                                {tripbit.description && (
                                  <p className="text-sm text-muted-foreground mt-2">{tripbit.description}</p>
                                )}
                                {tripbit.url && (
                                  <a 
                                    href={tripbit.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-xs text-foreground/70 hover:text-foreground hover:underline mt-2 inline-flex items-center gap-1 print:text-foreground"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    {shortenUrl(tripbit.url)}
                                  </a>
                                )}
                                {tripbit.start_date && (
                                  <div className="mt-3 pt-3 border-t border-border/30 flex gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleGoogleCalendar(tripbit);
                                      }}
                                      className="gap-1.5 text-xs h-7 print:hidden"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      Google Calendar
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleExportTripbit(tripbit);
                                      }}
                                      className="gap-1.5 text-xs h-7 print:hidden"
                                    >
                                      <Download className="w-3 h-3" />
                                      .ics
                                    </Button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No items planned for this leg yet
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Dated Tripbits Not Assigned to Locations - List View Only */}
      {viewMode === 'list' && getDatedUnassignedTripbits().length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden print:break-inside-avoid">
          <div className="bg-muted/50 px-6 py-4 border-b border-border">
            <h3 className="font-display text-lg font-semibold text-foreground">
              Additional Items
            </h3>
            <p className="text-xs text-muted-foreground mt-1">Items with dates not assigned to a specific leg</p>
          </div>
          <div className="p-6 space-y-3">
            {getDatedUnassignedTripbits().map((tripbit) => {
              const config = getCategoryConfig(tripbit.category);
              const Icon = config.icon;
              const isExpanded = isTripbitExpanded(tripbit.id);
              return (
                <div 
                  key={tripbit.id}
                  className={cn(
                    "rounded-lg border border-border/50 transition-colors",
                    isExpanded ? "bg-muted/30" : "hover:bg-muted/10"
                  )}
                >
                  <button
                    onClick={() => toggleTripbitExpand(tripbit.id)}
                    className="w-full flex items-start gap-4 p-4 text-left cursor-pointer"
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                      config.bgClass, config.textClass
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">
                          {tripbit.category.replace('_', ' ')}
                        </span>
                        {tripbit.start_date && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(parseISO(tripbit.start_date), 'MMM d')}
                            {tripbit.end_date && tripbit.end_date !== tripbit.start_date && (
                              <> – {format(parseISO(tripbit.end_date), 'MMM d')}</>
                            )}
                            {getTripbitTimeString(tripbit) && (
                              <span>• {formatTime(getTripbitTimeString(tripbit) || undefined)}</span>
                            )}
                          </span>
                        )}
                      </div>
                      <h4 className="font-medium text-foreground">{tripbit.title}</h4>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                  
                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pl-[72px]">
                      {renderMetadataDetails(tripbit)}
                      {tripbit.description && (
                        <p className="text-sm text-muted-foreground mt-2">{tripbit.description}</p>
                      )}
                      {tripbit.url && (
                        <a 
                          href={tripbit.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-xs text-foreground/70 hover:text-foreground hover:underline mt-2 inline-flex items-center gap-1 print:text-foreground"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {shortenUrl(tripbit.url)}
                        </a>
                      )}
                      {tripbit.start_date && (
                        <div className="mt-3 pt-3 border-t border-border/30 flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGoogleCalendar(tripbit);
                            }}
                            className="gap-1.5 text-xs h-7 print:hidden"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Google Calendar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExportTripbit(tripbit);
                            }}
                            className="gap-1.5 text-xs h-7 print:hidden"
                          >
                            <Download className="w-3 h-3" />
                            .ics
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {viewMode === 'list' && getFilteredUnassignedTripbits().length > 0 && (
        <div className="bg-card border border-border rounded-xl overflow-hidden print:break-inside-avoid">
          <div className="bg-muted/50 px-6 py-4 border-b border-border">
            <h3 className="font-display text-lg font-semibold text-foreground">
              General Tripbits
            </h3>
          </div>
          <div className="p-6 space-y-3">
            {getFilteredUnassignedTripbits().map((tripbit) => {
              const config = getCategoryConfig(tripbit.category);
              const Icon = config.icon;
              const isExpanded = isTripbitExpanded(tripbit.id);
              return (
                <div 
                  key={tripbit.id}
                  className={cn(
                    "rounded-lg border border-border/50 transition-colors",
                    isExpanded ? "bg-muted/30" : "hover:bg-muted/10"
                  )}
                >
                  <button
                    onClick={() => toggleTripbitExpand(tripbit.id)}
                    className="w-full flex items-start gap-4 p-4 text-left cursor-pointer"
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
                      config.bgClass, config.textClass
                    )}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        {tripbit.category.replace('_', ' ')}
                      </span>
                      <h4 className="font-medium text-foreground">{tripbit.title}</h4>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>
                  
                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pl-[72px]">
                      {renderMetadataDetails(tripbit)}
                      {tripbit.description && (
                        <p className="text-sm text-muted-foreground mt-2">{tripbit.description}</p>
                      )}
                      {tripbit.start_date && (
                        <div className="mt-3 pt-3 border-t border-border/30 flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGoogleCalendar(tripbit);
                            }}
                            className="gap-1.5 text-xs h-7 print:hidden"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Google Calendar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExportTripbit(tripbit);
                            }}
                            className="gap-1.5 text-xs h-7 print:hidden"
                          >
                            <Download className="w-3 h-3" />
                            .ics
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer for print */}
      <div className="hidden print:block text-center text-sm text-muted-foreground pt-8 border-t border-border">
        <p>Generated from your trip itinerary</p>
      </div>
    </div>
  );
}