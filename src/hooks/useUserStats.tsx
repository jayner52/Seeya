import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface UserStats {
  tripsCount: number;
  recommendationsCount: number;
  countriesVisited: number;
  citiesWithRecs: number;
}

export function useUserStats(userId: string | undefined, viewerId?: string | undefined) {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchStats = async () => {
      setLoading(true);
      
      // Use the viewer's ID if provided, otherwise get current user
      let actualViewerId = viewerId;
      if (!actualViewerId) {
        const { data: { user } } = await supabase.auth.getUser();
        actualViewerId = user?.id;
      }
      
      if (!actualViewerId) {
        setLoading(false);
        return;
      }

      // Use the RPC function that bypasses RLS for friends
      const { data, error } = await supabase.rpc('get_user_profile_stats', {
        _viewer_id: actualViewerId,
        _profile_id: userId
      });

      if (error) {
        console.error('Error fetching user stats:', error);
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        const row = data[0];
        setStats({
          tripsCount: row.trips_count || 0,
          recommendationsCount: row.recommendations_count || 0,
          countriesVisited: row.countries_visited || 0,
          citiesWithRecs: row.cities_with_recs || 0,
        });
      } else {
        setStats({
          tripsCount: 0,
          recommendationsCount: 0,
          countriesVisited: 0,
          citiesWithRecs: 0,
        });
      }
      
      setLoading(false);
    };

    fetchStats();
  }, [userId, viewerId]);

  return { stats, loading };
}
