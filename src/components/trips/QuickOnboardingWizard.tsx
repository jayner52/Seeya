import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { useQuickOnboarding, QuickRecommendation, WanderlistSelection } from '@/hooks/useQuickOnboarding';
import { useLocationSearch, usePopularCountries } from '@/hooks/useLocationSearch';
import { WelcomeStep } from '@/components/onboarding/WelcomeStep';
import { CountrySelectionStep, CountrySelection } from '@/components/onboarding/CountrySelectionStep';
import { HomebaseStep } from '@/components/onboarding/HomebaseStep';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  X, Loader2, Search, Star, Plus, 
  ArrowRight, Check, Sparkles, ChevronRight, 
  Utensils, MapPinned, Home, Lightbulb, Compass, ArrowLeft, Globe, Link
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickOnboardingWizardProps {
  open: boolean;
  onComplete: () => void;
  onSkip: () => void;
  onStartTour?: () => void;
}

type Step = 'welcome' | 'homebase' | 'countries' | 'wanderlist' | 'recommendations' | 'success';

const STEPS_CONFIG = [
  { key: 'welcome', label: 'Welcome' },
  { key: 'homebase', label: 'Home' },
  { key: 'countries', label: 'Visited' },
  { key: 'wanderlist', label: 'Wanderlist' },
  { key: 'recommendations', label: 'Tips' },
] as const;

