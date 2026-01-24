import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { Skeleton } from '@/components/ui/skeleton';
import { useTripDetail, useTrips } from '@/hooks/useTrips';
import { useTripLocations } from '@/hooks/useTripLocations';
import { useTripbits, Tripbit } from '@/hooks/useTripbits';
import { useTripParticipants } from '@/hooks/useTripParticipants';
import { useLocationParticipants } from '@/hooks/useLocationParticipants';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import { useFriends } from '@/hooks/useFriends';
import { useSubscription } from '@/hooks/useSubscription';
import { useFriendRecommendations, FriendRecommendation } from '@/hooks/useFriendRecommendations';
import { PremiumBadge } from '@/components/premium/PremiumBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { RecommendationCard } from '@/components/trips/RecommendationCard';
import { AddRecommendationDialog, RecommendationPrefill } from '@/components/trips/AddRecommendationDialog';
import { EditTripDialog } from '@/components/trips/EditTripDialog';
import { ManageLocationsDialog } from '@/components/trips/ManageLocationsDialog';
import { EditLocationDialog } from '@/components/trips/EditLocationDialog';
import { TripLocation } from '@/hooks/useTripLocations';
import { InviteTravelPalsDialog } from '@/components/trips/InviteTravelPalsDialog';
import { TripbitsGrid } from '@/components/trips/TripbitsGrid';
import { ChatDrawer } from '@/components/trips/ChatDrawer';
import { TransportConnector, TransportType } from '@/components/trips/TransportConnector';
import { ItineraryLocationCard } from '@/components/trips/ItineraryLocationCard';
import { AISuggestionCard, AISuggestion } from '@/components/trips/AISuggestionCard';
import { AddToItineraryDialog } from '@/components/trips/AddToItineraryDialog';
import { ItineraryPrintView } from '@/components/trips/ItineraryPrintView';
import { FriendRecommendationCard } from '@/components/trips/FriendRecommendationCard';
import { PendingJoinRequests } from '@/components/trips/PendingJoinRequests';
import { RateAndShareDialog } from '@/components/trips/RateAndShareDialog';
import { TripFilesSection } from '@/components/trips/TripFilesSection';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Users, 
  Plus, 
  Check, 
  X,
  Utensils,
  Compass,
  Home,
  Lightbulb,
  Trash2,
  Pencil,
  UserPlus,
  ChevronRight,
  Clock,
  Briefcase,
  MessageCircle,
  Plane,
  Train,
  Target,
  Car,
  DollarSign,
  FileText,
  ExternalLink,
  Sparkles,
  Loader2,
  ClipboardList,
  PenLine,
  Users2,
  FolderOpen,
  HelpCircle
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { getCategoryConfig } from '@/lib/tripbitCategoryConfig';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type FilterCategory = 'all' | 'restaurant' | 'activity' | 'stay' | 'tip';
type FriendshipStatusType = 'friend' | 'pending_sent' | 'pending_received' | 'none' | 'self' | 'owner';
type ViewMode = 'planning' | 'itinerary';

