import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface BasicInfoStepProps {
  name: string;
  destination: string;
  description: string;
  onNameChange: (value: string) => void;
  onDestinationChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
}

export function BasicInfoStep({
  name,
  destination,
  description,
  onNameChange,
  onDestinationChange,
  onDescriptionChange,
}: BasicInfoStepProps) {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="font-display text-2xl font-semibold text-foreground">
          Where are you headed?
        </h2>
        <p className="text-muted-foreground mt-2">
          Give your trip a name and destination
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="tripName">Trip Name</Label>
          <Input
            id="tripName"
            placeholder="Summer Adventure"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className="bg-card"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="destination">Destination</Label>
          <Input
            id="destination"
            placeholder="Paris, France"
            value={destination}
            onChange={(e) => onDestinationChange(e.target.value)}
            className="bg-card"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea
            id="description"
            placeholder="A relaxing getaway to explore the city of lights..."
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            className="bg-card resize-none"
            rows={3}
          />
        </div>
      </div>
    </div>
  );
}
