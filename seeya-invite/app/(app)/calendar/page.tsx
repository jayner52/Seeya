'use client';

import { CalendarView } from '@/components/calendar';

export default function CalendarPage() {
  return (
    <div className="p-6">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-display font-semibold text-seeya-text">
          Calendar
        </h1>
        <p className="text-seeya-text-secondary mt-1">
          View your travel schedule and your travel pals&apos; trips
        </p>
      </div>

      {/* Calendar view */}
      <CalendarView />
    </div>
  );
}
