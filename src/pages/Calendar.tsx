import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { useTrips } from '@/hooks/useTrips';
import { useFriends } from '@/hooks/useFriends';
import { useCircleTrips } from '@/hooks/useCircleTrips';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useSubscription } from '@/hooks/useSubscription';
import { UpgradePrompt } from '@/components/premium/UpgradePrompt';
import { PremiumBadge } from '@/components/premium/PremiumBadge';
import { TripVisibilityDropdown } from '@/components/trips/TripVisibilityDropdown';
import { shouldShowTrip, getEffectiveVisibility } from '@/lib/visibility';
import { getFriendColor, getOwnerColor, FriendColor } from '@/lib/friendColors';
import { ChevronLeft, ChevronRight, MapPin, Lock, CalendarDays, ExternalLink, Plane, EyeOff, Check, Mail, Eye, Users, User } from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isToday,
  addMonths,
  subMonths,
  parseISO,
  isWithinInterval,
  differenceInDays,
  isFuture,
  startOfDay,
} from 'date-fns';
import { cn } from '@/lib/utils';
import { Database } from '@/integrations/supabase/types';

type VisibilityLevel = Database['public']['Enums']['visibility_level'];
type ParticipationStatus = 'owner' | 'confirmed' | 'invited' | 'pending' | 'tentative' | 'viewing';

type MonthsView = 1 | 3 | 6 | 12;
type TripFilter = 'all' | 'my-trips' | 'shared' | 'invites';

const STORAGE_KEY_MONTHS = 'calendar-months-view';
const STORAGE_KEY_FRIENDS = 'calendar-enabled-friends';
const STORAGE_KEY_FILTER = 'calendar-trip-filter';

// Parse flexible_month string (e.g., "September 2013") into date range
const parseFlexibleMonth = (flexibleMonth: string): { start: Date; end: Date } | null => {
  const parts = flexibleMonth.split(' ');
  if (parts.length !== 2) return null;
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const monthIndex = monthNames.indexOf(parts[0]);
  const year = parseInt(parts[1]);
  
  if (monthIndex === -1 || isNaN(year)) return null;
  
  const start = new Date(year, monthIndex, 1);
  const end = endOfMonth(start);
  return { start, end };
};

interface EnhancedTrip {
  id: string;
  name: string;
  destination: string;
  start_date: string | null;
  end_date: string | null;
  visibility: VisibilityLevel;
  isOwner: boolean;
  owner_id: string;
  owner_username?: string;
  owner_full_name?: string | null;
  owner_avatar_url?: string | null;
  country_emoji?: string | null;
  participationStatus: ParticipationStatus;
  ownerColor: FriendColor;
  is_flexible_dates?: boolean;
  flexible_month?: string | null;
  personal_visibility?: VisibilityLevel | null;
}

