import { ReactNode } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { UpgradePrompt } from './UpgradePrompt';

type PremiumFeature = 'calendar' | 'ai_suggestions' | 'pdf_export' | 'ics_export' | 'unlimited_trips';

interface PremiumGateProps {
  feature: PremiumFeature;
  children: ReactNode;
  fallback?: ReactNode;
  showPrompt?: boolean;
}

const featureLabels: Record<PremiumFeature, string> = {
  calendar: 'Calendar View',
  ai_suggestions: 'AI Travel Suggestions',
  pdf_export: 'PDF Export',
  ics_export: 'Calendar Export',
  unlimited_trips: 'Unlimited Trips',
};

export function PremiumGate({ 
  feature, 
  children, 
  fallback,
  showPrompt = true 
}: PremiumGateProps) {
  const { isPremium, isLoading } = useSubscription();

  if (isLoading) {
    return null;
  }

  if (isPremium) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showPrompt) {
    return <UpgradePrompt feature={featureLabels[feature]} />;
  }

  return null;
}

// Hook for conditional rendering
export function usePremiumFeature(feature: PremiumFeature): boolean {
  const { isPremium, canAccessCalendar, canAccessAI, canExportPDF, canExportICS } = useSubscription();

  switch (feature) {
    case 'calendar':
      return canAccessCalendar;
    case 'ai_suggestions':
      return canAccessAI;
    case 'pdf_export':
      return canExportPDF;
    case 'ics_export':
      return canExportICS;
    case 'unlimited_trips':
      return isPremium;
    default:
      return isPremium;
  }
}
