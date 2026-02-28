'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils/cn';
import { Button } from '@/components/ui';
import { TripBitCard, TripBitCardCompact } from './TripBitCard';
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
  Image,
  MoreHorizontal,
  Plus,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Luggage,
  ArrowUpDown,
  LayoutGrid,
  LayoutList,
  List,
  Check,
} from 'lucide-react';
import type { TripBit, TripBitCategory } from '@/types/database';

// ─── Types ──────────────────────────────────────────────────────────────────

type ViewMode = 'full' | 'compact' | 'byType';
type SortMode = 'date' | 'created' | 'category';

interface TripPackSectionProps {
  tripBits: TripBit[];
  onAddClick?: (category?: TripBitCategory) => void;
  onAIQuickAdd?: () => void;
  onTripBitClick?: (tripBit: TripBit) => void;
  isPastTrip?: boolean;
  onRateShare?: (tripBit: TripBit) => void;
  className?: string;
}

// ─── Category config ─────────────────────────────────────────────────────────

const categories: {
  id: TripBitCategory;
  label: string;
  chipLabel: string;
  icon: typeof Plane;
  color: string;
  bgColor: string;
}[] = [
  { id: 'flight',      label: 'Flights',      chipLabel: 'Flights',  icon: Plane,        color: 'text-blue-600',   bgColor: 'bg-blue-100' },
  { id: 'stay',        label: 'Stays',         chipLabel: 'Stays',    icon: BedDouble,    color: 'text-purple-600', bgColor: 'bg-purple-100' },
  { id: 'car',         label: 'Cars',          chipLabel: 'Cars',     icon: Car,          color: 'text-orange-600', bgColor: 'bg-orange-100' },
  { id: 'activity',    label: 'Activities',    chipLabel: 'Activites',icon: PersonStanding,color: 'text-green-600', bgColor: 'bg-green-100' },
  { id: 'transport',   label: 'Transit',       chipLabel: 'Transit',  icon: TramFront,    color: 'text-cyan-600',   bgColor: 'bg-cyan-100' },
  { id: 'money',       label: 'Money',         chipLabel: 'Money',    icon: CreditCard,   color: 'text-amber-600',  bgColor: 'bg-amber-100' },
  { id: 'dining',      label: 'Dining',        chipLabel: 'Dining',   icon: Utensils,     color: 'text-red-500',    bgColor: 'bg-red-50' },
  { id: 'reservation', label: 'Reservations',  chipLabel: 'Reserv.',  icon: CalendarClock,color: 'text-pink-600',   bgColor: 'bg-pink-100' },
  { id: 'document',    label: 'Documents',     chipLabel: 'Docs',     icon: FileText,     color: 'text-gray-600',   bgColor: 'bg-gray-100' },
  { id: 'photos',      label: 'Photos',        chipLabel: 'Photos',   icon: Image,        color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  { id: 'other',       label: 'Other',         chipLabel: 'Other',    icon: MoreHorizontal,color: 'text-gray-500', bgColor: 'bg-gray-100' },
];

// ─── Sorting ─────────────────────────────────────────────────────────────────

function sortBits(bits: TripBit[], sort: SortMode): TripBit[] {
  return [...bits].sort((a, b) => {
    if (sort === 'date') {
      const da = a.start_datetime ?? a.date ?? '';
      const db = b.start_datetime ?? b.date ?? '';
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return da.localeCompare(db);
    }
    if (sort === 'category') return a.category.localeCompare(b.category);
    return 0; // 'created' — preserve DB order
  });
}

// ─── By-Type category section ────────────────────────────────────────────────

interface CategorySectionProps {
  category: typeof categories[0];
  tripBits: TripBit[];
  onAddClick?: () => void;
  onTripBitClick?: (tripBit: TripBit) => void;
  isPastTrip?: boolean;
  onRateShare?: (tripBit: TripBit) => void;
}

function CategorySection({
  category,
  tripBits,
  onAddClick,
  onTripBitClick,
  isPastTrip,
  onRateShare,
}: CategorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(tripBits.length > 0);
  const Icon = category.icon;

  return (
    <div id={`section-${category.id}`} className="border-b border-gray-100 last:border-0">
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

// ─── Popover helper ──────────────────────────────────────────────────────────

function Popover({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute right-0 top-full mt-2 z-20 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-[160px]">
        {children}
      </div>
    </>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export function TripPackSection({
  tripBits,
  onAddClick,
  onAIQuickAdd,
  onTripBitClick,
  isPastTrip,
  onRateShare,
  className,
}: TripPackSectionProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('full');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortMode>('date');
  const [showViewPicker, setShowViewPicker] = useState(false);
  const [showSortPicker, setShowSortPicker] = useState(false);

  const groupedBits = categories.reduce((acc, cat) => {
    acc[cat.id] = tripBits.filter((b) => b.category === cat.id);
    return acc;
  }, {} as Record<string, TripBit[]>);

  // Filtered + sorted list for Full / Compact views
  const filteredBits = sortBits(
    activeCategory === 'all' ? tripBits : tripBits.filter((b) => b.category === activeCategory),
    sortBy
  );

  const handleCategoryChipClick = (catId: string) => {
    setActiveCategory(catId);
    if (viewMode === 'byType' && catId !== 'all') {
      setTimeout(() => {
        document.getElementById(`section-${catId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 50);
    }
  };

  const viewOptions: { id: ViewMode; label: string; icon: typeof LayoutList }[] = [
    { id: 'full',    label: 'Full',    icon: LayoutList },
    { id: 'compact', label: 'Compact', icon: List },
    { id: 'byType',  label: 'By Type', icon: LayoutGrid },
  ];

  const sortOptions: { id: SortMode; label: string }[] = [
    { id: 'date',     label: 'Date' },
    { id: 'created',  label: 'Recently Added' },
    { id: 'category', label: 'Category' },
  ];

  const ViewIcon = viewOptions.find((v) => v.id === viewMode)?.icon ?? LayoutList;

  return (
    <div className={className}>
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-seeya-text">TripPack</h3>
          <p className="text-sm text-seeya-text-secondary">
            {tripBits.length} {tripBits.length === 1 ? 'item' : 'items'}
          </p>
        </div>

        <div className="flex items-center gap-1">
          {/* View picker */}
          <div className="relative">
            <button
              onClick={() => { setShowViewPicker(!showViewPicker); setShowSortPicker(false); }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-seeya-text-secondary hover:text-seeya-text"
              title="Change view"
            >
              <ViewIcon size={18} />
            </button>
            <Popover open={showViewPicker} onClose={() => setShowViewPicker(false)}>
              {viewOptions.map((opt) => {
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.id}
                    onClick={() => { setViewMode(opt.id); setShowViewPicker(false); }}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors',
                      viewMode === opt.id ? 'text-seeya-purple font-medium' : 'text-seeya-text'
                    )}
                  >
                    <Icon size={16} />
                    <span className="flex-1 text-left">{opt.label}</span>
                    {viewMode === opt.id && <Check size={14} className="text-seeya-purple" />}
                  </button>
                );
              })}
            </Popover>
          </div>

          {/* Sort picker */}
          <div className="relative">
            <button
              onClick={() => { setShowSortPicker(!showSortPicker); setShowViewPicker(false); }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-seeya-text-secondary hover:text-seeya-text"
              title="Sort"
            >
              <ArrowUpDown size={18} />
            </button>
            <Popover open={showSortPicker} onClose={() => setShowSortPicker(false)}>
              {sortOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => { setSortBy(opt.id); setShowSortPicker(false); }}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors',
                    sortBy === opt.id ? 'text-seeya-purple font-medium' : 'text-seeya-text'
                  )}
                >
                  <span className="flex-1 text-left">{opt.label}</span>
                  {sortBy === opt.id && <Check size={14} className="text-seeya-purple" />}
                </button>
              ))}
            </Popover>
          </div>

          {/* Add button */}
          <button
            onClick={() => onAddClick?.()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-seeya-text-secondary hover:text-seeya-purple"
            title="Add item"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* ── Category chips ── */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-3 scrollbar-hide">
        <button
          onClick={() => handleCategoryChipClick('all')}
          className={cn(
            'flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
            activeCategory === 'all'
              ? 'bg-seeya-text text-white'
              : 'bg-gray-100 text-seeya-text-secondary hover:bg-gray-200'
          )}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategoryChipClick(cat.id)}
            className={cn(
              'flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
              activeCategory === cat.id
                ? 'bg-seeya-text text-white'
                : 'bg-gray-100 text-seeya-text-secondary hover:bg-gray-200'
            )}
          >
            {cat.chipLabel}
          </button>
        ))}
      </div>

      {/* ── Empty state ── */}
      {tripBits.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 px-6 bg-gray-50 rounded-2xl text-center">
          <Luggage size={64} className="text-gray-300 mb-4" strokeWidth={1.25} />
          <h4 className="text-lg font-bold text-seeya-text mb-1">Your TripPack is Empty</h4>
          <p className="text-sm text-seeya-text-secondary mb-6">
            Add flights, hotels, activities, and more to organize your trip.
          </p>
          <div className="flex gap-3 w-full max-w-xs">
            <Button
              variant="secondary"
              leftIcon={<Plus size={16} />}
              onClick={() => onAddClick?.()}
              className="flex-1"
            >
              Add Item
            </Button>
            <Button
              variant="purple"
              leftIcon={<Sparkles size={16} />}
              onClick={onAIQuickAdd}
              className="flex-1"
            >
              AI Quick Add
            </Button>
          </div>
        </div>
      )}

      {/* ── Full view ── */}
      {tripBits.length > 0 && viewMode === 'full' && (
        <div className="space-y-2">
          {filteredBits.length === 0 ? (
            <p className="text-center text-sm text-seeya-text-secondary py-8">
              No items in this category yet.
            </p>
          ) : (
            filteredBits.map((bit) => (
              <TripBitCard
                key={bit.id}
                tripBit={bit}
                onClick={() => onTripBitClick?.(bit)}
                isPastTrip={isPastTrip}
                onRateShare={onRateShare}
              />
            ))
          )}
        </div>
      )}

      {/* ── Compact view ── */}
      {tripBits.length > 0 && viewMode === 'compact' && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
          {filteredBits.length === 0 ? (
            <p className="text-center text-sm text-seeya-text-secondary py-8">
              No items in this category yet.
            </p>
          ) : (
            filteredBits.map((bit) => (
              <TripBitCardCompact
                key={bit.id}
                tripBit={bit}
                onClick={() => onTripBitClick?.(bit)}
              />
            ))
          )}
        </div>
      )}

      {/* ── By Type view ── */}
      {tripBits.length > 0 && viewMode === 'byType' && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          {categories.map((cat) => (
            <CategorySection
              key={cat.id}
              category={cat}
              tripBits={groupedBits[cat.id] || []}
              onAddClick={() => onAddClick?.(cat.id)}
              onTripBitClick={onTripBitClick}
              isPastTrip={isPastTrip}
              onRateShare={onRateShare}
            />
          ))}
        </div>
      )}
    </div>
  );
}
