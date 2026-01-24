import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan_type: 'free' | 'premium';
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  current_period_start: string | null;
  current_period_end: string | null;
}

const MAX_FREE_UPCOMING_TRIPS = 5;

export function useSubscription() {
  const { user } = useAuth();

  const { data: subscription, isLoading, refetch } = useQuery({
    queryKey: ['subscription', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching subscription:', error);
        return null;
      }

      // If no subscription exists, create one
      if (!data) {
        const { data: newSub, error: insertError } = await supabase
          .from('user_subscriptions')
          .insert({ user_id: user.id, plan_type: 'free', status: 'active' })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating subscription:', insertError);
          return null;
        }
        return newSub as Subscription;
      }

      return data as Subscription;
    },
    enabled: !!user?.id,
  });

  const isPremium = subscription?.plan_type === 'premium' && subscription?.status === 'active';

  const canCreateTrip = (upcomingTripsCount: number) => {
    if (isPremium) return true;
    return upcomingTripsCount < MAX_FREE_UPCOMING_TRIPS;
  };

  const getTripsRemaining = (upcomingTripsCount: number) => {
    if (isPremium) return Infinity;
    return Math.max(0, MAX_FREE_UPCOMING_TRIPS - upcomingTripsCount);
  };

  return {
    subscription,
    isLoading,
    isPremium,
    planType: subscription?.plan_type ?? 'free',
    status: subscription?.status ?? 'active',
    currentPeriodEnd: subscription?.current_period_end,
    
    // Feature access
    canCreateTrip,
    getTripsRemaining,
    canAccessCalendar: isPremium,
    canAccessAI: isPremium,
    canExportPDF: isPremium,
    canExportICS: isPremium,
    showAds: !isPremium,
    maxFreeTrips: MAX_FREE_UPCOMING_TRIPS,
    
    refetch,
  };
}
