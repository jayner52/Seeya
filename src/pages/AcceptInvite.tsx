import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { acceptTripInvite } from '@/hooks/useTripInvites';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { 
  MapPin, 
  Calendar, 
  Users, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  ChevronDown,
  Plane,
  Home,
  Car,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { format, parseISO, isPast, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';

interface TripPreview {
  id: string;
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  is_flexible_dates: boolean;
  flexible_month: string | null;
  owner_id: string;
}

interface OwnerProfile {
  full_name: string | null;
  username: string;
  avatar_url: string | null;
}

interface InvitedLocation {
  id: string;
  destination: string;
  start_date: string | null;
  end_date: string | null;
}

interface InvitedResource {
  id: string;
  title: string;
  category: string;
  location_id: string | null;
  start_date: string | null;
}

const getCategoryIcon = (category: string) => {
  switch (category) {
    case 'flight': return Plane;
    case 'accommodation': return Home;
    case 'rental_car':
    case 'transportation': return Car;
    default: return Calendar;
  }
};

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [trip, setTrip] = useState<TripPreview | null>(null);
  const [ownerProfile, setOwnerProfile] = useState<OwnerProfile | null>(null);
  const [invitedLocations, setInvitedLocations] = useState<InvitedLocation[]>([]);
  const [invitedResources, setInvitedResources] = useState<InvitedResource[]>([]);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Selection state
  const [selectedLocationIds, setSelectedLocationIds] = useState<string[]>([]);
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);
  const [expandedLocations, setExpandedLocations] = useState<string[]>([]);

  useEffect(() => {
    const fetchInvite = async () => {
      if (!token) {
        setError('Invalid invite link');
        setLoading(false);
        return;
      }

      // Use the secure RPC function that bypasses RLS
      const { data: preview, error: previewError } = await supabase
        .rpc('get_trip_invite_preview', { _token: token });

      if (previewError || !preview) {
        setError('This invite link is invalid or has expired');
        setLoading(false);
        return;
      }

      // Cast the JSON response
      const previewData = preview as unknown as {
        trip: TripPreview;
        owner: OwnerProfile | null;
        locations: InvitedLocation[];
        resources: InvitedResource[];
        expires_at: string | null;
      };

      // Set trip data
      setTrip(previewData.trip);

      // Set owner profile
      if (previewData.owner) {
        setOwnerProfile(previewData.owner);
      }

      // Set locations - sorted chronologically by start_date
      const locations = (previewData.locations || []).sort((a, b) => {
        if (!a.start_date) return 1;
        if (!b.start_date) return -1;
        return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
      });
      setInvitedLocations(locations);
      setSelectedLocationIds(locations.map((l) => l.id));

      // Set resources
      const resources = previewData.resources || [];
      setInvitedResources(resources);
      setSelectedResourceIds(resources.map((r) => r.id));

      // Set expiration date
      setExpiresAt(previewData.expires_at || null);

      setLoading(false);
    };

    fetchInvite();
  }, [token]);

  const toggleLocation = (locationId: string) => {
    setSelectedLocationIds(prev => {
      const isSelected = prev.includes(locationId);
      if (isSelected) {
        // Also deselect resources in this location
        const locationResources = invitedResources.filter(r => r.location_id === locationId);
        setSelectedResourceIds(prevRes => 
          prevRes.filter(id => !locationResources.some(r => r.id === id))
        );
        return prev.filter(id => id !== locationId);
      }
      // Select location and its resources
      const locationResources = invitedResources.filter(r => r.location_id === locationId);
      setSelectedResourceIds(prevRes => 
        [...new Set([...prevRes, ...locationResources.map(r => r.id)])]
      );
      return [...prev, locationId];
    });
  };

  const toggleResource = (resourceId: string) => {
    setSelectedResourceIds(prev => 
      prev.includes(resourceId)
        ? prev.filter(id => id !== resourceId)
        : [...prev, resourceId]
    );
  };

  const toggleExpandedLocation = (locationId: string) => {
    setExpandedLocations(prev =>
      prev.includes(locationId)
        ? prev.filter(id => id !== locationId)
        : [...prev, locationId]
    );
  };

  const handleAccept = async () => {
    if (!token || !user || !trip) return;

    setAccepting(true);
    const { tripId, error } = await acceptTripInvite(token);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setAccepting(false);
      return;
    }

    // Add selected location participants
    if (selectedLocationIds.length > 0) {
      const locationParticipants = selectedLocationIds.map(locId => ({
        location_id: locId,
        user_id: user.id,
      }));
      await supabase.from('location_participants').insert(locationParticipants);
    }

    // Add selected resource participants
    if (selectedResourceIds.length > 0) {
      const resourceParticipants = selectedResourceIds.map(resId => ({
        resource_id: resId,
        user_id: user.id,
      }));
      await supabase.from('resource_participants').insert(resourceParticipants);
    }

    setSuccess(true);
    toast({ title: 'You\'ve joined the trip!' });
    
    setTimeout(() => {
      navigate(`/trips/${tripId}`);
    }, 1500);
  };

  const formatDateRange = () => {
    if (!trip) return '';
    if (trip.is_flexible_dates && trip.flexible_month) {
      const monthDate = parseISO(`${trip.flexible_month}-01`);
      return `${format(monthDate, 'MMMM yyyy')} (flexible)`;
    }
    
    // Calculate from location dates if available
    const locationDates = invitedLocations
      .filter(l => l.start_date)
      .map(l => ({
        start: l.start_date ? parseISO(l.start_date) : null,
        end: l.end_date ? parseISO(l.end_date) : (l.start_date ? parseISO(l.start_date) : null)
      }))
      .filter(d => d.start !== null);
    
    if (locationDates.length > 0) {
      const earliestStart = locationDates.reduce((min, d) => 
        d.start && d.start < min ? d.start : min, 
        locationDates[0].start!
      );
      const latestEnd = locationDates.reduce((max, d) => 
        d.end && d.end > max ? d.end : max, 
        locationDates[0].end || locationDates[0].start!
      );
      return `${format(earliestStart, 'MMM d')} – ${format(latestEnd, 'MMM d, yyyy')}`;
    }
    
    // Fall back to trip dates
    const start = parseISO(trip.start_date);
    const end = parseISO(trip.end_date);
    return `${format(start, 'MMM d')} – ${format(end, 'MMM d, yyyy')}`;
  };

  const formatLocationDateRange = (startDate: string | null, endDate: string | null) => {
    if (!startDate) return '';
    const start = parseISO(startDate);
    if (!endDate) return format(start, 'MMM d');
    const end = parseISO(endDate);
    return `${format(start, 'MMM d')} - ${format(end, 'MMM d')}`;
  };

  const getLocationResources = (locationId: string) => {
    return invitedResources.filter(r => r.location_id === locationId);
  };

  const getExpirationInfo = () => {
    if (!expiresAt) return null;
    const expDate = parseISO(expiresAt);
    const daysLeft = differenceInDays(expDate, new Date());
    const isUrgent = daysLeft <= 3;
    return {
      date: expDate,
      daysLeft,
      isUrgent,
      formatted: format(expDate, 'MMM d, yyyy'),
    };
  };

  const expirationInfo = getExpirationInfo();

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center">
          <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold mb-2">Invalid Invite</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold mb-2">You're In!</h1>
          <p className="text-muted-foreground">Redirecting to your trip...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    const ownerName = ownerProfile?.full_name || ownerProfile?.username || 'Someone';
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="max-w-md w-full">
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <Users className="w-12 h-12 text-primary mx-auto mb-4" />
            <h1 className="font-display text-2xl font-bold mb-2">You're Invited!</h1>
            <p className="text-muted-foreground mb-4">
              <span className="font-semibold text-foreground">{ownerName}</span> invited you to join a trip
            </p>
            {trip && (
              <div className="my-6 p-4 bg-muted/50 rounded-lg">
                <h2 className="font-display text-xl font-semibold mb-3">{trip.name}</h2>
                <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{trip.destination}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDateRange()}</span>
                  </div>
                </div>
                {invitedLocations.length > 1 && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      Includes {invitedLocations.length} destinations: {invitedLocations.map(l => l.destination.split(',')[0]).join(' → ')}
                    </p>
                  </div>
                )}
                {expirationInfo && (
                  <div className={cn(
                    "mt-3 pt-3 border-t border-border flex items-center justify-center gap-2 text-sm",
                    expirationInfo.isUrgent ? "text-destructive" : "text-muted-foreground"
                  )}>
                    {expirationInfo.isUrgent ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : (
                      <Clock className="w-4 h-4" />
                    )}
                    <span>
                      Must accept by {expirationInfo.formatted}
                      {expirationInfo.daysLeft <= 7 && ` (${expirationInfo.daysLeft} day${expirationInfo.daysLeft !== 1 ? 's' : ''} left)`}
                    </span>
                  </div>
                )}
              </div>
            )}
            <p className="text-muted-foreground mb-6 text-sm">
              Create an account or sign in to view trip details and accept this invitation.
            </p>
            <div className="space-y-3">
              <Button onClick={() => navigate(`/auth?redirect=/invite/${token}`)} className="w-full">
                Create Account to Join
              </Button>
              <Button variant="outline" onClick={() => navigate(`/auth?redirect=/invite/${token}`)} className="w-full">
                Sign In
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hasGranularOptions = invitedLocations.length > 0;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full">
        <div className="bg-card border border-border rounded-2xl p-8">
          <div className="text-center mb-6">
            <Users className="w-12 h-12 text-primary mx-auto mb-4" />
            <h1 className="font-display text-2xl font-bold mb-2">You're Invited!</h1>
          </div>
          
          {trip && (
            <div className="mb-6 p-4 bg-muted/50 rounded-lg text-center">
              <h2 className="font-display text-xl font-semibold mb-2">{trip.name}</h2>
              <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>{trip.destination}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDateRange()}</span>
                </div>
              </div>
              {expirationInfo && (
                <div className={cn(
                  "mt-3 pt-3 border-t border-border flex items-center justify-center gap-2 text-sm",
                  expirationInfo.isUrgent ? "text-destructive" : "text-muted-foreground"
                )}>
                  {expirationInfo.isUrgent ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : (
                    <Clock className="w-4 h-4" />
                  )}
                  <span>
                    Must accept by {expirationInfo.formatted}
                    {expirationInfo.daysLeft <= 7 && ` (${expirationInfo.daysLeft} day${expirationInfo.daysLeft !== 1 ? 's' : ''} left)`}
                  </span>
                </div>
              )}
            </div>
          )}

          {hasGranularOptions && (
            <div className="mb-6 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Select what to join:</span>
                <button
                  type="button"
                  onClick={() => {
                    const allSelected = selectedLocationIds.length === invitedLocations.length;
                    if (allSelected) {
                      setSelectedLocationIds([]);
                      setSelectedResourceIds([]);
                    } else {
                      setSelectedLocationIds(invitedLocations.map(l => l.id));
                      setSelectedResourceIds(invitedResources.map(r => r.id));
                    }
                  }}
                  className="text-xs text-primary hover:underline"
                >
                  {selectedLocationIds.length === invitedLocations.length ? 'Deselect all' : 'Select all'}
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {invitedLocations.map((location) => {
                  const locationResources = getLocationResources(location.id);
                  const isExpanded = expandedLocations.includes(location.id);
                  const isSelected = selectedLocationIds.includes(location.id);
                  const selectedResourceCount = locationResources.filter(r => 
                    selectedResourceIds.includes(r.id)
                  ).length;

                  return (
                    <div key={location.id} className="border border-border rounded-lg overflow-hidden">
                      <div className="flex items-center gap-3 p-3 bg-card">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleLocation(location.id)}
                          className="shrink-0"
                        />
                        <button
                          type="button"
                          onClick={() => toggleExpandedLocation(location.id)}
                          className="flex-1 flex items-center gap-2 text-left"
                        >
                          <MapPin className="w-4 h-4 text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium truncate">{location.destination}</div>
                            {location.start_date && (
                              <div className="text-xs text-muted-foreground">
                                {formatLocationDateRange(location.start_date, location.end_date)}
                              </div>
                            )}
                          </div>
                          {locationResources.length > 0 && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {selectedResourceCount}/{locationResources.length}
                              </span>
                              <ChevronDown className={cn(
                                "w-4 h-4 text-muted-foreground transition-transform",
                                isExpanded && "rotate-180"
                              )} />
                            </div>
                          )}
                        </button>
                      </div>

                      {locationResources.length > 0 && (
                        <Collapsible open={isExpanded}>
                          <CollapsibleContent>
                            <div className="border-t border-border bg-muted/30 p-2 space-y-1">
                              {locationResources.map((resource) => {
                                const Icon = getCategoryIcon(resource.category);
                                const isResourceSelected = selectedResourceIds.includes(resource.id);

                                return (
                                  <button
                                    key={resource.id}
                                    type="button"
                                    onClick={() => toggleResource(resource.id)}
                                    className={cn(
                                      "w-full flex items-center gap-3 p-2 rounded-md transition-colors",
                                      isResourceSelected 
                                        ? "bg-primary/10" 
                                        : "hover:bg-accent/50"
                                    )}
                                  >
                                    <Checkbox
                                      checked={isResourceSelected}
                                      onCheckedChange={() => toggleResource(resource.id)}
                                      className="shrink-0"
                                    />
                                    <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                                    <div className="flex-1 text-left min-w-0">
                                      <div className="text-sm truncate">{resource.title}</div>
                                      {resource.start_date && (
                                        <div className="text-xs text-muted-foreground">
                                          {format(parseISO(resource.start_date), 'MMM d')}
                                        </div>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate('/trips')} className="flex-1">
              Maybe Later
            </Button>
            <Button 
              onClick={handleAccept} 
              disabled={accepting || (hasGranularOptions && selectedLocationIds.length === 0)} 
              className="flex-1 gap-2"
            >
              {accepting && <Loader2 className="w-4 h-4 animate-spin" />}
              {hasGranularOptions 
                ? `Join (${selectedLocationIds.length} leg${selectedLocationIds.length !== 1 ? 's' : ''})`
                : 'Join Trip'
              }
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
