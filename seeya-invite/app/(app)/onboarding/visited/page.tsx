'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Card, Button } from '@/components/ui';
import { StepIndicator, CountrySelector } from '@/components/onboarding';
import { Globe, ArrowLeft } from 'lucide-react';

export default function OnboardingVisitedPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [selectedCountries, setSelectedCountries] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  const handleToggleCountry = (countryId: string) => {
    setSelectedCountries((prev) => {
      const next = new Set(prev);
      if (next.has(countryId)) {
        next.delete(countryId);
      } else {
        next.add(countryId);
      }
      return next;
    });
  };

  const handleNext = async () => {
    if (!user) return;

    setIsSaving(true);
    const supabase = createClient();

    // Save visited countries (if you have a visited_countries table)
    // For now, we'll skip actual persistence and move forward
    // You can add: await supabase.from('visited_countries').insert(...)

    router.push('/onboarding/wanderlist');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-seeya-purple to-purple-700 p-6 flex items-center justify-center">
      <div className="w-full max-w-md">
        <StepIndicator totalSteps={5} currentStep={3} className="mb-8" />

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
              <Globe size={32} className="text-seeya-purple" />
            </div>
            <h1 className="text-xl font-semibold text-seeya-text mb-2">
              Where have you been?
            </h1>
            <p className="text-seeya-text-secondary">
              Select the countries you&apos;ve visited
            </p>
          </div>

          {selectedCountries.size > 0 && (
            <div className="bg-seeya-purple/10 rounded-xl px-4 py-3 mb-4 text-center">
              <p className="text-seeya-purple font-medium">
                {selectedCountries.size} {selectedCountries.size === 1 ? 'country' : 'countries'} selected
              </p>
            </div>
          )}

          <div className="max-h-64 overflow-auto mb-6">
            <CountrySelector
              selectedCountries={selectedCountries}
              onToggleCountry={handleToggleCountry}
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => router.push('/onboarding/wanderlist')}
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
