'use client';

import { LEGEND_COLORS } from '@/types/calendar';

export function CalendarLegend() {
  const legendItems = [
    { label: 'Your trips', color: LEGEND_COLORS.your_trips },
    { label: 'Accepted', color: LEGEND_COLORS.accepted },
    { label: 'Invited', color: LEGEND_COLORS.invited },
    { label: 'Viewing', color: LEGEND_COLORS.viewing },
    { label: 'Today', color: LEGEND_COLORS.today, isCircle: true },
  ];

  return (
    <div className="flex flex-wrap items-center gap-4 text-sm text-seeya-text-secondary">
      {legendItems.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          {item.isCircle ? (
            <div
              className="w-3 h-3 rounded-full border-2"
              style={{ borderColor: item.color }}
            />
          ) : (
            <div
              className="w-4 h-2.5 rounded-sm"
              style={{ backgroundColor: item.color }}
            />
          )}
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}
