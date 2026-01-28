import type { Profile } from './database';

// Calendar view modes
export type CalendarViewMode = '1mo' | '3mo' | '6mo' | '12mo';

// Trip filter options
export type TripFilter = 'all' | 'my_trips' | 'shared';

// Visibility levels (from iOS app)
export type VisibilityLevel =
  | 'only_me'       // Private - don't show to anyone
  | 'busy_only'     // Show I'm busy
  | 'dates_only'    // Show dates only
  | 'location_only' // Show destination only
  | 'full_details'; // Full details

// Calendar visibility preference (per-trip override)
export type CalendarVisibility =
  | 'follow'    // Follow trip's default setting
  | 'hide'      // Hide from my calendar
  | 'busy'      // Show as busy only
  | 'dates'     // Show dates only
  | 'location'; // Show location only

// Trip role for display
export type TripRole = 'owner' | 'accepted' | 'invited' | 'viewing';

// Trip owner info for display
export interface TripOwner {
  id: string;
  full_name: string;
  avatar_url: string | null;
}

// Calendar trip (display model)
export interface CalendarTrip {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  visibility: VisibilityLevel;

  // Owner info
  owner: TripOwner;

  // Computed for display
  role: TripRole;
  color: string;

  // First location for display
  destination?: string;
}

// Travel pal with trip count
export interface TravelPal {
  id: string;
  full_name: string;
  avatar_url: string | null;
  trip_count: number;
  color: string;
}

// Upcoming trip for sidebar
export interface UpcomingTrip {
  id: string;
  name: string;
  destination?: string;
  start_date: string;
  days_until: number;
}

// Calendar state
export interface CalendarState {
  // View settings
  viewMode: CalendarViewMode;
  currentDate: Date;
  filter: TripFilter;

  // Travel pal toggles (pal_id -> enabled)
  enabledPals: Set<string>;

  // Actions
  setViewMode: (mode: CalendarViewMode) => void;
  setCurrentDate: (date: Date) => void;
  setFilter: (filter: TripFilter) => void;
  togglePal: (palId: string) => void;
  enableAllPals: (palIds: string[]) => void;
  disableAllPals: () => void;
  navigateMonths: (delta: number) => void;
  goToToday: () => void;
}

// Color palette for travel pals
export const PAL_COLORS = [
  '#FFE066', // Yellow (user's own trips)
  '#7DD3FC', // Sky blue
  '#A5D6A7', // Green
  '#FFAB91', // Orange
  '#CE93D8', // Purple
  '#F48FB1', // Pink
  '#80DEEA', // Teal
  '#BCAAA4', // Brown
];

// Legend colors
export const LEGEND_COLORS = {
  your_trips: '#FFE066',
  accepted: '#A5D6A7',
  invited: '#FFAB91',
  viewing: '#E5E7EB',
  today: '#9333EA',
};

// Get color for a pal by index
export function getPalColor(index: number): string {
  return PAL_COLORS[index % PAL_COLORS.length];
}
