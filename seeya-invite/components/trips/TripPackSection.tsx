'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { Card, Button } from '@/components/ui';
import { TripBitCard } from './TripBitCard';
import {
  Plane,
  BedDouble,
  Car,
  PersonStanding,
  TramFront,
  CreditCard,
  Utensils,
  CalendarClock,
  FileText,
  Images,
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
  isPastTrip?: boolean;
  onRateShare?: (tripBit: TripBit) => void;
  className?: string;
}

const categories: { id: TripBitCategory; label: string; icon: typeof Plane; color: string; bgColor: string }[] = [
  { id: 'flight', label: 'Flights', icon: Plane, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  { id: 'stay', label: 'Stays', icon: BedDouble, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  { id: 'car', label: 'Car', icon: Car, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  { id: 'activity', label: 'Activities', icon: PersonStanding, color: 'text-green-600', bgColor: 'bg-green-100' },
  { id: 'transport', label: 'Transit', icon: TramFront, color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
  { id: 'money', label: 'Money', icon: CreditCard, color: 'text-amber-600', bgColor: 'bg-amber-100' },
  { id: 'dining', label: 'Dining', icon: Utensils, color: 'text-red-500', bgColor: 'bg-red-50' },
  { id: 'reservation', label: 'Reservations', icon: CalendarClock, color: 'text-pink-600', bgColor: 'bg-pink-100' },
  { id: 'document', label: 'Documents', icon: FileText, color: 'text-gray-600', bgColor: 'bg-gray-100' },
  { id: 'photos', label: 'Photos', icon: Images, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  { id: 'other', label: 'Other', icon: MoreHorizontal, color: 'text-gray-500', bgColor: 'bg-gray-100' },
];

interface CategorySectionProps {
  category: typeof categories[0];
  tripBits: TripBit[];
  onAddClick?: () => void;
  onTripBitClick?: (tripBit: TripBit) => void;
  isPastTrip?: boolean;
  onRateShare?: (tripBit: TripBit) => void;
}

function CategorySection({ category, tripBits, onAddClick, onTripBitClick, isPastTrip, onRateShare }: CategorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(tripBits.length > 0);
  const Icon = category.icon;

  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className={cn('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0', category.bgColor)}>
          <Icon size={14} className={category.color} />
        </div>
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
              isPastTrip={isPastTrip}
              onRateShare={onRateShare}
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
  isPastTrip,
  onRateShare,
  className,
}: TripPackSectionProps) {
  // Group trip bits by category
  const groupedBits = categories.reduce((acc, category) => {
    acc[category.id] = tripBits.filter((bit) => bit.category === category.id);
    return acc;
  }, {} as Record<string, TripBit[]>);

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
            isPastTrip={isPastTrip}
            onRateShare={onRateShare}
          />
        ))}
      </Card>
    </div>
  );
}
