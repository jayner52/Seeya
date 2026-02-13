'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Card, Button } from '@/components/ui';
import { StepIndicator } from '@/components/onboarding';
import { PartyPopper, Plane, Sparkles, Users } from 'lucide-react';

export default function OnboardingCompletePage() {
  const router = useRouter();
  const { user, fetchProfile } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleComplete = async () => {
    if (!user) return;

    setIsLoading(true);
    const supabase = createClient();

    // Mark onboarding as completed
    await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', user.id);

    await fetchProfile();
    router.push('/trips');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-seeya-purple to-purple-700 p-6 flex items-center justify-center">
      <div className="w-full max-w-md">
        <StepIndicator totalSteps={5} currentStep={5} className="mb-8" />

        <Card variant="elevated" padding="lg" className="text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-seeya-purple/10 flex items-center justify-center">
              <PartyPopper size={32} className="text-seeya-purple" />
            </div>
          </div>
          <h1 className="text-2xl font-display font-semibold text-seeya-text mb-2">
            You&apos;re all set!
          </h1>
          <p className="text-seeya-text-secondary mb-8">
            Your travel profile is ready. Start exploring!
          </p>

          {/* Quick actions preview */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-seeya-purple/10 flex items-center justify-center mx-auto mb-2">
                <Plane size={24} className="text-seeya-purple" />
              </div>
              <p className="text-xs text-seeya-text-secondary">Plan a trip</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-seeya-purple/10 flex items-center justify-center mx-auto mb-2">
                <Users size={24} className="text-seeya-purple" />
              </div>
              <p className="text-xs text-seeya-text-secondary">Add friends</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-seeya-purple/10 flex items-center justify-center mx-auto mb-2">
                <Sparkles size={24} className="text-seeya-purple" />
              </div>
              <p className="text-xs text-seeya-text-secondary">Explore</p>
            </div>
          </div>

          <Button
            variant="purple"
            size="lg"
            className="w-full"
            isLoading={isLoading}
            onClick={handleComplete}
          >
            Start Exploring
          </Button>
        </Card>
      </div>
    </div>
  );
}
