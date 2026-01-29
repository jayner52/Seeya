import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AppTour } from '@/components/onboarding/AppTour';

interface AppTourContextType {
  showAppTour: boolean;
  setShowAppTour: (show: boolean) => void;
}

const AppTourContext = createContext<AppTourContextType | undefined>(undefined);

export function AppTourProvider({ children }: { children: ReactNode }) {
  const [showAppTour, setShowAppTour] = useState(false);

  return (
    <AppTourContext.Provider value={{ showAppTour, setShowAppTour }}>
      {children}
      {showAppTour && <AppTour onComplete={() => setShowAppTour(false)} />}
    </AppTourContext.Provider>
  );
}

export function useAppTour() {
  const context = useContext(AppTourContext);
  if (context === undefined) {
    throw new Error('useAppTour must be used within an AppTourProvider');
  }
  return context;
}
