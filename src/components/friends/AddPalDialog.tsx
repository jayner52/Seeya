import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserPlus, Search, Mail, Sparkles, Loader2 } from 'lucide-react';
import { useSuggestedFriends } from '@/hooks/useSuggestedFriends';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface SearchResult {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface AddPalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSendRequest: (username: string) => Promise<{ error: Error | null }>;
  onSendRequestById: (userId: string) => Promise<{ error: Error | null }>;
  isAdding: boolean;
}

export function AddPalDialog({
  open,
  onOpenChange,
  onSendRequest,
  onSendRequestById,
  isAdding,
}: AddPalDialogProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  const [addingUserId, setAddingUserId] = useState<string | null>(null);
  
  const { suggestions, loading: suggestionsLoading, refresh: refreshSuggestions } = useSuggestedFriends();
  const { toast } = useToast();

  const getInitials = (fullName: string | null, username: string) => {
    if (fullName) {
      return fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return username.slice(0, 2).toUpperCase();
  };

  // Search users as they type
  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.length < 3) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const { data, error } = await supabase.rpc('search_users_for_friends', {
          _query: searchQuery
        });

        if (error) throw error;
        setSearchResults(data || []);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleAddFromSearch = async (userId: string, name: string) => {
    setAddingUserId(userId);
    const { error } = await onSendRequestById(userId);
    setAddingUserId(null);
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Request sent', description: `Friend request sent to ${name}` });
      setSearchQuery('');
      setSearchResults([]);
      onOpenChange(false);
    }
  };

  const handleAddSuggested = async (userId: string, name: string) => {
    setAddingUserId(userId);
    const { error } = await onSendRequestById(userId);
    setAddingUserId(null);
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Request sent', description: `Friend request sent to ${name}` });
      refreshSuggestions();
    }
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      toast({ title: 'Invalid email', description: 'Please enter a valid email address', variant: 'destructive' });
      return;
    }

    setIsSendingInvite(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-friend-invite', {
        body: { email: inviteEmail.trim(), personalMessage: inviteMessage.trim() || undefined },
      });

      if (error) throw error;

      toast({ title: 'Invite sent!', description: `We sent an invitation to ${inviteEmail}` });
      setInviteEmail('');
      setInviteMessage('');
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error sending invite:', error);
      toast({ 
        title: 'Failed to send invite', 
        description: error.message || 'Please try again later', 
        variant: 'destructive' 
      });
    } finally {
      setIsSendingInvite(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
          <UserPlus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Pal</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Add a Travel Pal</DialogTitle>
          <DialogDescription>
            Find friends or invite someone new to join.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="suggestions" className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="suggestions" className="gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Suggestions</span>
            </TabsTrigger>
            <TabsTrigger value="search" className="gap-1.5">
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Search</span>
            </TabsTrigger>
            <TabsTrigger value="invite" className="gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Invite</span>
            </TabsTrigger>
          </TabsList>

          {/* Suggestions Tab */}
          <TabsContent value="suggestions" className="mt-4 space-y-3">
            {suggestionsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : suggestions.length > 0 ? (
              <div className="max-h-[300px] overflow-y-auto space-y-2">
                {suggestions.map((suggestion) => (
                  <div
                    key={suggestion.user_id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="w-10 h-10 border border-border">
                      <AvatarImage src={suggestion.avatar_url || undefined} />
                      <AvatarFallback className="text-sm">
                        {getInitials(suggestion.full_name, suggestion.username)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {suggestion.full_name || suggestion.username}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {suggestion.suggestion_reason}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="shrink-0 gap-1"
                      onClick={() => handleAddSuggested(suggestion.user_id, suggestion.full_name || suggestion.username)}
                      disabled={addingUserId === suggestion.user_id}
                    >
                      {addingUserId === suggestion.user_id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <UserPlus className="w-3 h-3" />
                      )}
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No suggestions yet</p>
                <p className="text-xs mt-1">Travel with more people to get suggestions!</p>
              </div>
            )}
          </TabsContent>

          {/* Search Tab */}
          <TabsContent value="search" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search by name or username</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Type at least 3 characters..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Search Results */}
            {isSearching ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : searchResults.length > 0 ? (
              <div className="max-h-[240px] overflow-y-auto space-y-2">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="w-10 h-10 border border-border">
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback className="text-sm">
                        {getInitials(user.full_name, user.username)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {user.full_name || user.username}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        @{user.username}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="shrink-0 gap-1"
                      onClick={() => handleAddFromSearch(user.id, user.full_name || user.username)}
                      disabled={addingUserId === user.id}
                    >
                      {addingUserId === user.id ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <UserPlus className="w-3 h-3" />
                      )}
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            ) : searchQuery.length >= 3 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No users found for "{searchQuery}"</p>
                <p className="text-xs mt-1">Try a different name or username</p>
              </div>
            ) : searchQuery.length > 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Type at least 3 characters to search
              </p>
            ) : null}
          </TabsContent>

          {/* Invite Tab */}
          <TabsContent value="invite" className="mt-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Friend's email</Label>
              <Input
                id="email"
                type="email"
                placeholder="friend@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Personal message (optional)</Label>
              <Textarea
                id="message"
                placeholder="Hey! Join me on roamwyth so we can plan trips together..."
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                rows={3}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleSendInvite}
              disabled={isSendingInvite || !inviteEmail.trim()}
            >
              {isSendingInvite ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 mr-2" />
                  Send Invite
                </>
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              We'll send them an email invitation to join roamwyth
            </p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
