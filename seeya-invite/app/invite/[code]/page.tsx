import { createClient } from '@/lib/supabase/server';
import { TripPreview } from '@/components/invite';
import { InviteActions } from './InviteActions';
import { Logo, Card } from '@/components/ui';
import { Clock, XCircle } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';
import type { TripWithDetails } from '@/types';
import { transformLocation, transformParticipant } from '@/types/database';

interface InvitePageProps {
  params: Promise<{ code: string }>;
}

async function getInviteData(code: string) {
  const supabase = await createClient();

  // Get invite
  const { data: invite, error: inviteError } = await supabase
    .from('trip_invite_links')
    .select('id, trip_id, code, expires_at, location_ids, created_by')
    .eq('code', code)
    .single();

  if (inviteError || !invite) {
    return { valid: false, error: 'not_found' as const };
  }

  // Check expiration
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return { valid: false, error: 'expired' as const };
  }

  // Get trip with details
  const { data: trip, error: tripError } = await supabase
    .from('trips')
    .select(
      `
      id,
      name,
      description,
      start_date,
      end_date,
      user_id,
      cover_photo_city,
      created_at,
      updated_at
    `
    )
    .eq('id', invite.trip_id)
    .single();

  if (tripError || !trip) {
    return { valid: false, error: 'trip_not_found' as const };
  }

  // Get locations
  const { data: locations } = await supabase
    .from('trip_locations')
    .select(
      `
      id,
      trip_id,
      city_id,
      custom_location,
      order_index,
      created_at,
      city:cities (
        id,
        name,
        country,
        country_code,
        continent
      )
    `
    )
    .eq('trip_id', trip.id)
    .order('order_index');

  // Get participants
  const { data: participants } = await supabase
    .from('trip_participants')
    .select(
      `
      id,
      trip_id,
      user_id,
      role,
      status,
      created_at,
      user:profiles (
        id,
        full_name,
        avatar_url
      )
    `
    )
    .eq('trip_id', trip.id)
    .eq('status', 'confirmed');

  // Fetch the inviter's profile
  let inviter: { id: string; full_name: string | null; avatar_url: string | null } | null = null;
  if (invite.created_by) {
    const { data: inviterProfile } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('id', invite.created_by)
      .single();
    inviter = inviterProfile;
  }

  const tripWithDetails: TripWithDetails = {
    ...trip,
    locations: (locations || []).map(transformLocation),
    participants: (participants || []).map(transformParticipant),
  };

  return {
    valid: true,
    invite,
    trip: tripWithDetails,
    inviter,
    coverPhotoCity: (trip as any).cover_photo_city as string | null,
  };
}

async function fetchCoverPhotoUrl(city: string): Promise<string | null> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) return null;
  try {
    const url = new URL('https://api.unsplash.com/search/photos');
    url.searchParams.set('query', city);
    url.searchParams.set('orientation', 'landscape');
    url.searchParams.set('per_page', '1');
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Client-ID ${accessKey}` },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const photo = data.results?.[0];
    return photo ? `${photo.urls.raw}&w=1200&h=630&fit=crop` : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: InvitePageProps): Promise<Metadata> {
  const { code } = await params;
  const data = await getInviteData(code);

  if (!data.valid || !data.trip) {
    return {
      title: 'Invalid Invite - Seeya',
    };
  }

  const destination = data.trip.locations?.[0]?.name || data.trip.locations?.[0]?.city?.name;
  const description = destination
    ? `You're invited to join a trip to ${destination}!`
    : "You've been invited to join a trip on Seeya!";

  // Fetch cover photo for OG image
  const photoCity = data.coverPhotoCity || destination;
  const ogImageUrl = photoCity ? await fetchCoverPhotoUrl(photoCity) : null;

  return {
    title: `Join ${data.trip.name} - Seeya`,
    description,
    openGraph: {
      title: `Join ${data.trip.name}`,
      description,
      type: 'website',
      ...(ogImageUrl ? { images: [{ url: ogImageUrl, width: 1200, height: 630 }] } : {}),
    },
  };
}

export default async function InvitePage({ params }: InvitePageProps) {
  const { code } = await params;
  const data = await getInviteData(code);
  const appStoreUrl = process.env.NEXT_PUBLIC_APP_STORE_URL || '#';

  if (!data.valid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-seeya-secondary via-seeya-secondary/80 to-seeya-primary/30 flex flex-col">
        <header className="p-6">
          <Link href="/">
            <Logo size="md" className="text-seeya-text [&_span]:text-seeya-text" />
          </Link>
        </header>

        <main className="flex-1 flex items-center justify-center p-6">
          <Card variant="elevated" padding="lg" className="max-w-md w-full text-center">
            <div className="flex justify-center mb-4">
              {data.error === 'expired' ? (
                <Clock size={48} className="text-seeya-text-secondary" />
              ) : (
                <XCircle size={48} className="text-red-400" />
              )}
            </div>
            <h1 className="text-2xl font-semibold text-seeya-text mb-2">
              {data.error === 'expired' ? 'Invite Expired' : 'Invalid Invite'}
            </h1>
            <p className="text-seeya-text-secondary mb-6">
              {data.error === 'expired'
                ? 'This invite link has expired. Ask your friend for a new one!'
                : 'This invite link is not valid. Please check the link and try again.'}
            </p>
            <a
              href={appStoreUrl}
              className="seeya-button-secondary inline-block"
            >
              Download Seeya
            </a>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-seeya-secondary via-seeya-secondary/80 to-seeya-primary/30 flex flex-col">
      <header className="p-6">
        <Link href="/">
          <Logo size="md" className="text-seeya-text [&_span]:text-seeya-text" />
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-lg w-full space-y-6">
          {/* Invitation Header */}
          <div className="text-center text-seeya-text mb-2">
            <p className="text-lg opacity-90">You&apos;re invited to join</p>
          </div>

          {/* Trip Preview */}
          <TripPreview trip={data.trip!} inviter={data.inviter} coverPhotoCity={data.coverPhotoCity} />

          {/* Actions */}
          <InviteActions
            code={code}
            tripId={data.trip!.id}
            tripName={data.trip!.name}
            appStoreUrl={appStoreUrl}
          />
        </div>
      </main>

      <footer className="p-6 text-center">
        <p className="text-seeya-text/60 text-sm">
          &copy; {new Date().getFullYear()} Seeya. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
