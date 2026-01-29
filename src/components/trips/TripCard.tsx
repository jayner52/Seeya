import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TripData, useTrips } from '@/hooks/useTrips';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AvatarGroup } from '@/components/ui/avatar-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { MapPin, Calendar, ChevronRight, CalendarPlus, Star, Pencil } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { useTripUnreadIndicators } from '@/hooks/useTripUnreadIndicators';
import { useAddTripRecommendation } from '@/hooks/useAddTripRecommendation';
import { TripLocation } from '@/hooks/useTripLocations';
import { QuickDateEditDialog } from './QuickDateEditDialog';
import { AddRecommendationDialog } from './AddRecommendationDialog';

interface TripCardProps {
  trip: TripData;
  index?: number;
  locations?: TripLocation[];
  onRefresh?: () => void;
}

export function TripCard({ trip, index = 0, locations = [], onRefresh }: TripCardProps) {
  const { getHasUnread } = useTripUnreadIndicators();
  const { addRecommendation } = useAddTripRecommendation(trip.id);
  const { updateTrip } = useTrips();
  const hasUnread = getHasUnread(trip.id);
  const navigate = useNavigate();
  
  const [showDateDialog, setShowDateDialog] = useState(false);
  const [showRecommendationDialog, setShowRecommendationDialog] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(trip.name);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [isEditingName]);

  const handleSaveName = async () => {
    const trimmedName = editedName.trim();
    if (trimmedName && trimmedName !== trip.name) {
      await updateTrip(trip.id, { name: trimmedName });
      onRefresh?.();
    } else {
      setEditedName(trip.name); // Reset if empty or unchanged
    }
    setIsEditingName(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveName();
    } else if (e.key === 'Escape') {
      setEditedName(trip.name);
      setIsEditingName(false);
    }
  };
  
  const showLocation = trip.visibility === 'location_only' || trip.visibility === 'full_details';
  const showDates = trip.visibility === 'dates_only' || trip.visibility === 'full_details';
  const isBusyOnly = trip.visibility === 'busy_only';
  const isPrivate = trip.visibility === 'only_me';
  
  // Check if this is a past trip without dates
  const isPastTripWithoutDates = trip.is_logged_past_trip && !trip.start_date && !trip.end_date;

  const formatDateRange = () => {
    if (trip.is_flexible_dates && trip.flexible_month) {
      return trip.flexible_month;
    }
    if (!trip.start_date || !trip.end_date) {
      return null;
    }
    const start = parseISO(trip.start_date);
    const end = parseISO(trip.end_date);
    return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
  };

  const getStatusBadge = () => {
    if (trip.status === 'owner') {
      return <Badge className="bg-purple-accent text-purple-accent-foreground border-0 pointer-events-none">Your Trip</Badge>;
    }
    switch (trip.status) {
      case 'confirmed':
        return <Badge className="bg-green-bg text-green-text border-0 pointer-events-none">Confirmed</Badge>;
      case 'invited':
        return <Badge className="bg-yellow-accent/30 text-yellow-accent-foreground border-0 pointer-events-none">Invited</Badge>;
      case 'declined':
        return <Badge className="bg-muted text-muted-foreground border-0 pointer-events-none">Declined</Badge>;
    }
  };

  const confirmedParticipants = trip.participants.filter(p => p.status === 'confirmed');

  // Build itinerary: only use trip_locations if they exist, otherwise use trip.destination as fallback
  // This fixes the duplicate destination bug
  const allDestinations = locations.length > 0 
    ? locations.map(l => l.destination)
    : [trip.destination];
  const displayDestinations = allDestinations.slice(0, 3);
  const remainingCount = allDestinations.length - 3;

  // Extract country information for flags
  // Parse countries from destination strings (format: "City, Country" or just "Country")
  const extractCountries = (): { name: string; emoji: string }[] => {
    const countrySet = new Map<string, string>();
    
    // Helper to extract and add country from a destination string
    const addCountryFromDestination = (dest: string) => {
      const parts = dest.split(',').map(p => p.trim());
      // The last part is typically the country
      if (parts.length > 0) {
        const countryName = parts[parts.length - 1];
        // Only add if it looks like a country (not a city/region)
        // Simple heuristic: if it's already in our map or is a single word
        if (!countrySet.has(countryName)) {
          // Try to get emoji from common country codes
          const emoji = getCountryEmojiFromName(countryName);
          countrySet.set(countryName, emoji);
        }
      }
    };

    // Process all destinations
    allDestinations.forEach(addCountryFromDestination);
    
    return Array.from(countrySet.entries())
      .map(([name, emoji]) => ({ name, emoji }))
      .slice(0, 4); // Max 4 countries to display
  };

  const countries = extractCountries();

  return (
    <Card 
      className={cn(
        "group overflow-hidden bg-card hover:shadow-elevated transition-all duration-300 animate-slide-up border-border/50 cursor-pointer relative",
        "hover:-translate-y-1"
      )}
      style={{ animationDelay: `${index * 100}ms` }}
      onClick={() => navigate(`/trips/${trip.id}`)}
    >
      {/* Unread indicator */}
      {hasUnread && (
        <span className="absolute top-4 right-4 h-2.5 w-2.5 rounded-full bg-red-500 z-10" />
      )}
      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            {isEditingName && trip.isOwner ? (
              <Input
                ref={nameInputRef}
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
                className="font-display text-xl font-semibold h-8 px-2 -ml-2 mb-1"
              />
            ) : (
              <div className="group/name flex items-center gap-1.5 mb-1">
                <h3 className="font-display text-xl font-semibold text-foreground transition-colors">
                  {isPrivate || isBusyOnly ? 'Private Trip' : trip.name}
                </h3>
                {trip.isOwner && !isPrivate && !isBusyOnly && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsEditingName(true);
                    }}
                    className="opacity-0 group-hover/name:opacity-100 transition-opacity p-1 hover:bg-muted rounded"
                    title="Edit trip name"
                  >
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>
            )}
            {/* Country flags */}
            {countries.length > 0 && !isPrivate && !isBusyOnly && (
              <div className="flex items-center gap-1.5 mb-1">
                {countries.map((country, idx) => (
                  <span key={idx} className="text-base" title={country.name}>
                    {country.emoji || '🌍'}
                  </span>
                ))}
                {countries.length > 0 && (
                  <span className="text-xs text-muted-foreground">
                    {countries.map(c => c.name).join(', ')}
                  </span>
                )}
              </div>
            )}
            {getStatusBadge()}
          </div>
        </div>

        {/* Details */}
        <div className="space-y-2 mb-3">
          {/* Location / Itinerary */}
          <div className="flex items-start gap-2 text-foreground">
            <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            {showLocation ? (
              <div className="flex flex-wrap items-center gap-1 min-w-0">
                {displayDestinations.map((dest, idx) => (
                  <span key={idx} className="flex items-center">
                    <span className={cn("truncate", idx === 0 ? "font-medium" : "text-muted-foreground")}>
                      {dest.split(',')[0]}
                    </span>
                    {idx < displayDestinations.length - 1 && (
                      <ChevronRight className="w-3 h-3 mx-0.5 text-muted-foreground/50 flex-shrink-0" />
                    )}
                  </span>
                ))}
                {remainingCount > 0 && (
                  <span className="text-muted-foreground ml-1">+{remainingCount} more</span>
                )}
              </div>
            ) : (
              <span className="text-muted-foreground italic">Location hidden</span>
            )}
          </div>

          {/* Dates */}
          <div className="flex items-center gap-2 text-foreground">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            {showDates ? (
              formatDateRange() ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDateDialog(true);
                  }}
                  className="hover:underline hover:text-foreground cursor-pointer"
                >
                  {formatDateRange()}
                </button>
              ) : isPastTripWithoutDates ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDateDialog(true);
                  }}
                  className="text-muted-foreground hover:text-foreground hover:underline italic flex items-center gap-1"
                >
                  <CalendarPlus className="w-3 h-3" />
                  When did you go here?
                </button>
              ) : (
                <span className="text-muted-foreground italic">No dates set</span>
              )
            ) : isBusyOnly ? (
              <span className="text-muted-foreground italic">Unavailable</span>
            ) : (
              <span className="text-muted-foreground italic">Dates hidden</span>
            )}
          </div>
        </div>

        {/* Participants */}
        {confirmedParticipants.length > 0 && trip.visibility === 'full_details' && (
          <div className="pt-3 border-t border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* Show owner avatar for trips you don't own */}
                {!trip.isOwner && trip.ownerProfile && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Avatar className="w-5 h-5 ring-1 ring-primary/30">
                          <AvatarImage src={trip.ownerProfile.avatar_url || undefined} />
                          <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                            {(trip.ownerProfile.full_name || trip.ownerProfile.username || '?').slice(0, 1).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        Trip by {trip.ownerProfile.full_name || trip.ownerProfile.username}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                <span className="text-sm text-muted-foreground">Traveling with</span>
              </div>
              <AvatarGroup
                avatars={confirmedParticipants.map(p => ({ 
                  src: p.profile?.avatar_url || undefined, 
                  name: p.profile?.full_name || p.profile?.username || '' 
                }))}
                size="sm"
              />
            </div>
          </div>
        )}
        
        {/* Add Recommendation button for past trips */}
        {trip.is_logged_past_trip && trip.isOwner && (
          <div className="pt-2 mt-2 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              className="w-full gap-2 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                setShowRecommendationDialog(true);
              }}
            >
              <Star className="w-4 h-4" />
              Add Recommendation
            </Button>
          </div>
        )}
      </CardContent>
      
      {/* Quick Date Edit Dialog */}
      <QuickDateEditDialog
        open={showDateDialog}
        onOpenChange={setShowDateDialog}
        tripId={trip.id}
        tripName={trip.name}
        onSuccess={onRefresh}
        initialStartDate={trip.start_date}
        initialEndDate={trip.end_date}
        initialFlexibleMonth={trip.flexible_month}
        initialIsFlexible={trip.is_flexible_dates}
      />
      
      {/* Add Recommendation Dialog */}
      <AddRecommendationDialog
        open={showRecommendationDialog}
        onOpenChange={setShowRecommendationDialog}
        onSubmit={addRecommendation}
        locations={locations}
        mainDestination={trip.destination}
      />
    </Card>
  );
}

