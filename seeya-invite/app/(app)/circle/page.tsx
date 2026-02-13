'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Button, Spinner } from '@/components/ui';
import {
  TravelPalsSection,
  TripmatesSection,
  PendingRequestsSection,
  AddPalModal,
} from '@/components/circle';
import { UserPlus } from 'lucide-react';
import type { Profile } from '@/types/database';

interface FriendshipWithProfile {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  requester?: Profile;
  addressee?: Profile;
}

interface TravelPalWithDetails extends Profile {
  tripCount?: number;
  mutualTrips?: number;
}

interface TripmateWithDetails extends Profile {
  sharedTrips: number;
}

interface FriendshipRequest {
  id: string;
  profile: Profile;
  createdAt: string;
}

export default function CirclePage() {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  // Data states
  const [travelPals, setTravelPals] = useState<TravelPalWithDetails[]>([]);
  const [tripmates, setTripmates] = useState<TripmateWithDetails[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendshipRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendshipRequest[]>([]);

  const fetchCircleData = useCallback(async () => {
    if (!user) return;

    const supabase = createClient();

    // Fetch friendships and user's trip participations in parallel
    const [{ data: friendships }, { data: myParticipations }, { data: ownedTrips }] = await Promise.all([
      supabase
        .from('friendships')
        .select(`
          *,
          requester:profiles!friendships_requester_id_fkey (*),
          addressee:profiles!friendships_addressee_id_fkey (*)
        `)
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
      supabase
        .from('trip_participants')
        .select('trip_id')
        .eq('user_id', user.id)
        .eq('status', 'accepted'),
      supabase
        .from('trips')
        .select('id')
        .eq('user_id', user.id),
    ]);

    // Build set of all friend/pending IDs to exclude from tripmates
    const excludedIds = new Set<string>([user.id]);

    if (friendships) {
      // Process accepted friends (travel pals)
      const accepted = friendships.filter((f) => f.status === 'accepted');
      const pals: TravelPalWithDetails[] = accepted.map((f) => {
        const profile = f.requester_id === user.id ? f.addressee : f.requester;
        const friendId = f.requester_id === user.id ? f.addressee_id : f.requester_id;
        excludedIds.add(friendId);
        return {
          ...profile,
          tripCount: 0,
          mutualTrips: 0,
        };
      }).filter(Boolean) as TravelPalWithDetails[];
      setTravelPals(pals);

      // Process incoming requests (where user is addressee, status pending)
      const incoming = friendships
        .filter((f) => f.addressee_id === user.id && f.status === 'pending')
        .map((f) => {
          excludedIds.add(f.requester_id);
          return {
            id: f.id,
            profile: f.requester as Profile,
            createdAt: f.created_at,
          };
        })
        .filter((r) => r.profile);
      setIncomingRequests(incoming);

      // Process outgoing requests (where user is requester, status pending)
      const outgoing = friendships
        .filter((f) => f.requester_id === user.id && f.status === 'pending')
        .map((f) => {
          excludedIds.add(f.addressee_id);
          return {
            id: f.id,
            profile: f.addressee as Profile,
            createdAt: f.created_at,
          };
        })
        .filter((r) => r.profile);
      setOutgoingRequests(outgoing);
    }

    // Fetch tripmates: people from shared trips who aren't friends
    const participantTripIds = myParticipations?.map((p) => p.trip_id) || [];
    const ownedTripIds = ownedTrips?.map((t) => t.id) || [];
    const allTripIds = Array.from(new Set([...participantTripIds, ...ownedTripIds]));

    if (allTripIds.length > 0) {
      // Get all participants from the user's trips
      const { data: allParticipants } = await supabase
        .from('trip_participants')
        .select(`
          user_id,
          trip_id,
          user:profiles (*)
        `)
        .in('trip_id', allTripIds)
        .eq('status', 'accepted');

      if (allParticipants) {
        // Count shared trips per person, excluding friends and self
        const tripmateMap = new Map<string, { profile: Profile; sharedTrips: number }>();

        for (const p of allParticipants) {
          if (excludedIds.has(p.user_id) || !p.user) continue;

          const existing = tripmateMap.get(p.user_id);
          if (existing) {
            existing.sharedTrips++;
          } else {
            tripmateMap.set(p.user_id, {
              profile: p.user as unknown as Profile,
              sharedTrips: 1,
            });
          }
        }

        const tripmatesList: TripmateWithDetails[] = Array.from(tripmateMap.values())
          .map((t) => ({
            ...t.profile,
            sharedTrips: t.sharedTrips,
          }))
          .sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));

        setTripmates(tripmatesList);
      } else {
        setTripmates([]);
      }
    } else {
      setTripmates([]);
    }

    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchCircleData();
  }, [fetchCircleData]);

  const handleSendRequest = async (userId: string) => {
    if (!user) return;

    const supabase = createClient();

    const { error } = await supabase.from('friendships').insert({
      requester_id: user.id,
      addressee_id: userId,
      status: 'pending',
    });

    if (!error) {
      await fetchCircleData();
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    const supabase = createClient();

    const { error } = await supabase
      .from('friendships')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    if (!error) {
      await fetchCircleData();
    }
  };

  const handleDeclineRequest = async (requestId: string) => {
    const supabase = createClient();

    const { error } = await supabase
      .from('friendships')
      .update({ status: 'declined' })
      .eq('id', requestId);

    if (!error) {
      await fetchCircleData();
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    const supabase = createClient();

    const { error } = await supabase
      .from('friendships')
      .delete()
      .eq('id', requestId);

    if (!error) {
      await fetchCircleData();
    }
  };

  const handleAddTripmate = async (userId: string) => {
    await handleSendRequest(userId);
  };

  // Get all friend IDs (accepted + pending)
  const existingFriendIds = [
    ...travelPals.map((p) => p.id),
    ...incomingRequests.map((r) => r.profile.id),
    ...outgoingRequests.map((r) => r.profile.id),
  ];

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display font-semibold text-seeya-text">
            Travel Circle
          </h1>
          <p className="text-seeya-text-secondary mt-1">
            Connect with travel pals and tripmates
          </p>
        </div>
        <Button
          variant="purple"
          leftIcon={<UserPlus size={20} />}
          onClick={() => setShowAddModal(true)}
        >
          Add Friend
        </Button>
      </div>

      <div className="space-y-8">
        {/* Pending Requests (incoming first, then outgoing) */}
        <PendingRequestsSection
          incoming={incomingRequests}
          outgoing={outgoingRequests}
          onAccept={handleAcceptRequest}
          onDecline={handleDeclineRequest}
          onCancel={handleCancelRequest}
        />

        {/* Travel Pals */}
        <TravelPalsSection
          pals={travelPals}
          onAddClick={() => setShowAddModal(true)}
        />

        {/* Tripmates */}
        <TripmatesSection
          tripmates={tripmates}
          onAddPal={handleAddTripmate}
        />
      </div>

      {/* Add Pal Modal */}
      {user && (
        <AddPalModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          currentUserId={user.id}
          existingFriendIds={existingFriendIds}
          onSendRequest={handleSendRequest}
        />
      )}
    </div>
  );
}
