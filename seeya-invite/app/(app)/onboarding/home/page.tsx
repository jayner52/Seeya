'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Card, Button } from '@/components/ui';
import { StepIndicator } from '@/components/onboarding';
import { MapPin, Search, X, ArrowLeft } from 'lucide-react';

interface CityResult {
  id: string;
  name: string;
  country: string;
}

export default function OnboardingHomePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [selectedCity, setSelectedCity] = useState<CityResult | null>(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CityResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      const supabase = createClient();

      const { data } = await supabase
        .from('cities')
        .select('id, name, country')
        .ilike('name', `${query}%`)
        .limit(10);

      if (data) {
        setResults(data);
      }
      setIsSearching(false);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  const handleNext = async () => {
    if (!user || !selectedCity) return;

    setIsSaving(true);
    const supabase = createClient();

    await supabase
      .from('profiles')
      .update({ home_city_id: selectedCity.id })
      .eq('id', user.id);

    router.push('/onboarding/visited');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-seeya-purple to-purple-700 p-6 flex items-center justify-center">
      <div className="w-full max-w-md">
        <StepIndicator totalSteps={5} currentStep={2} className="mb-8" />

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
              <MapPin size={32} className="text-seeya-purple" />
            </div>
            <h1 className="text-xl font-semibold text-seeya-text mb-2">
              Where&apos;s home?
            </h1>
            <p className="text-seeya-text-secondary">
              This helps us personalize your experience
            </p>
          </div>

          {/* Selected city display */}
          {selectedCity ? (
            <div className="flex items-center gap-3 p-4 bg-seeya-purple/10 rounded-xl mb-4">
              <MapPin size={20} className="text-seeya-purple" />
              <div className="flex-1">
                <p className="font-medium text-seeya-text">{selectedCity.name}</p>
                <p className="text-sm text-seeya-text-secondary">{selectedCity.country}</p>
              </div>
              <button
                onClick={() => setSelectedCity(null)}
                className="p-1 hover:bg-white/50 rounded-full"
              >
                <X size={16} className="text-seeya-text-secondary" />
              </button>
            </div>
          ) : (
            <>
              {/* Search input */}
              <div className="relative mb-4">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search for your city..."
                  className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-seeya-purple focus:ring-2 focus:ring-seeya-purple/20 outline-none"
                />
              </div>

              {/* Search results */}
              {(results.length > 0 || isSearching) && (
                <div className="border border-gray-200 rounded-xl max-h-48 overflow-auto mb-4">
                  {isSearching ? (
                    <div className="p-4 text-center text-seeya-text-secondary">
                      Searching...
                    </div>
                  ) : (
                    results.map((city) => (
                      <button
                        key={city.id}
                        onClick={() => {
                          setSelectedCity(city);
                          setQuery('');
                          setResults([]);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left border-b border-gray-100 last:border-0"
                      >
                        <MapPin size={16} className="text-seeya-purple" />
                        <div>
                          <p className="font-medium text-seeya-text">{city.name}</p>
                          <p className="text-sm text-seeya-text-secondary">{city.country}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </>
          )}

          <div className="flex gap-3 mt-6">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => router.push('/onboarding/visited')}
            >
              Skip
            </Button>
            <Button
              variant="purple"
              className="flex-1"
              disabled={!selectedCity}
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
