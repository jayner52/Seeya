import { useNavigate } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { TripChat } from './TripChat';
import { MessageCircle, ExternalLink } from 'lucide-react';

interface ChatDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  tripName: string;
}

export function ChatDrawer({ open, onOpenChange, tripId, tripName }: ChatDrawerProps) {
  const navigate = useNavigate();

  const handleExpand = () => {
    onOpenChange(false);
    navigate(`/messages?tripId=${tripId}`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleExpand}
          title="Open in Messages"
          className="absolute right-12 top-3 z-10 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
        >
          <ExternalLink className="w-4 h-4" />
        </Button>
        <SheetHeader className="p-4 pr-20 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <div className="bg-primary rounded-full p-1.5">
              <MessageCircle className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="truncate">{tripName}</span>
          </SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-hidden">
          <TripChat tripId={tripId} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
