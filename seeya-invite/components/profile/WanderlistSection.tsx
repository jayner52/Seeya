'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { Card, Button } from '@/components/ui';
import {
  Globe,
  Plus,
  MapPin,
  X,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Landmark,
  Mountain,
  Triangle,
  Wind,
  Sun,
  Waves,
  Snowflake,
} from 'lucide-react';

interface WanderlistItem {
  id: string;
  placeName: string;
  country?: string;
  continent?: string;
  notes?: string;
}

interface WanderlistSectionProps {
  items: WanderlistItem[];
  onAddClick: () => void;
  onRemoveItem: (id: string) => Promise<void>;
  className?: string;
}

// Continent config matching iOS
const continentConfig: Record<string, {
  icon: typeof Landmark;
  color: string;
  bgColor: string;
  textColor: string;
  rowBg: string;
}> = {
  Europe: {
    icon: Landmark,
    color: 'text-blue-500',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-600',
    rowBg: 'bg-blue-50/50',
  },
  Asia: {
    icon: Mountain,
    color: 'text-red-500',
    bgColor: 'bg-red-100',
    textColor: 'text-red-600',
    rowBg: 'bg-red-50/50',
  },
  'North America': {
    icon: Triangle,
    color: 'text-green-500',
    bgColor: 'bg-green-100',
    textColor: 'text-green-600',
    rowBg: 'bg-green-50/50',
  },
  'South America': {
    icon: Wind,
    color: 'text-orange-500',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-600',
    rowBg: 'bg-orange-50/50',
  },
  Africa: {
    icon: Sun,
    color: 'text-amber-500',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-600',
    rowBg: 'bg-amber-50/50',
  },
  Oceania: {
    icon: Waves,
    color: 'text-teal-500',
    bgColor: 'bg-teal-100',
    textColor: 'text-teal-600',
    rowBg: 'bg-teal-50/50',
  },
  Antarctica: {
    icon: Snowflake,
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-100',
    textColor: 'text-cyan-500',
    rowBg: 'bg-cyan-50/50',
  },
  Other: {
    icon: Globe,
    color: 'text-gray-500',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-600',
    rowBg: 'bg-gray-50/50',
  },
};

const continentOrder = [
  'Europe',
  'Asia',
  'North America',
  'South America',
  'Africa',
  'Oceania',
  'Antarctica',
  'Other',
];

function groupByContinent(items: WanderlistItem[]): Record<string, WanderlistItem[]> {
  const grouped: Record<string, WanderlistItem[]> = {};
  items.forEach((item) => {
    const continent = item.continent || 'Other';
    if (!grouped[continent]) grouped[continent] = [];
    grouped[continent].push(item);
  });
  return grouped;
}

interface ContinentRowProps {
  continent: string;
  items: WanderlistItem[];
  onRemoveItem: (id: string) => Promise<void>;
}

function ContinentRow({ continent, items, onRemoveItem }: ContinentRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const config = continentConfig[continent] || continentConfig.Other;
  const Icon = config.icon;

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    try {
      await onRemoveItem(id);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className={cn('border-b border-gray-100 last:border-0', config.rowBg)}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-3 px-4 py-3"
      >
        <Icon size={20} className={config.color} />
        <span className={cn('font-medium', config.textColor)}>{continent}</span>
        <span className="ml-auto text-sm text-seeya-text-secondary">{items.length}</span>
        {isExpanded ? (
          <ChevronDown size={16} className="text-seeya-text-secondary" />
        ) : (
          <ChevronRight size={16} className="text-seeya-text-secondary" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-3 space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-2 rounded-lg bg-white/60 group"
            >
              <MapPin size={14} className="text-seeya-purple flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-seeya-text text-sm truncate">
                  {item.placeName}
                </p>
                {item.country && (
                  <p className="text-xs text-seeya-text-secondary">{item.country}</p>
                )}
              </div>
              <button
                onClick={() => handleRemove(item.id)}
                disabled={removingId === item.id}
                className="p-1 text-gray-400 hover:text-seeya-error hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function WanderlistSection({
  items,
  onAddClick,
  onRemoveItem,
  className,
}: WanderlistSectionProps) {
  const groupedItems = groupByContinent(items);
  const sortedContinents = continentOrder.filter((c) => groupedItems[c]?.length > 0);
  const continentCount = sortedContinents.filter((c) => c !== 'Other').length;

  return (
    <div className={className}>
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Globe size={20} className="text-seeya-purple" />
          <h2 className="text-lg font-semibold text-seeya-text">My Wanderlist</h2>
        </div>
        {items.length > 0 && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-seeya-purple/10">
            <Sparkles size={14} className="text-seeya-purple" />
            <span className="text-xs font-medium text-seeya-purple">{continentCount}/7 continents</span>
          </div>
        )}
      </div>
      <p className="text-sm text-seeya-text-secondary mb-4">Countries you dream of visiting</p>

      {items.length > 0 ? (
        <Card variant="outline" padding="none">
          {/* Continent filter icons */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
            {continentOrder.filter((c) => c !== 'Other').map((continent) => {
              const config = continentConfig[continent];
              const Icon = config.icon;
              const hasItems = !!groupedItems[continent];
              return (
                <div
                  key={continent}
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center',
                    hasItems ? config.bgColor : 'bg-gray-100'
                  )}
                >
                  <Icon
                    size={16}
                    className={hasItems ? config.color : 'text-gray-300'}
                  />
                </div>
              );
            })}
          </div>

          {/* Continent rows */}
          {sortedContinents.map((continent) => (
            <ContinentRow
              key={continent}
              continent={continent}
              items={groupedItems[continent]}
              onRemoveItem={onRemoveItem}
            />
          ))}

          {/* Add place button */}
          <button
            onClick={onAddClick}
            className="w-full flex items-center gap-2 px-4 py-3 text-seeya-purple hover:bg-gray-50 transition-colors"
          >
            <Plus size={16} />
            <span className="text-sm font-medium">Add place</span>
          </button>
        </Card>
      ) : (
        <Card variant="outline" padding="none">
          {/* Continent filter icons - all grayed out */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
            {continentOrder.filter((c) => c !== 'Other').map((continent) => {
              const config = continentConfig[continent];
              const Icon = config.icon;
              return (
                <div
                  key={continent}
                  className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100"
                >
                  <Icon size={16} className="text-gray-300" />
                </div>
              );
            })}
          </div>

          <div className="text-center py-8">
            <Globe size={36} className="text-gray-300 mx-auto mb-3" />
            <p className="text-seeya-text-secondary">No places yet</p>
            <p className="text-xs text-gray-400 mt-1">Add countries or cities you want to visit</p>
          </div>

          {/* Add place button */}
          <button
            onClick={onAddClick}
            className="w-full flex items-center gap-2 px-4 py-3 border-t border-gray-100 text-seeya-purple hover:bg-gray-50 transition-colors"
          >
            <Plus size={16} />
            <span className="text-sm font-medium">Add place</span>
          </button>
        </Card>
      )}
    </div>
  );
}
