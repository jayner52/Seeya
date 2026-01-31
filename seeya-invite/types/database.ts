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
  visibility?: string | null;
}

export interface TripLocation {
  id: string;
  trip_id: string;
  city_id?: string | null;
  country_id?: string | null;
  name?: string;  // Web uses this
  custom_location?: string;  // iOS uses this
  arrival_date?: string | null;
  departure_date?: string | null;
  order_index: number;
  created_at: string;
  city?: City;
}

// Helper to get location display name (works with both iOS and web data)
export function getLocationDisplayName(location: TripLocation): string {
  // iOS uses custom_location, web might use name or city reference
  return location.custom_location || location.name || location.city?.name || 'Unknown location';
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
  location_id?: string | null;
  category: TripBitCategory;
  title: string;
  status?: TripBitStatus | null;
  start_datetime?: string | null;
  end_datetime?: string | null;
  notes?: string | null;
  order_index?: number | null;
  created_by: string;
  created_at: string;
  updated_at?: string;
  // Legacy web fields (for backwards compatibility)
  date?: string | null;
  time?: string | null;
  duration_minutes?: number | null;
  confirmation_number?: string | null;
  url?: string | null;
  address?: string | null;
  is_booked?: boolean;
  cost?: number | null;
  currency?: string | null;
  metadata?: Record<string, unknown> | null;
}

export type TripBitStatus = 'idea' | 'planned' | 'booked' | 'confirmed' | 'completed' | 'cancelled';

// Updated TripBitCategory to match iOS (10 categories)
export type TripBitCategory =
  | 'flight'
  | 'stay'
  | 'car'
  | 'activity'
  | 'transport'
  | 'money'
  | 'reservation'
  | 'document'
  | 'photos'
  | 'other'
  // Legacy categories (for backwards compatibility)
  | 'hotel'
  | 'restaurant'
  | 'note';

// Trip bit details (category-specific fields stored as JSON)
export interface TripBitDetails {
  id: string;
  trip_bit_id: string;
  details: Record<string, string | number | boolean>;
  created_at: string;
}

// Trip bit status mapping (web uses different terms than display)
export const STATUS_DISPLAY_MAP = {
  booked: 'Confirmed',
  confirmed: 'Confirmed',
  planned: 'Pending',
  idea: 'Pending',
  cancelled: 'Cancelled',
  completed: 'Completed',
} as const;

// Category picker options
export const STAY_PROPERTY_TYPES = ['Hotel', 'Airbnb', 'Hostel', 'Resort', 'Villa', 'Apartment', 'Other'];
export const CAR_VEHICLE_TYPES = ['Economy', 'Compact', 'Mid-size', 'Full-size', 'SUV', 'Minivan', 'Luxury', 'Convertible', 'Other'];
export const TRANSPORT_TYPES = ['Train', 'Bus', 'Ferry', 'Shuttle', 'Taxi', 'Uber/Lyft', 'Metro', 'Other'];
export const MONEY_TYPES = ['Budget', 'Expense', 'Exchange', 'Payment', 'Refund'];
export const CURRENCY_OPTIONS = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY', 'MXN', 'Other'];
export const RESERVATION_VENUE_TYPES = ['Restaurant', 'Spa', 'Tour', 'Class', 'Event', 'Show', 'Other'];
export const DOCUMENT_TYPES = ['Passport', 'Visa', 'ID Card', "Driver's License", 'Insurance', 'Vaccination Record', 'Travel Insurance', 'Other'];

// Re-export VisibilityLevel from calendar for use here
import type { VisibilityLevel } from './calendar';
export type { VisibilityLevel } from './calendar';

export const VISIBILITY_OPTIONS: { value: VisibilityLevel; label: string; description: string; icon: string }[] = [
  { value: 'only_me', label: 'Only me', description: 'Private - only you can see this trip', icon: 'Lock' },
  { value: 'busy_only', label: "Show I'm busy", description: "Friends see you're traveling", icon: 'EyeOff' },
  { value: 'dates_only', label: 'Show dates', description: "Friends see when you're traveling", icon: 'Calendar' },
  { value: 'location_only', label: 'Show destination', description: "Friends see where you're going", icon: 'MapPin' },
  { value: 'full_details', label: 'Full details', description: 'Friends see all trip details', icon: 'Globe' },
];

// User settings
export interface UserSettings {
  id: string;
  user_id: string;
  default_trip_visibility: VisibilityLevel;
  delayed_trip_visibility: boolean;
  calendar_sharing: boolean;
  notify_travel_pal_requests: boolean;
  notify_trip_invitations: boolean;
  notify_trip_messages: boolean;
  notify_added_to_tripbit: boolean;
  created_at: string;
  updated_at: string;
}

export const DEFAULT_USER_SETTINGS: Omit<UserSettings, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  default_trip_visibility: 'busy_only',
  delayed_trip_visibility: false,
  calendar_sharing: true,
  notify_travel_pal_requests: true,
  notify_trip_invitations: true,
  notify_trip_messages: true,
  notify_added_to_tripbit: true,
};

// Trip bit attachment
export interface TripBitAttachment {
  id: string;
  trip_bit_id: string;
  file_url: string;
  file_name: string | null;
  file_type: string | null;
  created_at: string;
}

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
