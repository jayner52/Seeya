'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Card, Spinner } from '@/components/ui';

export default function DebugPage() {
  const { user } = useAuthStore();
  const [data, setData] = useState<{
    userId: string | null;
    allTrips: unknown[];
    ownedTrips: unknown[];
    participantTrips: unknown[];
    profiles: unknown[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDebugData() {
      if (!user) {
        setLoading(false);
        return;
      }

      const supabase = createClient();

      // Get all trips (no filter)
      const { data: allTrips } = await supabase
        .from('trips')
        .select('id, name, user_id, created_at')
        .order('created_at', { ascending: false })
        .limit(20);

      // Get owned trips
      const { data: ownedTrips } = await supabase
        .from('trips')
        .select('id, name, user_id')
        .eq('user_id', user.id);

      // Get participations
      const { data: participantTrips } = await supabase
        .from('trip_participants')
        .select('trip_id, user_id, role, status')
        .eq('user_id', user.id);

      // Get profiles to see user IDs
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .limit(10);

      setData({
        userId: user.id,
        allTrips: allTrips || [],
        ownedTrips: ownedTrips || [],
        participantTrips: participantTrips || [],
        profiles: profiles || [],
      });
      setLoading(false);
    }

    fetchDebugData();
  }, [user]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6">
        <Card variant="elevated" padding="lg">
          <p>Not logged in</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Debug Info</h1>

      <Card variant="elevated" padding="lg">
        <h2 className="font-semibold mb-2">Your User ID (Web)</h2>
        <code className="text-sm bg-gray-100 p-2 rounded block break-all">
          {data?.userId}
        </code>
      </Card>

      <Card variant="elevated" padding="lg">
        <h2 className="font-semibold mb-2">All Trips in Database ({data?.allTrips.length})</h2>
        <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-64">
          {JSON.stringify(data?.allTrips, null, 2)}
        </pre>
      </Card>

      <Card variant="elevated" padding="lg">
        <h2 className="font-semibold mb-2">Trips You Own ({data?.ownedTrips.length})</h2>
        <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-64">
          {JSON.stringify(data?.ownedTrips, null, 2)}
        </pre>
      </Card>

      <Card variant="elevated" padding="lg">
        <h2 className="font-semibold mb-2">Your Participations ({data?.participantTrips.length})</h2>
        <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-64">
          {JSON.stringify(data?.participantTrips, null, 2)}
        </pre>
      </Card>

      <Card variant="elevated" padding="lg">
        <h2 className="font-semibold mb-2">Profiles in Database</h2>
        <pre className="text-xs bg-gray-100 p-2 rounded overflow-auto max-h-64">
          {JSON.stringify(data?.profiles, null, 2)}
        </pre>
      </Card>
    </div>
  );
}
