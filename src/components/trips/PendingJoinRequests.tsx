import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, X, UserPlus } from 'lucide-react';
import { TripParticipantProfile } from '@/hooks/useTripParticipants';

interface PendingJoinRequestsProps {
  pendingRequests: TripParticipantProfile[];
  onApprove: (participantId: string) => void;
  onDecline: (participantId: string) => void;
  loading?: boolean;
}

export function PendingJoinRequests({ 
  pendingRequests, 
  onApprove, 
  onDecline,
  loading 
}: PendingJoinRequestsProps) {
  if (pendingRequests.length === 0) return null;

  const getInitials = (fullName: string | null, username: string) => {
    if (fullName) {
      return fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return username.slice(0, 2).toUpperCase();
  };

  return (
    <Card className="border-amber-500/30 bg-amber-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-amber-500" />
          Join Requests ({pendingRequests.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {pendingRequests.map((request) => (
          <div 
            key={request.id} 
            className="flex items-center justify-between gap-3 p-2 rounded-lg bg-background/50"
          >
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={request.profile?.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {getInitials(request.profile?.full_name || null, request.profile?.username || '?')}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {request.profile?.full_name || request.profile?.username}
                </p>
                {request.profile?.full_name && (
                  <p className="text-xs text-muted-foreground truncate">
                    @{request.profile.username}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 hover:bg-green-500/10 hover:text-green-500"
                onClick={() => onApprove(request.id)}
                disabled={loading}
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                onClick={() => onDecline(request.id)}
                disabled={loading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