// Helper function to get country emoji from country name
// This is a simplified mapping for common countries
function getCountryEmojiFromName(countryName: string): string {
  const countryMap: Record<string, string> = {
    // Common countries
    'United States': '🇺🇸', 'USA': '🇺🇸', 'US': '🇺🇸',
    'United Kingdom': '🇬🇧', 'UK': '🇬🇧', 'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    'Canada': '🇨🇦',
    'Australia': '🇦🇺',
    'Germany': '🇩🇪', 'Deutschland': '🇩🇪',
    'France': '🇫🇷',
    'Italy': '🇮🇹', 'Italia': '🇮🇹',
    'Spain': '🇪🇸', 'España': '🇪🇸',
    'Japan': '🇯🇵',
    'China': '🇨🇳',
    'South Korea': '🇰🇷', 'Korea': '🇰🇷',
    'Mexico': '🇲🇽',
    'Brazil': '🇧🇷',
    'Argentina': '🇦🇷',
    'India': '🇮🇳',
    'Thailand': '🇹🇭',
    'Vietnam': '🇻🇳',
    'Indonesia': '🇮🇩',
    'Philippines': '🇵🇭',
    'South Africa': '🇿🇦',
    'Egypt': '🇪🇬',
    'Morocco': '🇲🇦',
    'Kenya': '🇰🇪',
    'Tanzania': '🇹🇿',
    'Namibia': '🇳🇦',
    'Botswana': '🇧🇼',
    'Zimbabwe': '🇿🇼',
    'Netherlands': '🇳🇱', 'Holland': '🇳🇱',
    'Belgium': '🇧🇪',
    'Switzerland': '🇨🇭',
    'Austria': '🇦🇹',
    'Portugal': '🇵🇹',
    'Greece': '🇬🇷',
    'Turkey': '🇹🇷', 'Türkiye': '🇹🇷',
    'Russia': '🇷🇺',
    'Poland': '🇵🇱',
    'Czech Republic': '🇨🇿', 'Czechia': '🇨🇿',
    'Hungary': '🇭🇺',
    'Sweden': '🇸🇪',
    'Norway': '🇳🇴',
    'Denmark': '🇩🇰',
    'Finland': '🇫🇮',
    'Iceland': '🇮🇸',
    'Ireland': '🇮🇪',
    'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
    'New Zealand': '🇳🇿',
    'Singapore': '🇸🇬',
    'Malaysia': '🇲🇾',
    'UAE': '🇦🇪', 'United Arab Emirates': '🇦🇪', 'Dubai': '🇦🇪',
    'Israel': '🇮🇱',
    'Colombia': '🇨🇴',
    'Peru': '🇵🇪',
    'Chile': '🇨🇱',
    'Costa Rica': '🇨🇷',
    'Panama': '🇵🇦',
    'Cuba': '🇨🇺',
    'Jamaica': '🇯🇲',
    'Croatia': '🇭🇷',
    'Slovenia': '🇸🇮',
    'Romania': '🇷🇴',
    'Bulgaria': '🇧🇬',
    'Serbia': '🇷🇸',
    'Montenegro': '🇲🇪',
    'Albania': '🇦🇱',
    'Malta': '🇲🇹',
    'Cyprus': '🇨🇾',
    'Luxembourg': '🇱🇺',
    'Monaco': '🇲🇨',
    'Maldives': '🇲🇻',
    'Sri Lanka': '🇱🇰',
    'Nepal': '🇳🇵',
    'Bali': '🇮🇩', // Technically Indonesia
    'Hawaii': '🇺🇸', // Technically US
    'Puerto Rico': '🇵🇷',
    'Hong Kong': '🇭🇰',
    'Taiwan': '🇹🇼',
    'Cambodia': '🇰🇭',
    'Laos': '🇱🇦',
    'Myanmar': '🇲🇲', 'Burma': '🇲🇲',
    'Bangladesh': '🇧🇩',
    'Pakistan': '🇵🇰',
    'Saudi Arabia': '🇸🇦',
    'Qatar': '🇶🇦',
    'Oman': '🇴🇲',
    'Jordan': '🇯🇴',
    'Lebanon': '🇱🇧',
    'Tunisia': '🇹🇳',
    'Algeria': '🇩🇿',
    'Nigeria': '🇳🇬',
    'Ghana': '🇬🇭',
    'Ethiopia': '🇪🇹',
    'Uganda': '🇺🇬',
    'Rwanda': '🇷🇼',
    'Zambia': '🇿🇲',
    'Mozambique': '🇲🇿',
    'Madagascar': '🇲🇬',
    'Mauritius': '🇲🇺',
    'Seychelles': '🇸🇨',
    'Ecuador': '🇪🇨',
    'Bolivia': '🇧🇴',
    'Paraguay': '🇵🇾',
    'Uruguay': '🇺🇾',
    'Venezuela': '🇻🇪',
    'Guatemala': '🇬🇹',
    'Honduras': '🇭🇳',
    'El Salvador': '🇸🇻',
    'Nicaragua': '🇳🇮',
    'Belize': '🇧🇿',
    'Dominican Republic': '🇩🇴',
    'Bahamas': '🇧🇸',
    'Barbados': '🇧🇧',
    'Trinidad and Tobago': '🇹🇹',
    'Fiji': '🇫🇯',
    'Tahiti': '🇵🇫', // French Polynesia
    'French Polynesia': '🇵🇫',
  };
  
  return countryMap[countryName] || '🌍';
}
