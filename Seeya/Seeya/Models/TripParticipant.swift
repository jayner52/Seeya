import Foundation

struct TripParticipant: Codable, Identifiable, Sendable {
    let id: UUID
    let tripId: UUID
    let userId: UUID
    let status: ParticipationStatus
    let invitedAt: Date?
    let respondedAt: Date?
    var user: Profile?

    // New relationships for location/tripbit-level participation
    var participantLocations: [TripParticipantLocation]?
    var participantTripbits: [TripParticipantTripbit]?

    enum CodingKeys: String, CodingKey {
        case id
        case tripId = "trip_id"
        case userId = "user_id"
        case status
        case invitedAt = "invited_at"
        case respondedAt = "responded_at"
        case user = "profiles"
        case participantLocations = "trip_participant_locations"
        case participantTripbits = "trip_participant_tripbits"
    }

    // MARK: - Computed Properties

    /// Returns true if participant is invited to the full trip (no location restrictions)
    var isFullTripParticipant: Bool {
        participantLocations == nil || participantLocations?.isEmpty == true
    }

    /// Returns location IDs this participant is invited to
    var invitedLocationIds: Set<UUID> {
        Set(participantLocations?.map { $0.locationId } ?? [])
    }

    /// Returns tripbit IDs this participant is invited to
    var invitedTripbitIds: Set<UUID> {
        Set(participantTripbits?.map { $0.tripbitId } ?? [])
    }

    /// Returns confirmed location IDs
    var confirmedLocationIds: Set<UUID> {
        Set(participantLocations?.filter { $0.status == .confirmed }.map { $0.locationId } ?? [])
    }

    /// Returns confirmed tripbit IDs
    var confirmedTripbitIds: Set<UUID> {
        Set(participantTripbits?.filter { $0.status == .confirmed }.map { $0.tripbitId } ?? [])
    }
}

// MARK: - Create DTO

struct InviteParticipant: Encodable {
    let tripId: UUID
    let userId: UUID
    let status: ParticipationStatus

    enum CodingKeys: String, CodingKey {
        case tripId = "trip_id"
        case userId = "user_id"
        case status
    }

    init(tripId: UUID, userId: UUID) {
        self.tripId = tripId
        self.userId = userId
        self.status = .invited
    }
}

struct UpdateParticipantStatus: Encodable {
    let status: ParticipationStatus
    let respondedAt: Date

    enum CodingKeys: String, CodingKey {
        case status
        case respondedAt = "responded_at"
    }
}
