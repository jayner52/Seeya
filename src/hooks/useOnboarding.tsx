import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';

const ONBOARDING_KEY = 'roamwyth_onboarding_completed';

export function useOnboarding() {
  const { user, profile, profileLoading, refreshProfile } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    if (!user) {
      setShowOnboarding(false);
      return;
    }

    // Still loading profile, wait
    if (profileLoading) {
      return;
    }

    // No profile yet - this is a new user, show onboarding
    if (!profile) {
      setIsNewUser(true);
      setShowOnboarding(true);
      return;
    }

    // Profile exists - check if onboarding completed
    const isCompleted = profile.onboarding_completed === true;
    const localCompleted = localStorage.getItem(`${ONBOARDING_KEY}_${user.id}`);
    
    const shouldShow = !isCompleted && !localCompleted;
    
    setIsNewUser(shouldShow);
    setShowOnboarding(shouldShow);
  }, [user, profile, profileLoading]);

  const completeOnboarding = useCallback(async () => {
    if (user) {
      
      // Update database
      await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', user.id);
      
      // Also keep localStorage as backup
      localStorage.setItem(`${ONBOARDING_KEY}_${user.id}`, 'true');
      
      // Refresh profile to update context with new onboarding_completed value
      await refreshProfile();
      
      setShowOnboarding(false);
    }
  }, [user, refreshProfile]);

  const skipOnboarding = useCallback(() => {
    completeOnboarding();
  }, [completeOnboarding]);

  return {
    showOnboarding,
    isNewUser,
    completeOnboarding,
    skipOnboarding,
    setShowOnboarding,
  };
}
