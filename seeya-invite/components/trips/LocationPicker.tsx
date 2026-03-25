'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils/cn';
import { MapPin, X, Plus, GripVertical, Search } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Location {
  id: string;
  name: string;
  cityId?: string;
  country?: string;
  arrivalDate?: string | null;
  departureDate?: string | null;
}

interface LocationPickerProps {
  locations: Location[];
  onChange: (locations: Location[]) => void;
  className?: string;
}

interface PlacePrediction {
  placeId: string;
  mainText: string;
  secondaryText: string;
  description: string;
}

// ── Sortable location card ──────────────────────────────────────────
interface SortableLocationCardProps {
  location: Location;
  index: number;
  totalCount: number;
  onRemove: (id: string) => void;
  onDateChange: (idx: number, field: 'arrivalDate' | 'departureDate', value: string | null) => void;
}

function SortableLocationCard({ location, index, totalCount, onRemove, onDateChange }: SortableLocationCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: location.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.9 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'p-3 bg-white border rounded-xl group',
        isDragging ? 'border-seeya-purple shadow-lg' : 'border-gray-200'
      )}
    >
      <div className="flex items-center gap-2">
        {totalCount > 1 && (
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 touch-none"
            {...attributes}
            {...listeners}
          >
            <GripVertical size={16} />
          </button>
        )}
        <div className="w-8 h-8 rounded-lg bg-seeya-purple/10 flex items-center justify-center flex-shrink-0">
          <span className="text-sm font-medium text-seeya-purple">
            {index + 1}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-seeya-text truncate">
            {location.name}
          </p>
          {location.country && (
            <p className="text-sm text-seeya-text-secondary">
              {location.country}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => onRemove(location.id)}
          className="p-1.5 text-gray-400 hover:text-seeya-error hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
        >
          <X size={16} />
        </button>
      </div>
      {/* Per-location date range */}
      <div className="mt-2 ml-10 grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-seeya-text-secondary mb-1">Arrival</label>
          <input
            type="date"
            value={location.arrivalDate ?? ''}
            onChange={(e) => onDateChange(index, 'arrivalDate', e.target.value)}
            className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-200 focus:border-seeya-purple focus:ring-2 focus:ring-seeya-purple/20 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs text-seeya-text-secondary mb-1">Departure</label>
          <input
            type="date"
            value={location.departureDate ?? ''}
            onChange={(e) => onDateChange(index, 'departureDate', e.target.value)}
            className="w-full px-2 py-1.5 text-sm rounded-lg border border-gray-200 focus:border-seeya-purple focus:ring-2 focus:ring-seeya-purple/20 outline-none"
          />
        </div>
      </div>
    </div>
  );
}

