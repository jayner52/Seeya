'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { Card, Button } from '@/components/ui';
import { TripBitCard } from './TripBitCard';
import {
  Plane,
  Hotel,
  Utensils,
  Ticket,
  Car,
  Wallet,
  FileText,
  Image,
  MoreHorizontal,
  Plus,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import type { TripBit, TripBitCategory } from '@/types/database';

interface TripPackSectionProps {
  tripBits: TripBit[];
  onAddClick?: (category?: TripBitCategory) => void;
  onTripBitClick?: (tripBit: TripBit) => void;
  className?: string;
}

const categories: { id: TripBitCategory; label: string; icon: typeof Plane; aliases?: string[] }[] = [
  { id: 'flight', label: 'Flights', icon: Plane },
  { id: 'hotel', label: 'Stays', icon: Hotel, aliases: ['stay'] },
  { id: 'transport', label: 'Transport', icon: Car, aliases: ['car'] },
  { id: 'activity', label: 'Activities', icon: Ticket },
  { id: 'restaurant', label: 'Dining', icon: Utensils, aliases: ['reservation'] },
  { id: 'note', label: 'Notes', icon: FileText },
  { id: 'other', label: 'Other', icon: MoreHorizontal },
];

interface CategorySectionProps {
  category: typeof categories[0];
  tripBits: TripBit[];
  onAddClick?: () => void;
  onTripBitClick?: (tripBit: TripBit) => void;
}

function CategorySection({ category, tripBits, onAddClick, onTripBitClick }: CategorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(tripBits.length > 0);
  const Icon = category.icon;

  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <Icon size={18} className="text-seeya-text-secondary" />
        <span className="flex-1 text-left font-medium text-seeya-text">
          {category.label}
        </span>
        {tripBits.length > 0 && (
          <span className="text-sm text-seeya-text-secondary mr-2">
            {tripBits.length}
          </span>
        )}
        {isExpanded ? (
          <ChevronDown size={18} className="text-seeya-text-secondary" />
        ) : (
          <ChevronRight size={18} className="text-seeya-text-secondary" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-2">
          {tripBits.map((bit) => (
            <TripBitCard
              key={bit.id}
              tripBit={bit}
              onClick={() => onTripBitClick?.(bit)}
            />
          ))}
          <button
            onClick={onAddClick}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-gray-200 rounded-xl text-sm text-seeya-text-secondary hover:border-seeya-purple hover:text-seeya-purple transition-colors"
          >
            <Plus size={16} />
            <span>Add {category.label.toLowerCase()}</span>
          </button>
        </div>
      )}
    </div>
  );
}

export function TripPackSection({
  tripBits,
  onAddClick,
  onTripBitClick,
  className,
}: TripPackSectionProps) {
  // Group trip bits by category (including iOS category aliases)
  const groupedBits = categories.reduce((acc, category) => {
    acc[category.id] = tripBits.filter((bit) => {
      if (bit.category === category.id) return true;
      if (category.aliases?.includes(bit.category)) return true;
      return false;
    });
    return acc;
  }, {} as Record<TripBitCategory, TripBit[]>);

  const totalCount = tripBits.length;

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-seeya-text">Trip Pack</h3>
          <p className="text-sm text-seeya-text-secondary">
            {totalCount} {totalCount === 1 ? 'item' : 'items'}
          </p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<Plus size={16} />}
          onClick={() => onAddClick?.()}
        >
          Add
        </Button>
      </div>

      <Card variant="outline" padding="none">
        {categories.map((category) => (
          <CategorySection
            key={category.id}
            category={category}
            tripBits={groupedBits[category.id] || []}
            onAddClick={() => onAddClick?.(category.id)}
            onTripBitClick={onTripBitClick}
          />
        ))}
      </Card>
    </div>
  );
}
