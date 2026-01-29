'use client';

import { TripPackSection } from './TripPackSection';
import { ParticipantsSection } from './ParticipantsSection';
import { InviteSection } from './InviteSection';
import type { TripBit, TripParticipant, TripBitCategory } from '@/types/database';

interface PlanningTabProps {
  tripId: string;
  tripBits: TripBit[];
  participants: TripParticipant[];
  existingInviteCode?: string | null;
  onAddTripBit: (category?: TripBitCategory) => void;
  onTripBitClick: (tripBit: TripBit) => void;
  onInviteClick: () => void;
}

export function PlanningTab({
  tripId,
  tripBits,
  participants,
  existingInviteCode,
  onAddTripBit,
  onTripBitClick,
  onInviteClick,
}: PlanningTabProps) {
  return (
    <div className="space-y-8">
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
