'use client';

import { useCalendarStore } from '@/stores/calendarStore';
import { Avatar } from '@/components/ui';
import type { TravelPal } from '@/types/calendar';
import { cn } from '@/lib/utils/cn';

interface TravelPalsSidebarProps {
  pals: TravelPal[];
}

export function TravelPalsSidebar({ pals }: TravelPalsSidebarProps) {
  const { enabledPals, togglePal, enableAllPals, disableAllPals } = useCalendarStore();

  const allEnabled = pals.length > 0 && pals.every((p) => enabledPals.has(p.id));
  const someEnabled = pals.some((p) => enabledPals.has(p.id));

  const handleToggleAll = () => {
    if (allEnabled || someEnabled) {
      disableAllPals();
    } else {
      enableAllPals(pals.map((p) => p.id));
    }
  };

  if (pals.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold text-seeya-text mb-2">Travel Pals</h3>
        <p className="text-sm text-seeya-text-secondary">
          Add travel pals to see their trips overlaid on your calendar.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="font-semibold text-seeya-text">Travel Pals</h3>
        <p className="text-xs text-seeya-text-secondary mt-0.5">
          Toggle travel pals to overlay their trips
        </p>
      </div>

      {/* Toggle all */}
      <button
        onClick={handleToggleAll}
        className="w-full px-4 py-2 text-left text-sm text-seeya-purple hover:bg-seeya-purple/5 transition-colors border-b border-gray-100"
      >
        {allEnabled || someEnabled ? 'Hide all' : 'Show all'}
      </button>

      {/* Pal list */}
      <div className="max-h-[300px] overflow-y-auto">
        {pals.map((pal) => {
          const isEnabled = enabledPals.has(pal.id);

          return (
            <button
              key={pal.id}
              onClick={() => togglePal(pal.id)}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
            >
              {/* Checkbox */}
              <div
                className={cn(
                  'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                  isEnabled
                    ? 'bg-seeya-purple border-seeya-purple'
                    : 'border-gray-300'
                )}
              >
                {isEnabled && (
                  <svg
                    width="12"
                    height="9"
                    viewBox="0 0 12 9"
                    fill="none"
                    className="text-white"
                  >
                    <path
                      d="M1 4L4.5 7.5L11 1"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </div>

              {/* Avatar with color indicator */}
              <div className="relative">
                <Avatar
                  name={pal.full_name}
                  avatarUrl={pal.avatar_url}
                  size="sm"
                />
                <div
                  className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white"
                  style={{ backgroundColor: pal.color }}
                />
              </div>

              {/* Name and trip count */}
              <div className="flex-1 min-w-0 text-left">
                <div className="text-sm font-medium text-seeya-text truncate">
                  {pal.full_name}
                </div>
                <div className="text-xs text-seeya-text-secondary">
                  {pal.trip_count} {pal.trip_count === 1 ? 'trip' : 'trips'}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
