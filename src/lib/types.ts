// Database types matching Supabase schema
export type FriendshipStatus = 'pending' | 'accepted' | 'declined';
export type AppRole = 'admin' | 'moderator' | 'user';
export type VisibilityLevel = 'only_me' | 'busy_only' | 'dates_only' | 'location_only' | 'full_details';

export interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
  onboarding_completed?: boolean;
}

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  updated_at: string;
}

export interface FriendWithProfile extends Friendship {
  profile: Profile;
}

export interface CalendarSharing {
  id: string;
  owner_id: string;
  shared_with_id: string;
  is_enabled: boolean;
  created_at: string;
}

export interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  visibility: VisibilityLevel;
  participants: Profile[];
  isOwner: boolean;
  status: 'confirmed' | 'interested' | 'invited';
}

export const visibilityLabels: Record<VisibilityLevel, { label: string; description: string }> = {
  only_me: {
    label: 'Only Me',
    description: 'Fully private, not visible to friends',
  },
  busy_only: {
    label: 'Busy Only',
    description: 'Appears as "Unavailable" — no destination or dates',
  },
  dates_only: {
    label: 'Dates Only',
    description: 'Shows date range, no location',
  },
  location_only: {
    label: 'Location Only',
    description: 'Shows destination, no dates',
  },
  full_details: {
    label: 'Full Details',
    description: 'Visible to accepted participants only',
  },
};

