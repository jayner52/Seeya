export type RecommendationCategory = 'restaurant' | 'activity' | 'stay' | 'tip';

export interface AIRecommendation {
  id: string;
  title: string;
  description: string;
  category: RecommendationCategory;
  tips?: string;
  estimatedCost?: string;
  bestTimeToVisit?: string;
  // Google Places enrichment
  googlePlaceId?: string;
  rating?: number;
  userRatingsTotal?: number;
  priceLevel?: number;
  address?: string;
  photoUrl?: string;
  websiteUrl?: string;
  googleMapsUrl?: string;
}

// Legacy response format (all categories at once)
export interface AIRecommendationsResponse {
  restaurants: AIRecommendation[];
  activities: AIRecommendation[];
  stays: AIRecommendation[];
  tips: AIRecommendation[];
}

// New category-based response format
export interface CategoryRecommendationsResponse {
  category: RecommendationCategory;
  destination: string;
  filters: CategoryFilters;
  recommendations: AIRecommendation[];
}

// Category-specific filter types
export interface RestaurantFilters {
  cuisine?: string;
  neighborhood?: string;
  priceRange?: '$' | '$$' | '$$$' | '$$$$';
  mealType?: 'breakfast' | 'brunch' | 'lunch' | 'dinner' | 'late-night';
  vibe?: 'romantic' | 'casual' | 'family' | 'trendy' | 'traditional';
}

export interface ActivityFilters {
  type?: 'outdoor' | 'cultural' | 'nightlife' | 'tours' | 'shopping' | 'wellness';
  duration?: 'quick' | 'half-day' | 'full-day';
  difficulty?: 'easy' | 'moderate' | 'challenging';
  kidFriendly?: boolean;
}

export interface StayFilters {
  neighborhood?: string;
  propertyType?: 'hotel' | 'boutique' | 'airbnb' | 'hostel' | 'resort';
  priceRange?: '$' | '$$' | '$$$' | '$$$$';
  amenities?: string[];
}

export interface TipFilters {
  topic?: 'transport' | 'safety' | 'culture' | 'money' | 'packing' | 'local-customs' | 'food' | 'language';
}

export type CategoryFilters = RestaurantFilters | ActivityFilters | StayFilters | TipFilters;

// Filter options for UI dropdowns
export const CUISINE_OPTIONS = [
  'Italian', 'Japanese', 'Mexican', 'Thai', 'Indian', 'French', 'Chinese',
  'Mediterranean', 'American', 'Korean', 'Vietnamese', 'Greek', 'Spanish', 'Local/Regional'
];

export const MEAL_TYPE_OPTIONS = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'brunch', label: 'Brunch' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'late-night', label: 'Late Night' },
];

export const VIBE_OPTIONS = [
  { value: 'romantic', label: 'Romantic' },
  { value: 'casual', label: 'Casual' },
  { value: 'family', label: 'Family-friendly' },
  { value: 'trendy', label: 'Trendy' },
  { value: 'traditional', label: 'Traditional' },
];

export const PRICE_RANGE_OPTIONS = [
  { value: '$', label: '$' },
  { value: '$$', label: '$$' },
  { value: '$$$', label: '$$$' },
  { value: '$$$$', label: '$$$$' },
];

export const ACTIVITY_TYPE_OPTIONS = [
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'cultural', label: 'Cultural' },
  { value: 'nightlife', label: 'Nightlife' },
  { value: 'tours', label: 'Tours' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'wellness', label: 'Wellness' },
];

export const ACTIVITY_DURATION_OPTIONS = [
  { value: 'quick', label: 'Quick (1-2 hrs)' },
  { value: 'half-day', label: 'Half Day' },
  { value: 'full-day', label: 'Full Day' },
];

export const STAY_PROPERTY_TYPE_OPTIONS = [
  { value: 'hotel', label: 'Hotel' },
  { value: 'boutique', label: 'Boutique' },
  { value: 'airbnb', label: 'Airbnb' },
  { value: 'hostel', label: 'Hostel' },
  { value: 'resort', label: 'Resort' },
];

export const TIP_TOPIC_OPTIONS = [
  { value: 'transport', label: 'Transportation' },
  { value: 'safety', label: 'Safety' },
  { value: 'culture', label: 'Culture' },
  { value: 'money', label: 'Money' },
  { value: 'packing', label: 'Packing' },
  { value: 'local-customs', label: 'Local Customs' },
  { value: 'food', label: 'Food' },
  { value: 'language', label: 'Language' },
];

export interface GenerateRecommendationsRequest {
  destination: string;
  category: RecommendationCategory;
  count?: number;
  filters?: CategoryFilters;
  startDate?: string;
  endDate?: string;
}
