'use client';

import { cn } from '@/lib/utils/cn';
import { Card } from '@/components/ui';
import { formatDate } from '@/lib/utils/date';
import {
  Plane,
  Hotel,
  Utensils,
  Ticket,
  Car,
  Wallet,
  FileText,
  Image,
  MoreHorizontal,
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
} from 'lucide-react';
import type { TripBit, TripBitCategory } from '@/types/database';

interface TripBitCardProps {
  tripBit: TripBit;
  onClick?: () => void;
  className?: string;
}

const categoryConfig: Record<TripBitCategory, { icon: typeof Plane; color: string; bgColor: string }> = {
  flight: { icon: Plane, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  hotel: { icon: Hotel, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  restaurant: { icon: Utensils, color: 'text-orange-600', bgColor: 'bg-orange-50' },
  activity: { icon: Ticket, color: 'text-green-600', bgColor: 'bg-green-50' },
  transport: { icon: Car, color: 'text-cyan-600', bgColor: 'bg-cyan-50' },
  note: { icon: FileText, color: 'text-gray-600', bgColor: 'bg-gray-50' },
  other: { icon: MoreHorizontal, color: 'text-gray-500', bgColor: 'bg-gray-50' },
};

export function TripBitCard({ tripBit, onClick, className }: TripBitCardProps) {
  const config = categoryConfig[tripBit.category] || categoryConfig.other;
  const Icon = config.icon;

  return (
    <Card
      variant="outline"
      padding="none"
      className={cn(
        'overflow-hidden hover:shadow-seeya transition-shadow cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-stretch">
        {/* Category indicator */}
        <div className={cn('w-1 flex-shrink-0', config.bgColor)} />

        <div className="flex-1 p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', config.bgColor)}>
              <Icon size={20} className={config.color} />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-medium text-seeya-text truncate">
                  {tripBit.title}
                </h4>
                {tripBit.is_booked ? (
                  <CheckCircle2 size={16} className="text-seeya-success flex-shrink-0" />
                ) : (
                  <AlertCircle size={16} className="text-seeya-warning flex-shrink-0" />
                )}
              </div>

              {/* Date/Time */}
              {(tripBit.date || tripBit.time) && (
                <div className="flex items-center gap-3 mt-1 text-sm text-seeya-text-secondary">
                  {tripBit.date && (
                    <span className="flex items-center gap-1">
                      <Clock size={12} />
                      {formatDate(tripBit.date, 'EEE, MMM d')}
                      {tripBit.time && ` at ${tripBit.time}`}
                    </span>
                  )}
                </div>
              )}

              {/* Address */}
              {tripBit.address && (
                <div className="flex items-center gap-1 mt-1 text-sm text-seeya-text-secondary">
                  <MapPin size={12} />
                  <span className="truncate">{tripBit.address}</span>
                </div>
              )}

              {/* Confirmation */}
              {tripBit.confirmation_number && (
                <p className="mt-1 text-xs text-seeya-text-tertiary font-mono">
                  Conf: {tripBit.confirmation_number}
                </p>
              )}
            </div>

            <ChevronRight size={20} className="text-seeya-text-secondary flex-shrink-0 self-center" />
          </div>
        </div>
      </div>
    </Card>
  );
}

// Compact version for lists
export function TripBitCardCompact({ tripBit, onClick, className }: TripBitCardProps) {
  const config = categoryConfig[tripBit.category] || categoryConfig.other;
  const Icon = config.icon;

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-gray-300 bg-white transition-colors text-left',
        className
      )}
    >
      <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', config.bgColor)}>
        <Icon size={16} className={config.color} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-seeya-text truncate text-sm">{tripBit.title}</p>
        {tripBit.date && (
          <p className="text-xs text-seeya-text-secondary">
            {formatDate(tripBit.date, 'MMM d')}
            {tripBit.time && ` at ${tripBit.time}`}
          </p>
        )}
      </div>
      <ChevronRight size={16} className="text-seeya-text-secondary flex-shrink-0" />
    </button>
  );
}
