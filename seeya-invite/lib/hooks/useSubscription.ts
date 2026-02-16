'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';

interface Subscription {
  id: string;
  user_id: string;
  plan_type: 'free' | 'premium';
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
}

const MAX_FREE_UPCOMING_TRIPS = 5;

export function useSubscription() {
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
      // Auto-create free subscription
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

  return {
    subscription,
    isLoading,
    isPremium,
    canCreateTrip: (upcomingTripsCount: number) =>
      isPremium || upcomingTripsCount < MAX_FREE_UPCOMING_TRIPS,
    getTripsRemaining: (upcomingTripsCount: number) =>
      isPremium ? Infinity : Math.max(0, MAX_FREE_UPCOMING_TRIPS - upcomingTripsCount),
    canAccessCalendar: isPremium,
    canAccessAI: isPremium,
    canExportPDF: isPremium,
    canExportICS: isPremium,
    showAds: !isPremium,
    refresh: fetchSubscription,
  };
}
