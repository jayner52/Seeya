import { useState, useMemo } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { TripCard } from '@/components/trips/TripCard';
import { NewTripWizard } from '@/components/trips/NewTripWizard';
import { LogPastTripDialog } from '@/components/trips/LogPastTripDialog';
import { QuickOnboardingWizard } from '@/components/trips/QuickOnboardingWizard';
import { TripLimitModal } from '@/components/premium/TripLimitModal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTrips, TripData } from '@/hooks/useTrips';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useAppTour } from '@/components/providers/AppTourProvider';
import { useSubscription } from '@/hooks/useSubscription';
import { Plus, Filter, History, ChevronDown, ChevronRight, CalendarDays, Calendar, Clock, Crown } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { parseISO, isAfter, isBefore, isWithinInterval, startOfDay, parse } from 'date-fns';

type FilterType = 'all' | 'my_trips' | 'invited';

interface TripSection {
  id: string;
  label: string;
  icon: React.ReactNode;
  trips: TripData[];
  defaultOpen: boolean;
}

export default function Trips() {
  const [filter, setFilter] = useState<FilterType>('all');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [logPastTripOpen, setLogPastTripOpen] = useState(false);
  const [tripLimitModalOpen, setTripLimitModalOpen] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    upcoming: true,
    current: true,
    past: true,
    undated: true,
  });
  const { trips, loading, fetchTrips } = useTrips();
  const { showOnboarding, completeOnboarding, skipOnboarding } = useOnboarding();
  const { setShowAppTour } = useAppTour();
  const { isPremium, canCreateTrip, getTripsRemaining, maxFreeTrips } = useSubscription();

  const filteredTrips = trips.filter((trip) => {
    if (filter === 'all') return true;
    if (filter === 'my_trips') return trip.isOwner;
    if (filter === 'invited') return !trip.isOwner;
    return true;
  });

  // Categorize trips by timeline
  const tripSections = useMemo(() => {
    const today = startOfDay(new Date());
    
    const upcoming: TripData[] = [];
    const current: TripData[] = [];
    const past: TripData[] = [];
    const undated: TripData[] = [];

    filteredTrips.forEach((trip) => {
      // If no dates, put in undated (unless it's a logged past trip)
      if (!trip.start_date && !trip.end_date) {
        // Logged past trips without dates go to past section
        if (trip.is_logged_past_trip) {
          past.push(trip);
          return;
        }
        // If it has flexible_month, try to parse it for past/future
        if (trip.is_flexible_dates && trip.flexible_month) {
          // Format: "Month Year" e.g., "August 2024"
          const parts = trip.flexible_month.split(' ');
          if (parts.length === 2) {
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                               'July', 'August', 'September', 'October', 'November', 'December'];
            const monthIndex = monthNames.indexOf(parts[0]);
            const year = parseInt(parts[1]);
            if (monthIndex !== -1 && !isNaN(year)) {
              const flexDate = new Date(year, monthIndex, 15); // Middle of month
              if (isBefore(flexDate, today)) {
                past.push(trip);
              } else {
                upcoming.push(trip);
              }
              return;
            }
          }
        }
        undated.push(trip);
        return;
      }

      const startDate = trip.start_date ? parseISO(trip.start_date) : null;
      const endDate = trip.end_date ? parseISO(trip.end_date) : null;

      // Determine if current, upcoming, or past
      if (startDate && endDate) {
        if (isWithinInterval(today, { start: startDate, end: endDate })) {
          current.push(trip);
        } else if (isAfter(startDate, today)) {
          upcoming.push(trip);
        } else {
          past.push(trip);
        }
      } else if (startDate) {
        // Only start date
        if (isAfter(startDate, today)) {
          upcoming.push(trip);
        } else {
          past.push(trip);
        }
      } else if (endDate) {
        // Only end date
        if (isBefore(endDate, today)) {
          past.push(trip);
        } else {
          upcoming.push(trip);
        }
      }
    });

    // Sort each section
    upcoming.sort((a, b) => {
      const dateA = a.start_date ? new Date(a.start_date).getTime() : Infinity;
      const dateB = b.start_date ? new Date(b.start_date).getTime() : Infinity;
      return dateA - dateB;
    });

    current.sort((a, b) => {
      const dateA = a.end_date ? new Date(a.end_date).getTime() : Infinity;
      const dateB = b.end_date ? new Date(b.end_date).getTime() : Infinity;
      return dateA - dateB;
    });

    past.sort((a, b) => {
      const getDate = (trip: TripData) => {
        if (trip.start_date) {
          return new Date(trip.start_date).getTime();
        }
        if (trip.flexible_month) {
          const parsed = parse(trip.flexible_month, 'MMMM yyyy', new Date());
          if (!isNaN(parsed.getTime())) {
            return parsed.getTime();
          }
        }
        return -Infinity;
      };
      return getDate(b) - getDate(a); // Most recent first, trips without dates at the end
    });

    const sections: TripSection[] = [];

    if (current.length > 0) {
      sections.push({
        id: 'current',
        label: `Happening Now (${current.length})`,
        icon: <div className="bg-green-500 rounded-full p-1"><Clock className="w-3 h-3 text-white" /></div>,
        trips: current,
        defaultOpen: true,
      });
    }

    if (upcoming.length > 0) {
      sections.push({
        id: 'upcoming',
        label: `Upcoming (${upcoming.length})`,
        icon: <div className="bg-primary rounded-full p-1"><CalendarDays className="w-3 h-3 text-primary-foreground" /></div>,
        trips: upcoming,
        defaultOpen: true,
      });
    }

    if (past.length > 0) {
      sections.push({
        id: 'past',
        label: `Past Trips (${past.length})`,
        icon: <div className="bg-muted rounded-full p-1"><Calendar className="w-3 h-3 text-muted-foreground" /></div>,
        trips: past,
        defaultOpen: true,
      });
    }

    if (undated.length > 0) {
      sections.push({
        id: 'undated',
        label: `No Dates Set (${undated.length})`,
        icon: <div className="bg-muted/50 rounded-full p-1"><Calendar className="w-3 h-3 text-muted-foreground/50" /></div>,
        trips: undated,
        defaultOpen: sections.length === 0, // Only open by default if no other sections
      });
    }

    return sections;
  }, [filteredTrips]);

  // Count upcoming trips for limit checking (from all trips, not filtered)
  const upcomingTripsCount = useMemo(() => {
    const today = startOfDay(new Date());
    return trips.filter((trip) => {
      if (trip.is_logged_past_trip) return false;
      if (!trip.start_date && !trip.end_date) {
        if (trip.is_flexible_dates && trip.flexible_month) {
          const parts = trip.flexible_month.split(' ');
          if (parts.length === 2) {
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                               'July', 'August', 'September', 'October', 'November', 'December'];
            const monthIndex = monthNames.indexOf(parts[0]);
            const year = parseInt(parts[1]);
            if (monthIndex !== -1 && !isNaN(year)) {
              const flexDate = new Date(year, monthIndex, 15);
              return !isBefore(flexDate, today);
            }
          }
        }
        return true; // Undated trips count as upcoming
      }
      const startDate = trip.start_date ? parseISO(trip.start_date) : null;
      const endDate = trip.end_date ? parseISO(trip.end_date) : null;
      if (endDate && isBefore(endDate, today)) return false;
      if (startDate && !isAfter(startDate, today) && endDate && !isBefore(endDate, today)) return true; // Current
      if (startDate && isAfter(startDate, today)) return true; // Upcoming
      return false;
    }).length;
  }, [trips]);

  const handleNewTripClick = () => {
    if (canCreateTrip(upcomingTripsCount)) {
      setWizardOpen(true);
    } else {
      setTripLimitModalOpen(true);
    }
  };

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  if (loading) {
    return (
      <PageLayout title="Your Trips" subtitle="Plan, coordinate, and keep track of your travels">
        <div className="flex items-center justify-center py-16">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Your Trips"
      subtitle="Plan, coordinate, and keep track of your travels"
    >
      {/* Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 animate-fade-in">
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select value={filter} onValueChange={(value: FilterType) => setFilter(value)}>
            <SelectTrigger className="w-40 bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Trips</SelectItem>
              <SelectItem value="my_trips">My Trips</SelectItem>
              <SelectItem value="invited">Invited</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          {!isPremium && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              {getTripsRemaining(upcomingTripsCount)} trips left
            </Badge>
          )}
          <Button variant="outline" className="gap-2" onClick={() => setLogPastTripOpen(true)}>
            <History className="w-4 h-4" />
            Log Past Trip
          </Button>
          <Button data-tour="new-trip" className="gap-2 shadow-soft" onClick={handleNewTripClick}>
            <Plus className="w-4 h-4" />
            New Trip
          </Button>
        </div>
      </div>

      {/* Trip Sections */}
      {tripSections.length > 0 ? (
        <div className="space-y-6">
          {tripSections.map((section) => (
            <Collapsible
              key={section.id}
              open={openSections[section.id] !== false}
              onOpenChange={() => toggleSection(section.id)}
            >
              <CollapsibleTrigger className="flex items-center gap-2 w-full text-left py-2 group">
                {openSections[section.id] !== false ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground transition-transform" />
                )}
                {section.icon}
                <span className="font-medium text-foreground">{section.label}</span>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                  {section.trips.map((trip, index) => (
                    <TripCard key={trip.id} trip={trip} index={index} locations={trip.locations || []} onRefresh={() => fetchTrips()} />
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
            <Plus className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-display text-xl font-semibold text-foreground mb-2">
            No trips yet
          </h3>
          <p className="text-muted-foreground mb-6">
            Start planning your next adventure
          </p>
          <Button className="gap-2" onClick={handleNewTripClick}>
            <Plus className="w-4 h-4" />
            Create Your First Trip
          </Button>
        </div>
      )}

      <NewTripWizard open={wizardOpen} onOpenChange={setWizardOpen} />
      <LogPastTripDialog 
        open={logPastTripOpen} 
        onOpenChange={setLogPastTripOpen} 
        onComplete={fetchTrips}
      />
      <QuickOnboardingWizard 
        open={showOnboarding} 
        onComplete={() => { completeOnboarding(); fetchTrips(); }} 
        onSkip={skipOnboarding}
        onStartTour={() => setShowAppTour(true)}
      />
      <TripLimitModal
        open={tripLimitModalOpen}
        onOpenChange={setTripLimitModalOpen}
        currentCount={upcomingTripsCount}
        maxTrips={maxFreeTrips}
      />
    </PageLayout>
  );
}
