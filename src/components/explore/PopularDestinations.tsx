import { useDestinationStats } from '@/hooks/useDestinationStats';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, Users } from 'lucide-react';

export function PopularDestinations() {
  const { destinations, loading } = useDestinationStats();

  if (loading) {
    return (
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <div className="bg-primary rounded-full p-1.5">
            <TrendingUp className="w-4 h-4 text-primary-foreground" />
          </div>
          Popular in Your Circle
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-6 w-6 rounded mb-2" />
                <Skeleton className="h-5 w-24 mb-1" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  if (destinations.length === 0) {
    return (
      <section>
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <div className="bg-primary rounded-full p-1.5">
            <TrendingUp className="w-4 h-4 text-primary-foreground" />
          </div>
          Popular in Your Circle
        </h2>
        <Card>
          <CardContent className="p-8 text-center">
            <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">
              No popular locations yet.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Locations will appear as your circle plans trips!
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
          <TrendingUp className="w-4 h-4 text-primary-foreground" />
        </div>
        Popular in Your Circle
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {destinations.map((dest, index) => (
          <Card key={dest.location_name} className="hover:bg-muted/50 transition-colors">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="text-2xl">
                  {dest.country_emoji || '🌍'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-foreground truncate">
                      {dest.location_name}
                    </h3>
                    {index === 0 && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-primary/10 text-primary text-xs font-medium">
                        #1
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {dest.trip_count} {dest.trip_count === 1 ? 'trip' : 'trips'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
