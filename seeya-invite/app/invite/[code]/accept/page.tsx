import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { TripPreview } from '@/components/invite';
import { Logo, Card } from '@/components/ui';
import { Clock, XCircle } from 'lucide-react';
import Link from 'next/link';
import type { TripWithDetails } from '@/types';
import { transformLocation, transformParticipant } from '@/types/database';

interface AcceptPageProps {
  params: Promise<{ code: string }>;
}

export default async function AcceptInvitePage({ params }: AcceptPageProps) {
  const { code } = await params;
  const supabase = await createClient();

  // Server-side auth check — always reliable, no race conditions
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?invite=${code}`);
  }

  // Get invite
  const { data: invite, error: inviteError } = await supabase
    .from('trip_invite_links')
    .select('id, trip_id, code, expires_at, usage_count')
    .eq('code', code)
    .single();

  if (inviteError || !invite) {
    return <InviteError type="not_found" />;
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return <InviteError type="expired" />;
  }

  // Get trip
  const { data: trip } = await supabase
    .from('trips')
    .select('id, name, description, start_date, end_date, user_id, created_at, updated_at')
    .eq('id', invite.trip_id)
    .single();

  if (!trip) return <InviteError type="not_found" />;

  // Already a confirmed member → go straight to trip
  const { data: existing } = await supabase
    .from('trip_participants')
    .select('id, status')
    .eq('trip_id', trip.id)
    .eq('user_id', user!.id)
    .single();

  if (existing?.status === 'confirmed') {
    redirect(`/trips/${trip.id}`);
  }

  // Build trip preview data
  const { data: locations } = await supabase
    .from('trip_locations')
    .select(
      'id, trip_id, city_id, custom_location, order_index, created_at, city:cities(id, name, country, country_code, continent)'
    )
    .eq('trip_id', trip.id)
    .order('order_index');

  const { data: participants } = await supabase
    .from('trip_participants')
    .select(
      'id, trip_id, user_id, role, status, created_at, user:profiles(id, full_name, avatar_url)'
    )
    .eq('trip_id', trip.id)
    .eq('status', 'confirmed');

  const tripWithDetails: TripWithDetails = {
    ...trip,
    locations: (locations || []).map(transformLocation),
    participants: (participants || []).map(transformParticipant),
  };

  // Server action — runs on the server, no client auth needed
  async function doAccept(formData: FormData) {
    'use server';
    const inviteCode = formData.get('code') as string;
    const tripId = formData.get('tripId') as string;
    const inviteId = formData.get('inviteId') as string;
    const currentUsageCount = Number(formData.get('usageCount') ?? 0);

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect(`/login?invite=${inviteCode}`);
      return;
    }

    // Check if already a participant
    const { data: existingP } = await supabase
      .from('trip_participants')
      .select('id, status')
      .eq('trip_id', tripId)
      .eq('user_id', user.id)
      .single();

    if (existingP?.status === 'confirmed') {
      redirect(`/trips/${tripId}`);
      return;
    }

    if (existingP) {
      // Pending → confirmed
      await supabase
        .from('trip_participants')
        .update({ status: 'confirmed', responded_at: new Date().toISOString() })
        .eq('id', existingP.id);
    } else {
      // Insert directly as confirmed — single step, avoids double trigger fires
      await supabase
        .from('trip_participants')
        .insert({ trip_id: tripId, user_id: user.id, status: 'confirmed' });
    }

    // Increment invite usage count
    await supabase
      .from('trip_invite_links')
      .update({ usage_count: currentUsageCount + 1 })
      .eq('id', inviteId);

    // New users go through onboarding first, then land on the trip
    const { data: prof } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .single();

    if (prof?.onboarding_completed === false) {
      redirect(`/onboarding/welcome?next=${encodeURIComponent(`/trips/${tripId}`)}`);
    }

    redirect(`/trips/${tripId}`);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-seeya-purple via-purple-600 to-purple-800 flex flex-col">
      <header className="p-6">
        <Link href="/">
          <Logo size="md" className="text-white [&_span]:text-white" />
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-lg w-full space-y-6">
          <div className="text-center text-white mb-2">
            <p className="text-lg opacity-90">Accept invitation to</p>
          </div>

          <TripPreview trip={tripWithDetails} />

          <Card variant="elevated" padding="lg" className="text-center">
            <h2 className="text-xl font-semibold text-seeya-text mb-2">
              Ready to join?
            </h2>
            <p className="text-seeya-text-secondary mb-6">
              Accept this invitation to become a traveler on this trip
            </p>
            <form action={doAccept}>
              <input type="hidden" name="code" value={code} />
              <input type="hidden" name="tripId" value={trip.id} />
              <input type="hidden" name="inviteId" value={invite.id} />
              <input type="hidden" name="usageCount" value={invite.usage_count ?? 0} />
              <button
                type="submit"
                className="w-full bg-seeya-purple text-white font-semibold py-3 px-6 rounded-xl hover:bg-seeya-purple/90 transition-colors"
              >
                Accept Invitation
              </button>
            </form>
          </Card>
        </div>
      </main>
    </div>
  );
}

function InviteError({ type }: { type: 'not_found' | 'expired' | 'trip_not_found' }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-seeya-purple via-purple-600 to-purple-800 flex flex-col">
      <header className="p-6">
        <Link href="/">
          <Logo size="md" className="text-white [&_span]:text-white" />
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center p-6">
        <Card variant="elevated" padding="lg" className="max-w-md w-full text-center">
          <div className="flex justify-center mb-4">
            {type === 'expired' ? (
              <Clock size={48} className="text-seeya-text-secondary" />
            ) : (
              <XCircle size={48} className="text-red-400" />
            )}
          </div>
          <h1 className="text-2xl font-semibold text-seeya-text mb-2">
            {type === 'expired' ? 'Invite Expired' : 'Invalid Invite'}
          </h1>
          <p className="text-seeya-text-secondary">
            {type === 'expired'
              ? 'This invite link has expired.'
              : 'This invite link is not valid.'}
          </p>
        </Card>
      </main>
    </div>
  );
}
