export type RecommendationCategory = 'restaurant' | 'activity' | 'stay' | 'tip';

export interface AIRecommendation {
  id: string;
  title: string;
  description: string;
  category: RecommendationCategory;
  tips?: string;
  estimatedCost?: string;
  bestTimeToVisit?: string;
}

export interface AIRecommendationsResponse {
  restaurants: AIRecommendation[];
  activities: AIRecommendation[];
  stays: AIRecommendation[];
  tips: AIRecommendation[];
}

export interface GenerateRecommendationsRequest {
  destination: string;
  startDate?: string;
  endDate?: string;
}
