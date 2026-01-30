'use client';

import { TripPackSection } from './TripPackSection';
import { ParticipantsSection } from './ParticipantsSection';
import { InviteSection } from './InviteSection';
import { AIRecommendationsSection } from './AIRecommendationsSection';
import type { TripBit, TripParticipant, TripBitCategory, TripLocation } from '@/types/database';

interface PlanningTabProps {
  tripId: string;
  tripBits: TripBit[];
  participants: TripParticipant[];
  existingInviteCode?: string | null;
  locations: TripLocation[];
  startDate?: string | null;
  endDate?: string | null;
  onAddTripBit: (category?: TripBitCategory) => void;
  onTripBitClick: (tripBit: TripBit) => void;
  onInviteClick: () => void;
  onTripBitAdded?: () => void;
}

export function PlanningTab({
  tripId,
  tripBits,
  participants,
  existingInviteCode,
  locations,
  startDate,
  endDate,
  onAddTripBit,
  onTripBitClick,
  onInviteClick,
  onTripBitAdded,
}: PlanningTabProps) {
  return (
    <div className="space-y-8">
      {/* AI Recommendations */}
      <AIRecommendationsSection
        tripId={tripId}
        locations={locations}
        startDate={startDate}
        endDate={endDate}
        onTripBitAdded={onTripBitAdded}
      />

      {/* Trip Pack */}
      <TripPackSection
        tripBits={tripBits}
        onAddClick={onAddTripBit}
        onTripBitClick={onTripBitClick}
      />

      {/* Participants */}
      <ParticipantsSection
        participants={participants}
        onInviteClick={onInviteClick}
      />

      {/* Invite Link */}
      <InviteSection
        tripId={tripId}
        existingCode={existingInviteCode}
      />
    </div>
  );
}
