import { useTripTypes, TripType } from '@/hooks/useTripTypes';
import { Loader2, PartyPopper, Heart, Users, Mountain, Umbrella, Building2, UtensilsCrossed, Snowflake, Sparkles, Beer, Laptop, Compass, Car, Music, Backpack, Crown, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TripTypeStepProps {
  tripTypeIds: string[];
  onTripTypeChange: (tripTypeIds: string[], tripTypes: TripType[]) => void;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  PartyPopper,
  Heart,
  Users,
  Mountain,
  Umbrella,
  Building2,
  UtensilsCrossed,
  Snowflake,
  Sparkles,
  Beer,
  Laptop,
  Compass,
  Car,
  Music,
  Backpack,
  Crown,
  User,
};

const colorMap: Record<string, string> = {
  pink: 'bg-pink-500/10 text-pink-500 border-pink-500/30 hover:bg-pink-500/20',
  rose: 'bg-rose-500/10 text-rose-500 border-rose-500/30 hover:bg-rose-500/20',
  blue: 'bg-blue-500/10 text-blue-500 border-blue-500/30 hover:bg-blue-500/20',
  green: 'bg-green-500/10 text-green-500 border-green-500/30 hover:bg-green-500/20',
  cyan: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/30 hover:bg-cyan-500/20',
  purple: 'bg-purple-500/10 text-purple-500 border-purple-500/30 hover:bg-purple-500/20',
  orange: 'bg-orange-500/10 text-orange-500 border-orange-500/30 hover:bg-orange-500/20',
  sky: 'bg-sky-500/10 text-sky-500 border-sky-500/30 hover:bg-sky-500/20',
  fuchsia: 'bg-fuchsia-500/10 text-fuchsia-500 border-fuchsia-500/30 hover:bg-fuchsia-500/20',
  amber: 'bg-amber-500/10 text-amber-500 border-amber-500/30 hover:bg-amber-500/20',
  slate: 'bg-slate-500/10 text-slate-500 border-slate-500/30 hover:bg-slate-500/20',
  gray: 'bg-gray-500/10 text-gray-500 border-gray-500/30 hover:bg-gray-500/20',
  indigo: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30 hover:bg-indigo-500/20',
  teal: 'bg-teal-500/10 text-teal-500 border-teal-500/30 hover:bg-teal-500/20',
  violet: 'bg-violet-500/10 text-violet-500 border-violet-500/30 hover:bg-violet-500/20',
  yellow: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30 hover:bg-yellow-500/20',
  lime: 'bg-lime-500/10 text-lime-500 border-lime-500/30 hover:bg-lime-500/20',
  gold: 'bg-amber-400/10 text-amber-400 border-amber-400/30 hover:bg-amber-400/20',
  emerald: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30 hover:bg-emerald-500/20',
  red: 'bg-red-500/10 text-red-500 border-red-500/30 hover:bg-red-500/20',
};

const selectedColorMap: Record<string, string> = {
  pink: 'bg-pink-500 text-white border-pink-500',
  rose: 'bg-rose-500 text-white border-rose-500',
  blue: 'bg-blue-500 text-white border-blue-500',
  green: 'bg-green-500 text-white border-green-500',
  cyan: 'bg-cyan-500 text-white border-cyan-500',
  purple: 'bg-purple-500 text-white border-purple-500',
  orange: 'bg-orange-500 text-white border-orange-500',
  sky: 'bg-sky-500 text-white border-sky-500',
  fuchsia: 'bg-fuchsia-500 text-white border-fuchsia-500',
  amber: 'bg-amber-500 text-white border-amber-500',
  slate: 'bg-slate-500 text-white border-slate-500',
  gray: 'bg-gray-500 text-white border-gray-500',
  indigo: 'bg-indigo-500 text-white border-indigo-500',
  teal: 'bg-teal-500 text-white border-teal-500',
  violet: 'bg-violet-500 text-white border-violet-500',
  yellow: 'bg-yellow-500 text-white border-yellow-500',
  lime: 'bg-lime-500 text-white border-lime-500',
  gold: 'bg-amber-400 text-white border-amber-400',
  emerald: 'bg-emerald-500 text-white border-emerald-500',
  red: 'bg-red-500 text-white border-red-500',
};

export function TripTypeStep({ tripTypeIds, onTripTypeChange }: TripTypeStepProps) {
  const { data: tripTypes = [], isLoading } = useTripTypes();

  const handleToggle = (tripType: TripType) => {
    const isSelected = tripTypeIds.includes(tripType.id);
    let newIds: string[];
    let newTypes: TripType[];

    if (isSelected) {
      newIds = tripTypeIds.filter(id => id !== tripType.id);
      newTypes = tripTypes.filter(t => newIds.includes(t.id));
    } else {
      newIds = [...tripTypeIds, tripType.id];
      newTypes = tripTypes.filter(t => newIds.includes(t.id));
    }

    onTripTypeChange(newIds, newTypes);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
        <h2 className="font-display text-2xl text-foreground mb-2">
          What's the vibe?
        </h2>
        <p className="text-muted-foreground">
          Select one or more vibes for your trip
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {tripTypes.map((tripType) => {
          const Icon = iconMap[tripType.icon] || Compass;
          const isSelected = tripTypeIds.includes(tripType.id);
          const baseColor = colorMap[tripType.color] || colorMap.gray;
          const selectedColor = selectedColorMap[tripType.color] || selectedColorMap.gray;

          return (
            <button
              key={tripType.id}
              type="button"
              onClick={() => handleToggle(tripType)}
              className={cn(
                'p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2 text-center',
                isSelected ? selectedColor : baseColor
              )}
            >
              <Icon className="w-6 h-6" />
              <span className="font-medium text-sm">{tripType.name}</span>
            </button>
          );
        })}
      </div>

      {tripTypeIds.length > 0 && (
        <p className="text-center text-sm text-muted-foreground">
          {tripTypeIds.length} vibe{tripTypeIds.length > 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  );
}
