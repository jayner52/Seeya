import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { UserPlus, Search, Check, X, UserMinus, Clock, User, Users, MapPin, Info, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
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
import { useFriends } from '@/hooks/useFriends';
import { useTripmates } from '@/hooks/useTripmates';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { AddPalDialog } from '@/components/friends/AddPalDialog';

export default function Friends() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showTripmateInfo, setShowTripmateInfo] = useState(false);
  const [friendToRemove, setFriendToRemove] = useState<{ id: string; name: string; userId: string } | null>(null);
  const [isAddingFriend, setIsAddingFriend] = useState(false);
  
  const { friends, pendingRequests, loading, sendFriendRequest, sendFriendRequestById, acceptRequest, declineRequest, removeFriend } = useFriends();
  const { tripmates, loading: tripmatesLoading } = useTripmates();
  const { toast } = useToast();

  // Filter out friends with null profiles (can happen due to RLS) and apply search
  const filteredFriends = friends.filter((friend) => {
    if (!friend.profile) return false;
    if (!searchQuery) return true;
    return (
      friend.profile.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      friend.profile.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const filteredTripmates = tripmates.filter((tripmate) =>
    tripmate.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tripmate.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter out requests with null profiles (can happen due to RLS)
  const validPendingRequests = pendingRequests.filter(r => r.profile);
  const incomingRequests = validPendingRequests.filter(r => !r.isRequester);
  const outgoingRequests = validPendingRequests.filter(r => r.isRequester);

  const handleSendRequest = async (username: string) => {
    setIsAddingFriend(true);
    const result = await sendFriendRequest(username);
    setIsAddingFriend(false);
    
    if (result.error) {
      toast({ title: 'Error', description: result.error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Request sent', description: `Friend request sent to @${username}` });
    }
    return result;
  };

  const handleSendRequestById = async (userId: string) => {
    return await sendFriendRequestById(userId);
  };

  const handleUpgradeToTravelPal = async (tripmateId: string, name: string) => {
    const { error } = await sendFriendRequestById(tripmateId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Request sent', description: `Travel pal request sent to ${name}` });
    }
  };

  const handleAccept = async (id: string, name: string) => {
    const { error } = await acceptRequest(id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Friend added', description: `You are now friends with ${name}` });
    }
  };

  const handleDecline = async (id: string) => {
    const { error } = await declineRequest(id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const isAlsoTripmate = (userId: string) => {
    return tripmates.some(t => t.id === userId);
  };

  const handleRemoveClick = (friendshipId: string, name: string, userId: string) => {
    setFriendToRemove({ id: friendshipId, name, userId });
  };

  const handleConfirmRemove = async () => {
    if (!friendToRemove) return;
    
    const { error } = await removeFriend(friendToRemove.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      const willBecomeTripmate = isAlsoTripmate(friendToRemove.userId);
      toast({ 
        title: 'Travel Pal removed', 
        description: willBecomeTripmate 
          ? `${friendToRemove.name} is now a tripmate only` 
          : `${friendToRemove.name} has been removed from your circle`
      });
    }
    setFriendToRemove(null);
  };

  const getInitials = (fullName: string | null, username: string) => {
    if (fullName) {
      return fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return username.slice(0, 2).toUpperCase();
  };

  if (loading) {
    return (
      <PageLayout title="Your Travel Circle" subtitle="Manage your trusted travel pals">
        <div className="flex items-center justify-center py-16">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Your Travel Circle"
      subtitle="Manage your trusted travel pals and tripmates"
    >
      {/* Actions Bar */}
      <div className="flex items-center gap-4 mb-8 animate-fade-in">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search travel circle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-card"
          />
        </div>

        <AddPalDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSendRequest={handleSendRequest}
          onSendRequestById={handleSendRequestById}
          isAdding={isAddingFriend}
        />
      </div>

      {/* Incoming Requests */}
      {incomingRequests.length > 0 && (
        <div className="mb-8 animate-fade-in">
          <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
            <div className="bg-primary rounded-full p-1">
              <Clock className="w-3 h-3 text-primary-foreground" />
            </div>
            Pending Requests ({incomingRequests.length})
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {incomingRequests.map((request) => (
              <Card key={request.id} className="bg-card border-primary/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12 border-2 border-secondary">
                      <AvatarImage src={request.profile.avatar_url || undefined} />
                      <AvatarFallback>{getInitials(request.profile.full_name, request.profile.username)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{request.profile.full_name || request.profile.username}</p>
                      <p className="text-sm text-muted-foreground">@{request.profile.username}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button 
                      size="sm" 
                      className="flex-1 gap-1"
                      onClick={() => handleAccept(request.id, request.profile.full_name || request.profile.username)}
                    >
                      <Check className="w-3 h-3" />
                      Accept
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1 gap-1"
                      onClick={() => handleDecline(request.id)}
                    >
                      <X className="w-3 h-3" />
                      Decline
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Outgoing Requests - Subtle inline display */}
      {outgoingRequests.length > 0 && (
        <div className="mb-6 animate-fade-in">
          <p className="text-sm text-muted-foreground flex flex-wrap items-center gap-1.5">
            <Clock className="w-3 h-3" />
            <span>Awaiting response from</span>
            {outgoingRequests.map((request, index) => (
              <span key={request.id} className="inline-flex items-center">
                <button
                  onClick={() => removeFriend(request.id)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted hover:bg-destructive/10 hover:text-destructive transition-colors group"
                  title="Cancel request"
                >
                  <span className="font-medium text-foreground/80 group-hover:text-destructive">
                    {request.profile.full_name || request.profile.username}
                  </span>
                  <X className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                </button>
                {index < outgoingRequests.length - 1 && <span className="ml-1">,</span>}
              </span>
            ))}
          </p>
        </div>
      )}

      {/* Travel Pals Section */}
      <div className="mb-10 animate-fade-in">
        <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
          <div className="bg-primary rounded-full p-1">
            <Users className="w-3 h-3 text-primary-foreground" />
          </div>
          Travel Pals
          <span className="text-sm font-normal text-muted-foreground ml-1">
            ({filteredFriends.length})
          </span>
        </h2>

        {/* Friends Carousel */}
        {filteredFriends.length > 0 ? (
          <div className="relative">
            <Carousel
              opts={{
                align: 'start',
                loop: false,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-2 pt-3 pb-1">
                {filteredFriends.map((friend) => (
                  <CarouselItem key={friend.id} className="pl-2 basis-auto">
                    <Card 
                      className="bg-card border-border/50 hover:shadow-card hover:border-primary/30 transition-all duration-200 cursor-pointer w-[180px] relative group overflow-visible"
                      onClick={() => navigate(`/user/${friend.profile.id}`)}
                    >
                      <button
                        className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-muted border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:border-destructive hover:text-destructive-foreground z-10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveClick(friend.id, friend.profile.full_name || friend.profile.username, friend.profile.id);
                        }}
                        title="Remove travel pal"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <CardContent className="p-3">
                        <div className="flex flex-col items-center text-center gap-2">
                          <Avatar className="w-12 h-12 border-2 border-primary">
                            <AvatarImage src={friend.profile.avatar_url || undefined} />
                            <AvatarFallback className="text-sm font-display">
                              {getInitials(friend.profile.full_name, friend.profile.username)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 w-full">
                            <h3 className="font-display font-medium text-sm text-foreground truncate">
                              {friend.profile.full_name || friend.profile.username}
                            </h3>
                            <p className="text-xs text-muted-foreground truncate">@{friend.profile.username}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {filteredFriends.length > 4 && (
                <>
                  <CarouselPrevious className="left-0 -translate-x-1/2" />
                  <CarouselNext className="right-0 translate-x-1/2" />
                </>
              )}
            </Carousel>
          </div>
        ) : (
          <div className="text-center py-6 bg-card/50 rounded-lg border border-border/50">
            <div className="w-10 h-10 rounded-full bg-secondary mx-auto mb-2 flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-muted-foreground" />
            </div>
            <h3 className="font-display text-base font-semibold text-foreground mb-1">
              {searchQuery ? 'No travel pals found' : 'No travel pals yet'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {searchQuery
                ? 'Try a different search term'
                : 'Add trusted travel pals to share trips and calendars'}
            </p>
          </div>
        )}
      </div>

      {/* Tripmates Section */}
      <div className="animate-fade-in">
        <h2 className="font-display text-lg font-semibold mb-4 flex items-center gap-2">
          <div className="bg-secondary rounded-full p-1">
            <MapPin className="w-3 h-3 text-secondary-foreground" />
          </div>
          Tripmates
          <span className="text-sm font-normal text-muted-foreground ml-1">
            ({filteredTripmates.length})
          </span>
        </h2>

        {/* Info Banner */}
        <div className="mb-5 bg-muted/50 rounded-lg border border-border/50 overflow-hidden">
          <button
            className="w-full p-3 flex items-center gap-2 text-left hover:bg-muted/70 transition-colors"
            onClick={() => setShowTripmateInfo(!showTripmateInfo)}
          >
            <Info className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-sm text-muted-foreground flex-1">
              What's the difference between Travel Pals and Tripmates?
            </span>
            {showTripmateInfo ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          {showTripmateInfo && (
            <div className="px-3 pb-3 pt-1 space-y-2 text-sm text-muted-foreground border-t border-border/50">
              <p>
                <strong className="text-foreground">Travel Pals</strong> are people you've explicitly added as friends. They can see your upcoming trips, calendar availability, and all your shared recommendations.
              </p>
              <p>
                <strong className="text-foreground">Tripmates</strong> are people you've traveled with but haven't added as Travel Pals. They can only see your shared recommendations — not your trips or calendar. This helps build your recommendation network from people you've traveled with.
              </p>
              <p className="text-xs">
                Upgrade a Tripmate to Travel Pal for full access.
              </p>
            </div>
          )}
        </div>

        {/* Tripmates Grid */}
        {tripmatesLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-muted-foreground">Loading tripmates...</div>
          </div>
        ) : filteredTripmates.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredTripmates.map((tripmate, index) => (
              <Card 
                key={tripmate.id} 
                className="bg-card border-dashed border-border/70 hover:shadow-card transition-all duration-300 animate-fade-in cursor-pointer"
                style={{ animationDelay: `${index * 50}ms` }}
                onClick={() => navigate(`/user/${tripmate.id}`)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <Avatar className="w-14 h-14 border-2 border-secondary">
                      <AvatarImage src={tripmate.avatar_url || undefined} />
                      <AvatarFallback className="text-lg font-display">
                        {getInitials(tripmate.full_name, tripmate.username)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-semibold text-foreground truncate">
                        {tripmate.full_name || tripmate.username}
                      </h3>
                      <p className="text-sm text-muted-foreground">@{tripmate.username}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Tripmate since {format(new Date(tripmate.first_shared_trip_date), 'MMM yyyy')}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="gap-1.5 font-medium"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUpgradeToTravelPal(tripmate.id, tripmate.full_name || tripmate.username);
                      }}
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Upgrade to Travel Pal
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-card/50 rounded-lg border border-dashed border-border/50">
            <div className="w-12 h-12 rounded-full bg-secondary mx-auto mb-3 flex items-center justify-center">
              <MapPin className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-display text-lg font-semibold text-foreground mb-1">
              {searchQuery ? 'No tripmates found' : 'No tripmates yet'}
            </h3>
            <p className="text-sm text-muted-foreground">
              {searchQuery
                ? 'Try a different search term'
                : 'People you travel with will appear here'}
            </p>
          </div>
        )}
      </div>

      {/* Remove Travel Pal Confirmation Dialog */}
      <AlertDialog open={!!friendToRemove} onOpenChange={(open) => !open && setFriendToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Remove Travel Pal?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Are you sure you want to remove <span className="font-medium text-foreground">{friendToRemove?.name}</span> as a Travel Pal?
              </p>
              {friendToRemove && isAlsoTripmate(friendToRemove.userId) && (
                <div className="bg-muted/50 border border-border rounded-lg p-3 text-sm">
                  <p className="font-medium text-foreground mb-1">They'll become a tripmate</p>
                  <p className="text-muted-foreground">
                    Since you've traveled together, they'll still appear in your tripmates list but won't have Travel Pal privileges.
                  </p>
                </div>
              )}
              <p className="text-sm text-muted-foreground">
                You can always add them back later.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Travel Pal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageLayout>
  );
}
