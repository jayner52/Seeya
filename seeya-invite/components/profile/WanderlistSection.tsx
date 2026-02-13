'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { Card, Button } from '@/components/ui';
import { Globe, Plus, MapPin, X, ChevronDown, ChevronRight } from 'lucide-react';

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

// Group items by continent
function groupByContinent(items: WanderlistItem[]): Record<string, WanderlistItem[]> {
  const grouped: Record<string, WanderlistItem[]> = {};

  items.forEach((item) => {
    const continent = item.continent || 'Other';
    if (!grouped[continent]) {
      grouped[continent] = [];
    }
    grouped[continent].push(item);
  });

  return grouped;
}

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

interface ContinentGroupProps {
  continent: string;
  items: WanderlistItem[];
  onRemoveItem: (id: string) => Promise<void>;
}

function ContinentGroup({ continent, items, onRemoveItem }: ContinentGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    try {
      await onRemoveItem(id);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        {isExpanded ? (
          <ChevronDown size={16} className="text-seeya-text-secondary" />
        ) : (
          <ChevronRight size={16} className="text-seeya-text-secondary" />
        )}
        <span className="font-medium text-seeya-text">{continent}</span>
        <span className="text-sm text-seeya-text-secondary">({items.length})</span>
      </button>

      {isExpanded && (
        <div className="px-4 pb-3 space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 group"
            >
              <MapPin size={16} className="text-seeya-purple flex-shrink-0" />
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

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Globe size={20} className="text-seeya-purple" />
          <h2 className="text-lg font-semibold text-seeya-text">Wanderlist</h2>
          {items.length > 0 && (
            <span className="text-sm text-seeya-text-secondary">({items.length})</span>
          )}
        </div>
        <Button
          variant="secondary"
          size="sm"
          leftIcon={<Plus size={16} />}
          onClick={onAddClick}
        >
          Add
        </Button>
      </div>

      {items.length > 0 ? (
        <Card variant="outline" padding="none">
          {sortedContinents.map((continent) => (
            <ContinentGroup
              key={continent}
              continent={continent}
              items={groupedItems[continent]}
              onRemoveItem={onRemoveItem}
            />
          ))}
        </Card>
      ) : (
        <Card variant="outline" padding="md" className="text-center py-8">
          <Globe size={36} className="text-gray-300 mx-auto mb-3" />
          <p className="text-seeya-text-secondary">No places yet</p>
          <p className="text-xs text-gray-400 mt-1">Add countries or cities you want to visit</p>
        </Card>
      )}
    </div>
  );
}
