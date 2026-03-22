'use client';

import { useState } from 'react';
import { TripPackSection } from './TripPackSection';
import { ParticipantsSection } from './ParticipantsSection';
import { InviteSection } from './InviteSection';
import { AIRecommendationsSection } from './AIRecommendationsSection';
import { FriendRecommendationsSection } from './FriendRecommendationsSection';
import { RateShareModal } from './RateShareModal';
import type { TripBit, TripParticipant, TripBitCategory, TripLocation } from '@/types/database';
import type { AIRecommendation } from '@/types';

interface PlanningTabProps {
  tripId: string;
  tripName?: string;
  tripBits: TripBit[];
  participants: TripParticipant[];
  existingInviteCode?: string | null;
  locations: TripLocation[];
  startDate?: string | null;
  endDate?: string | null;
  onAddTripBit: (category?: TripBitCategory) => void;
  onTripBitClick: (tripBit: TripBit) => void;
  onInviteClick: () => void;
  onAIQuickAdd?: () => void;
  onTripBitAdded?: () => void;
  onAddRecommendation?: (
    recommendation: AIRecommendation,
    locationDateRange: { start: string; end: string; locationName?: string } | undefined,
    onAdded: () => void
  ) => void;
  isOwner?: boolean;
  ownerUserId?: string;
  currentUserId?: string;
  onParticipantsChanged?: () => void;
}

export function PlanningTab({
  tripId,
  tripName,
  tripBits,
  participants,
  existingInviteCode,
  locations,
  startDate,
  endDate,
  onAddTripBit,
  onTripBitClick,
  onInviteClick,
  onAIQuickAdd,
  onTripBitAdded,
  onAddRecommendation,
  isOwner,
  ownerUserId,
  currentUserId,
  onParticipantsChanged,
}: PlanningTabProps) {
  const [rateShareBit, setRateShareBit] = useState<TripBit | null>(null);

  // Determine if this is a past trip (use local date string comparison to avoid UTC parsing issues)
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const isPastTrip = endDate
    ? endDate < todayStr
    : startDate
      ? startDate < todayStr
      : false;

  return (
    <div className="space-y-8">
      {/* Travelers */}
      <ParticipantsSection
        participants={participants}
        onInviteClick={onInviteClick}
        isOwner={isOwner}
        ownerUserId={ownerUserId}
        tripId={tripId}
        currentUserId={currentUserId}
        onParticipantsChanged={onParticipantsChanged}
      />

      {/* Trip Pack */}
      <TripPackSection
        tripBits={tripBits}
        onAddClick={onAddTripBit}
        onAIQuickAdd={onAIQuickAdd}
        onTripBitClick={onTripBitClick}
        isPastTrip={isPastTrip}
        onRateShare={(tripBit) => setRateShareBit(tripBit)}
      />

      {/* Friend Recommendations */}
      <FriendRecommendationsSection
        tripId={tripId}
        tripLocations={locations}
        onTripBitAdded={onTripBitAdded}
      />

      {/* AI Recommendations */}
      <AIRecommendationsSection
        tripId={tripId}
        locations={locations}
        startDate={startDate}
        endDate={endDate}
        onTripBitAdded={onTripBitAdded}
        onAddRecommendation={onAddRecommendation}
      />

      {/* Invite Link */}
      <div id="invite-section">
        <InviteSection
          tripId={tripId}
          existingCode={existingInviteCode}
          tripName={tripName}
          startDate={startDate}
          endDate={endDate}
        />
      </div>

      {/* Rate & Share Modal */}
      {rateShareBit && (
        <RateShareModal
          tripBit={rateShareBit}
          tripId={tripId}
          tripLocations={locations}
          isOpen={!!rateShareBit}
          onClose={() => setRateShareBit(null)}
          onSuccess={() => {
            // Modal handles its own success state, just close after
          }}
        />
      )}
    </div>
  );
}
