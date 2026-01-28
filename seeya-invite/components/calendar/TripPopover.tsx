'use client';

import { X, MapPin, Calendar, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { Button, Avatar } from '@/components/ui';
import { formatDateRange } from '@/lib/utils/date';
import type { CalendarTrip } from '@/types/calendar';
import { VisibilityMenu } from './VisibilityMenu';

interface TripPopoverProps {
  trip: CalendarTrip;
  onClose: () => void;
}

export function TripPopover({ trip, onClose }: TripPopoverProps) {
  const isOwnTrip = trip.role === 'owner';
  const showVisibilityMenu = isOwnTrip || trip.role === 'accepted';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />

      {/* Popover content */}
      <div className="relative bg-white rounded-xl shadow-xl max-w-sm w-full p-4 animate-in fade-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X size={20} className="text-gray-500" />
        </button>

        {/* Trip color indicator */}
        <div
          className="h-2 rounded-full mb-4"
          style={{ backgroundColor: trip.color }}
        />

        {/* Trip name */}
        <h3 className="text-lg font-semibold text-seeya-text mb-2 pr-8">
          {trip.visibility === 'busy_only' ? 'Busy' : trip.name}
        </h3>

        {/* Destination */}
        {trip.destination && trip.visibility !== 'dates_only' && (
          <div className="flex items-center gap-2 text-seeya-text-secondary mb-2">
            <MapPin size={16} />
            <span>{trip.destination}</span>
          </div>
        )}

        {/* Dates */}
        {trip.visibility !== 'location_only' && (
          <div className="flex items-center gap-2 text-seeya-text-secondary mb-4">
            <Calendar size={16} />
            <span>{formatDateRange(trip.start_date, trip.end_date)}</span>
          </div>
        )}

        {/* Owner info (for shared trips) */}
        {trip.role !== 'owner' && (
          <div className="flex items-center gap-2 mb-4 py-2 border-t border-gray-100">
            <Avatar
              name={trip.owner.full_name}
              avatarUrl={trip.owner.avatar_url}
              size="sm"
            />
            <span className="text-sm text-seeya-text-secondary">
              {trip.owner.full_name}&apos;s trip
            </span>
          </div>
        )}

        {/* Visibility menu (for own trips) */}
        {showVisibilityMenu && (
          <div className="mb-4 pb-4 border-b border-gray-100">
            <VisibilityMenu tripId={trip.id} currentVisibility={trip.visibility} />
          </div>
        )}

        {/* View trip button */}
        {trip.visibility !== 'busy_only' && trip.role !== 'viewing' && (
          <Link href={`/trips/${trip.id}`}>
            <Button variant="purple" className="w-full" rightIcon={<ExternalLink size={16} />}>
              View Trip
            </Button>
          </Link>
        )}
      </div>
    </div>
  );
}
