'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useCalendarStore } from '@/stores/calendarStore';
import { Spinner } from '@/components/ui';
import {
  fetchUserTrips,
  fetchTravelPals,
  fetchPalTrips,
  fetchUpcomingTrips,
} from '@/lib/api/calendar';
import type { CalendarTrip, TravelPal, UpcomingTrip } from '@/types/calendar';

import { CalendarHeader } from './CalendarHeader';
import { CalendarFilters } from './CalendarFilters';
import { CalendarLegend } from './CalendarLegend';
import { CalendarGrid, CalendarGridRef } from './CalendarGrid';
import { TravelPalsSidebar } from './TravelPalsSidebar';
import { UpcomingTripsList } from './UpcomingTripsList';
import { TripPopover } from './TripPopover';

export function CalendarView() {
  const { user } = useAuthStore();
  const { filter, enabledPals } = useCalendarStore();
  const calendarGridRef = useRef<CalendarGridRef>(null);

  // Data states
  const [userTrips, setUserTrips] = useState<CalendarTrip[]>([]);
  const [travelPals, setTravelPals] = useState<TravelPal[]>([]);
  const [palTrips, setPalTrips] = useState<CalendarTrip[]>([]);
  const [upcomingTrips, setUpcomingTrips] = useState<UpcomingTrip[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Popover state
  const [selectedTrip, setSelectedTrip] = useState<CalendarTrip | null>(null);

  // Fetch initial data
  useEffect(() => {
    if (!user) return;

    async function loadData() {
      setIsLoading(true);
      try {
        const [trips, pals, upcoming] = await Promise.all([
          fetchUserTrips(user!.id),
          fetchTravelPals(user!.id),
          fetchUpcomingTrips(user!.id),
        ]);

        console.log('[CalendarView] Fetched trips:', trips);
        console.log('[CalendarView] Fetched pals:', pals);
        console.log('[CalendarView] Fetched upcoming:', upcoming);

        setUserTrips(trips);
        setTravelPals(pals);
        setUpcomingTrips(upcoming);
      } catch (error) {
        console.error('Failed to load calendar data:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [user]);

  // Fetch pal trips when enabled pals change
  useEffect(() => {
    if (!user) return;

    async function loadPalTrips() {
      const enabledPalIds = Array.from(enabledPals);
      if (enabledPalIds.length === 0) {
        setPalTrips([]);
        return;
      }

      try {
        const trips = await fetchPalTrips(user!.id, enabledPalIds);
        setPalTrips(trips);
      } catch (error) {
        console.error('Failed to load pal trips:', error);
      }
    }

    loadPalTrips();
  }, [user, enabledPals]);

  // Filter and combine trips for display
  const displayTrips = useMemo(() => {
    let trips = [...userTrips];

    // Apply filter
    if (filter === 'my_trips') {
      trips = trips.filter((t) => t.role === 'owner');
    } else if (filter === 'shared') {
      trips = trips.filter((t) => t.role !== 'owner');
    }

    // Add pal trips
    trips = [...trips, ...palTrips];

    return trips;
  }, [userTrips, palTrips, filter]);

  // Handle scroll to today
  const handleScrollToToday = () => {
    calendarGridRef.current?.scrollToToday();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Main calendar area */}
      <div className="flex-1 min-w-0">
        <CalendarHeader onScrollToToday={handleScrollToToday} />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <CalendarFilters trips={userTrips} />
          <CalendarLegend />
        </div>
        <CalendarGrid
          ref={calendarGridRef}
          trips={displayTrips}
          onTripClick={setSelectedTrip}
        />
      </div>

      {/* Right sidebar */}
      <div className="w-full lg:w-80 flex-shrink-0 space-y-4">
        <TravelPalsSidebar pals={travelPals} />
        <UpcomingTripsList trips={upcomingTrips} />
      </div>

      {/* Trip popover */}
      {selectedTrip && (
        <TripPopover
          trip={selectedTrip}
          onClose={() => setSelectedTrip(null)}
        />
      )}
    </div>
  );
}
