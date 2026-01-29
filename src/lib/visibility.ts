import { Database } from '@/integrations/supabase/types';

type VisibilityLevel = Database['public']['Enums']['visibility_level'];

// Visibility levels ordered from most restrictive to least restrictive
const visibilityOrder: VisibilityLevel[] = [
  'only_me',
  'busy_only', 
  'dates_only',
  'location_only',
  'full_details',
];

/**
 * Get the effective visibility by taking the most restrictive between
 * the trip owner's setting and the participant's personal setting.
 * 
 * @param tripVisibility - The trip owner's visibility setting
 * @param personalVisibility - The participant's personal visibility override (null = follow trip)
 * @returns The effective visibility level
 */
export function getEffectiveVisibility(
  tripVisibility: VisibilityLevel,
  personalVisibility: VisibilityLevel | null
): VisibilityLevel {
  // If participant hasn't set a preference, use trip visibility
  if (personalVisibility === null) {
    return tripVisibility;
  }

  // Return the most restrictive (lower index = more restrictive)
  const tripIndex = visibilityOrder.indexOf(tripVisibility);
  const personalIndex = visibilityOrder.indexOf(personalVisibility);

  return tripIndex < personalIndex ? tripVisibility : personalVisibility;
}

/**
 * Check if a trip should be visible based on effective visibility
 */
export function shouldShowTrip(
  tripVisibility: VisibilityLevel,
  personalVisibility: VisibilityLevel | null
): boolean {
  const effective = getEffectiveVisibility(tripVisibility, personalVisibility);
  return effective !== 'only_me';
}

/**
 * Get display info based on effective visibility
 */
export function getVisibilityDisplayInfo(effective: VisibilityLevel): {
  showName: boolean;
  showDestination: boolean;
  showDates: boolean;
  displayAs: 'full' | 'busy' | 'dates' | 'location' | 'hidden';
} {
  switch (effective) {
    case 'only_me':
      return { showName: false, showDestination: false, showDates: false, displayAs: 'hidden' };
    case 'busy_only':
      return { showName: false, showDestination: false, showDates: true, displayAs: 'busy' };
    case 'dates_only':
      return { showName: true, showDestination: false, showDates: true, displayAs: 'dates' };
    case 'location_only':
      return { showName: true, showDestination: true, showDates: false, displayAs: 'location' };
    case 'full_details':
    default:
      return { showName: true, showDestination: true, showDates: true, displayAs: 'full' };
  }
}
