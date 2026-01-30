import { create } from 'zustand';
import { addMonths } from 'date-fns';
import type { CalendarViewMode, TripFilter, CalendarState } from '@/types/calendar';

export const useCalendarStore = create<CalendarState>((set, get) => ({
  // Initial state - default to 'split' like iOS
  viewMode: 'split',
  currentDate: new Date(),
  filter: 'all',
  enabledPals: new Set<string>(),

  // Actions
  setViewMode: (mode: CalendarViewMode) => {
    set({ viewMode: mode });
  },

  setCurrentDate: (date: Date) => {
    set({ currentDate: date });
  },

  setFilter: (filter: TripFilter) => {
    set({ filter: filter });
  },

  togglePal: (palId: string) => {
    const { enabledPals } = get();
    const newEnabledPals = new Set(enabledPals);

    if (newEnabledPals.has(palId)) {
      newEnabledPals.delete(palId);
    } else {
      newEnabledPals.add(palId);
    }

    set({ enabledPals: newEnabledPals });
  },

  enableAllPals: (palIds: string[]) => {
    set({ enabledPals: new Set(palIds) });
  },

  disableAllPals: () => {
    set({ enabledPals: new Set() });
  },

  navigateMonths: (delta: number) => {
    const { currentDate } = get();
    // Simple navigation by single month (used for scrolling to today)
    set({ currentDate: addMonths(currentDate, delta) });
  },

  goToToday: () => {
    set({ currentDate: new Date() });
  },
}));
