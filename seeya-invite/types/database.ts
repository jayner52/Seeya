export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  bio: string | null;
  home_city_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Trip {
  id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
  visibility: string | null;
}

export interface TripLocation {
  id: string;
  trip_id: string;
  city_id: string | null;
  name: string;
  arrival_date: string | null;
  departure_date: string | null;
  order_index: number;
  created_at: string;
  city?: City;
}

export interface City {
  id: string;
  name: string;
  country: string;
  country_code: string;
  continent: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface TripParticipant {
  id: string;
  trip_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  status: 'invited' | 'accepted' | 'declined';
  joined_at: string | null;
  created_at: string;
  user?: Profile;
}

export interface TripInviteLink {
  id: string;
  trip_id: string;
  created_by: string;
  code: string;
  expires_at: string | null;
  location_ids: string[] | null;
  usage_count: number;
  created_at: string;
}

export interface TripBit {
  id: string;
  trip_id: string;
  location_id: string | null;
  category: TripBitCategory;
  title: string;
  notes: string | null;
  date: string | null;
  time: string | null;
  duration_minutes: number | null;
  confirmation_number: string | null;
  url: string | null;
  address: string | null;
  is_booked: boolean;
  cost: number | null;
  currency: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, unknown> | null;
}

export type TripBitCategory =
  | 'flight'
  | 'hotel'
  | 'restaurant'
  | 'activity'
  | 'transport'
  | 'note'
  | 'other';

export type FriendshipStatus = 'pending' | 'accepted' | 'declined';

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  requester?: Profile;
  addressee?: Profile;
}

export interface WanderlistItem {
  id: string;
  user_id: string;
  country_id?: string;
  city_id?: string;
  place_name?: string;
  place_id?: string;
  notes?: string;
  created_at?: string;
  country?: { name: string; continent: string };
  city?: City;
}

// Extended types for API responses
export interface TripWithDetails extends Trip {
  locations: TripLocation[];
  participants: TripParticipant[];
  tripbits?: TripBit[];
}

export interface InviteWithTrip extends TripInviteLink {
  trip: TripWithDetails;
}

// API Response types
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface InviteValidationResult {
  valid: boolean;
  expired?: boolean;
  error?: string;
  invite?: TripInviteLink;
  trip?: TripWithDetails;
}

// Raw Supabase query response types (nested relations come as single objects or arrays)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RawTripLocation = Omit<TripLocation, 'city'> & { city: any };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type RawTripParticipant = Omit<TripParticipant, 'user'> & { user: any };

// Utility function to normalize Supabase nested relation
export function normalizeRelation<T>(relation: T | T[] | null | undefined): T | undefined {
  if (!relation) return undefined;
  if (Array.isArray(relation)) return relation[0];
  return relation;
}

// Transform raw Supabase data to typed data
export function transformLocation(raw: RawTripLocation): TripLocation {
  return {
    ...raw,
    city: normalizeRelation(raw.city),
  };
}

export function transformParticipant(raw: RawTripParticipant): TripParticipant {
  return {
    ...raw,
    user: normalizeRelation(raw.user),
  };
}
