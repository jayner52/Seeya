import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { format, parseISO, isAfter, isBefore, isWithinInterval, startOfDay } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import { useAllTripChats } from '@/hooks/useAllTripChats';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Navigation } from '@/components/layout/Navigation';
import { AvatarGroup } from '@/components/ui/avatar-group';

import { TripChat } from '@/components/trips/TripChat';
import { MessageCircle, MapPin, ArrowLeft, Search, X, ExternalLink, Calendar } from 'lucide-react';

type TripTimeFilterType = 'current' | 'upcoming' | 'past';

export default function Messages() {
  const { user } = useAuth();
  const { chatPreviews, loading } = useAllTripChats();
  const { markTripAsRead } = useUnreadMessages();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tripIdFromUrl = searchParams.get('tripId');
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tripTimeFilter, setTripTimeFilter] = useState<Set<TripTimeFilterType>>(
    new Set(['current', 'upcoming'])
  );

  // Filter conversations by search and time filter
  const filteredPreviews = chatPreviews.filter(preview => {
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        preview.trip.name.toLowerCase().includes(query) ||
        preview.trip.destination.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }
    
    // Time filter - if all three selected, show all
    if (tripTimeFilter.size === 3) return true;
    // If none selected, show none
    if (tripTimeFilter.size === 0) return false;
    
    const today = startOfDay(new Date());
    const startDate = preview.trip.start_date ? parseISO(preview.trip.start_date) : null;
    const endDate = preview.trip.end_date ? parseISO(preview.trip.end_date) : null;
    
    // Categorize this trip (matching Trips.tsx logic exactly)
    let category: TripTimeFilterType | 'undated';
    
    if (!startDate && !endDate) {
      // Logged past trips always go to past
      if (preview.trip.is_logged_past_trip) {
        category = 'past';
      } 
      // If flexible_month exists, parse it to determine past/future
      else if (preview.trip.is_flexible_dates && preview.trip.flexible_month) {
        const parts = preview.trip.flexible_month.split(' ');
        if (parts.length === 2) {
          const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                             'July', 'August', 'September', 'October', 'November', 'December'];
          const monthIndex = monthNames.indexOf(parts[0]);
          const year = parseInt(parts[1]);
          if (monthIndex !== -1 && !isNaN(year)) {
            const flexDate = new Date(year, monthIndex, 15); // Middle of month
            category = isBefore(flexDate, today) ? 'past' : 'upcoming';
          } else {
            category = 'undated';
          }
        } else {
          category = 'undated';
        }
      } else {
        category = 'undated';
      }
    } else if (startDate && endDate) {
      if (isWithinInterval(today, { start: startOfDay(startDate), end: startOfDay(endDate) })) {
        category = 'current';
      } else if (isAfter(startOfDay(startDate), today)) {
        category = 'upcoming';
      } else {
        category = 'past';
      }
    } else if (startDate) {
      category = isAfter(startOfDay(startDate), today) ? 'upcoming' : 'past';
    } else if (endDate) {
      category = isBefore(startOfDay(endDate), today) ? 'past' : 'upcoming';
    } else {
      category = 'undated';
    }
    
    // Undated trips show with upcoming filter
    if (category === 'undated') {
      return tripTimeFilter.has('upcoming');
    }
    
    return tripTimeFilter.has(category);
  });

  // Auto-select conversation from URL or first on load (desktop only)
  useEffect(() => {
    if (tripIdFromUrl && chatPreviews.some(p => p.trip.id === tripIdFromUrl)) {
      setSelectedTripId(tripIdFromUrl);
    } else if (!isMobile && chatPreviews.length > 0 && !selectedTripId) {
      setSelectedTripId(chatPreviews[0].trip.id);
    }
  }, [chatPreviews, isMobile, selectedTripId, tripIdFromUrl]);

  // Mark as read when selecting a conversation
  useEffect(() => {
    if (selectedTripId) {
      markTripAsRead(selectedTripId);
    }
  }, [selectedTripId, markTripAsRead]);

  const selectedTrip = chatPreviews.find(p => p.trip.id === selectedTripId);


  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    if (diffWeeks < 4) return `${diffWeeks}w`;
    if (diffMonths < 12) return `${diffMonths}mo`;
    return `${diffYears}y`;
  };

  const handleSelectTrip = (tripId: string) => {
    setSelectedTripId(tripId);
  };

  const handleBack = () => {
    setSelectedTripId(null);
  };

  // Search bar component
  const SearchBar = () => (
    <div className="p-3 border-b w-full overflow-hidden">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 pr-9"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
            onClick={() => setSearchQuery('')}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );

  // Trip time filter tabs with multi-select
  const TripTimeFilterTabs = () => {
    const toggleFilter = (filter: TripTimeFilterType) => {
      setTripTimeFilter(prev => {
        const next = new Set(prev);
        if (next.has(filter)) {
          next.delete(filter);
        } else {
          next.add(filter);
        }
        return next;
      });
    };
    
    const selectAll = () => setTripTimeFilter(new Set(['current', 'upcoming', 'past']));
    
    const isAllSelected = tripTimeFilter.size === 3;
    
    return (
      <div className="px-3 py-2 border-b flex gap-1 flex-wrap">
        <Button
          variant={isAllSelected ? 'default' : 'outline'}
          size="sm"
          className="text-xs h-7 px-3"
          onClick={selectAll}
        >
          All
        </Button>
        {(['current', 'upcoming', 'past'] as const).map((filter) => (
          <Button
            key={filter}
            variant={tripTimeFilter.has(filter) && !isAllSelected ? 'default' : 'outline'}
            size="sm"
            className="text-xs h-7 px-3"
            onClick={() => toggleFilter(filter)}
          >
            {filter === 'current' ? 'Current' : filter === 'upcoming' ? 'Upcoming' : 'Past'}
          </Button>
        ))}
      </div>
    );
  };

  // Loading state - skeleton for conversation list items
  const ConversationSkeleton = () => (
    <div className="divide-y">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="px-4 py-3 space-y-1.5">
          <Skeleton className="h-4 w-36" />
          <div className="flex items-center gap-1.5">
            <Skeleton className="h-3 w-3 rounded-sm" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-3 w-full max-w-[200px]" />
          <Skeleton className="h-3 w-10" />
        </div>
      ))}
    </div>
  );

  if (loading) {
    // Mobile loading state
    if (isMobile) {
      return (
        <div className="min-h-screen bg-background">
          <Navigation />
          <div className="pt-16 pb-20 h-screen flex flex-col">
            <div className="px-4 py-4 border-b">
              <Skeleton className="h-6 w-28 mb-1" />
              <Skeleton className="h-4 w-40" />
            </div>
            <div className="p-3 border-b">
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
            <div className="flex-1 overflow-hidden">
              <ConversationSkeleton />
            </div>
          </div>
        </div>
      );
    }

    // Desktop loading state - split panel layout
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-32 h-screen flex flex-col">
          <div className="px-4 md:px-8 py-6 border-b">
            <h1 className="font-display text-2xl font-bold">Messages</h1>
            <p className="text-muted-foreground text-sm">Your trip conversations</p>
          </div>
          <div className="flex-1 overflow-hidden flex">
            {/* Left sidebar skeleton */}
            <div className="w-80 border-r flex-shrink-0 h-full overflow-hidden">
              <div className="p-3 border-b">
                <Skeleton className="h-10 w-full rounded-md" />
              </div>
              <ConversationSkeleton />
            </div>
            {/* Right panel skeleton - empty chat placeholder */}
            <div className="flex-1 h-full min-w-0 flex items-center justify-center bg-muted/30">
              <div className="text-center">
                <Skeleton className="w-12 h-12 rounded-full mx-auto mb-3" />
                <Skeleton className="h-4 w-48 mx-auto" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (chatPreviews.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-16 pb-20 md:pt-32 md:pb-0 h-screen flex flex-col">
          <div className="px-4 md:px-8 py-6 border-b">
            <h1 className="font-display text-2xl font-bold">Messages</h1>
            <p className="text-muted-foreground text-sm">Your trip conversations</p>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center py-16">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-display text-lg font-semibold mb-2">No conversations yet</h3>
              <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                Create a trip and invite your travel pals to start chatting together.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Conversation list component
  const ConversationList = ({ compact = false }: { compact?: boolean }) => {
    const getEmptyMessage = () => {
      if (searchQuery.trim()) return 'No conversations match your search';
      if (tripTimeFilter.size === 0) return 'Select a filter to view conversations';
      
      const filters = Array.from(tripTimeFilter);
      if (filters.length === 1) {
        if (filters[0] === 'current') return 'No conversations for trips happening now';
        if (filters[0] === 'upcoming') return 'No conversations for upcoming trips';
        if (filters[0] === 'past') return 'No conversations for past trips';
      }
      return 'No conversations found for selected filters';
    };

    return (
      <div className="h-full w-full flex flex-col overflow-hidden">
        <SearchBar />
        <TripTimeFilterTabs />
        <ScrollArea className="flex-1 overflow-hidden">
          <div className="divide-y">
            {filteredPreviews.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {getEmptyMessage()}
              </div>
            ) : (
            filteredPreviews.map(preview => {
              const isSelected = preview.trip.id === selectedTripId;

              return (
                <div
                  key={preview.trip.id}
                  className={cn(
                    'relative flex px-4 py-3 cursor-pointer transition-all duration-200 overflow-hidden',
                    isSelected ? 'bg-muted' : 'hover:bg-muted/50 hover:pl-5',
                    preview.unreadCount > 0 && !isSelected && 'border-l-2 border-primary bg-primary/5'
                  )}
                  onClick={() => handleSelectTrip(preview.trip.id)}
                >
                  {preview.unreadCount > 0 && (
                    <div className="absolute top-3 right-3 min-w-5 h-5 px-1.5 bg-primary text-primary-foreground text-xs font-medium rounded-full flex items-center justify-center animate-badge-pulse shadow-sm">
                      {preview.unreadCount > 99 ? '99+' : preview.unreadCount}
                    </div>
                  )}
                  <div className="space-y-0.5 overflow-hidden pr-10 flex-1 min-w-0">
                    <h3 className="font-semibold truncate text-sm">{preview.trip.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{preview.trip.destination}</span>
                    </div>
                    {preview.lastMessage && (
                      <>
                        <p className="text-xs text-muted-foreground truncate w-full max-w-full">
                          <span className="font-medium text-foreground">
                            {preview.lastMessage.sender.id === user?.id 
                              ? 'You' 
                              : preview.lastMessage.sender.full_name || preview.lastMessage.sender.username}
                          </span>
                          : {preview.lastMessage.content.length > 40 
                              ? `${preview.lastMessage.content.slice(0, 40)}...` 
                              : preview.lastMessage.content}
                        </p>
                        <span className="text-xs text-muted-foreground">
                          {formatTime(preview.lastMessage.created_at)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
  };

  // Chat panel component
  const ChatPanel = () => {
    if (!selectedTrip) {
      return (
        <div className="h-full flex items-center justify-center bg-muted/30">
          <div className="text-center">
            <MessageCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Select a conversation to start chatting</p>
          </div>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b flex items-center gap-3">
          {isMobile && (
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold truncate">{selectedTrip.trip.name}</h2>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground flex-wrap">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{selectedTrip.trip.destination}</span>
              {selectedTrip.trip.start_date && (
                <>
                  <span>•</span>
                  <Calendar className="w-3 h-3 flex-shrink-0" />
                  <span>
                    {format(new Date(selectedTrip.trip.start_date), 'MMM d')}
                    {selectedTrip.trip.end_date && ` - ${format(new Date(selectedTrip.trip.end_date), 'MMM d')}`}
                  </span>
                </>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <AvatarGroup
              avatars={selectedTrip.participants.map(p => ({
                src: p.avatar_url || '',
                name: p.full_name || p.username,
              }))}
              max={4}
              size="sm"
            />
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => navigate(`/trips/${selectedTrip.trip.id}`)}
                >
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Go to Trip
                </Button>
          </div>
        </div>

        {/* Chat Content */}
        <div className="flex-1 overflow-hidden">
          <TripChat tripId={selectedTripId!} />
        </div>
      </div>
    );
  };

  // Mobile layout: show either list or chat
  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="pt-16 pb-20 h-screen flex flex-col">
          {!selectedTripId ? (
            <>
              <div className="px-4 py-4 border-b">
                <h1 className="font-display text-xl font-bold">Messages</h1>
                <p className="text-muted-foreground text-sm">Your trip conversations</p>
              </div>
              <div className="flex-1 overflow-hidden">
                <ConversationList />
              </div>
            </>
          ) : (
            <ChatPanel />
          )}
        </div>
      </div>
    );
  }

  // Desktop layout: split panel
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="pt-32 h-screen flex flex-col">
        <div className="px-4 md:px-8 py-6 border-b">
          <h1 className="font-display text-2xl font-bold">Messages</h1>
          <p className="text-muted-foreground text-sm">Your trip conversations</p>
        </div>
        <div className="flex-1 overflow-hidden flex">
          <div className="w-80 border-r flex-shrink-0 h-full overflow-hidden">
            <ConversationList compact />
          </div>
          <div className="flex-1 h-full min-w-0">
            <ChatPanel />
          </div>
        </div>
      </div>
    </div>
  );
}
