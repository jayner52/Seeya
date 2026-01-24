import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Plus, FolderOpen, LayoutGrid, Layers, ChevronDown, ChevronUp, Grid3X3, ExternalLink, GripVertical, Trash2, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { TripbitCard } from './TripbitCard';
import { AddTripbitDialog, TripbitPrefill } from './AddTripbitDialog';
import { EditTripbitDialog } from './EditTripbitDialog';
import { Tripbit, TripbitCategory, CreateTripbitData } from '@/hooks/useTripbits';
import { TripLocation } from '@/hooks/useTripLocations';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { categoryConfig, allFilterOption, getCategoryConfig, TripbitCategoryType } from '@/lib/tripbitCategoryConfig';

interface TravelerOption {
  id: string;
  user_id: string;
  profile: {
    id: string;
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface TripbitsGridProps {
  tripbits: Tripbit[];
  loading: boolean;
  onAdd: (data: CreateTripbitData) => Promise<boolean>;
  onUpdate?: (tripbitId: string, data: Partial<CreateTripbitData>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onReorder?: (reorderedIds: string[]) => Promise<boolean>;
  canEdit: boolean;
  locations?: TripLocation[];
  travelers?: TravelerOption[];
  dialogOpen?: boolean;
  onDialogOpenChange?: (open: boolean) => void;
  prefill?: TripbitPrefill;
  onPrefillClear?: () => void;
  tripStartDate?: string | null;
  tripEndDate?: string | null;
  onRateAndShare?: (tripbit: Tripbit) => void;
  sharedTripbitIds?: Set<string>;
  tripId?: string;
  locationParticipants?: Map<string, string[]>;
}

type ViewMode = 'full' | 'compact' | 'byType';

// Build filter options from centralized config
const filterOptions: { value: TripbitCategory | 'all'; icon: React.ElementType; label: string; colorClass: string; bgClass: string; textClass: string }[] = [
  { value: 'all', icon: allFilterOption.icon, label: allFilterOption.label, colorClass: allFilterOption.colorClass, bgClass: allFilterOption.bgClass, textClass: allFilterOption.textClass },
  ...Object.entries(categoryConfig).map(([key, config]) => ({
    value: key as TripbitCategory,
    icon: config.icon,
    label: config.labelPlural,
    colorClass: config.colorClass,
    bgClass: config.bgClass,
    textClass: config.textClass,
  })),
];

const categoryOrder: TripbitCategory[] = [
  'flight', 'accommodation', 'rental_car', 'activity', 'reservation', 
  'transportation', 'money', 'document', 'photos', 'other'
];

export function TripbitsGrid({ 
  tripbits, loading, onAdd, onUpdate, onDelete, onReorder, canEdit, locations = [], travelers = [],
  dialogOpen: externalDialogOpen, onDialogOpenChange, prefill, onPrefillClear,
  tripStartDate, tripEndDate, onRateAndShare, sharedTripbitIds = new Set(),
  tripId, locationParticipants
}: TripbitsGridProps) {
  const [filter, setFilter] = useState<TripbitCategory | 'all'>('all');
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const stored = localStorage.getItem('trip-pack-view-mode');
    // Handle migration from old 'grid' or 'byDate' values
    if (stored === 'grid' || stored === 'byDate') return 'full';
    return (stored as ViewMode) || 'full';
  });
  const [internalDialogOpen, setInternalDialogOpen] = useState(false);
  const [editingTripbit, setEditingTripbit] = useState<Tripbit | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [deleteConfirmTripbit, setDeleteConfirmTripbit] = useState<Tripbit | null>(null);
  
  // Drag and drop state for iOS-style sliding
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [insertionIndex, setInsertionIndex] = useState<number | null>(null);
  const draggedIndexRef = useRef<number | null>(null);

  // Persist viewMode
  useEffect(() => {
    localStorage.setItem('trip-pack-view-mode', viewMode);
  }, [viewMode]);

  // Use external state if provided, otherwise use internal state
  const dialogOpen = externalDialogOpen !== undefined ? externalDialogOpen : internalDialogOpen;
  const setDialogOpen = onDialogOpenChange || setInternalDialogOpen;

  const locationMap = useMemo(() => 
    new Map(locations.map(l => [l.id, l])), 
    [locations]
  );

  const filteredTripbits = useMemo(() => 
    filter === 'all' ? tripbits : tripbits.filter(r => r.category === filter),
    [tripbits, filter]
  );

  // Sort tripbits by order_index (primary) then date (secondary)
  const sortedByOrder = useMemo(() => {
    return [...filteredTripbits].sort((a, b) => {
      // Primary: order_index
      const orderDiff = (a.order_index ?? 0) - (b.order_index ?? 0);
      if (orderDiff !== 0) return orderDiff;
      // Secondary: date
      if (!a.start_date && !b.start_date) return 0;
      if (!a.start_date) return 1;
      if (!b.start_date) return -1;
      return a.start_date.localeCompare(b.start_date);
    });
  }, [filteredTripbits]);

  // For byType view, still sort by date within each category
  const sortedByDate = useMemo(() => {
    return [...filteredTripbits].sort((a, b) => {
      if (!a.start_date && !b.start_date) return 0;
      if (!a.start_date) return 1;
      if (!b.start_date) return -1;
      return a.start_date.localeCompare(b.start_date);
    });
  }, [filteredTripbits]);

  // Helper to find which location a date belongs to
  const getLocationForDate = useCallback((dateStr: string | null): TripLocation | null => {
    if (!dateStr || dateStr === 'unscheduled' || locations.length === 0) return null;
    
    // Find location where date falls within start_date and end_date
    return locations.find(loc => {
      if (!loc.start_date || !loc.end_date) return false;
      return dateStr >= loc.start_date && dateStr <= loc.end_date;
    }) || null;
  }, [locations]);

  // Group tripbits by date for compact view
  const groupedByDate = useMemo(() => {
    const dateGroups = new Map<string, { tripbits: Tripbit[]; indices: number[] }>();
    
    sortedByOrder.forEach((tripbit, index) => {
      const dateKey = tripbit.start_date || 'unscheduled';
      if (!dateGroups.has(dateKey)) {
        dateGroups.set(dateKey, { tripbits: [], indices: [] });
      }
      dateGroups.get(dateKey)!.tripbits.push(tripbit);
      dateGroups.get(dateKey)!.indices.push(index);
    });

    // Convert to array and sort by date
    const groups = Array.from(dateGroups.entries()).map(([dateKey, data]) => ({
      dateKey,
      tripbits: data.tripbits,
      indices: data.indices,
      location: getLocationForDate(dateKey),
    }));

    // Sort: scheduled dates first (chronologically), then unscheduled
    groups.sort((a, b) => {
      if (a.dateKey === 'unscheduled') return 1;
      if (b.dateKey === 'unscheduled') return -1;
      return a.dateKey.localeCompare(b.dateKey);
    });

    return groups;
  }, [sortedByOrder, getLocationForDate]);

  // Group tripbits by category
  const groupedByCategory = useMemo(() => {
    const groups: { category: TripbitCategory; tripbits: Tripbit[] }[] = [];
    const categoryGroups = new Map<TripbitCategory, Tripbit[]>();
    
    sortedByDate.forEach(tripbit => {
      if (!categoryGroups.has(tripbit.category)) {
        categoryGroups.set(tripbit.category, []);
      }
      categoryGroups.get(tripbit.category)!.push(tripbit);
    });

    // Sort by category order
    categoryOrder.forEach(category => {
      if (categoryGroups.has(category)) {
        groups.push({ category, tripbits: categoryGroups.get(category)! });
      }
    });

    return groups;
  }, [sortedByDate]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedIds(new Set(filteredTripbits.map(r => r.id)));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  const allExpanded = filteredTripbits.length > 0 && expandedIds.size === filteredTripbits.length;

  // Drag and drop handlers for iOS-style sliding
  const handleDragStart = useCallback((e: React.DragEvent, tripbitId: string, index: number) => {
    setDraggedId(tripbitId);
    draggedIndexRef.current = index;
    setInsertionIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', tripbitId);
    
    // Set drag image with slight offset
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    e.dataTransfer.setDragImage(target, rect.width / 2, rect.height / 2);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedIndexRef.current === null) return;
    
    // Simply use the hovered index as insertion point
    if (index !== insertionIndex) {
      setInsertionIndex(index);
    }
  }, [insertionIndex]);

  const handleDragLeave = useCallback(() => {
    // Keep insertion index stable during drag
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    
    if (!draggedId || insertionIndex === null || !onReorder || draggedIndexRef.current === null) {
      setDraggedId(null);
      setInsertionIndex(null);
      draggedIndexRef.current = null;
      return;
    }

    const currentOrder = sortedByOrder.map(t => t.id);
    const draggedIndex = draggedIndexRef.current;
    
    if (draggedIndex === insertionIndex) {
      setDraggedId(null);
      setInsertionIndex(null);
      draggedIndexRef.current = null;
      return;
    }

    // Remove dragged item and insert at new position
    const newOrder = [...currentOrder];
    const [removed] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(insertionIndex > draggedIndex ? insertionIndex - 1 : insertionIndex, 0, removed);
    
    setDraggedId(null);
    setInsertionIndex(null);
    draggedIndexRef.current = null;
    
    await onReorder(newOrder);
  }, [draggedId, insertionIndex, sortedByOrder, onReorder]);

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setInsertionIndex(null);
    draggedIndexRef.current = null;
  }, []);

  // Calculate transform for iOS-style sliding animation
  const getSlideTransform = useCallback((index: number): React.CSSProperties => {
    const baseTransition = { transition: 'transform 200ms cubic-bezier(0.2, 0, 0, 1), opacity 200ms ease' };
    
    if (draggedId === null || insertionIndex === null || draggedIndexRef.current === null) {
      return baseTransition;
    }
    
    const draggedIndex = draggedIndexRef.current;
    
    // The dragged item itself - fade it slightly
    if (sortedByOrder[index]?.id === draggedId) {
      return { 
        ...baseTransition,
        opacity: 0.4, 
        transform: 'scale(0.98)',
        zIndex: 1000
      };
    }
    
    // For Full view and Compact view (list layouts) - items shift vertically
    if (viewMode === 'full' || viewMode === 'compact') {
      if (draggedIndex < insertionIndex && index > draggedIndex && index <= insertionIndex) {
        return { ...baseTransition, transform: 'translateY(calc(-100% - 8px))' };
      }
      if (draggedIndex > insertionIndex && index >= insertionIndex && index < draggedIndex) {
        return { ...baseTransition, transform: 'translateY(calc(100% + 8px))' };
      }
    }
    
    return baseTransition;
  }, [draggedId, insertionIndex, sortedByOrder, viewMode]);

  const handleDeleteClick = useCallback((tripbit: Tripbit) => {
    setDeleteConfirmTripbit(tripbit);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (deleteConfirmTripbit) {
      await onDelete(deleteConfirmTripbit.id);
      setDeleteConfirmTripbit(null);
    }
  }, [deleteConfirmTripbit, onDelete]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  const renderTripbitCard = (tripbit: Tripbit, index: number, showLocation = true, hideIcon = false) => {
    const location = tripbit.location_id ? locationMap.get(tripbit.location_id) : undefined;
    const isCollapsibleView = viewMode === 'byType';
    const cityId = location?.city_id || undefined;
    const slideStyle = getSlideTransform(index);
    
    return (
      <div
        key={tripbit.id}
        draggable={canEdit && onReorder && (viewMode === 'full' || viewMode === 'compact')}
        onDragStart={(e) => handleDragStart(e, tripbit.id, index)}
        onDragOver={(e) => handleDragOver(e, index)}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
        style={slideStyle}
        className="will-change-transform"
      >
        <TripbitCard
          tripbit={tripbit}
          onDelete={handleDeleteClick}
          onEdit={onUpdate ? (r) => setEditingTripbit(r) : undefined}
          locationName={showLocation ? location?.destination.split(',')[0] : undefined}
          isExpanded={isCollapsibleView ? expandedIds.has(tripbit.id) : true}
          onToggleExpand={isCollapsibleView ? () => toggleExpand(tripbit.id) : undefined}
          tripEndDate={tripEndDate}
          cityId={cityId}
          onRateAndShare={onRateAndShare}
          isShared={sharedTripbitIds.has(tripbit.id)}
          showDragHandle={canEdit && onReorder && (viewMode === 'full' || viewMode === 'compact')}
          hideIcon={hideIcon}
        />
      </div>
    );
  };

  const renderCompactListItem = (tripbit: Tripbit, index: number) => {
    const config = getCategoryConfig(tripbit.category);
    const Icon = config.icon;
    const location = tripbit.location_id ? locationMap.get(tripbit.location_id) : undefined;
    const timeStr = tripbit.start_date 
      ? format(parseISO(tripbit.start_date), 'h:mm a')
      : null;
    const slideStyle = getSlideTransform(index);
    
    // Get metadata details for the second line
    const metadata = tripbit.metadata as Record<string, unknown> | null;
    let detailLine = '';
    if (metadata) {
      if (metadata.airline && metadata.flight_number) {
        detailLine = `${metadata.airline} ${metadata.flight_number}`;
      } else if (metadata.property_name) {
        detailLine = metadata.property_name as string;
      } else if (metadata.company) {
        detailLine = metadata.company as string;
      } else if (metadata.venue) {
        detailLine = metadata.venue as string;
      }
    }
    if (!detailLine && tripbit.description) {
      detailLine = tripbit.description;
    }
    if (!detailLine && location) {
      detailLine = location.destination.split(',')[0];
    }
    
    return (
      <div
        key={tripbit.id}
        draggable={canEdit && !!onReorder}
        onDragStart={(e) => handleDragStart(e, tripbit.id, index)}
        onDragOver={(e) => handleDragOver(e, index)}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
        style={slideStyle}
        className="will-change-transform"
      >
        <div
          className={cn(
            "flex items-center gap-3 px-3 py-2 bg-card rounded-lg border border-border/50",
            "hover:bg-accent/50 hover:border-border transition-colors cursor-pointer group"
          )}
          onClick={() => onUpdate && setEditingTripbit(tripbit)}
        >
          {/* Drag handle */}
          {canEdit && onReorder && (
            <div className="opacity-0 group-hover:opacity-60 transition-opacity cursor-grab active:cursor-grabbing -ml-1">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          
          {/* Category icon */}
          <div className={cn(config.colorClass, "p-1.5 rounded-md shrink-0")}>
            <Icon className="h-3.5 w-3.5 text-white" />
          </div>
          
          {/* Title and details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">{tripbit.title}</span>
              {tripbit.url && (
                <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
              )}
            </div>
            {detailLine && (
              <p className="text-xs text-muted-foreground truncate">{detailLine}</p>
            )}
          </div>
          
          {/* Time (if available) */}
          {timeStr && metadata?.departure_time && (
            <span className="text-xs text-muted-foreground shrink-0 hidden sm:block">
              {metadata.departure_time as string}
            </span>
          )}
          
          {/* Delete button */}
          {canEdit && (
            <button
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/10 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteClick(tripbit);
              }}
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive/70 hover:text-destructive" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header with filters and view mode */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1">
            {filterOptions.map((option) => {
              const Icon = option.icon;
              const count = option.value === 'all' 
                ? tripbits.length 
                : tripbits.filter(r => r.category === option.value).length;
              
              if (option.value !== 'all' && count === 0) return null;
              
              const isActive = filter === option.value;
              
              return (
                <Button
                  key={option.value}
                  variant="ghost"
                  size="sm"
                  onClick={() => setFilter(option.value)}
                  className={cn(
                    "h-8 gap-1.5 border transition-all",
                    isActive
                      ? `${option.colorClass} text-white border-transparent hover:opacity-90`
                      : `${option.bgClass} ${option.textClass} border-transparent hover:opacity-80`
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{option.label}</span>
                  {count > 0 && (
                    <span className={cn(
                      "ml-1 text-xs px-1.5 py-0.5 rounded-full",
                      isActive
                        ? "bg-white/20 text-white" 
                        : "bg-white/60 text-inherit"
                    )}>
                      {count}
                    </span>
                  )}
                </Button>
              );
            })}
          </div>
          
          {canEdit && (
            <Button
              size="sm"
              onClick={() => setDialogOpen(true)}
              className="ml-auto gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Add Tripbit
            </Button>
          )}
        </div>

        {/* View mode toggle */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
            <Button
              variant={viewMode === 'full' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('full')}
              className="h-7 gap-1.5"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Full</span>
            </Button>
            <Button
              variant={viewMode === 'compact' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('compact')}
              className="h-7 gap-1.5"
            >
              <Grid3X3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Compact</span>
            </Button>
            <Button
              variant={viewMode === 'byType' ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('byType')}
              className="h-7 gap-1.5"
            >
              <Layers className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">By Type</span>
            </Button>
          </div>

          {viewMode === 'byType' && filteredTripbits.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={allExpanded ? collapseAll : expandAll}
              className="h-7 gap-1.5 text-muted-foreground"
            >
              {allExpanded ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Collapse All</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Expand All</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Empty state */}
      {filteredTripbits.length === 0 ? (
        <div className="text-center py-12 bg-muted/30 rounded-lg border border-dashed border-border">
          <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-1">
            {filter === 'all' ? 'No tripbits yet' : `No ${filter} tripbits`}
          </p>
          {canEdit && (
            <p className="text-sm text-muted-foreground">
              Add links to flights, accommodations, activities, and more
            </p>
          )}
        </div>
      ) : viewMode === 'full' ? (
        /* Full View - Single column, with location headers */
        <div className="space-y-3">
          {groupedByDate.map(({ dateKey, tripbits: dateTripbits, indices, location }, groupIndex) => {
            const prevLocation = groupIndex > 0 ? groupedByDate[groupIndex - 1].location : null;
            const showLocationHeader = location && location.id !== prevLocation?.id;
            
            return (
              <div key={dateKey}>
                {/* Location header - shows when entering a new leg */}
                {showLocationHeader && (
                  <div className="flex items-center gap-2 mb-3 mt-4 first:mt-0 pb-2 border-b border-secondary/30">
                    <MapPin className="w-4 h-4 text-secondary-foreground" />
                    <span className="text-sm font-semibold text-secondary-foreground">
                      {location.destination}
                    </span>
                    {location.start_date && location.end_date && (
                      <span className="text-xs text-muted-foreground">
                        {format(parseISO(location.start_date), 'MMM d')} – {format(parseISO(location.end_date), 'MMM d')}
                      </span>
                    )}
                  </div>
                )}
                {/* Tripbits for this date */}
                <div className="space-y-3">
                  {dateTripbits.map((tripbit, idx) => renderTripbitCard(tripbit, indices[idx]))}
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === 'compact' ? (
        /* Compact List View - Grouped by Day with location headers */
        <div className="space-y-4">
          {groupedByDate.map(({ dateKey, tripbits: dateTripbits, indices, location }, groupIndex) => {
            const prevLocation = groupIndex > 0 ? groupedByDate[groupIndex - 1].location : null;
            const showLocationHeader = location && location.id !== prevLocation?.id;
            
            return (
              <div key={dateKey}>
                {/* Location header - shows when entering a new leg */}
                {showLocationHeader && (
                  <div className="flex items-center gap-2 mb-3 mt-4 first:mt-0 pb-2 border-b border-secondary/30">
                    <MapPin className="w-4 h-4 text-secondary-foreground" />
                    <span className="text-sm font-semibold text-secondary-foreground">
                      {location.destination}
                    </span>
                    {location.start_date && location.end_date && (
                      <span className="text-xs text-muted-foreground">
                        {format(parseISO(location.start_date), 'MMM d')} – {format(parseISO(location.end_date), 'MMM d')}
                      </span>
                    )}
                  </div>
                )}
                <div className="space-y-1.5">
                  {/* Day header */}
                  <div className="flex items-center gap-2 px-1">
                    <span className="text-sm font-semibold text-foreground">
                      {dateKey === 'unscheduled' 
                        ? 'Unscheduled' 
                        : format(parseISO(dateKey), 'EEE, MMM d')}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">
                      {dateTripbits.length} {dateTripbits.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                  {/* List items */}
                  <div className="space-y-1.5">
                    {dateTripbits.map((tripbit, idx) => renderCompactListItem(tripbit, indices[idx]))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* By Type View - Grouped by Category */
        <div className="space-y-6">
          {groupedByCategory.map(({ category, tripbits: groupTripbits }) => {
            const config = categoryConfig[category];
            const Icon = config.icon;
            
            return (
              <div key={category} className="space-y-2">
                <div className="flex items-center gap-2 pb-2 border-b border-border">
                  <div className={cn(config.colorClass, "p-1 rounded")}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <h3 className="font-semibold text-foreground">{config.label}</h3>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {groupTripbits.length} {groupTripbits.length === 1 ? 'item' : 'items'}
                  </span>
                </div>
                <div className="space-y-2 pl-6">
                  {groupTripbits.map((tripbit, idx) => renderTripbitCard(tripbit, idx, true, true))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <AddTripbitDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open && onPrefillClear) onPrefillClear();
        }}
        onAdd={onAdd}
        locations={locations}
        travelers={travelers}
        prefill={prefill}
        tripStartDate={tripStartDate}
        tripEndDate={tripEndDate}
        tripId={tripId}
        locationParticipants={locationParticipants}
      />

      {onUpdate && (
        <EditTripbitDialog
          open={!!editingTripbit}
          onOpenChange={(open) => !open && setEditingTripbit(null)}
          tripbit={editingTripbit}
          onUpdate={onUpdate}
          locations={locations}
          travelers={travelers}
          tripId={tripId}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmTripbit} onOpenChange={(open) => !open && setDeleteConfirmTripbit(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tripbit</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteConfirmTripbit?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
