'use client';

import { cn } from '@/lib/utils/cn';
import { Utensils, Ticket, Hotel, Lightbulb, Sparkles } from 'lucide-react';

export type RecommendationCategory = 'all' | 'restaurant' | 'activity' | 'stay' | 'tip';

interface CategoryFilterProps {
  selectedCategory: RecommendationCategory;
  onCategoryChange: (category: RecommendationCategory) => void;
  className?: string;
}

const categories: { id: RecommendationCategory; label: string; icon: typeof Sparkles }[] = [
  { id: 'all', label: 'All', icon: Sparkles },
  { id: 'restaurant', label: 'Food', icon: Utensils },
  { id: 'activity', label: 'Activities', icon: Ticket },
  { id: 'stay', label: 'Stays', icon: Hotel },
  { id: 'tip', label: 'Tips', icon: Lightbulb },
];

export function CategoryFilter({
  selectedCategory,
  onCategoryChange,
  className,
}: CategoryFilterProps) {
  return (
    <div className={cn('flex gap-2 overflow-x-auto pb-2', className)}>
      {categories.map((category) => {
        const Icon = category.icon;
        const isSelected = selectedCategory === category.id;
        return (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
              isSelected
                ? 'bg-seeya-purple text-white'
                : 'bg-gray-100 text-seeya-text-secondary hover:bg-gray-200'
            )}
          >
            <Icon size={16} />
            <span>{category.label}</span>
          </button>
        );
      })}
    </div>
  );
}
