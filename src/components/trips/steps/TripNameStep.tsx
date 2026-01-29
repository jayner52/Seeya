import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, Pencil, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { TripType } from '@/hooks/useTripTypes';
import { WizardLocation } from './MultiLocationStep';

interface TripNameStepProps {
  name: string;
  description: string;
  onNameChange: (name: string) => void;
  onDescriptionChange: (description: string) => void;
  locations: WizardLocation[];
  selectedTripTypes: TripType[];
}

export function TripNameStep({
  name,
  description,
  onNameChange,
  onDescriptionChange,
  locations,
  selectedTripTypes,
}: TripNameStepProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const { toast } = useToast();

  const generateNames = async () => {
    if (locations.length === 0 || selectedTripTypes.length === 0) {
      toast({
        title: 'Missing info',
        description: 'Please select destinations and vibes first.',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-trip-name', {
        body: {
          locations: locations.map(loc => loc.destination),
          tripTypes: selectedTripTypes.map(t => t.name),
        },
      });

      if (error) throw error;

      if (data?.suggestions) {
        setSuggestions(data.suggestions);
      }
    } catch (err) {
      console.error('Error generating names:', err);
      toast({
        title: 'Error',
        description: 'Failed to generate name suggestions. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const selectSuggestion = (suggestion: string) => {
    onNameChange(suggestion);
    setSuggestions([]);
  };

  const destinationSummary = locations.length > 0
    ? locations.length === 1
      ? locations[0].destination
      : `${locations[0].destination} + ${locations.length - 1} more`
    : '';

  const vibesSummary = selectedTripTypes.map(t => t.name).join(', ');

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary mb-4">
          <Pencil className="w-8 h-8 text-primary-foreground" />
        </div>
        <h2 className="font-display text-2xl text-foreground mb-2">
          Name your adventure
        </h2>
        <p className="text-muted-foreground">
          Give your trip a memorable name
        </p>
      </div>

      {/* AI Suggestions */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium">Trip Name</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={generateNames}
            disabled={isGenerating || locations.length === 0 || selectedTripTypes.length === 0}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : suggestions.length > 0 ? (
              <>
                <RefreshCw className="w-4 h-4" />
                New ideas
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                AI Suggestions
              </>
            )}
          </Button>
        </div>

        {/* Suggestion chips */}
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                onClick={() => selectSuggestion(suggestion)}
                className="px-3 py-2 rounded-full bg-primary/10 text-foreground text-sm font-medium hover:bg-primary/20 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        )}

        <Input
          placeholder="e.g., Summer in Paris"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className="h-12 text-base"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-base font-medium">Description (optional)</Label>
        <Textarea
          placeholder="Add any notes or details about your trip..."
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          rows={3}
          className="resize-none"
        />
      </div>

      {/* Preview card */}
      {name && locations.length > 0 && (
        <div className="mt-6 p-6 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <h3 className="font-display text-xl text-foreground mb-1">
            {name}
          </h3>
          <p className="text-muted-foreground">
            {destinationSummary}
          </p>
          {selectedTripTypes.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {selectedTripTypes.map(tripType => (
                <span
                  key={tripType.id}
                  className="px-2 py-0.5 rounded-full bg-primary/10 text-foreground text-xs"
                >
                  {tripType.name}
                </span>
              ))}
            </div>
          )}
          {description && (
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
    </div>
  );
}
