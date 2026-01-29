import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useFriends } from '@/hooks/useFriends';
import { useTripInvites } from '@/hooks/useTripInvites';
import { useTrips, ParticipantData } from '@/hooks/useTrips';
import { useTripLocations } from '@/hooks/useTripLocations';
import { useTripbits } from '@/hooks/useTripbits';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  Link as LinkIcon, 
  Copy, 
  Check, 
  Loader2, 
  Trash2,
  UserPlus,
  Clock,
  ChevronDown,
  ChevronUp,
  CalendarIcon,
  X,
  MapPin
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, addDays } from 'date-fns';
import { InviteSelectionAccordion } from './InviteSelectionAccordion';

interface InviteTravelPalsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  participants: ParticipantData[];
  onInviteSent: () => void;
}

export function InviteTravelPalsDialog({ 
  open, 
  onOpenChange, 
  tripId, 
  participants,
  onInviteSent 
}: InviteTravelPalsDialogProps) {
  const { friends, loading: loadingFriends } = useFriends();
  const { invites, createInviteLink, deleteInvite, getInviteUrl } = useTripInvites(tripId);
  const { inviteToTrip } = useTrips();
  const { locations } = useTripLocations(tripId);
  const { tripbits } = useTripbits(tripId);
  const { toast } = useToast();

  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [inviting, setInviting] = useState(false);
  const [creatingLink, setCreatingLink] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [expirationDate, setExpirationDate] = useState<Date | undefined>(addDays(new Date(), 7));
  const [expandedInvite, setExpandedInvite] = useState<string | null>(null);
  
  // Share link granular selection state
  const [linkLocationIds, setLinkLocationIds] = useState<string[]>([]);
  const [linkTripbitIds, setLinkTripbitIds] = useState<string[]>([]);
  
  // Friend granular selection state
  const [expandedFriend, setExpandedFriend] = useState<string | null>(null);
  const [friendSelections, setFriendSelections] = useState<Record<string, {
    locationIds: string[];
    tripbitIds: string[];
  }>>({});

  const participantIds = participants.map(p => p.user_id);
  const availableFriends = friends.filter(f => !participantIds.includes(f.profile?.id || ''));

  // Initialize link selections when locations/tripbits load
  useEffect(() => {
    setLinkLocationIds(locations.map(l => l.id));
    setLinkTripbitIds(tripbits.map(t => t.id));
  }, [locations, tripbits]);

  // Initialize friend selections when friend is selected
  useEffect(() => {
    selectedFriends.forEach(friendId => {
      if (!friendSelections[friendId]) {
        setFriendSelections(prev => ({
          ...prev,
          [friendId]: {
            locationIds: locations.map(l => l.id),
            tripbitIds: tripbits.map(t => t.id),
          }
        }));
      }
    });
  }, [selectedFriends, locations, tripbits]);

  const getInitials = (fullName: string | null, username: string) => {
    if (fullName) {
      return fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return username.slice(0, 2).toUpperCase();
  };

  const toggleFriend = (friendId: string) => {
    setSelectedFriends(prev => {
      if (prev.includes(friendId)) {
        // Deselecting - also close expanded view
        if (expandedFriend === friendId) {
          setExpandedFriend(null);
        }
        return prev.filter(id => id !== friendId);
      }
      // Selecting - initialize with all selections
      setFriendSelections(prev => ({
        ...prev,
        [friendId]: {
          locationIds: locations.map(l => l.id),
          tripbitIds: tripbits.map(t => t.id),
        }
      }));
      return [...prev, friendId];
    });
  };

  const toggleExpandedFriend = (friendId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFriend(prev => prev === friendId ? null : friendId);
  };

  const handleLocationToggle = (friendId: string, locationId: string) => {
    setFriendSelections(prev => {
      const current = prev[friendId] || { locationIds: [], tripbitIds: [] };
      const isSelected = current.locationIds.includes(locationId);
      
      if (isSelected) {
        // Deselecting location - also deselect all tripbits in that location
        const locationTripbits = tripbits.filter(t => t.location_id === locationId);
        return {
          ...prev,
          [friendId]: {
            locationIds: current.locationIds.filter(id => id !== locationId),
            tripbitIds: current.tripbitIds.filter(id => 
              !locationTripbits.some(t => t.id === id)
            ),
          }
        };
      }
      
      // Selecting location - also select all tripbits in that location
      const locationTripbits = tripbits.filter(t => t.location_id === locationId);
      return {
        ...prev,
        [friendId]: {
          locationIds: [...current.locationIds, locationId],
          tripbitIds: [...new Set([...current.tripbitIds, ...locationTripbits.map(t => t.id)])],
        }
      };
    });
  };

  const handleTripbitToggle = (friendId: string, tripbitId: string) => {
    setFriendSelections(prev => {
      const current = prev[friendId] || { locationIds: [], tripbitIds: [] };
      const isSelected = current.tripbitIds.includes(tripbitId);
      
      return {
        ...prev,
        [friendId]: {
          ...current,
          tripbitIds: isSelected
            ? current.tripbitIds.filter(id => id !== tripbitId)
            : [...current.tripbitIds, tripbitId],
        }
      };
    });
  };

  const handleSelectAll = (friendId: string) => {
    setFriendSelections(prev => ({
      ...prev,
      [friendId]: {
        locationIds: locations.map(l => l.id),
        tripbitIds: tripbits.map(t => t.id),
      }
    }));
  };

  const handleDeselectAll = (friendId: string) => {
    setFriendSelections(prev => ({
      ...prev,
      [friendId]: {
        locationIds: [],
        tripbitIds: [],
      }
    }));
  };

  // Link selection handlers
  const handleLinkLocationToggle = (locationId: string) => {
    setLinkLocationIds(prev => {
      const isSelected = prev.includes(locationId);
      if (isSelected) {
        // Also deselect tripbits in this location
        const locationTripbits = tripbits.filter(t => t.location_id === locationId);
        setLinkTripbitIds(ids => ids.filter(id => !locationTripbits.some(t => t.id === id)));
        return prev.filter(id => id !== locationId);
      }
      // Select location and its tripbits
      const locationTripbits = tripbits.filter(t => t.location_id === locationId);
      setLinkTripbitIds(ids => [...new Set([...ids, ...locationTripbits.map(t => t.id)])]);
      return [...prev, locationId];
    });
  };

  const handleLinkTripbitToggle = (tripbitId: string) => {
    setLinkTripbitIds(prev => 
      prev.includes(tripbitId)
        ? prev.filter(id => id !== tripbitId)
        : [...prev, tripbitId]
    );
  };

  const handleLinkSelectAll = () => {
    setLinkLocationIds(locations.map(l => l.id));
    setLinkTripbitIds(tripbits.map(t => t.id));
  };

  const handleLinkDeselectAll = () => {
    setLinkLocationIds([]);
    setLinkTripbitIds([]);
  };

  const handleInviteFriends = async () => {
    if (selectedFriends.length === 0) return;

    setInviting(true);
    let successCount = 0;

    for (const friendId of selectedFriends) {
      const { error } = await inviteToTrip(tripId, friendId);
      if (!error) {
        successCount++;
        
        // Add location participants
        const selection = friendSelections[friendId];
        if (selection && selection.locationIds.length > 0) {
          const locationParticipants = selection.locationIds.map(locId => ({
            location_id: locId,
            user_id: friendId,
          }));
          await supabase.from('location_participants').insert(locationParticipants);
        }

        // Add tripbit participants
        if (selection && selection.tripbitIds.length > 0) {
          const tripbitParticipants = selection.tripbitIds.map(tripbitId => ({
            resource_id: tripbitId,
            user_id: friendId,
          }));
          await supabase.from('resource_participants').insert(tripbitParticipants);
        }
      }
    }

    if (successCount > 0) {
      toast({ title: `Invited ${successCount} friend${successCount > 1 ? 's' : ''}!` });
      onInviteSent();
    }

    setSelectedFriends([]);
    setFriendSelections({});
    setExpandedFriend(null);
    setInviting(false);
  };

  const handleCreateLink = async () => {
    setCreatingLink(true);
    
    // Determine if we're sharing the full trip or specific items
    const isFullTrip = linkLocationIds.length === locations.length && 
                       linkTripbitIds.length === tripbits.length;
    
    const { error } = await createInviteLink({ 
      expires_at: expirationDate || null,
      locationIds: isFullTrip ? undefined : linkLocationIds,
      tripbitIds: isFullTrip ? undefined : linkTripbitIds,
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Invite link created!' });
    }
    setCreatingLink(false);
  };

  const handleCopyLink = async (token: string) => {
    const url = getInviteUrl(token);
    await navigator.clipboard.writeText(url);
    setCopiedToken(token);
    toast({ title: 'Link copied to clipboard!' });
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleDeleteInvite = async (inviteId: string) => {
    const { error } = await deleteInvite(inviteId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>Invite Travel Pals</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="friends" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="friends" className="gap-2">
              <Users className="w-4 h-4" />
              Friends
            </TabsTrigger>
            <TabsTrigger value="link" className="gap-2">
              <LinkIcon className="w-4 h-4" />
              Share Link
            </TabsTrigger>
          </TabsList>

          <TabsContent value="friends" className="mt-4 space-y-4">
            {loadingFriends ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : availableFriends.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>No friends available to invite</p>
                <p className="text-sm">All your friends are already part of this trip!</p>
              </div>
            ) : (
              <>
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {availableFriends.map((friend) => {
                    const profile = friend.profile;
                    if (!profile) return null;
                    const isSelected = selectedFriends.includes(profile.id);
                    const isExpanded = expandedFriend === profile.id;
                    const selection = friendSelections[profile.id];
                    
                    return (
                      <div key={friend.id} className="border border-border rounded-lg overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleFriend(profile.id)}
                          className={cn(
                            'w-full flex items-center gap-3 p-3 transition-all',
                            isSelected
                              ? 'bg-foreground/5'
                              : 'hover:bg-accent/50'
                          )}
                        >
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={profile.avatar_url || undefined} />
                            <AvatarFallback>
                              {getInitials(profile.full_name, profile.username)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 text-left min-w-0">
                            <div className="font-medium truncate">
                              {profile.full_name || profile.username}
                            </div>
                            <div className="text-sm text-muted-foreground truncate">
                              @{profile.username}
                            </div>
                          </div>
                          
                          {isSelected && locations.length > 0 && (
                            <button
                              type="button"
                              onClick={(e) => toggleExpandedFriend(profile.id, e)}
                              className="p-1 hover:bg-accent rounded text-muted-foreground"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          )}
                          
                          <div className={cn(
                            'w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors',
                            isSelected ? 'border-foreground bg-foreground' : 'border-muted-foreground/30'
                          )}>
                            {isSelected && <Check className="w-3 h-3 text-background" />}
                          </div>
                        </button>

                        {isSelected && isExpanded && locations.length > 0 && (
                          <div className="border-t border-border p-3 bg-muted/30">
                            <InviteSelectionAccordion
                              locations={locations}
                              tripbits={tripbits}
                              selectedLocationIds={selection?.locationIds || []}
                              selectedTripbitIds={selection?.tripbitIds || []}
                              onLocationToggle={(locId) => handleLocationToggle(profile.id, locId)}
                              onTripbitToggle={(tripbitId) => handleTripbitToggle(profile.id, tripbitId)}
                              onSelectAll={() => handleSelectAll(profile.id)}
                              onDeselectAll={() => handleDeselectAll(profile.id)}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <Button 
                  onClick={handleInviteFriends} 
                  disabled={selectedFriends.length === 0 || inviting}
                  className="w-full gap-2"
                >
                  {inviting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <UserPlus className="w-4 h-4" />
                  )}
                  Invite {selectedFriends.length > 0 ? `(${selectedFriends.length})` : ''}
                </Button>
              </>
            )}
          </TabsContent>

          <TabsContent value="link" className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Create a shareable link that anyone can use to join this trip.
            </p>

            {/* Granular selection for share link */}
            {locations.length > 0 && (
              <div className="border border-border rounded-lg p-3">
                <InviteSelectionAccordion
                  locations={locations}
                  tripbits={tripbits}
                  selectedLocationIds={linkLocationIds}
                  selectedTripbitIds={linkTripbitIds}
                  onLocationToggle={handleLinkLocationToggle}
                  onTripbitToggle={handleLinkTripbitToggle}
                  onSelectAll={handleLinkSelectAll}
                  onDeselectAll={handleLinkDeselectAll}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm">Must accept by (optional)</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !expirationDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {expirationDate ? format(expirationDate, "PPP") : "No expiration"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={expirationDate}
                    onSelect={setExpirationDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              {expirationDate && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setExpirationDate(undefined)}
                >
                  <X className="w-3 h-3 mr-1" />
                  Remove expiration
                </Button>
              )}
            </div>

            <Button 
              onClick={handleCreateLink} 
              disabled={creatingLink || (locations.length > 0 && linkLocationIds.length === 0)}
              variant="outline"
              className="w-full gap-2"
            >
              {creatingLink ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <LinkIcon className="w-4 h-4" />
              )}
              Create New Link
            </Button>

            {invites.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Active Links</Label>
                {invites.map((invite) => {
                  const isExpanded = expandedInvite === invite.id;
                  const includedLocations = invite.included_location_ids
                    ? locations.filter(l => invite.included_location_ids?.includes(l.id))
                    : locations;
                  const includedTripbits = invite.included_tripbit_ids
                    ? tripbits.filter(t => invite.included_tripbit_ids?.includes(t.id))
                    : tripbits;
                  const isFullTrip = !invite.included_location_ids && !invite.included_tripbit_ids;

                  return (
                    <div 
                      key={invite.id}
                      className="bg-card border border-border rounded-lg overflow-hidden"
                    >
                      <div className="p-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <Input 
                            value={getInviteUrl(invite.token)} 
                            readOnly 
                            className="text-sm h-8"
                          />
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 shrink-0"
                            onClick={() => handleCopyLink(invite.token)}
                          >
                            {copiedToken === invite.token ? (
                              <Check className="w-4 h-4 text-green-500" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteInvite(invite.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {invite.expires_at 
                                ? `Expires ${format(new Date(invite.expires_at), 'MMM d, yyyy')}`
                                : 'Never expires'}
                            </span>
                            <span>•</span>
                            <span>Used {invite.use_count} time{invite.use_count !== 1 ? 's' : ''}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setExpandedInvite(isExpanded ? null : invite.id)}
                            className="text-sm font-medium text-[hsl(266,50%,45%)] hover:underline flex items-center gap-1"
                          >
                            {isFullTrip ? 'Full trip' : `${includedLocations.length} location${includedLocations.length !== 1 ? 's' : ''}`}
                            {isExpanded ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-border p-3 bg-muted/30 space-y-2">
                          <span className="text-xs font-medium text-muted-foreground">Includes:</span>
                          <div className="space-y-1">
                            {includedLocations.map(loc => (
                              <div key={loc.id} className="flex items-center gap-2 text-sm">
                                <MapPin className="w-3 h-3 text-primary" />
                                <span>{loc.destination}</span>
                                <span className="text-xs text-muted-foreground">
                                  ({includedTripbits.filter(t => t.location_id === loc.id).length} tripbits)
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
