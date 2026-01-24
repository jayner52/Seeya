import { Utensils, Compass, Home, Lightbulb } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type RecommendationCategory = 'restaurant' | 'activity' | 'stay' | 'tip';

export interface RecommendationCategoryConfig {
  icon: LucideIcon;
  label: string;
  bgClass: string;
  textClass: string;
}

export const recommendationCategoryConfig: Record<RecommendationCategory, RecommendationCategoryConfig> = {
  restaurant: { 
    icon: Utensils, 
    label: 'Restaurant', 
    bgClass: 'bg-orange-500/10', 
    textClass: 'text-orange-600' 
  },
  activity: { 
    icon: Compass, 
    label: 'Activity', 
    bgClass: 'bg-emerald-500/10', 
    textClass: 'text-emerald-600' 
  },
  stay: { 
    icon: Home, 
    label: 'Stay', 
    bgClass: 'bg-blue-500/10', 
    textClass: 'text-blue-600' 
  },
  tip: { 
    icon: Lightbulb, 
    label: 'Tip', 
    bgClass: 'bg-amber-500/10', 
    textClass: 'text-amber-600' 
  },
};

export const getRecommendationCategoryConfig = (category: string): RecommendationCategoryConfig => {
  return recommendationCategoryConfig[category as RecommendationCategory] || recommendationCategoryConfig.tip;
};