const categoryConfig = {
  restaurant: { icon: Utensils, label: 'Restaurant', color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  activity: { icon: MapPinned, label: 'Activity', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  stay: { icon: Home, label: 'Stay', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  tip: { icon: Lightbulb, label: 'Tip', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
};

function StepProgress({ currentStep }: { currentStep: Step }) {
  const stepIndex = STEPS_CONFIG.findIndex(s => s.key === currentStep);
  const progress = stepIndex >= 0 ? ((stepIndex + 1) / STEPS_CONFIG.length) * 100 : 0;
  
  if (currentStep === 'success') return null;
  
  return (
    <div className="mb-4">
      <Progress value={progress} className="h-1.5" />
      <div className="flex justify-between mt-2">
        {STEPS_CONFIG.map((step, idx) => (
          <span 
            key={step.key}
            className={cn(
              "text-[10px] font-medium",
              idx <= stepIndex ? "text-foreground" : "text-muted-foreground/50"
            )}
          >
            {step.label}
          </span>
        ))}
      </div>
    </div>
  );
}

export function QuickOnboardingWizard({ open, onComplete, onSkip, onStartTour }: QuickOnboardingWizardProps) {
  const [step, setStep] = useState<Step>('welcome');
  const [activeCountry, setActiveCountry] = useState<string | null>(null);
  const [homebase, setHomebase] = useState<{ name: string; placeId: string } | null>(null);
  const { user } = useAuth();
  
  const {
    visitedCountries,
    wanderlist,
    recommendations,
    isSubmitting,
    toggleCountry,
    addWanderlistItem,
    removeWanderlistItem,
    addRecommendation,
    removeRecommendation,
    getRecommendationsForCountry,
    submitOnboarding,
    reset,
  } = useQuickOnboarding();

  const handleHomebaseNext = async (selectedHomebase: { name: string; placeId: string } | null) => {
    if (selectedHomebase && user) {
      setHomebase(selectedHomebase);
      // Save homebase to profile
      await supabase
        .from('profiles')
        .update({
          homebase_city: selectedHomebase.name,
          homebase_google_place_id: selectedHomebase.placeId,
        })
        .eq('id', user.id);
    }
    setStep('countries');
  };

  const handleNext = () => {
    if (step === 'welcome') {
      setStep('homebase');
    } else if (step === 'homebase') {
      setStep('countries');
    } else if (step === 'countries') {
      setStep('wanderlist');
    } else if (step === 'wanderlist') {
      if (visitedCountries.length > 0) {
        setActiveCountry(visitedCountries[0].countryId);
        setStep('recommendations');
      } else {
        handleSubmit();
      }
    } else if (step === 'recommendations') {
      handleSubmit();
    }
  };

  const handleFinishEarly = () => {
    handleSubmit();
  };

  const handleBack = () => {
    if (step === 'homebase') {
      setStep('welcome');
    } else if (step === 'countries') {
      setStep('homebase');
    } else if (step === 'wanderlist') {
      setStep('countries');
    } else if (step === 'recommendations') {
      setStep('wanderlist');
    }
  };

  const handleSubmit = async () => {
    const result = await submitOnboarding();
    if (result.success) {
      setStep('success');
    }
  };

  const handleFinish = () => {
    reset();
    setHomebase(null);
    setStep('welcome');
    onComplete();
    onStartTour?.();
  };

  const handleSkipAll = () => {
    reset();
    setHomebase(null);
    setStep('welcome');
    onSkip();
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col p-0" hideCloseButton>
        <div className="p-6 overflow-y-auto flex-1">
          <StepProgress currentStep={step} />
          
          {step === 'welcome' && (
            <WelcomeStep
              onGetStarted={handleNext}
              onSkip={handleSkipAll}
            />
          )}

          {step === 'homebase' && (
            <HomebaseStep
              onNext={handleHomebaseNext}
              onSkip={() => setStep('countries')}
            />
          )}

          {step === 'countries' && (
            <CountrySelectionStep
              selectedCountries={visitedCountries}
              onToggleCountry={toggleCountry}
              onNext={handleNext}
              onSkip={handleSkipAll}
            />
          )}

          {step === 'wanderlist' && (
            <WanderlistStep
              wanderlist={wanderlist}
              visitedCountries={visitedCountries}
              onAddCountry={(country) => addWanderlistItem({
                id: crypto.randomUUID(),
                name: country.name,
                countryId: country.id,
                countryEmoji: country.emoji,
              })}
              onRemoveItem={removeWanderlistItem}
              onBack={handleBack}
              onNext={handleNext}
              onFinishEarly={handleFinishEarly}
            />
          )}

          {step === 'recommendations' && (
            <RecommendationsStep
              visitedCountries={visitedCountries}
              activeCountry={activeCountry}
              setActiveCountry={setActiveCountry}
              recommendations={recommendations}
              getRecommendationsForCountry={getRecommendationsForCountry}
              onAddRecommendation={addRecommendation}
              onRemoveRecommendation={removeRecommendation}
              onBack={handleBack}
              onNext={handleNext}
              isSubmitting={isSubmitting}
            />
          )}

          {step === 'success' && (
            <SuccessStep
              tripCount={visitedCountries.length}
              wanderlistCount={wanderlist.length}
              recCount={recommendations.length}
              onFinish={handleFinish}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Wanderlist Step
interface WanderlistStepProps {
  wanderlist: WanderlistSelection[];
  visitedCountries: CountrySelection[];
  onAddCountry: (country: { id: string; name: string; emoji: string }) => void;
  onRemoveItem: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
  onFinishEarly: () => void;
}

function WanderlistStep({
  wanderlist,
  visitedCountries,
  onAddCountry,
  onRemoveItem,
  onBack,
  onNext,
  onFinishEarly,
}: WanderlistStepProps) {
  const { countries: popularCountries } = usePopularCountries();
  const { results: countryResults, isSearching, searchCountriesOnly, clearResults } = useLocationSearch();
  const [searchValue, setSearchValue] = useState('');
  
  const wanderlistCountryIds = new Set(wanderlist.filter(w => w.countryId).map(w => w.countryId));
  const visitedCountryIds = new Set(visitedCountries.map(c => c.countryId));
  
  const availableCountries = popularCountries.filter(c => 
    !wanderlistCountryIds.has(c.id) && !visitedCountryIds.has(c.id)
  );

  const handleSearch = (value: string) => {
    setSearchValue(value);
    if (value.length >= 2) {
      searchCountriesOnly(value);
    } else {
      clearResults();
    }
  };

  const handleAddCountry = (country: { id: string; name: string; emoji?: string; countryEmoji?: string }) => {
    onAddCountry({ 
      id: country.id, 
      name: country.name, 
      emoji: country.emoji || country.countryEmoji || '' 
    });
    setSearchValue('');
    clearResults();
  };

  return (
    <>
      <div className="text-center mb-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-2">
          <Compass className="w-6 h-6 text-violet-600 dark:text-violet-400" />
        </div>
        <h2 className="font-display text-xl font-semibold">Where do you dream of going?</h2>
        <p className="text-sm text-muted-foreground">Add destinations to your Wanderlist</p>
      </div>

      <div className="space-y-3">
        {availableCountries.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Popular</Label>
            <div className="flex flex-wrap gap-1.5">
              {availableCountries.slice(0, 6).map((country) => (
                <button
                  key={country.id}
                  onClick={() => handleAddCountry(country)}
                  className="flex items-center gap-1 px-2 py-1 rounded-full bg-violet-50 dark:bg-violet-900/20 hover:bg-violet-100 dark:hover:bg-violet-900/40 text-xs font-medium transition-colors border border-violet-200 dark:border-violet-800"
                >
                  <span>{country.emoji}</span>
                  {country.name}
                  <Plus className="w-3 h-3 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search countries..."
            value={searchValue}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10 h-9"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {countryResults.length > 0 && (
          <div className="border rounded-lg bg-card shadow-sm max-h-28 overflow-y-auto">
            {countryResults.filter(r => r.type === 'country').map((country) => (
              <button
                key={country.id}
                className="w-full px-3 py-1.5 text-left hover:bg-muted flex items-center gap-2 border-b last:border-b-0 transition-colors disabled:opacity-50 text-sm"
                onClick={() => handleAddCountry(country)}
                disabled={wanderlistCountryIds.has(country.id) || visitedCountryIds.has(country.id)}
              >
                <Globe className="w-3.5 h-3.5 text-violet-500 shrink-0" />
                {country.countryEmoji && <span>{country.countryEmoji}</span>}
                <span className="font-medium">{country.name}</span>
              </button>
            ))}
          </div>
        )}

        {wanderlist.length > 0 && (
          <div className="space-y-1.5">
            <Label className="text-[10px] text-muted-foreground uppercase tracking-wide">Your Wanderlist ({wanderlist.length})</Label>
            <div className="flex flex-wrap gap-1.5">
              {wanderlist.map((item) => (
                <Badge
                  key={item.id}
                  variant="secondary"
                  className="pl-2 pr-1 py-1 text-xs font-medium gap-1 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300"
                >
                  {item.countryEmoji && <span>{item.countryEmoji}</span>}
                  {item.name}
                  <button
                    onClick={() => onRemoveItem(item.id)}
                    className="ml-0.5 hover:bg-violet-200 dark:hover:bg-violet-800 rounded p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>
        {visitedCountries.length > 0 ? (
          <>
            <Button variant="ghost" size="sm" onClick={onFinishEarly} className="text-muted-foreground">
              Finish
            </Button>
            <Button className="flex-1" size="sm" onClick={onNext}>
              Continue
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </>
        ) : (
          <Button className="flex-1" size="sm" onClick={onNext}>
            Finish
            <Check className="w-4 h-4 ml-1" />
          </Button>
        )}
      </div>
    </>
  );
}

// Recommendations Step
interface RecommendationsStepProps {
  visitedCountries: CountrySelection[];
  activeCountry: string | null;
  setActiveCountry: (id: string | null) => void;
  recommendations: QuickRecommendation[];
  getRecommendationsForCountry: (id: string) => QuickRecommendation[];
  onAddRecommendation: (rec: Omit<QuickRecommendation, 'id'>) => void;
  onRemoveRecommendation: (id: string) => void;
  onBack: () => void;
  onNext: () => void;
  isSubmitting: boolean;
}

function RecommendationsStep({
  visitedCountries,
  activeCountry,
  setActiveCountry,
  recommendations,
  getRecommendationsForCountry,
  onAddRecommendation,
  onRemoveRecommendation,
  onBack,
  onNext,
  isSubmitting,
}: RecommendationsStepProps) {
  return (
    <>
      <div className="text-center mb-3">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
          <Star className="w-6 h-6 text-primary" />
        </div>
        <h2 className="font-display text-xl font-semibold">Share your recommendations</h2>
        <p className="text-sm text-muted-foreground">Help your friends discover great places</p>
      </div>

      <ScrollArea className="w-full whitespace-nowrap mb-3">
        <div className="flex gap-1.5 pb-2">
          {visitedCountries.map((country) => {
            const countryRecs = getRecommendationsForCountry(country.countryId);
            const isActive = activeCountry === country.countryId;
            return (
              <button
                key={country.id}
                onClick={() => setActiveCountry(country.countryId)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all shrink-0 text-sm",
                  isActive 
                    ? "border-primary bg-primary/5 ring-1 ring-primary" 
                    : "border-border hover:border-primary/50"
                )}
              >
                <span>{country.countryEmoji}</span>
                <span className="font-medium">{country.countryName}</span>
                {countryRecs.length > 0 && (
                  <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[10px]">
                    {countryRecs.length}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <ScrollArea className="h-[200px] -mx-2 px-2">
        {activeCountry && (
          <CountryRecommendations
            country={visitedCountries.find(c => c.countryId === activeCountry)!}
            recommendations={getRecommendationsForCountry(activeCountry)}
            onAdd={onAddRecommendation}
            onRemove={onRemoveRecommendation}
          />
        )}
      </ScrollArea>

      {recommendations.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-2.5 py-1.5 mt-2">
          <Check className="w-3.5 h-3.5 text-green-600" />
          {recommendations.length} {recommendations.length === 1 ? 'recommendation' : 'recommendations'} added
        </div>
      )}

      <p className="text-[10px] text-muted-foreground text-center mt-2">
        You can always add more recommendations later from your profile
      </p>

      <div className="flex gap-3 pt-3">
        <Button variant="outline" size="sm" onClick={onBack} disabled={isSubmitting}>
          Back
        </Button>
        <Button 
          className="flex-1" 
          size="sm"
          onClick={onNext}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-1" />
              Saving...
            </>
          ) : (
            <>
              {recommendations.length === 0 ? 'Skip & Finish' : 'Finish'}
              <Check className="w-4 h-4 ml-1" />
            </>
          )}
        </Button>
      </div>
    </>
  );
}

// Country Recommendations Component
interface CountryRecommendationsProps {
  country: CountrySelection;
  recommendations: QuickRecommendation[];
  onAdd: (rec: Omit<QuickRecommendation, 'id'>) => void;
  onRemove: (id: string) => void;
}

function CountryRecommendations({ country, recommendations, onAdd, onRemove }: CountryRecommendationsProps) {
  const [showForm, setShowForm] = useState(false);
  const [newRec, setNewRec] = useState({
    title: '',
    category: 'restaurant' as QuickRecommendation['category'],
    rating: 5,
    tips: '',
    url: '',
  });

  const handleAdd = () => {
    if (!newRec.title.trim()) return;
    onAdd({
      destinationId: country.countryId,
      title: newRec.title,
      category: newRec.category,
      rating: newRec.rating,
      tips: newRec.tips || undefined,
      url: newRec.url || undefined,
    });
    setNewRec({ title: '', category: 'restaurant', rating: 5, tips: '', url: '' });
    setShowForm(false);
  };

  return (
    <div className="space-y-2">
      {recommendations.map((rec) => {
        const config = categoryConfig[rec.category];
        const Icon = config.icon;
        return (
          <div
            key={rec.id}
            className="flex items-start gap-2 p-2 rounded-lg border bg-card"
          >
            <div className={cn("w-7 h-7 rounded-full flex items-center justify-center shrink-0", config.color)}>
              <Icon className="w-3.5 h-3.5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-sm leading-tight">{rec.title}</div>
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span>{config.label}</span>
                <span>•</span>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: rec.rating }).map((_, i) => (
                    <Star key={i} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                  ))}
                </div>
              </div>
              {rec.tips && <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{rec.tips}</p>}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={() => onRemove(rec.id)}
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        );
      })}

      {showForm ? (
        <div className="space-y-2 p-2.5 rounded-lg border-2 border-dashed border-primary/30 bg-primary/5">
          <Input
            placeholder="Name of place..."
            value={newRec.title}
            onChange={(e) => setNewRec(p => ({ ...p, title: e.target.value }))}
            className="h-8 text-sm"
            autoFocus
          />
          
          <div className="flex flex-wrap gap-1">
            {(Object.keys(categoryConfig) as Array<keyof typeof categoryConfig>).map((cat) => {
              const config = categoryConfig[cat];
              const Icon = config.icon;
              return (
                <button
                  key={cat}
                  onClick={() => setNewRec(p => ({ ...p, category: cat }))}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-all",
                    newRec.category === cat
                      ? config.color + " ring-1 ring-offset-1 ring-current"
                      : "bg-muted hover:bg-muted/80"
                  )}
                >
                  <Icon className="w-3 h-3" />
                  {config.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <Label className="text-[10px] text-muted-foreground">Rating:</Label>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setNewRec(p => ({ ...p, rating: star }))}
                  className="p-0.5"
                >
                  <Star
                    className={cn(
                      "w-4 h-4 transition-colors",
                      star <= newRec.rating
                        ? "fill-amber-400 text-amber-400"
                        : "text-muted-foreground/30"
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          <Input
            placeholder="Quick tip (optional)"
            value={newRec.tips}
            onChange={(e) => setNewRec(p => ({ ...p, tips: e.target.value }))}
            className="h-8 text-sm"
          />

          <div className="relative">
            <Link className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Link (optional)"
              value={newRec.url}
              onChange={(e) => setNewRec(p => ({ ...p, url: e.target.value }))}
              className="pl-8 h-8 text-sm"
            />
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button size="sm" className="h-7 text-xs" onClick={handleAdd} disabled={!newRec.title.trim()}>
              Add
            </Button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-1.5 p-2.5 rounded-lg border-2 border-dashed border-muted-foreground/20 text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          Add recommendation for {country.countryName}
        </button>
      )}
    </div>
  );
}

// Success Step
interface SuccessStepProps {
  tripCount: number;
  wanderlistCount: number;
  recCount: number;
  onFinish: () => void;
}

function SuccessStep({ tripCount, wanderlistCount, recCount, onFinish }: SuccessStepProps) {
  return (
    <>
      <div className="text-center mb-4">
        <div className="mx-auto w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-2">
          <Sparkles className="w-7 h-7 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="font-display text-xl font-semibold">You're all set!</h2>
        <p className="text-sm text-muted-foreground">Your travel profile is ready</p>
      </div>

      <div className="bg-muted/50 rounded-xl p-3 space-y-2.5 mb-4">
        {tripCount > 0 && (
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-slate-700/80 dark:bg-slate-600/80 flex items-center justify-center">
              <Globe className="w-4 h-4 text-primary" />
            </div>
            <div>
              <div className="font-semibold text-sm">{tripCount} {tripCount === 1 ? 'country' : 'countries'} visited</div>
              <div className="text-xs text-muted-foreground">Added to your profile</div>
            </div>
          </div>
        )}

        {wanderlistCount > 0 && (
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
              <Compass className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <div className="font-semibold text-sm">{wanderlistCount} {wanderlistCount === 1 ? 'destination' : 'destinations'}</div>
              <div className="text-xs text-muted-foreground">On your Wanderlist</div>
            </div>
          </div>
        )}
        
        {recCount > 0 && (
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Star className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <div className="font-semibold text-sm">{recCount} {recCount === 1 ? 'recommendation' : 'recommendations'}</div>
              <div className="text-xs text-muted-foreground">Shared with your network</div>
            </div>
          </div>
        )}
      </div>

      <p className="text-xs text-muted-foreground text-center mb-4">
        Let's take a quick tour of the app
      </p>

      <Button className="w-full gap-2" onClick={onFinish}>
        Show Me Around
        <ChevronRight className="w-4 h-4" />
      </Button>
    </>
  );
}
