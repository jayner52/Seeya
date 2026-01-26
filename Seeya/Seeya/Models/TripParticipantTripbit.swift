import Foundation

struct TripParticipantTripbit: Codable, Identifiable, Sendable {
    let id: UUID
    let participantId: UUID
    let tripbitId: UUID
    let status: ParticipationStatus
    let createdAt: Date?

    // Relationships
    var tripbit: TripBit?

    enum CodingKeys: String, CodingKey {
        case id
        case participantId = "participant_id"
        case tripbitId = "tripbit_id"
        case status
        case createdAt = "created_at"
        case tripbit = "trip_bits"
    }

    // MARK: - Initializer (for previews and testing)

    init(
        id: UUID = UUID(),
        participantId: UUID,
        tripbitId: UUID,
        status: ParticipationStatus = .invited,
        createdAt: Date? = Date(),
        tripbit: TripBit? = nil
    ) {
        self.id = id
        self.participantId = participantId
        self.tripbitId = tripbitId
        self.status = status
        self.createdAt = createdAt
        self.tripbit = tripbit
    }
}

// MARK: - Create DTO

struct CreateTripParticipantTripbit: Encodable {
    let participantId: UUID
    let tripbitId: UUID
    let status: ParticipationStatus

    enum CodingKeys: String, CodingKey {
        case participantId = "participant_id"
        case tripbitId = "tripbit_id"
        case status
    }

    init(participantId: UUID, tripbitId: UUID, status: ParticipationStatus = .invited) {
        self.participantId = participantId
        self.tripbitId = tripbitId
        self.status = status
    }
}

// MARK: - Update DTO

struct UpdateTripParticipantTripbit: Encodable {
    let status: ParticipationStatus
}
