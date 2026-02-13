'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Card, Button } from '@/components/ui';
import { StepIndicator } from '@/components/onboarding';
import { Sparkles, Search, MapPin, Plus, X, ArrowLeft } from 'lucide-react';

interface PlacePrediction {
  placeId: string;
  mainText: string;
  secondaryText: string;
  description: string;
}

interface WanderlistItem {
  id: string;
  name: string;
  secondaryText: string;
  placeId?: string;
}

export default function OnboardingWanderlistPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [wanderlist, setWanderlist] = useState<WanderlistItem[]>([]);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlacePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);

      try {
        const response = await fetch(`/api/places/autocomplete?query=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (data.predictions) {
          // Filter out already added places
          const existingIds = new Set(wanderlist.map((w) => w.placeId));
          setResults(data.predictions.filter((p: PlacePrediction) => !existingIds.has(p.placeId)));
        }
      } catch (err) {
        console.error('Wanderlist search error:', err);
        setResults([]);
      }

      setIsSearching(false);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, wanderlist]);

  const addPlace = (place: PlacePrediction) => {
    setWanderlist((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        name: place.mainText,
        secondaryText: place.secondaryText,
        placeId: place.placeId,
      },
    ]);
    setQuery('');
    setResults([]);
  };

  const addCustomPlace = () => {
    if (!query.trim()) return;
    setWanderlist((prev) => [
      ...prev,
      {
        id: `temp-${Date.now()}`,
        name: query.trim(),
        secondaryText: '',
      },
    ]);
    setQuery('');
    setResults([]);
  };

  const removeItem = (id: string) => {
    setWanderlist((prev) => prev.filter((item) => item.id !== id));
  };

  const handleNext = async () => {
    if (!user) return;

    setIsSaving(true);
    const supabase = createClient();

    // Save wanderlist items
    if (wanderlist.length > 0) {
      const inserts = wanderlist.map((item) => ({
        user_id: user.id,
        place_name: item.placeId ? `${item.name}, ${item.secondaryText}` : item.name,
        place_id: item.placeId || null,
      }));

      await supabase.from('wanderlist_items').insert(inserts);
    }

    router.push('/onboarding/complete');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-seeya-purple to-purple-700 p-6 flex items-center justify-center">
      <div className="w-full max-w-md">
        <StepIndicator totalSteps={5} currentStep={4} className="mb-8" />

        <Card variant="elevated" padding="lg">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1 text-sm text-seeya-text-secondary hover:text-seeya-text mb-6"
          >
            <ArrowLeft size={16} />
            Back
          </button>

          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full bg-seeya-purple/10 flex items-center justify-center mx-auto mb-4">
              <Sparkles size={32} className="text-seeya-purple" />
            </div>
            <h1 className="text-xl font-semibold text-seeya-text mb-2">
              Build your wanderlist
            </h1>
            <p className="text-seeya-text-secondary">
              Add places you dream of visiting
            </p>
          </div>

          {/* Wanderlist items */}
          {wanderlist.length > 0 && (
            <div className="space-y-2 mb-4">
              {wanderlist.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl group"
                >
                  <MapPin size={16} className="text-seeya-purple flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-seeya-text text-sm truncate">
                      {item.name}
                    </p>
                    {item.secondaryText && (
                      <p className="text-xs text-seeya-text-secondary">{item.secondaryText}</p>
                    )}
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1 text-gray-400 hover:text-seeya-error hover:bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Search input */}
          <div className="relative mb-4">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for a destination..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-seeya-purple focus:ring-2 focus:ring-seeya-purple/20 outline-none"
            />
          </div>

          {/* Search results */}
          {(results.length > 0 || (query.length >= 2 && !isSearching)) && (
            <div className="border border-gray-200 rounded-xl max-h-48 overflow-auto mb-4">
              {isSearching ? (
                <div className="p-4 text-center text-seeya-text-secondary">
                  Searching...
                </div>
              ) : (
                <>
                  {results.map((place) => (
                    <button
                      key={place.placeId}
                      onClick={() => addPlace(place)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left border-b border-gray-100 last:border-0"
                    >
                      <MapPin size={16} className="text-seeya-purple" />
                      <div>
                        <p className="font-medium text-seeya-text">{place.mainText}</p>
                        <p className="text-sm text-seeya-text-secondary">{place.secondaryText}</p>
                      </div>
                    </button>
                  ))}
                  {query.length >= 2 && (
                    <button
                      onClick={addCustomPlace}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left text-seeya-purple border-t border-gray-100"
                    >
                      <Plus size={16} />
                      <span>Add &quot;{query}&quot;</span>
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => router.push('/onboarding/complete')}
            >
              Skip
            </Button>
            <Button
              variant="purple"
              className="flex-1"
              isLoading={isSaving}
              onClick={handleNext}
            >
              Continue
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
