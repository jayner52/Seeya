import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { AcceptInviteForm } from '@/components/invite';
import { TripPreview } from '@/components/invite';
import { Logo, Card } from '@/components/ui';
import Link from 'next/link';
import type { TripWithDetails } from '@/types';
import { transformLocation, transformParticipant } from '@/types/database';

interface AcceptPageProps {
  params: Promise<{ code: string }>;
}

async function getInviteAndUserData(code: string) {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get invite
  const { data: invite, error: inviteError } = await supabase
    .from('trip_invite_links')
    .select('id, trip_id, code, expires_at')
    .eq('code', code)
    .single();

  if (inviteError || !invite) {
    return { valid: false, error: 'not_found' as const };
  }

  // Check expiration
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return { valid: false, error: 'expired' as const };
  }

  // Get trip details
  const { data: trip } = await supabase
    .from('trips')
    .select('id, name, description, start_date, end_date, user_id, created_at, updated_at, visibility')
    .eq('id', invite.trip_id)
    .single();

  if (!trip) {
    return { valid: false, error: 'trip_not_found' as const };
  }

  // Get locations
  const { data: locations } = await supabase
    .from('trip_locations')
    .select(`
      id, trip_id, city_id, name, arrival_date, departure_date, order_index, created_at,
      city:cities (id, name, country, country_code, continent)
    `)
    .eq('trip_id', trip.id)
    .order('order_index');

  // Get participants
  const { data: participants } = await supabase
    .from('trip_participants')
    .select(`
      id, trip_id, user_id, role, status, joined_at, created_at,
      user:profiles (id, full_name, avatar_url)
    `)
    .eq('trip_id', trip.id)
    .eq('status', 'accepted');

  const tripWithDetails: TripWithDetails = {
    ...trip,
    locations: (locations || []).map(transformLocation),
    participants: (participants || []).map(transformParticipant),
  };

  // Check if user is already a participant
  let isAlreadyMember = false;
  if (user) {
    const { data: existingParticipant } = await supabase
      .from('trip_participants')
      .select('id, status')
      .eq('trip_id', trip.id)
      .eq('user_id', user.id)
      .single();

    isAlreadyMember =
      existingParticipant?.status === 'accepted';
  }

  return {
    valid: true,
    invite,
    trip: tripWithDetails,
    user,
    isAlreadyMember,
  };
}

export default async function AcceptInvitePage({ params }: AcceptPageProps) {
  const { code } = await params;
  const data = await getInviteAndUserData(code);

  // If not logged in, redirect to login with invite param
  if (data.valid && !data.user) {
    redirect(`/login?invite=${code}`);
  }

  // If already a member, redirect to trip
  if (data.valid && data.isAlreadyMember) {
    redirect(`/trips/${data.trip!.id}`);
  }

  if (!data.valid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-seeya-purple via-purple-600 to-purple-800 flex flex-col">
        <header className="p-6">
          <Link href="/">
            <Logo size="md" className="text-white [&_span]:text-white" />
          </Link>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <Card variant="elevated" padding="lg" className="max-w-md w-full text-center">
            <div className="text-6xl mb-4">
              {data.error === 'expired' ? '⏰' : '❌'}
            </div>
            <h1 className="text-2xl font-semibold text-seeya-text mb-2">
              {data.error === 'expired' ? 'Invite Expired' : 'Invalid Invite'}
            </h1>
            <p className="text-seeya-text-secondary">
              {data.error === 'expired'
                ? 'This invite link has expired.'
                : 'This invite link is not valid.'}
            </p>
          </Card>
        </main>
      </div>
    );
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

          <TripPreview trip={data.trip!} />

          <AcceptInviteForm
            code={code}
            tripId={data.trip!.id}
            tripName={data.trip!.name}
          />
        </div>
      </main>
    </div>
  );
}
