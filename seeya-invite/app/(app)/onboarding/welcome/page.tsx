'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import { Card, Button } from '@/components/ui';
import { StepIndicator } from '@/components/onboarding';
import { Plane, MapPin, Users, Sparkles, Hand } from 'lucide-react';

export default function OnboardingWelcomePage() {
  const router = useRouter();
  const { profile } = useAuthStore();

  const firstName = profile?.full_name?.split(' ')[0] || 'Traveler';

  return (
    <div className="min-h-screen bg-gradient-to-br from-seeya-purple to-purple-700 p-6 flex items-center justify-center">
      <div className="w-full max-w-md">
        <StepIndicator totalSteps={5} currentStep={1} className="mb-8" />

        <Card variant="elevated" padding="lg" className="text-center">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 rounded-full bg-seeya-purple/10 flex items-center justify-center">
              <Hand size={32} className="text-seeya-purple" />
            </div>
          </div>
          <h1 className="text-2xl font-display font-semibold text-seeya-text mb-2">
            Welcome, {firstName}!
          </h1>
          <p className="text-seeya-text-secondary mb-8">
            Let&apos;s set up your travel profile. This will only take a minute.
          </p>

          {/* Features preview */}
          <div className="space-y-4 mb-8 text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-seeya-purple/10 flex items-center justify-center">
                <Plane size={20} className="text-seeya-purple" />
              </div>
              <div>
                <p className="font-medium text-seeya-text">Plan trips together</p>
                <p className="text-sm text-seeya-text-secondary">Collaborate with friends</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-seeya-purple/10 flex items-center justify-center">
                <MapPin size={20} className="text-seeya-purple" />
              </div>
              <div>
                <p className="font-medium text-seeya-text">Track your adventures</p>
                <p className="text-sm text-seeya-text-secondary">See where you&apos;ve been</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-seeya-purple/10 flex items-center justify-center">
                <Users size={20} className="text-seeya-purple" />
              </div>
              <div>
                <p className="font-medium text-seeya-text">Connect with travelers</p>
                <p className="text-sm text-seeya-text-secondary">Share recommendations</p>
              </div>
            </div>
          </div>

          <Button
            variant="purple"
            size="lg"
            className="w-full"
            onClick={() => router.push('/onboarding/home')}
          >
            Get Started
          </Button>

          <button
            onClick={() => router.push('/trips')}
            className="mt-4 text-sm text-seeya-text-secondary hover:text-seeya-text"
          >
            Skip for now
          </button>
        </Card>
      </div>
    </div>
  );
}
