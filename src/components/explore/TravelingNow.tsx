import { useCircleTrips, CircleTrip } from '@/hooks/useCircleTrips';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Plane, Calendar, MapPin, Eye, EyeOff } from 'lucide-react';
import { format, isWithinInterval, parseISO, isFuture } from 'date-fns';
import { getVisibilityDisplayInfo } from '@/lib/visibility';
import { Link } from 'react-router-dom';

function TripCard({ trip }: { trip: CircleTrip }) {
  const visibilityInfo = getVisibilityDisplayInfo(trip.visibility);
  
  const getInitials = () => {
    if (trip.owner_full_name) {
      return trip.owner_full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return trip.owner_username.slice(0, 2).toUpperCase();
  };

  const isCurrentlyTraveling = trip.start_date && trip.end_date && 
    isWithinInterval(new Date(), {
      start: parseISO(trip.start_date),
      end: parseISO(trip.end_date),
    });

  const isUpcoming = trip.start_date && isFuture(parseISO(trip.start_date));

  return (
    <Link to={`/user/${trip.owner_id}`}>
      <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={trip.owner_avatar_url || undefined} />
              <AvatarFallback className="bg-secondary text-secondary-foreground text-sm">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground truncate">
                  {trip.owner_full_name || trip.owner_username}
                </span>
                {isCurrentlyTraveling && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-accent text-accent-foreground text-xs font-medium">
                    <Plane className="w-3 h-3" />
                    Traveling
                  </span>
                )}
                {isUpcoming && !isCurrentlyTraveling && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                    Soon
                  </span>
                )}
              </div>
              
              {visibilityInfo.showDestination ? (
                <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                  {trip.country_emoji && <span>{trip.country_emoji}</span>}
                  <MapPin className="w-3.5 h-3.5" />
                  <span className="truncate">{trip.destination}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Location hidden</span>
                </div>
              )}
              
              {visibilityInfo.showDates && trip.start_date && trip.end_date ? (
                <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>
                    {format(parseISO(trip.start_date), 'MMM d')} - {format(parseISO(trip.end_date), 'MMM d')}
                  </span>
                </div>
              ) : visibilityInfo.displayAs === 'busy' ? (
                <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  <span>Busy</span>
                </div>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export function TravelingNow() {
  const { trips, loading } = useCircleTrips();

  if (loading) {
    return (
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <div className="bg-primary rounded-full p-1.5">
            <Plane className="w-4 h-4 text-primary-foreground" />
          </div>
          Traveling Now & Upcoming
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  if (trips.length === 0) {
    return (
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <div className="bg-primary rounded-full p-1.5">
            <Plane className="w-4 h-4 text-primary-foreground" />
          </div>
          Traveling Now & Upcoming
        </h2>
        <Card>
          <CardContent className="p-8 text-center">
            <Plane className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">
              No upcoming trips from your travel circle yet.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Add friends to see when they're traveling!
            </p>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
        <div className="bg-primary rounded-full p-1.5">
          <Plane className="w-4 h-4 text-primary-foreground" />
        </div>
        Traveling Now & Upcoming
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {trips.slice(0, 6).map((trip) => (
          <TripCard key={trip.trip_id} trip={trip} />
        ))}
      </div>
    </section>
  );
}