export default function TripDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { trip, recommendations, loading, addRecommendation, deleteRecommendation, fetchTripDetail } = useTripDetail(id || '');
  const { locations, updateLocation, deleteLocation, fetchLocations } = useTripLocations(id || '');
  const { tripbits, loading: tripbitsLoading, addTripbit, updateTripbit, deleteTripbit, reorderTripbits } = useTripbits(id);
  const { allTravelers, pendingRequests: pendingJoinRequests } = useTripParticipants(id);
  const { participants: locationParticipants, toggleParticipant, getLocationParticipants } = useLocationParticipants(id || '');
  const { respondToInvitation, deleteTrip, updateTrip, cancelInvite, removeParticipant, respondToJoinRequest } = useTrips();
  const { markTripNotificationsAsRead } = useNotifications();
  const { markTripAsRead, hasUnreadMessagesForTrip } = useUnreadMessages();
  const { friends, pendingRequests, sendFriendRequestById, acceptRequest, refresh: refreshFriends } = useFriends();
  const { canAccessAI, canExportPDF, canExportICS } = useSubscription();
  const { toast } = useToast();

  const [addRecOpen, setAddRecOpen] = useState(false);
  const [addRecPrefill, setAddRecPrefill] = useState<RecommendationPrefill | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [locationsDialogOpen, setLocationsDialogOpen] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [chatDrawerOpen, setChatDrawerOpen] = useState(searchParams.get('chat') === 'open');
  const [categoryFilter, setCategoryFilter] = useState<FilterCategory>('all');
  const [editingLocation, setEditingLocation] = useState<TripLocation | null>(null);
  const [managingTravelersForLocation, setManagingTravelersForLocation] = useState<string | null>(null);
  const [resourceDialogOpen, setResourceDialogOpen] = useState(false);
  const [resourcePrefill, setResourcePrefill] = useState<{ category?: string; title?: string; locationId?: string } | undefined>();
  const [expandedResourceId, setExpandedResourceId] = useState<string | null>(null);
  const [resourceMetadata, setResourceMetadata] = useState<Record<string, { image?: string; loading?: boolean }>>({});
  const [participantToRemove, setParticipantToRemove] = useState<{ id: string; name: string; isPending: boolean } | null>(null);
  
  // AI Suggestions state
  const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [selectedAILocation, setSelectedAILocation] = useState<string>('main');
  const [addToItineraryOpen, setAddToItineraryOpen] = useState(false);
  const [selectedItemForItinerary, setSelectedItemForItinerary] = useState<{
    name: string;
    description?: string;
    category: 'restaurant' | 'activity' | 'stay' | 'tip';
  } | null>(null);

  // Rate and Share state
  const [rateShareDialogOpen, setRateShareDialogOpen] = useState(false);
  const [tripbitToShare, setTripbitToShare] = useState<Tripbit | null>(null);
  const [sharedTripbitIds, setSharedTripbitIds] = useState<Set<string>>(new Set());

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('planning');
  const [expandAllItinerary, setExpandAllItinerary] = useState(() => {
    const stored = localStorage.getItem(`trip-expand-all-${id}`);
    return stored === 'true';
  });

  // Persist expand all state
  useEffect(() => {
    if (id) {
      localStorage.setItem(`trip-expand-all-${id}`, String(expandAllItinerary));
    }
  }, [expandAllItinerary, id]);

  // Accordion persistence
  const [openAccordions, setOpenAccordions] = useState<string[]>(() => {
    const stored = localStorage.getItem(`trip-accordions-${id}`);
    return stored ? JSON.parse(stored) : ["travelers", "trip-pack", "recommendations"];
  });

  // Persist accordion state
  useEffect(() => {
    if (id) {
      localStorage.setItem(`trip-accordions-${id}`, JSON.stringify(openAccordions));
    }
  }, [openAccordions, id]);

  // Handle navigation state for adding recommendation from Explore page
  useEffect(() => {
    const state = location.state as { 
      addRecommendation?: RecommendationPrefill;
      scrollTo?: string;
    } | null;
    
    if (state?.addRecommendation) {
      // Expand recommendations accordion if not already open
      setOpenAccordions(prev => 
        prev.includes('recommendations') ? prev : [...prev, 'recommendations']
      );
      
      // Pre-fill and open the dialog
      setAddRecPrefill(state.addRecommendation);
      setAddRecOpen(true);
      
      // Scroll to recommendations section
      setTimeout(() => {
        document.getElementById('recommendations-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      
      // Clear state to prevent re-triggering
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  // Extract city_ids from locations for friend recommendations
  const cityIds = useMemo(() => {
    const ids: string[] = [];
    // Add location city_ids
    locations.forEach(loc => {
      if (loc.city_id && !ids.includes(loc.city_id)) {
        ids.push(loc.city_id);
      }
    });
    return ids;
  }, [locations]);

  // Convert location participants to a Map for TripbitsGrid
  const locationParticipantsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    Object.entries(locationParticipants).forEach(([locationId, participants]) => {
      map.set(locationId, participants.map(p => p.user_id));
    });
    return map;
  }, [locationParticipants]);

  // Friend recommendations hook
  const { recommendations: friendRecommendations, loading: friendRecsLoading } = useFriendRecommendations({ cityIds });

  // Filtered friend recommendations based on category
  const filteredFriendRecommendations = useMemo(() => {
    if (categoryFilter === 'all') return friendRecommendations;
    return friendRecommendations.filter(rec => rec.category === categoryFilter);
  }, [friendRecommendations, categoryFilter]);


  const fetchUrlMetadata = useCallback(async (resourceId: string, url: string) => {
    if (!url) return;
    
    setResourceMetadata(prev => {
      if (prev[resourceId]?.image !== undefined || prev[resourceId]?.loading) return prev;
      return { ...prev, [resourceId]: { loading: true } };
    });
    
    try {
      // Get current session for authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setResourceMetadata(prev => ({ ...prev, [resourceId]: { loading: false } }));
        return;
      }
      
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-url-metadata`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ url }),
      });
      
      if (response.ok) {
        const data = await response.json();
        setResourceMetadata(prev => ({ ...prev, [resourceId]: { image: data.image, loading: false } }));
      } else {
        setResourceMetadata(prev => ({ ...prev, [resourceId]: { loading: false } }));
      }
    } catch {
      setResourceMetadata(prev => ({ ...prev, [resourceId]: { loading: false } }));
    }
  }, []);

  // Track which resources we've already fetched metadata for
  const fetchedMetadataRef = useRef<Set<string>>(new Set());

  // Fetch URL metadata when tripbit is expanded
  useEffect(() => {
    if (expandedResourceId && tripbits) {
      const tripbit = tripbits.find(r => r.id === expandedResourceId);
      if (tripbit?.url && !fetchedMetadataRef.current.has(expandedResourceId)) {
        fetchedMetadataRef.current.add(expandedResourceId);
        fetchUrlMetadata(expandedResourceId, tripbit.url);
      }
    }
  }, [expandedResourceId, tripbits, fetchUrlMetadata]);

  // Mark trip notifications as read when viewing the trip
  useEffect(() => {
    if (id && !loading) {
      markTripNotificationsAsRead(id);
    }
  }, [id, loading, markTripNotificationsAsRead]);

  // Mark chat as read if opened via URL param
  useEffect(() => {
    if (id && chatDrawerOpen) {
      markTripAsRead(id);
    }
  }, [id, chatDrawerOpen, markTripAsRead]);

  // Handle chat drawer URL param
  const handleChatDrawerChange = useCallback((open: boolean) => {
    setChatDrawerOpen(open);
    if (open && id) {
      markTripAsRead(id);
    }
    if (!open && searchParams.get('chat') === 'open') {
      searchParams.delete('chat');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, id, markTripAsRead]);

  if (loading) {
    return (
      <PageLayout title="" subtitle="">
        {/* Back button skeleton */}
        <Skeleton className="h-9 w-24 mb-4" />

        {/* View mode toggle skeleton */}
        <div className="mb-6">
          <Skeleton className="h-10 w-56 rounded-lg" />
        </div>

        {/* Trip Header skeleton */}
        <div className="mb-8">
          <Skeleton className="h-9 w-64 mb-2" />
          <div className="flex items-center gap-2 mb-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-36" />
          </div>
        </div>

        {/* Accordion sections skeleton */}
        <div className="space-y-4">
          {/* Travelers section */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-8 rounded-full" />
                <Skeleton className="h-6 w-24" />
              </div>
              <Skeleton className="h-9 w-20" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <Skeleton className="h-12 w-12 rounded-full" />
              <Skeleton className="h-12 w-12 rounded-full" />
            </div>
          </div>

          {/* Trip Pack section */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-6 w-24" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Skeleton className="h-32 rounded-lg" />
              <Skeleton className="h-32 rounded-lg" />
              <Skeleton className="h-32 rounded-lg" />
            </div>
          </div>

          {/* Itinerary section */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-6 w-28" />
            </div>
            <Skeleton className="h-24 rounded-lg" />
          </div>

          {/* Recommendations section */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-6 w-36" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Skeleton className="h-28 rounded-lg" />
              <Skeleton className="h-28 rounded-lg" />
            </div>
          </div>
        </div>
      </PageLayout>
    );
  }

  if (!trip) {
    return (
      <PageLayout title="Trip not found" subtitle="">
        <div className="text-center py-16">
          <p className="text-muted-foreground mb-4">This trip doesn't exist or you don't have access.</p>
          <Button onClick={() => navigate('/trips')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Trips
          </Button>
        </div>
      </PageLayout>
    );
  }

  const formatDateRange = () => {
    if (trip.is_flexible_dates && trip.flexible_month) {
      return `${trip.flexible_month} (flexible)`;
    }
    if (!trip.start_date || !trip.end_date) {
      return 'No dates set';
    }
    const start = parseISO(trip.start_date);
    const end = parseISO(trip.end_date);
    return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
  };

  const getInitials = (fullName: string | null, username: string) => {
    if (fullName) {
      return fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return username.slice(0, 2).toUpperCase();
  };

  const getParticipantFriendshipStatus = (participantId: string): FriendshipStatusType => {
    if (!user) return 'none';
    if (participantId === user.id) return 'self';
    if (participantId === trip?.owner_id) return 'owner';
    if (friends.some(f => f.profile.id === participantId)) return 'friend';
    if (pendingRequests.some(p => p.isRequester && p.profile.id === participantId)) return 'pending_sent';
    if (pendingRequests.some(p => !p.isRequester && p.profile.id === participantId)) return 'pending_received';
    return 'none';
  };

  const getPendingRequestIdForParticipant = (participantId: string): string | null => {
    const request = pendingRequests.find(p => !p.isRequester && p.profile.id === participantId);
    return request?.id || null;
  };

  const handleAddFriend = async (participantId: string) => {
    const { error } = await sendFriendRequestById(participantId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Friend request sent!' });
      refreshFriends();
    }
  };

  const handleAcceptFriendRequest = async (friendshipId: string) => {
    const { error } = await acceptRequest(friendshipId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Friend added!' });
      refreshFriends();
    }
  };

  const handleRespond = async (response: 'confirmed' | 'declined' | 'tentative') => {
    const { error } = await respondToInvitation(trip.id, response);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      const messages = {
        confirmed: 'Trip confirmed!',
        tentative: 'Marked as tentative',
        declined: 'Invitation declined',
      };
      toast({ title: messages[response] });
      fetchTripDetail();
    }
  };

  const handleDeleteTrip = async () => {
    const { error } = await deleteTrip(trip.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Trip deleted' });
      navigate('/trips');
    }
  };

  const handleUpdateTrip = async (data: any) => {
    const result = await updateTrip(trip.id, data);
    if (result.error) {
      toast({ title: 'Error', description: result.error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Trip updated!' });
      fetchTripDetail();
    }
    return result;
  };

  const handleAddRecommendation = async (data: any) => {
    const result = await addRecommendation(data);
    if (result.error) {
      toast({ title: 'Error', description: result.error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Recommendation added!' });
    }
    return result;
  };

  const handleDeleteRecommendation = async (recId: string) => {
    const { error } = await deleteRecommendation(recId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleRemoveParticipant = async () => {
    if (!participantToRemove) return;
    
    try {
      if (participantToRemove.isPending) {
        await cancelInvite(participantToRemove.id);
        toast({ title: 'Invite cancelled' });
      } else {
        await removeParticipant(participantToRemove.id);
        toast({ title: 'Participant removed' });
      }
      fetchTripDetail();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } finally {
      setParticipantToRemove(null);
    }
  };

  // Get the destination for AI suggestions based on selected location
  const getAIDestination = () => {
    if (!trip) return '';
    if (selectedAILocation === 'main') return trip.destination;
    const location = locations.find(l => l.id === selectedAILocation);
    return location?.destination || trip.destination;
  };

  // AI Recommendations handlers
  const fetchAISuggestions = async () => {
    if (!trip) return;
    
    setAiLoading(true);
    setAiError(null);
    
    const destination = getAIDestination();
    
    try {
      // Get auth session for authorization header
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setAiError('Please sign in to use AI suggestions.');
        toast({ title: 'Authentication Required', description: 'Please sign in to use AI suggestions.', variant: 'destructive' });
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-recommendations`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          destination,
          category: categoryFilter === 'all' ? null : categoryFilter,
        }),
      });
      
      if (response.status === 429) {
        setAiError('Rate limit exceeded. Please try again later.');
        toast({ title: 'Rate Limited', description: 'Please wait a moment before trying again.', variant: 'destructive' });
        return;
      }
      
      if (response.status === 402) {
        setAiError('AI usage limit reached. Please try again later.');
        toast({ title: 'Usage Limit', description: 'AI usage limit reached.', variant: 'destructive' });
        return;
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch suggestions');
      }
      
      const data = await response.json();
      setAiSuggestions(data.recommendations || []);
      toast({ title: 'AI suggestions loaded!' });
    } catch (error) {
      console.error('Error fetching AI suggestions:', error);
      setAiError('Failed to load suggestions. Please try again.');
      toast({ title: 'Error', description: 'Failed to load AI suggestions.', variant: 'destructive' });
    } finally {
      setAiLoading(false);
    }
  };

  const handleAddAISuggestionToTrip = async (suggestion: AISuggestion) => {
    const result = await addRecommendation({
      title: suggestion.name,
      description: suggestion.description,
      category: suggestion.category,
    });
    
    if (!result.error) {
      // Remove from AI suggestions after adding
      setAiSuggestions(prev => prev.filter(s => s.name !== suggestion.name));
    }
  };

  const handleOpenItineraryDialog = (item: { name: string; description?: string; category: 'restaurant' | 'activity' | 'stay' | 'tip' }) => {
    setSelectedItemForItinerary(item);
    setAddToItineraryOpen(true);
  };

  const handleAddToItinerary = async (data: {
    locationId: string;
    date?: string;
    time?: string;
    notes?: string;
    category: string;
  }) => {
    if (!selectedItemForItinerary) return;
    
    const success = await addTripbit({
      category: data.category as any,
      title: selectedItemForItinerary.name,
      description: data.notes || selectedItemForItinerary.description,
      locationId: data.locationId,
      startDate: data.date,
      metadata: data.time ? { time: data.time } : undefined,
    });
    
    if (success) {
      toast({ title: 'Added to itinerary!' });
      // If it was an AI suggestion, remove it
      setAiSuggestions(prev => prev.filter(s => s.name !== selectedItemForItinerary.name));
      setSelectedItemForItinerary(null);
    }
  };

  // Rate and share handlers
  const handleOpenRateShare = (tripbit: Tripbit) => {
    setTripbitToShare(tripbit);
    setRateShareDialogOpen(true);
  };

  const handleRateShareSuccess = () => {
    if (tripbitToShare) {
      setSharedTripbitIds(prev => new Set([...prev, tripbitToShare.id]));
    }
    setTripbitToShare(null);
    setRateShareDialogOpen(false);
  };

  // Get city info for rate and share dialog
  const getLocationCityInfo = (locationId: string | null) => {
    if (!locationId) return null;
    const location = locations.find(l => l.id === locationId);
    if (!location?.city_id) return null;
    return {
      cityId: location.city_id,
      cityName: location.destination.split(',')[0],
    };
  };

  // Handle adding friend recommendation to trip
  const handleAddFriendRecToTrip = async (rec: FriendRecommendation) => {
    const result = await addRecommendation({
      title: rec.title,
      description: rec.tips ? `${rec.description || ''}\n\n💬 "${rec.tips}"`.trim() : (rec.description || undefined),
      category: rec.category,
    });
    
    if (!result.error) {
      toast({ title: 'Added to recommendations!' });
    }
  };

  const confirmedParticipants = trip.participants.filter(p => p.status === 'confirmed');
  const pendingParticipants = trip.participants.filter(p => p.status === 'invited');
  const canAddRecommendation = trip.isOwner || trip.status === 'confirmed';
  const canEditTripbits = trip.isOwner || trip.status === 'confirmed';

  const filteredRecommendations = recommendations.filter(
    rec => categoryFilter === 'all' || rec.category === categoryFilter
  );

  const filterButtons: { value: FilterCategory; label: string; icon: React.ElementType }[] = [
    { value: 'all', label: 'All', icon: Plus },
    { value: 'restaurant', label: 'Food', icon: Utensils },
    { value: 'activity', label: 'Activities', icon: Compass },
    { value: 'stay', label: 'Stays', icon: Home },
    { value: 'tip', label: 'Tips', icon: Lightbulb },
  ];

  // Category colors from centralized config - no longer needed, use getCategoryConfig directly

  // Build destinations display - extract unique countries from all locations
  const allCountries = locations.length > 0
    ? [...new Set(locations.map(l => l.destination.split(',').pop()?.trim()).filter(Boolean))]
    : [trip.destination.split(',').pop()?.trim() || trip.destination];
  const countryDisplay = allCountries.join(' & ');
  const cityStops = locations.map(l => l.destination.split(',')[0].trim());

  return (
    <PageLayout title="" subtitle="">
      {/* Back button */}
      <Button variant="ghost" className="mb-4 -ml-2" onClick={() => navigate('/trips')}>
        <ArrowLeft className="w-4 h-4 mr-2" />
        All Trips
      </Button>

      {/* View Mode Toggle */}
      <div className="mb-6">
        <div className="inline-flex rounded-lg border border-border bg-card p-1 gap-1">
          <button
            onClick={() => setViewMode('planning')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
              viewMode === 'planning'
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <PenLine className="w-4 h-4" />
            Planning
          </button>
          <button
            onClick={() => setViewMode('itinerary')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
              viewMode === 'itinerary'
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            )}
          >
            <ClipboardList className="w-4 h-4" />
            Itinerary
          </button>
        </div>
      </div>

      {viewMode === 'itinerary' ? (
        <ItineraryPrintView
          trip={{
            name: trip.name,
            destination: trip.destination,
            start_date: trip.start_date,
            end_date: trip.end_date,
            description: trip.description,
            is_flexible_dates: trip.is_flexible_dates,
            flexible_month: trip.flexible_month,
            ownerProfile: trip.ownerProfile,
          }}
          locations={locations}
          tripbits={tripbits}
          travelers={allTravelers}
          getLocationParticipants={getLocationParticipants}
          expandAll={expandAllItinerary}
          onExpandAllChange={setExpandAllItinerary}
          onPrint={() => window.print()}
          currentUserId={user?.id}
          canExportICS={canExportICS}
          canExportPDF={canExportPDF}
          onUpgrade={() => navigate('/pricing')}
        />
      ) : (
        <>
          {/* Planning View Content */}

      {/* Trip Header */}
      <div className="mb-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">{trip.name}</h1>
            
            {/* Destinations */}
            <div className="text-muted-foreground mb-2 space-y-1">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <span>{countryDisplay}</span>
                {trip.isOwner && (
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    className="h-7 px-3 rounded-full text-xs font-medium"
                    onClick={() => setLocationsDialogOpen(true)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add stop
                  </Button>
                )}
              </div>
              {cityStops.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 pl-6 text-sm">
                  {cityStops.map((city, idx) => (
                    <span key={idx} className="flex items-center">
                      <span>{city}</span>
                      {idx < cityStops.length - 1 && (
                        <ChevronRight className="w-3 h-3 mx-1 text-muted-foreground/50" />
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>{formatDateRange()}</span>
            </div>
            
            {trip.description && (
              <p className="text-muted-foreground mt-3">{trip.description}</p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {trip.isOwner && (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon">
                      <Pencil className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit Trip Details
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLocationsDialogOpen(true)}>
                      <MapPin className="w-4 h-4 mr-2" />
                      Manage Locations & Dates
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Invitation response */}
        {trip.status === 'invited' && (
          <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-foreground mb-3">You've been invited to this trip!</p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => handleRespond('confirmed')} className="gap-1">
                <Check className="w-4 h-4" />
                Accept
              </Button>
              <Button size="sm" variant="secondary" onClick={() => handleRespond('tentative')} className="gap-1">
                <HelpCircle className="w-4 h-4" />
                Tentative
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleRespond('declined')} className="gap-1">
                <X className="w-4 h-4" />
                Decline
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Collapsible Sections */}
      <Accordion type="multiple" value={openAccordions} onValueChange={setOpenAccordions} className="space-y-4">
        {/* Travelers Section */}
        <AccordionItem value="travelers" className="border rounded-lg px-4 animate-fade-in" style={{ animationDelay: '100ms' }}>
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex items-center justify-between w-full mr-4">
              <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                <div className="bg-primary rounded-full p-1.5">
                  <Users className="w-4 h-4 text-primary-foreground" />
                </div>
                Travelers
              </h2>
              {trip.isOwner && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={(e) => { e.stopPropagation(); setInviteDialogOpen(true); }} 
                  className="gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Invite
                </Button>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
        
        <TooltipProvider>
          <div className="flex flex-wrap items-center gap-3">
            {/* Owner - always first */}
            {trip.ownerProfile && (() => {
              const ownerStatus = getParticipantFriendshipStatus(trip.owner_id);
              const ownerPendingId = getPendingRequestIdForParticipant(trip.owner_id);
              return (
                <div className="flex flex-col items-center gap-1">
                  <div className="relative">
                    <Avatar className="w-12 h-12 ring-2 ring-primary ring-offset-2 ring-offset-background">
                      <AvatarImage src={trip.ownerProfile.avatar_url || undefined} />
                      <AvatarFallback className="text-sm bg-primary text-primary-foreground">
                        {getInitials(trip.ownerProfile.full_name, trip.ownerProfile.username)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-[10px]">👑</span>
                    </div>
                    {/* Friend status indicator for owner */}
                    {ownerStatus === 'friend' && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="absolute -top-1 -left-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>Already friends</TooltipContent>
                      </Tooltip>
                    )}
                    {ownerStatus === 'pending_sent' && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="absolute -top-1 -left-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                            <Clock className="w-3 h-3 text-white" />
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>Request pending</TooltipContent>
                      </Tooltip>
                    )}
                    {ownerStatus === 'pending_received' && ownerPendingId && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button 
                            className="absolute -top-1 -left-1 w-5 h-5 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center transition-colors"
                            onClick={() => handleAcceptFriendRequest(ownerPendingId)}
                          >
                            <Check className="w-3 h-3 text-white" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Accept friend request</TooltipContent>
                      </Tooltip>
                    )}
                    {ownerStatus === 'none' && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button 
                            className="absolute -top-1 -left-1 w-5 h-5 bg-primary hover:bg-primary/90 rounded-full flex items-center justify-center transition-colors"
                            onClick={() => handleAddFriend(trip.owner_id)}
                          >
                            <UserPlus className="w-3 h-3 text-primary-foreground" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Add as travel pal</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                    {trip.ownerProfile.full_name?.split(' ')[0] || trip.ownerProfile.username}
                  </span>
                </div>
              );
            })()}

            {/* Confirmed participants */}
            {confirmedParticipants.map((p) => {
              const status = getParticipantFriendshipStatus(p.user_id);
              const pendingId = getPendingRequestIdForParticipant(p.user_id);
              const participantName = p.profile?.full_name?.split(' ')[0] || p.profile?.username || 'User';
              
              const avatarContent = (
                <div className="relative">
                  <Avatar className="w-12 h-12 ring-2 ring-green-500/50 ring-offset-2 ring-offset-background">
                    <AvatarImage src={p.profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-sm">
                      {getInitials(p.profile?.full_name || null, p.profile?.username || '')}
                    </AvatarFallback>
                  </Avatar>
                  {/* Friend status indicator */}
                  {status === 'friend' && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="absolute -top-1 -left-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Already friends</TooltipContent>
                    </Tooltip>
                  )}
                  {status === 'pending_sent' && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="absolute -top-1 -left-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                          <Clock className="w-3 h-3 text-white" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Request pending</TooltipContent>
                    </Tooltip>
                  )}
                  {status === 'pending_received' && pendingId && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button 
                          className="absolute -top-1 -left-1 w-5 h-5 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center transition-colors"
                          onClick={(e) => { e.stopPropagation(); handleAcceptFriendRequest(pendingId); }}
                        >
                          <Check className="w-3 h-3 text-white" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Accept friend request</TooltipContent>
                    </Tooltip>
                  )}
                  {status === 'none' && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button 
                          className="absolute -top-1 -left-1 w-5 h-5 bg-primary hover:bg-primary/90 rounded-full flex items-center justify-center transition-colors"
                          onClick={(e) => { e.stopPropagation(); handleAddFriend(p.user_id); }}
                        >
                          <UserPlus className="w-3 h-3 text-primary-foreground" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Add as travel pal</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              );
              
              return (
                <div key={p.id} className="flex flex-col items-center gap-1">
                  {trip.isOwner ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="cursor-pointer hover:opacity-80 transition-opacity">
                          {avatarContent}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="center">
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive"
                          onClick={() => setParticipantToRemove({ 
                            id: p.id, 
                            name: participantName, 
                            isPending: false 
                          })}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Remove from Trip
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    avatarContent
                  )}
                  <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                    {participantName}
                  </span>
                </div>
              );
            })}

            {/* Pending invites */}
            {pendingParticipants.map((p) => {
              const status = getParticipantFriendshipStatus(p.user_id);
              const participantName = p.profile?.full_name?.split(' ')[0] || p.profile?.username || 'User';
              
              const avatarContent = (
                <div className="relative">
                  <Avatar className="w-12 h-12 ring-2 ring-dashed ring-muted-foreground/30 ring-offset-2 ring-offset-background">
                    <AvatarImage src={p.profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-sm bg-muted">
                      {getInitials(p.profile?.full_name || null, p.profile?.username || '')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                    <Clock className="w-3 h-3 text-white" />
                  </div>
                  {/* Friend status indicator */}
                  {status === 'friend' && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="absolute -top-1 -left-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>Already friends</TooltipContent>
                    </Tooltip>
                  )}
                  {status === 'none' && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button 
                          className="absolute -top-1 -left-1 w-5 h-5 bg-primary hover:bg-primary/90 rounded-full flex items-center justify-center transition-colors"
                          onClick={(e) => { e.stopPropagation(); handleAddFriend(p.user_id); }}
                        >
                          <UserPlus className="w-3 h-3 text-primary-foreground" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Add as travel pal</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              );
              
              return (
                <div key={p.id} className="flex flex-col items-center gap-1 opacity-50">
                  {trip.isOwner ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="cursor-pointer hover:opacity-80 transition-opacity">
                          {avatarContent}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="center">
                        <DropdownMenuItem 
                          className="text-destructive focus:text-destructive"
                          onClick={() => setParticipantToRemove({ 
                            id: p.id, 
                            name: participantName, 
                            isPending: true 
                          })}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancel Invite
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    avatarContent
                  )}
                  <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                    {participantName}
                  </span>
                </div>
              );
            })}

            {/* Empty state */}
            {!trip.ownerProfile && confirmedParticipants.length === 0 && pendingParticipants.length === 0 && (
              <p className="text-muted-foreground">No travelers yet</p>
            )}
          </div>
        </TooltipProvider>

        {/* Pending Join Requests - Only visible to trip owner */}
        {trip.isOwner && pendingJoinRequests.length > 0 && (
          <div className="mt-4">
            <PendingJoinRequests
              pendingRequests={pendingJoinRequests}
              onApprove={async (participantId) => {
                const { error } = await respondToJoinRequest(participantId, true);
                if (error) {
                  toast({ title: 'Error', description: error.message, variant: 'destructive' });
                } else {
                  toast({ title: 'Join request approved!' });
                  fetchTripDetail();
                }
              }}
              onDecline={async (participantId) => {
                const { error } = await respondToJoinRequest(participantId, false);
                if (error) {
                  toast({ title: 'Error', description: error.message, variant: 'destructive' });
                } else {
                  toast({ title: 'Join request declined' });
                  fetchTripDetail();
                }
              }}
            />
          </div>
        )}
          </AccordionContent>
        </AccordionItem>

        {/* Trip Pack Section (formerly Resources) */}
        <AccordionItem value="trip-pack" className="border rounded-lg px-4 animate-fade-in" style={{ animationDelay: '150ms' }}>
          <AccordionTrigger className="hover:no-underline py-4">
            <h2 className="font-display text-xl font-semibold flex items-center gap-2">
              <div className="bg-primary rounded-full p-1.5">
                <Briefcase className="w-4 h-4 text-primary-foreground" />
              </div>
              Trip Pack
            </h2>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <TripbitsGrid
              tripbits={tripbits}
              loading={tripbitsLoading}
              onAdd={addTripbit}
              onUpdate={updateTripbit}
              onDelete={deleteTripbit}
              onReorder={reorderTripbits}
              canEdit={canEditTripbits}
              locations={locations}
              travelers={allTravelers}
              dialogOpen={resourceDialogOpen}
              onDialogOpenChange={setResourceDialogOpen}
              prefill={resourcePrefill as any}
              onPrefillClear={() => setResourcePrefill(undefined)}
              tripStartDate={trip.start_date}
              tripEndDate={trip.end_date}
              onRateAndShare={handleOpenRateShare}
              sharedTripbitIds={sharedTripbitIds}
              tripId={trip.id}
              locationParticipants={locationParticipantsMap}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Files Section */}
        <AccordionItem value="files" className="border rounded-lg px-4 animate-fade-in" style={{ animationDelay: '175ms' }}>
          <AccordionTrigger className="hover:no-underline py-4">
            <h2 className="font-display text-xl font-semibold flex items-center gap-2">
              <div className="bg-primary rounded-full p-1.5">
                <FolderOpen className="w-4 h-4 text-primary-foreground" />
              </div>
              Files
            </h2>
          </AccordionTrigger>
          <AccordionContent className="pt-4">
            <TripFilesSection tripbits={tripbits} locations={locations} />
          </AccordionContent>
        </AccordionItem>


        {/* Recommendations Section */}
        <AccordionItem id="recommendations-section" value="recommendations" className="border rounded-lg px-4 animate-fade-in" style={{ animationDelay: '250ms' }}>
          <AccordionTrigger className="hover:no-underline py-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full mr-4">
              <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                <div className="bg-primary rounded-full p-1.5">
                  <Lightbulb className="w-4 h-4 text-primary-foreground" />
                </div>
                Recommendations
              </h2>
              <div className="flex items-center gap-2 flex-wrap" onClick={(e) => e.stopPropagation()}>
                {/* Location selector for AI suggestions */}
                <Select value={selectedAILocation} onValueChange={(value) => {
                  setSelectedAILocation(value);
                  setAiSuggestions([]); // Clear suggestions when changing location
                }}>
                  <SelectTrigger className="w-[180px] h-8 text-sm">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="main">{trip.destination}</SelectItem>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.destination}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {canAccessAI ? (
                  <div className="flex items-center gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={fetchAISuggestions}
                      disabled={aiLoading}
                      className="gap-2"
                    >
                      {aiLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      {aiLoading ? 'Loading...' : 'Get AI Suggestions'}
                    </Button>
                    <PremiumBadge />
                  </div>
                ) : (
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => navigate('/pricing')}
                    className="gap-2 border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                  >
                    <Sparkles className="w-4 h-4" />
                    AI Suggestions
                    <Badge variant="secondary" className="ml-1 bg-amber-500/10 text-amber-600 text-[10px]">PRO</Badge>
                  </Button>
                )}
                {canAddRecommendation && (
                  <Button size="sm" onClick={() => setAddRecOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Recommendation
                  </Button>
                )}
              </div>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4">

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2 mb-4">
          {filterButtons.map((btn) => {
            const Icon = btn.icon;
            return (
              <Button
                key={btn.value}
                variant={categoryFilter === btn.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  setCategoryFilter(btn.value);
                  // Clear AI suggestions when changing filter
                  setAiSuggestions([]);
                }}
                className={cn("gap-1", categoryFilter !== btn.value && "bg-card")}
              >
                {btn.value !== 'all' && <Icon className="w-3 h-3" />}
                {btn.label}
              </Button>
            );
          })}
        </div>

        {/* Friend Recommendations Section */}
        {filteredFriendRecommendations.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Users2 className="w-4 h-4 text-primary" />
              <h3 className="font-medium text-foreground">From Your Travel Pals</h3>
              <Badge variant="secondary" className="text-[10px]">
                {filteredFriendRecommendations.length}
              </Badge>
            </div>
            <div className="grid gap-3">
              {filteredFriendRecommendations.map((rec) => (
                <FriendRecommendationCard
                  key={rec.id}
                  recommendation={rec}
                  onAddToTrip={() => handleAddFriendRecToTrip(rec)}
                />
              ))}
            </div>
          </div>
        )}

        {/* AI Suggestions Section */}
        {aiSuggestions.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="font-medium text-foreground">AI Suggestions for {getAIDestination()}</h3>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto text-muted-foreground"
                onClick={() => setAiSuggestions([])}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="grid gap-3">
              {aiSuggestions.map((suggestion, idx) => (
                <AISuggestionCard
                  key={`${suggestion.name}-${idx}`}
                  suggestion={suggestion}
                  onAddToTrip={() => handleAddAISuggestionToTrip(suggestion)}
                  onAddToItinerary={() => handleOpenItineraryDialog(suggestion)}
                />
              ))}
            </div>
          </div>
        )}

        {/* AI Error */}
        {aiError && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
            {aiError}
          </div>
        )}

        {/* Manual Recommendations */}
        {filteredRecommendations.length > 0 ? (
          <div className="grid gap-3">
            {filteredRecommendations.map((rec) => (
              <RecommendationCard
                key={rec.id}
                recommendation={rec}
                canDelete={rec.user_id === user?.id}
                onDelete={() => handleDeleteRecommendation(rec.id)}
                showAddToItinerary={canAddRecommendation && locations.length > 0}
                onAddToItinerary={() => handleOpenItineraryDialog({
                  name: rec.title,
                  description: rec.description || undefined,
                  category: rec.category,
                })}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-card rounded-lg border border-border/50">
            <Lightbulb className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-2">
              {categoryFilter === 'all' 
                ? 'No recommendations yet' 
                : `No ${categoryFilter} recommendations yet`}
            </p>
            <p className="text-sm text-muted-foreground mb-3">
              Try clicking "Get AI Suggestions" for ideas!
            </p>
            {canAddRecommendation && (
              <Button variant="link" onClick={() => setAddRecOpen(true)} className="mt-2">
                Or add your own
              </Button>
            )}
          </div>
        )}
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Dialogs */}
      <AddRecommendationDialog
        open={addRecOpen}
        onOpenChange={(open) => {
          setAddRecOpen(open);
          if (!open) setAddRecPrefill(undefined);
        }}
        onSubmit={handleAddRecommendation}
        locations={locations}
        mainDestination={trip.destination}
        prefill={addRecPrefill}
      />

      {trip.isOwner && (
        <>
          <EditTripDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            trip={trip}
            onSave={handleUpdateTrip}
          />

          <ManageLocationsDialog
            open={locationsDialogOpen}
            onOpenChange={setLocationsDialogOpen}
            tripId={trip.id}
            mainDestination={trip.destination}
          />

          <InviteTravelPalsDialog
            open={inviteDialogOpen}
            onOpenChange={setInviteDialogOpen}
            tripId={trip.id}
            participants={trip.participants}
            onInviteSent={fetchTripDetail}
          />
        </>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this trip?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All trip data and recommendations will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTrip} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!participantToRemove} onOpenChange={(open) => !open && setParticipantToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {participantToRemove?.isPending ? 'Cancel invite?' : 'Remove from trip?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {participantToRemove?.isPending 
                ? `${participantToRemove?.name} will no longer be able to join this trip using the current invite.`
                : `${participantToRemove?.name} will be removed from this trip and lose access to all trip details.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveParticipant} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {participantToRemove?.isPending ? 'Cancel Invite' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ChatDrawer
        open={chatDrawerOpen}
        onOpenChange={handleChatDrawerChange}
        tripId={trip.id}
        tripName={trip.name}
      />

      <EditLocationDialog
        open={!!editingLocation}
        onOpenChange={(open) => !open && setEditingLocation(null)}
        location={editingLocation}
        onSave={async (locationId, data) => {
          const result = await updateLocation(locationId, data);
          if (!result.error) {
            fetchLocations();
          }
          return result;
        }}
      />

      <AddToItineraryDialog
        open={addToItineraryOpen}
        onOpenChange={(open) => {
          setAddToItineraryOpen(open);
          if (!open) setSelectedItemForItinerary(null);
        }}
        locations={locations}
        itemName={selectedItemForItinerary?.name || ''}
        itemDescription={selectedItemForItinerary?.description}
        itemCategory={selectedItemForItinerary?.category || 'tip'}
        tripStartDate={trip?.start_date}
        tripEndDate={trip?.end_date}
        onSubmit={handleAddToItinerary}
      />

      {/* Rate and Share Dialog */}
      {tripbitToShare && (() => {
        const cityInfo = getLocationCityInfo(tripbitToShare.location_id);
        if (!cityInfo) return null;
        return (
          <RateAndShareDialog
            open={rateShareDialogOpen}
            onOpenChange={(open) => {
              setRateShareDialogOpen(open);
              if (!open) setTripbitToShare(null);
            }}
            tripbit={{
              id: tripbitToShare.id,
              title: tripbitToShare.title,
              description: tripbitToShare.description,
              category: tripbitToShare.category,
              url: tripbitToShare.url,
              trip_id: trip.id,
            }}
            cityId={cityInfo.cityId}
            cityName={cityInfo.cityName}
          />
        );
      })()}
        </>
      )}

      {/* Floating Chat Button */}
      <Button
        onClick={() => setChatDrawerOpen(true)}
        className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 w-14 h-14 rounded-full bg-[#FCED2E] border-2 border-foreground shadow-elevated hover:bg-[#FCED2E]/90 hover:scale-105 transition-all"
        size="icon"
      >
        <MessageCircle className="w-6 h-6 text-foreground" />
        {id && hasUnreadMessagesForTrip(id) && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full border-2 border-background" />
        )}
      </Button>
    </PageLayout>
  );
}
