import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { MapPin, Calendar } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { LocationWithDates } from '@/lib/utils';

interface LocationDisambiguationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locations: LocationWithDates[];
  onSelect: (locationId: string | null) => void;
  resourceTitle: string;
}

export function LocationDisambiguationDialog({
  open,
  onOpenChange,
  locations,
  onSelect,
  resourceTitle,
}: LocationDisambiguationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Which stop should this appear under?</DialogTitle>
          <DialogDescription>
            "{resourceTitle}" spans multiple stops. Choose where it should appear in your itinerary.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-4">
          {locations.map(loc => (
            <Button
              key={loc.id}
              variant="outline"
              className="w-full justify-start h-auto py-3"
              onClick={() => {
                onSelect(loc.id);
                onOpenChange(false);
              }}
            >
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="text-left">
                  <div className="font-medium">{loc.destination.split(',')[0]}</div>
                  {loc.start_date && loc.end_date && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(parseISO(loc.start_date), 'MMM d')} – {format(parseISO(loc.end_date), 'MMM d')}
                    </div>
                  )}
                </div>
              </div>
            </Button>
          ))}
          <Button
            variant="ghost"
            className="w-full justify-start h-auto py-3 text-muted-foreground"
            onClick={() => {
              onSelect(null);
              onOpenChange(false);
            }}
          >
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 shrink-0" />
              <span>Keep under "Entire Trip"</span>
            </div>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
