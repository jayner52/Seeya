import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTrendingWanderlist } from '@/hooks/useWanderlist';
import { Compass, Users } from 'lucide-react';

export function TrendingWanderlist() {
  const { items, loading } = useTrendingWanderlist();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-xl flex items-center gap-2">
            <div className="bg-primary rounded-full p-1.5">
              <Compass className="w-4 h-4 text-primary-foreground" />
            </div>
            Trending Wanderlist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 w-36 shrink-0 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-xl flex items-center gap-2">
          <div className="bg-primary rounded-full p-1.5">
            <Compass className="w-4 h-4 text-primary-foreground" />
          </div>
          Trending Wanderlist
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Places your travel circle dreams of visiting
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
          {items.map((item, index) => (
            <div
              key={`${item.google_place_id || item.name}-${index}`}
              className="shrink-0 w-36 p-3 rounded-lg border bg-gradient-to-br from-violet-50/50 to-rose-50/30 dark:from-violet-950/20 dark:to-rose-950/10 hover:shadow-card transition-shadow"
            >
              <div className="flex items-center gap-2 mb-2">
                {item.country_emoji && (
                  <span className="text-xl">{item.country_emoji}</span>
                )}
                <span className="font-medium text-sm truncate">{item.name}</span>
              </div>
              <Badge variant="secondary" className="gap-1 text-xs">
                <Users className="w-3 h-3" />
                {item.friend_count} {item.friend_count === 1 ? 'travel pal' : 'travel pals'}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