export default function Calendar() {
  const navigate = useNavigate();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [monthsToShow, setMonthsToShow] = useState<MonthsView>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_MONTHS);
    return saved ? (Number(saved) as MonthsView) : 1;
  });
  const [enabledFriends, setEnabledFriends] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_FRIENDS);
    return saved ? JSON.parse(saved) : [];
  });
  const [tripFilter, setTripFilter] = useState<TripFilter>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_FILTER);
    return (saved as TripFilter) || 'all';
  });
  
  const { user } = useAuth();
  const { friends } = useFriends();
  const { trips, updatePersonalVisibility, respondToInvitation } = useTrips();
  const { trips: circleTrips } = useCircleTrips();
  const { toast } = useToast();
  const { canAccessCalendar, isLoading: subLoading } = useSubscription();

  const ownerColor = getOwnerColor();

  // Memoize friend colors to keep them consistent
  const friendColors = useMemo(() => {
    const colors = new Map<string, FriendColor>();
    friends.forEach(friend => {
      colors.set(friend.profile.id, getFriendColor(friend.profile.id));
    });
    // Also get colors for circle trip owners who might not be direct friends
    circleTrips.forEach(trip => {
      if (!colors.has(trip.owner_id)) {
        colors.set(trip.owner_id, getFriendColor(trip.owner_id));
      }
    });
    return colors;
  }, [friends, circleTrips]);

  // Persist settings
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MONTHS, String(monthsToShow));
  }, [monthsToShow]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_FRIENDS, JSON.stringify(enabledFriends));
  }, [enabledFriends]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_FILTER, tripFilter);
  }, [tripFilter]);

  const toggleFriend = (friendId: string) => {
    setEnabledFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  // Get enhanced trips with participation status and colors
  const getTripsForDay = (day: Date): EnhancedTrip[] => {
    const tripMap = new Map<string, EnhancedTrip>();

    // Add own trips
    trips.forEach((trip) => {
      let inRange = false;
      if (trip.start_date && trip.end_date) {
        const start = parseISO(trip.start_date);
        const end = parseISO(trip.end_date);
        inRange = isWithinInterval(day, { start, end });
      } else if (trip.is_flexible_dates && trip.flexible_month) {
        const parsed = parseFlexibleMonth(trip.flexible_month);
        if (parsed) {
          inRange = isWithinInterval(day, { start: parsed.start, end: parsed.end });
        }
      }
      
      if (!inRange) return;

      const isOwner = trip.owner_id === user?.id;
      let participationStatus: ParticipationStatus = 'viewing';
      
      if (isOwner) {
        participationStatus = 'owner';
      } else if (trip.status === 'confirmed') {
        participationStatus = 'confirmed';
      } else if (trip.status === 'invited') {
        participationStatus = 'invited';
      } else if (trip.status === 'pending') {
        participationStatus = 'pending';
      } else if (trip.status === 'tentative') {
        participationStatus = 'tentative';
      }

      tripMap.set(trip.id, {
        id: trip.id,
        name: trip.name,
        destination: trip.destination,
        start_date: trip.start_date,
        end_date: trip.end_date,
        visibility: trip.visibility,
        isOwner,
        owner_id: trip.owner_id,
        owner_username: trip.ownerProfile?.username,
        owner_full_name: trip.ownerProfile?.full_name,
        owner_avatar_url: trip.ownerProfile?.avatar_url,
        participationStatus,
        ownerColor: isOwner ? ownerColor : (friendColors.get(trip.owner_id) || ownerColor),
        is_flexible_dates: trip.is_flexible_dates,
        flexible_month: trip.flexible_month,
        personal_visibility: trip.personal_visibility,
      });
    });

    // Add circle trips (friend trips)
    const enabledCircleTrips = circleTrips.filter(trip => 
      enabledFriends.includes(trip.owner_id)
    );

    enabledCircleTrips.forEach((trip) => {
      if (!trip.start_date || !trip.end_date) return;
      
      const start = parseISO(trip.start_date);
      const end = parseISO(trip.end_date);
      if (!isWithinInterval(day, { start, end })) return;

      const existing = tripMap.get(trip.trip_id);
      if (existing) {
        // Already have this trip from own trips, update with owner info
        tripMap.set(trip.trip_id, {
          ...existing,
          owner_username: trip.owner_username,
          owner_full_name: trip.owner_full_name,
          owner_avatar_url: trip.owner_avatar_url,
          country_emoji: trip.country_emoji,
        });
      } else {
        // New trip from friend
        tripMap.set(trip.trip_id, {
          id: trip.trip_id,
          name: trip.trip_name,
          destination: trip.destination,
          start_date: trip.start_date,
          end_date: trip.end_date,
          visibility: trip.visibility,
          isOwner: false,
          owner_id: trip.owner_id,
          owner_username: trip.owner_username,
          owner_full_name: trip.owner_full_name,
          owner_avatar_url: trip.owner_avatar_url,
          country_emoji: trip.country_emoji,
          participationStatus: 'viewing',
          ownerColor: friendColors.get(trip.owner_id) || ownerColor,
        });
      }
    });

    // Apply filter
    let result = Array.from(tripMap.values());
    
    if (tripFilter === 'my-trips') {
      result = result.filter(t => t.participationStatus === 'owner');
    } else if (tripFilter === 'shared') {
      result = result.filter(t => t.participationStatus === 'confirmed' || t.participationStatus === 'tentative');
    } else if (tripFilter === 'invites') {
      result = result.filter(t => t.participationStatus === 'invited' || t.participationStatus === 'pending');
    }

    return result;
  };

  const getInitials = (fullName: string | null, username: string) => {
    if (fullName) {
      return fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return username.slice(0, 2).toUpperCase();
  };

  // Generate array of months to display
  const monthsArray = Array.from({ length: monthsToShow }, (_, i) => 
    addMonths(currentMonth, i)
  );

  // Navigation functions
  const navigatePrev = () => setCurrentMonth(subMonths(currentMonth, monthsToShow));
  const navigateNext = () => setCurrentMonth(addMonths(currentMonth, monthsToShow));
  const goToToday = () => setCurrentMonth(new Date());

  const todayInView = monthsArray.some(month => isSameMonth(month, new Date()));

  const getGridLayout = () => {
    switch (monthsToShow) {
      case 1: return 'grid-cols-1';
      case 3: return 'grid-cols-1 md:grid-cols-3';
      case 6: return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
      case 12: return 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
    }
  };

  const getCellHeight = () => {
    switch (monthsToShow) {
      case 1: return 'h-24';
      case 3: return 'h-16';
      case 6: return 'h-12';
      case 12: return 'h-9';
    }
  };

  const isCompactView = monthsToShow > 1;
  const isVeryCompactView = monthsToShow >= 6;

  // Count trips for stats
  const tripCounts = useMemo(() => {
    const counts = { myTrips: 0, shared: 0, invites: 0, byFriend: new Map<string, number>() };
    
    trips.forEach(trip => {
      if (trip.owner_id === user?.id) counts.myTrips++;
      else if (trip.status === 'confirmed' || trip.status === 'tentative') counts.shared++;
      else if (trip.status === 'invited' || trip.status === 'pending') counts.invites++;
    });

    circleTrips.forEach(trip => {
      const current = counts.byFriend.get(trip.owner_id) || 0;
      counts.byFriend.set(trip.owner_id, current + 1);
    });

    return counts;
  }, [trips, circleTrips, user?.id]);

  // Gate calendar access for premium users
  if (!subLoading && !canAccessCalendar) {
    return (
      <PageLayout
        title="Calendar"
        subtitle="View your travel schedule and friend availability"
      >
        <div className="max-w-md mx-auto py-12">
          <UpgradePrompt feature="Calendar View" />
        </div>
      </PageLayout>
    );
  }

  const handleVisibilityChange = async (tripId: string, visibility: VisibilityLevel | null) => {
    const { error } = await updatePersonalVisibility(tripId, visibility);
    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update visibility',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Visibility updated',
        description: visibility === 'only_me' 
          ? 'Trip hidden from your calendar' 
          : 'Trip visibility updated',
      });
    }
  };

  return (
    <PageLayout
      title="Calendar"
      subtitle="View your travel schedule and friend availability"
    >
      <div className="mb-6 -mt-4 flex items-center gap-2">
        <PremiumBadge />
      </div>
      <div className="grid lg:grid-cols-4 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-3">
          <Card className="bg-card border-border/50 animate-fade-in">
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                  <CardTitle className="font-display text-xl sm:text-2xl">
                    {monthsToShow === 1 
                      ? format(currentMonth, 'MMMM yyyy')
                      : `${format(currentMonth, 'MMM yyyy')} - ${format(monthsArray[monthsArray.length - 1], 'MMM yyyy')}`
                    }
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={navigatePrev}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={navigateNext}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToToday}
                      disabled={todayInView}
                      className="ml-1"
                    >
                      <CalendarDays className="w-4 h-4 mr-1.5" />
                      Today
                    </Button>
                  </div>
                </div>
                
                {/* View toggles */}
                <ToggleGroup 
                  type="single" 
                  value={String(monthsToShow)}
                  onValueChange={(value) => value && setMonthsToShow(Number(value) as MonthsView)}
                  className="bg-muted rounded-lg p-1"
                >
                  <ToggleGroupItem value="1" aria-label="1 month view" className="text-xs px-3">
                    1 Mo
                  </ToggleGroupItem>
                  <ToggleGroupItem value="3" aria-label="3 month view" className="text-xs px-3">
                    3 Mo
                  </ToggleGroupItem>
                  <ToggleGroupItem value="6" aria-label="6 month view" className="text-xs px-3">
                    6 Mo
                  </ToggleGroupItem>
                  <ToggleGroupItem value="12" aria-label="12 month view" className="text-xs px-3">
                    12 Mo
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </CardHeader>
            <CardContent>
              <TooltipProvider>
                <div className={cn('grid gap-4', getGridLayout())}>
                  {monthsArray.map((month) => (
                    <MonthGrid 
                      key={month.toISOString()}
                      month={month}
                      currentMonth={currentMonth}
                      getTripsForDay={getTripsForDay}
                      cellHeight={getCellHeight()}
                      isCompactView={isCompactView}
                      isVeryCompactView={isVeryCompactView}
                      showHeader={monthsToShow > 1}
                      onViewTrip={(tripId) => navigate(`/trips/${tripId}`)}
                      onRespondToInvite={async (tripId, response) => {
                        await respondToInvitation(tripId, response);
                        toast({
                          title: response === 'confirmed' ? 'Invite accepted!' : 'Invite declined',
                          description: response === 'confirmed' 
                            ? 'You have joined this trip' 
                            : 'You have declined this invitation',
                        });
                      }}
                    />
                  ))}
                </div>
              </TooltipProvider>
              
              {/* Enhanced Legend */}
              <div className="flex flex-wrap items-center justify-center gap-4 text-xs pt-4 mt-4 border-t border-border/30">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-primary/30 ring-1 ring-primary" />
                  <span className="text-muted-foreground">Your trips</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-emerald-500/30 flex items-center justify-center">
                    <Check className="w-2 h-2 text-emerald-600" />
                  </div>
                  <span className="text-muted-foreground">Accepted</span>
                </div>
              <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-amber-400/50 border border-dashed border-amber-600 ring-1 ring-amber-600" />
                  <span className="text-muted-foreground">Invited</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-teal-500/30 flex items-center justify-center">
                    <Eye className="w-2 h-2 text-teal-600" />
                  </div>
                  <span className="text-muted-foreground">Viewing</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-[9px] font-bold">
                    {format(new Date(), 'd')}
                  </div>
                  <span className="text-muted-foreground">Today</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-4">
          {/* Filter Controls */}
          <Card className="bg-card border-border/50 animate-slide-up">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-lg">Filter Trips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge 
                  variant={tripFilter === 'all' ? 'default' : 'outline'}
                  className="cursor-pointer transition-colors"
                  onClick={() => setTripFilter('all')}
                >
                  All
                </Badge>
                <Badge 
                  variant={tripFilter === 'my-trips' ? 'default' : 'outline'}
                  className="cursor-pointer transition-colors"
                  onClick={() => setTripFilter('my-trips')}
                >
                  <User className="w-3 h-3 mr-1" />
                  My Trips ({tripCounts.myTrips})
                </Badge>
                <Badge 
                  variant={tripFilter === 'shared' ? 'default' : 'outline'}
                  className="cursor-pointer transition-colors"
                  onClick={() => setTripFilter('shared')}
                >
                  <Users className="w-3 h-3 mr-1" />
                  Shared ({tripCounts.shared})
                </Badge>
                {tripCounts.invites > 0 && (
                  <Badge 
                    variant={tripFilter === 'invites' ? 'default' : 'outline'}
                    className="cursor-pointer transition-colors animate-pulse"
                    onClick={() => setTripFilter('invites')}
                  >
                    <Mail className="w-3 h-3 mr-1" />
                    Invites ({tripCounts.invites})
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Travel Pal Calendars */}
          <Card className="bg-card border-border/50 animate-slide-up" style={{ animationDelay: '50ms' }}>
            <CardHeader>
              <CardTitle className="font-display text-lg">Travel Pal Calendars</CardTitle>
            </CardHeader>
            <CardContent>
              {friends.length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Toggle travel pals to overlay their trips
                  </p>
                  {friends.map((friend) => {
                    const color = friendColors.get(friend.profile.id);
                    const tripCount = tripCounts.byFriend.get(friend.profile.id) || 0;
                    return (
                      <div
                        key={friend.id}
                        className="flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={friend.profile.avatar_url || undefined} />
                              <AvatarFallback>
                                {getInitials(friend.profile.full_name, friend.profile.username)}
                              </AvatarFallback>
                            </Avatar>
                            {/* Color indicator */}
                            <div 
                              className={cn(
                                'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full ring-2 ring-card',
                                color?.dot
                              )} 
                            />
                          </div>
                          <div className="min-w-0">
                            <Label
                              htmlFor={`friend-${friend.id}`}
                              className="text-sm font-medium truncate block cursor-pointer"
                            >
                              {friend.profile.full_name || friend.profile.username}
                            </Label>
                            {tripCount > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {tripCount} trip{tripCount !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                        <Switch
                          id={`friend-${friend.id}`}
                          checked={enabledFriends.includes(friend.profile.id)}
                          onCheckedChange={() => toggleFriend(friend.profile.id)}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Add travel pals to see their trips on your calendar.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Trip Countdowns */}
          <Card className="bg-card border-border/50 animate-slide-up" style={{ animationDelay: '100ms' }}>
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <div className="bg-primary rounded-full p-1.5">
                  <Plane className="w-4 h-4 text-primary-foreground" />
                </div>
                Upcoming Trips
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(() => {
                const upcomingTrips = trips
                  .filter(trip => {
                    if (!trip.start_date) return false;
                    const startDate = parseISO(trip.start_date);
                    return isFuture(startDate) || isToday(startDate);
                  })
                  .sort((a, b) => {
                    const dateA = parseISO(a.start_date!);
                    const dateB = parseISO(b.start_date!);
                    return dateA.getTime() - dateB.getTime();
                  })
                  .slice(0, 5);

                if (upcomingTrips.length === 0) {
                  return (
                    <p className="text-sm text-muted-foreground">
                      No upcoming trips scheduled
                    </p>
                  );
                }

                return upcomingTrips.map(trip => {
                  const startDate = parseISO(trip.start_date!);
                  const daysUntil = differenceInDays(startDate, startOfDay(new Date()));
                  const isParticipant = !trip.isOwner;
                  const isHiddenFromPals = trip.personal_visibility === 'only_me' || 
                    (trip.isOwner && trip.visibility === 'only_me');
                  const isOwner = trip.owner_id === user?.id;
                  const color = isOwner ? ownerColor : friendColors.get(trip.owner_id);
                  
                  return (
                    <div
                      key={trip.id}
                      className={cn(
                        "p-3 rounded-lg transition-colors border",
                        isHiddenFromPals 
                          ? "bg-muted/50 border-dashed border-muted-foreground/30" 
                          : isOwner 
                            ? "bg-primary/10 hover:bg-primary/20 border-primary/30"
                            : cn(color?.bg, "hover:opacity-80 border-transparent")
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div 
                          className="min-w-0 flex-1 cursor-pointer"
                          onClick={() => setCurrentMonth(startOfMonth(startDate))}
                        >
                          <div className="flex items-center gap-1.5">
                            {isHiddenFromPals && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <EyeOff className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Hidden from your travel pals</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            <p className={cn(
                              "font-medium text-sm truncate",
                              isHiddenFromPals && "text-muted-foreground"
                            )}>
                              {trip.name}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {trip.destination}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={cn(
                            "text-lg font-bold",
                            daysUntil === 0 ? "text-emerald-500" : daysUntil <= 7 ? "text-orange-500" : "text-secondary"
                          )}>
                            {daysUntil === 0 ? "Today!" : daysUntil}
                          </p>
                          {daysUntil > 0 && (
                            <p className="text-[10px] text-muted-foreground">
                              {daysUntil === 1 ? "day" : "days"}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <p 
                          className="text-[10px] text-muted-foreground cursor-pointer"
                          onClick={() => setCurrentMonth(startOfMonth(startDate))}
                        >
                          {format(startDate, 'MMM d, yyyy')}
                        </p>
                        {isParticipant && (
                          <TripVisibilityDropdown
                            currentVisibility={trip.personal_visibility ?? null}
                            tripVisibility={trip.visibility}
                            onVisibilityChange={(v) => handleVisibilityChange(trip.id, v)}
                            compact
                          />
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}

interface MonthGridProps {
  month: Date;
  currentMonth: Date;
  getTripsForDay: (day: Date) => EnhancedTrip[];
  cellHeight: string;
  isCompactView: boolean;
  isVeryCompactView: boolean;
  showHeader: boolean;
  onViewTrip: (tripId: string) => void;
  onRespondToInvite: (tripId: string, response: 'confirmed' | 'declined') => void;
}

function MonthGrid({ 
  month, 
  currentMonth, 
  getTripsForDay, 
  cellHeight, 
  isCompactView,
  isVeryCompactView,
  showHeader,
  onViewTrip,
  onRespondToInvite
}: MonthGridProps) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  const startDay = monthStart.getDay();
  const paddedDays = [...Array(startDay).fill(null), ...days];

  const dayLabels = isVeryCompactView 
    ? ['S', 'M', 'T', 'W', 'T', 'F', 'S']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className={cn(showHeader && 'border border-border/30 rounded-lg p-3')}>
      {showHeader && (
        <h3 className="font-display text-sm font-semibold mb-2 text-center">
          {format(month, 'MMMM yyyy')}
        </h3>
      )}
      
      <div className="grid grid-cols-7 mb-1">
        {dayLabels.map((day, i) => (
          <div
            key={`${day}-${i}`}
            className={cn(
              'text-center font-medium text-muted-foreground',
              isVeryCompactView ? 'text-[10px] py-1' : 'text-xs py-2'
            )}
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {paddedDays.map((day, index) => {
          if (!day) {
            return <div key={`empty-${index}`} className={cellHeight} />;
          }

          const dayTrips = getTripsForDay(day);
          const hasTrips = dayTrips.length > 0;

          return (
            <DayCell
              key={day.toISOString()}
              day={day}
              month={month}
              trips={dayTrips}
              hasTrips={hasTrips}
              cellHeight={cellHeight}
              isCompactView={isCompactView}
              isVeryCompactView={isVeryCompactView}
              onViewTrip={onViewTrip}
              onRespondToInvite={onRespondToInvite}
            />
          );
        })}
      </div>
    </div>
  );
}

interface DayCellProps {
  day: Date;
  month: Date;
  trips: EnhancedTrip[];
  hasTrips: boolean;
  cellHeight: string;
  isCompactView: boolean;
  isVeryCompactView: boolean;
  onViewTrip: (tripId: string) => void;
  onRespondToInvite: (tripId: string, response: 'confirmed' | 'declined') => void;
}

function DayCell({ 
  day, 
  month, 
  trips, 
  hasTrips, 
  cellHeight, 
  isCompactView,
  isVeryCompactView,
  onViewTrip,
  onRespondToInvite
}: DayCellProps) {
  const today = isToday(day);

  // Get status icon for a trip
  const getStatusIcon = (status: ParticipationStatus) => {
    switch (status) {
      case 'owner':
        return <MapPin className="w-2 h-2" />;
      case 'confirmed':
        return <Check className="w-2 h-2" />;
      case 'invited':
      case 'pending':
        return <Mail className="w-2 h-2" />;
      case 'tentative':
        return <Eye className="w-2 h-2" />;
      default:
        return <Eye className="w-2 h-2" />;
    }
  };

  // Get cell background based on trips
  const getCellBackground = () => {
    if (!hasTrips || today) return '';
    
    const hasOwned = trips.some(t => t.participationStatus === 'owner');
    const hasInvited = trips.some(t => t.participationStatus === 'invited' || t.participationStatus === 'pending');
    
    if (hasOwned) return 'bg-primary/10';
    if (hasInvited) return 'bg-amber-500/10';
    return trips[0]?.ownerColor?.bg || 'bg-secondary/10';
  };

  // Compact/Very Compact view with popover
  if ((isCompactView || isVeryCompactView) && hasTrips) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <div
            className={cn(
              'p-1 rounded-md border border-transparent transition-colors relative cursor-pointer hover:bg-accent/50',
              cellHeight,
              !isSameMonth(day, month) && 'opacity-40',
              getCellBackground()
            )}
          >
            {today ? (
              <div className="flex justify-center">
                <span className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-[10px] sm:text-xs font-bold">
                  {format(day, 'd')}
                </span>
              </div>
            ) : (
              <span
                className={cn(
                  'font-medium block text-center',
                  isVeryCompactView ? 'text-[10px]' : isCompactView ? 'text-xs' : 'text-sm'
                )}
              >
                {format(day, 'd')}
              </span>
            )}
            
            {/* Trip indicators with colors */}
            {isVeryCompactView ? (
              <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                {trips.slice(0, 3).map((trip) => (
                  <div
                    key={trip.id}
                    className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      trip.ownerColor?.dot,
                      (trip.participationStatus === 'invited' || trip.participationStatus === 'pending') && 'animate-pulse'
                    )}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-0.5 space-y-0.5 overflow-hidden">
                {trips.slice(0, 1).map((trip) => (
                  <div
                    key={trip.id}
                    className={cn(
                      'text-[10px] px-1 py-0.5 rounded truncate flex items-center gap-0.5',
                      trip.participationStatus === 'owner' 
                        ? 'bg-primary/30 text-foreground'
                        : cn(trip.ownerColor?.bg, 'text-foreground'),
                      (trip.participationStatus === 'invited' || trip.participationStatus === 'pending') && 
                        'border border-dashed border-current'
                    )}
                  >
                    {getStatusIcon(trip.participationStatus)}
                  </div>
                ))}
                {trips.length > 1 && (
                  <div className="text-[9px] text-muted-foreground text-center">
                    +{trips.length - 1}
                  </div>
                )}
              </div>
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <TripPopoverContent 
            day={day} 
            trips={trips} 
            onViewTrip={onViewTrip}
            onRespondToInvite={onRespondToInvite}
          />
        </PopoverContent>
      </Popover>
    );
  }

  // Single month view with trip popovers
  if (!isCompactView && hasTrips) {
    return (
      <div
        className={cn(
          'p-1 rounded-md border border-transparent transition-colors relative',
          cellHeight,
          !isSameMonth(day, month) && 'opacity-40',
          getCellBackground()
        )}
      >
        {today ? (
          <div className="flex justify-center">
            <span className="w-6 h-6 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-bold">
              {format(day, 'd')}
            </span>
          </div>
        ) : (
          <span className="text-sm font-medium block text-center">
            {format(day, 'd')}
          </span>
        )}
        
        <div className="mt-1 space-y-1">
          {trips.slice(0, 2).map((trip) => (
            <Popover key={trip.id}>
              <PopoverTrigger asChild>
                <div
                  className={cn(
                    'text-xs px-1.5 py-0.5 rounded truncate cursor-pointer transition-colors flex items-center gap-1',
                    trip.participationStatus === 'owner'
                      ? 'bg-primary/30 text-foreground hover:bg-primary/40'
                      : cn(trip.ownerColor?.bg, 'text-foreground hover:opacity-80'),
                    (trip.participationStatus === 'invited' || trip.participationStatus === 'pending') &&
                      'border border-dashed animate-pulse'
                  )}
                >
                  {getStatusIcon(trip.participationStatus)}
                  {trip.visibility === 'busy_only' ? (
                    <span className="flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Away
                    </span>
                  ) : trip.visibility === 'location_only' || trip.visibility === 'full_details' ? (
                    <span className="truncate">{trip.destination.split(',')[0]}</span>
                  ) : (
                    'Trip'
                  )}
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0" align="start">
                <TripPopoverContent 
                  day={day} 
                  trips={[trip]} 
                  onViewTrip={onViewTrip}
                  onRespondToInvite={onRespondToInvite}
                />
              </PopoverContent>
            </Popover>
          ))}
          {trips.length > 2 && (
            <Popover>
              <PopoverTrigger asChild>
                <div className="text-xs text-muted-foreground px-1 cursor-pointer hover:text-foreground">
                  +{trips.length - 2} more
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-0" align="start">
                <TripPopoverContent 
                  day={day} 
                  trips={trips.slice(2)} 
                  onViewTrip={onViewTrip}
                  onRespondToInvite={onRespondToInvite}
                />
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
    );
  }

  // Default cell (no trips)
  return (
    <div
      className={cn(
        'p-1 rounded-md border border-transparent transition-colors relative',
        cellHeight,
        !isSameMonth(day, month) && 'opacity-40'
      )}
    >
      {today ? (
        <div className="flex justify-center">
          <span
            className={cn(
              'rounded-full bg-secondary text-secondary-foreground flex items-center justify-center font-bold',
              isVeryCompactView ? 'w-5 h-5 text-[10px]' : isCompactView ? 'w-5 h-5 text-xs' : 'w-6 h-6 text-xs'
            )}
          >
            {format(day, 'd')}
          </span>
        </div>
      ) : (
        <span
          className={cn(
            'font-medium block text-center',
            isVeryCompactView ? 'text-[10px]' : isCompactView ? 'text-xs' : 'text-sm'
          )}
        >
          {format(day, 'd')}
        </span>
      )}
    </div>
  );
}

interface TripPopoverContentProps {
  day: Date;
  trips: EnhancedTrip[];
  onViewTrip: (tripId: string) => void;
  onRespondToInvite: (tripId: string, response: 'confirmed' | 'declined') => void;
}

function TripPopoverContent({ day, trips, onViewTrip, onRespondToInvite }: TripPopoverContentProps) {
  const getInitials = (fullName: string | null | undefined, username: string | undefined) => {
    if (fullName) {
      return fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 1);
    }
    return (username || '?').slice(0, 1).toUpperCase();
  };

  const getStatusBadge = (status: ParticipationStatus) => {
    switch (status) {
      case 'owner':
        return <Badge variant="default" className="text-[10px] h-5">Your Trip</Badge>;
      case 'confirmed':
        return <Badge variant="secondary" className="text-[10px] h-5 bg-emerald-500/20 text-emerald-700">Accepted</Badge>;
      case 'invited':
        return <Badge variant="secondary" className="text-[10px] h-5 bg-amber-500/20 text-amber-700 animate-pulse">Invited</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="text-[10px] h-5 bg-orange-500/20 text-orange-700">Pending</Badge>;
      case 'tentative':
        return <Badge variant="secondary" className="text-[10px] h-5">Tentative</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px] h-5">Viewing</Badge>;
    }
  };

  return (
    <div className="p-3 space-y-3">
      <div className="font-semibold text-sm border-b border-border pb-2">
        {format(day, 'EEEE, MMMM d, yyyy')}
      </div>
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {trips.map((trip) => (
          <div
            key={trip.id}
            className={cn(
              "p-2 rounded-lg space-y-2 border",
              trip.participationStatus === 'owner' 
                ? 'bg-primary/10 border-primary/30'
                : cn(trip.ownerColor?.bg, 'border-transparent'),
              (trip.participationStatus === 'invited' || trip.participationStatus === 'pending') &&
                'border-dashed border-amber-500'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="font-medium text-sm truncate">{trip.name}</p>
                  {getStatusBadge(trip.participationStatus)}
                </div>
                {trip.visibility !== 'busy_only' && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">{trip.destination}</span>
                  </p>
                )}
              </div>
            </div>
            
            {/* Owner info for non-owned trips */}
            {trip.participationStatus !== 'owner' && (trip.owner_username || trip.owner_full_name) && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Avatar className="w-5 h-5">
                  <AvatarImage src={trip.owner_avatar_url || undefined} />
                  <AvatarFallback className="text-[8px]">
                    {getInitials(trip.owner_full_name, trip.owner_username)}
                  </AvatarFallback>
                </Avatar>
                <span>
                  {trip.participationStatus === 'viewing' ? "Trip by " : "Invited by "}
                  {trip.owner_full_name || trip.owner_username}
                </span>
              </div>
            )}
            
            {trip.start_date && trip.end_date && (
              <p className="text-xs text-muted-foreground">
                {format(parseISO(trip.start_date), 'MMM d')} - {format(parseISO(trip.end_date), 'MMM d, yyyy')}
              </p>
            )}
            
            {/* Action buttons */}
            {(trip.participationStatus === 'invited' || trip.participationStatus === 'pending') ? (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="default"
                  className="flex-1 text-xs h-7"
                  onClick={() => onRespondToInvite(trip.id, 'confirmed')}
                >
                  <Check className="w-3 h-3 mr-1" />
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs h-7"
                  onClick={() => onRespondToInvite(trip.id, 'declined')}
                >
                  Decline
                </Button>
              </div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs h-7"
                onClick={() => onViewTrip(trip.id)}
              >
                <ExternalLink className="w-3 h-3 mr-1.5" />
                View Trip
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
