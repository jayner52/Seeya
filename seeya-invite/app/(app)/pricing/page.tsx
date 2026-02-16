'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { Card, Button, Spinner } from '@/components/ui';
import { cn } from '@/lib/utils/cn';
import {
  Crown,
  Check,
  Plane,
  Calendar,
  Sparkles,
  FileText,
  CalendarClock,
  Ban,
  Star,
} from 'lucide-react';

interface Subscription {
  id: string;
  user_id: string;
  plan_type: 'free' | 'premium';
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
}

const FREE_FEATURES = [
  { icon: Plane, label: 'Up to 5 upcoming trips' },
  { icon: Sparkles, label: 'Basic AI recommendations' },
  { icon: Check, label: 'Trip planning & packing' },
  { icon: Check, label: 'Travel circle & friends' },
];

const PREMIUM_FEATURES = [
  { icon: Plane, label: 'Unlimited trips' },
  { icon: Sparkles, label: 'Full AI recommendations' },
  { icon: Calendar, label: 'Calendar view' },
  { icon: FileText, label: 'PDF export' },
  { icon: CalendarClock, label: 'ICS calendar export' },
  { icon: Ban, label: 'No ads' },
  { icon: Check, label: 'All free features included' },
];

export default function PricingPage() {
  const { user } = useAuthStore();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();
    const { data } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setSubscription(data);
    } else {
      // Auto-create free subscription if none exists
      const { data: newSub } = await supabase
        .from('user_subscriptions')
        .insert({ user_id: user.id, plan_type: 'free', status: 'active' })
        .select()
        .single();
      setSubscription(newSub);
    }
    setIsLoading(false);
  }, [user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const isPremium = subscription?.plan_type === 'premium' && subscription?.status === 'active';

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-display font-semibold text-seeya-text flex items-center justify-center gap-3">
            <Crown className="text-seeya-primary" size={32} />
            Choose Your Plan
          </h1>
          <p className="text-seeya-text-secondary mt-2">
            Unlock premium features for the ultimate trip planning experience
          </p>
        </div>

        {/* Plan Cards */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Free Plan */}
          <Card
            variant="outline"
            padding="lg"
            className={cn(
              'relative',
              !isPremium && 'ring-2 ring-seeya-purple'
            )}
          >
            {!isPremium && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-seeya-purple text-white text-xs font-medium rounded-full">
                Current Plan
              </span>
            )}
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-seeya-text">Free</h2>
              <p className="text-3xl font-bold text-seeya-text mt-2">$0</p>
              <p className="text-sm text-seeya-text-secondary">forever</p>
            </div>
            <ul className="space-y-3">
              {FREE_FEATURES.map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-seeya-text">
                  <feature.icon size={18} className="text-seeya-text-secondary shrink-0" />
                  {feature.label}
                </li>
              ))}
            </ul>
          </Card>

          {/* Premium Plan */}
          <Card
            variant="elevated"
            padding="lg"
            className={cn(
              'relative bg-gradient-to-br from-seeya-purple/5 to-purple-100/30',
              isPremium && 'ring-2 ring-seeya-primary'
            )}
          >
            {isPremium && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-seeya-primary text-seeya-text text-xs font-bold rounded-full flex items-center gap-1">
                <Star size={12} className="fill-current" />
                Current Plan
              </span>
            )}
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold text-seeya-purple">Premium</h2>
              <p className="text-3xl font-bold text-seeya-text mt-2">$4.99</p>
              <p className="text-sm text-seeya-text-secondary">/ month</p>
            </div>
            <ul className="space-y-3 mb-6">
              {PREMIUM_FEATURES.map((feature, i) => (
                <li key={i} className="flex items-center gap-3 text-sm text-seeya-text">
                  <feature.icon size={18} className="text-seeya-purple shrink-0" />
                  {feature.label}
                </li>
              ))}
            </ul>
            {!isPremium && (
              <Button
                variant="purple"
                className="w-full"
                onClick={() => {
                  // TODO: Integrate Stripe Checkout
                  alert('Stripe integration coming soon!');
                }}
              >
                Upgrade to Premium
              </Button>
            )}
            {isPremium && subscription?.current_period_end && (
              <p className="text-center text-sm text-seeya-text-secondary">
                Renews on {new Date(subscription.current_period_end).toLocaleDateString()}
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
