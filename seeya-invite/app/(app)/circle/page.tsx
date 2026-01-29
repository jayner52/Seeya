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

    // Get all friendships for this user
    const { data: friendships } = await supabase
      .from('friendships')
      .select(`
        *,
        requester:profiles!friendships_requester_id_fkey (*),
        addressee:profiles!friendships_addressee_id_fkey (*)
      `)
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (friendships) {
      // Process accepted friends (travel pals)
      const accepted = friendships.filter((f) => f.status === 'accepted');
      const pals: TravelPalWithDetails[] = accepted.map((f) => {
        const profile = f.requester_id === user.id ? f.addressee : f.requester;
        return {
          ...profile,
          tripCount: 0, // TODO: Calculate from actual trip data
          mutualTrips: 0,
        };
      }).filter(Boolean) as TravelPalWithDetails[];
      setTravelPals(pals);

      // Process incoming requests (where user is addressee, status pending)
      const incoming = friendships
        .filter((f) => f.addressee_id === user.id && f.status === 'pending')
        .map((f) => ({
          id: f.id,
          profile: f.requester as Profile,
          createdAt: f.created_at,
        }))
        .filter((r) => r.profile);
      setIncomingRequests(incoming);

      // Process outgoing requests (where user is requester, status pending)
      const outgoing = friendships
        .filter((f) => f.requester_id === user.id && f.status === 'pending')
        .map((f) => ({
          id: f.id,
          profile: f.addressee as Profile,
          createdAt: f.created_at,
        }))
        .filter((r) => r.profile);
      setOutgoingRequests(outgoing);
    }

    // TODO: Fetch tripmates (people from shared trips who aren't friends)
    // This would require an RPC function or complex query
    setTripmates([]);

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
            Your travel companions
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
