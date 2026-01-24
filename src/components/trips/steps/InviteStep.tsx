import { useState } from 'react';
import { useFriends } from '@/hooks/useFriends';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { Users, UserPlus, Loader2, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InviteStepProps {
  selectedIds: string[];
  onToggle: (userId: string) => void;
}

export function InviteStep({ selectedIds, onToggle }: InviteStepProps) {
  const { friends, loading, sendFriendRequest } = useFriends();
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [isSending, setIsSending] = useState(false);

  const getInitials = (fullName: string | null, username: string) => {
    if (fullName) {
      return fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return username.slice(0, 2).toUpperCase();
  };

  const handleSendRequest = async () => {
    if (!newUsername.trim()) return;
    
    setIsSending(true);
    try {
      await sendFriendRequest(newUsername.trim());
      toast({
        title: "Request sent!",
        description: `Friend request sent to @${newUsername}`,
      });
      setNewUsername('');
      setShowAddForm(false);
    } catch (error: any) {
      toast({
        title: "Could not send request",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="font-display text-2xl font-semibold text-foreground">
          Invite travel pals
        </h2>
        <p className="text-muted-foreground mt-2">
          Select friends to invite (optional)
        </p>
      </div>

      {/* Add Travel Pal Section */}
      <div className="border border-dashed border-border rounded-lg p-4">
        {!showAddForm ? (
          <Button
            type="button"
            variant="ghost"
            className="w-full justify-center gap-2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowAddForm(true)}
          >
            <UserPlus className="w-4 h-4" />
            Add a new travel pal
          </Button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">Add travel pal by username</p>
            <div className="flex gap-2">
              <Input
                placeholder="Enter username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendRequest()}
                className="flex-1"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleSendRequest}
                disabled={isSending || !newUsername.trim()}
              >
                {isSending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setShowAddForm(false);
                  setNewUsername('');
                }}
              >
                Cancel
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              They'll need to accept before appearing in your travel circle
            </p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      ) : friends.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
            <Users className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground">
            No friends in your travel circle yet
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Add some travel pals above to invite them
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
          {friends.map((friend) => {
            const isSelected = selectedIds.includes(friend.profile.id);

            return (
              <button
                key={friend.profile.id}
                type="button"
                onClick={() => onToggle(friend.profile.id)}
                className={cn(
                  "flex items-center gap-3 w-full p-3 rounded-lg border transition-all duration-200",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/50 bg-card"
                )}
              >
                <Checkbox checked={isSelected} className="pointer-events-none" />
                <Avatar className="w-10 h-10 border-2 border-secondary">
                  <AvatarImage src={friend.profile.avatar_url || undefined} />
                  <AvatarFallback>
                    {getInitials(friend.profile.full_name, friend.profile.username)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left min-w-0">
                  <p className="font-medium truncate">
                    {friend.profile.full_name || friend.profile.username}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    @{friend.profile.username}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedIds.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          {selectedIds.length} {selectedIds.length === 1 ? 'friend' : 'friends'} selected
        </p>
      )}
    </div>
  );
}