export function LocationPicker({
  locations,
  onChange,
  className,
}: LocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<PlacePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = locations.findIndex(l => l.id === active.id);
    const newIndex = locations.findIndex(l => l.id === over.id);

    // Collect date slots in positional order (dates stay in their slots)
    const dateSlots = locations.map(l => ({
      arrivalDate: l.arrivalDate,
      departureDate: l.departureDate,
    }));

    // Reorder the locations (names move, dates stay)
    const reordered = arrayMove(locations, oldIndex, newIndex);

    // Reassign the original positional dates to the new order
    const result = reordered.map((loc, i) => ({
      ...loc,
      arrivalDate: dateSlots[i].arrivalDate,
      departureDate: dateSlots[i].departureDate,
    }));

    onChange(result);
  };

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);

      try {
        const response = await fetch(`/api/places/autocomplete?query=${encodeURIComponent(searchQuery)}`);
        const data = await response.json();

        if (data.predictions) {
          setSearchResults(data.predictions);
        }
      } catch (error) {
        console.error('Error searching places:', error);
      }

      setIsSearching(false);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const addLocation = (place: PlacePrediction) => {
    const newLocation: Location = {
      id: `temp-${Date.now()}`,
      name: place.mainText,
      country: place.secondaryText,
    };
    onChange([...locations, newLocation]);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);
  };

  const addCustomLocation = () => {
    if (!searchQuery.trim()) return;

    const newLocation: Location = {
      id: `temp-${Date.now()}`,
      name: searchQuery.trim(),
    };
    onChange([...locations, newLocation]);
    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);
  };

  const removeLocation = (id: string) => {
    onChange(locations.filter((loc) => loc.id !== id));
  };

  const addDay = (date: string): string => {
    const d = new Date(date);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const handleDateChange = (
    idx: number,
    field: 'arrivalDate' | 'departureDate',
    value: string | null
  ) => {
    const updated = locations.map(l => ({ ...l }));
    updated[idx] = { ...updated[idx], [field]: value || null };

    // Departure must be after arrival for the same stop
    if (field === 'arrivalDate' && value) {
      const dep = updated[idx].departureDate;
      if (dep && dep <= value) {
        updated[idx].departureDate = addDay(value);
      }
    }

    // Arrival must not be before previous stop's departure
    if (field === 'arrivalDate' && value && idx > 0) {
      const prevDep = updated[idx - 1].departureDate;
      if (prevDep && value < prevDep) {
        updated[idx].arrivalDate = prevDep;
        // Re-check departure for this stop
        const dep = updated[idx].departureDate;
        if (dep && dep <= prevDep) {
          updated[idx].departureDate = addDay(prevDep);
        }
      }
    }

    // When departure changes, cascade: next stop's arrival ← this departure
    if (field === 'departureDate' && value && idx + 1 < updated.length) {
      const nextArr = updated[idx + 1].arrivalDate;
      if (!nextArr || nextArr < value) {
        updated[idx + 1].arrivalDate = value;
        // Also push next stop's departure if it now conflicts
        const nextDep = updated[idx + 1].departureDate;
        if (nextDep && nextDep <= value) {
          updated[idx + 1].departureDate = addDay(value);
        }
      }
    }

    onChange(updated);
  };

  return (
    <div className={cn('space-y-3', className)}>
      <label className="block text-sm font-medium text-seeya-text">
        Where are you going?
      </label>

      {/* Location List */}
      {locations.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={locations.map(l => l.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {locations.map((location, index) => (
                <SortableLocationCard
                  key={location.id}
                  location={location}
                  index={index}
                  totalCount={locations.length}
                  onRemove={removeLocation}
                  onDateChange={handleDateChange}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Add Location */}
      {showSearch ? (
        <div className="relative">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for a city..."
              className="w-full pl-10 pr-10 py-3 rounded-xl border border-gray-200 focus:border-seeya-purple focus:ring-2 focus:ring-seeya-purple/20 outline-none transition-all"
            />
            <button
              type="button"
              onClick={() => {
                setShowSearch(false);
                setSearchQuery('');
                setSearchResults([]);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full"
            >
              <X size={16} className="text-gray-400" />
            </button>
          </div>

          {/* Search Results */}
          {(searchResults.length > 0 || (searchQuery.length >= 2 && !isSearching)) && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-64 overflow-auto">
              {searchResults.map((place) => (
                <button
                  key={place.placeId}
                  type="button"
                  onClick={() => addLocation(place)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left border-b border-gray-100 last:border-0"
                >
                  <MapPin size={18} className="text-seeya-purple shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-seeya-text">{place.mainText}</p>
                    <p className="text-sm text-seeya-text-secondary truncate">{place.secondaryText}</p>
                  </div>
                </button>
              ))}

              {searchQuery.length >= 2 && !isSearching && (
                <button
                  type="button"
                  onClick={addCustomLocation}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left text-seeya-purple"
                >
                  <Plus size={18} />
                  <span>Add &quot;{searchQuery}&quot; as custom location</span>
                </button>
              )}
            </div>
          )}

          {isSearching && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg p-4 text-center text-seeya-text-secondary">
              Searching...
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowSearch(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-seeya-text-secondary hover:border-seeya-purple hover:text-seeya-purple transition-colors"
        >
          <Plus size={18} />
          <span>Add destination</span>
        </button>
      )}

      {locations.length === 0 && !showSearch && (
        <p className="text-sm text-seeya-text-secondary">
          Add at least one destination to your trip
        </p>
      )}
    </div>
  );
}
