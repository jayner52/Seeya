import Foundation

struct TripParticipantLocation: Codable, Identifiable, Sendable {
    let id: UUID
    let participantId: UUID
    let locationId: UUID
    let status: ParticipationStatus
    let createdAt: Date?

    // Relationships
    var location: TripLocation?

    enum CodingKeys: String, CodingKey {
        case id
        case participantId = "participant_id"
        case locationId = "location_id"
        case status
        case createdAt = "created_at"
        case location = "trip_locations"
    }

    // MARK: - Initializer (for previews and testing)

    init(
        id: UUID = UUID(),
        participantId: UUID,
        locationId: UUID,
        status: ParticipationStatus = .invited,
        createdAt: Date? = Date(),
        location: TripLocation? = nil
    ) {
        self.id = id
        self.participantId = participantId
        self.locationId = locationId
        self.status = status
        self.createdAt = createdAt
        self.location = location
    }
}

// MARK: - Create DTO

struct CreateTripParticipantLocation: Encodable {
    let participantId: UUID
    let locationId: UUID
    let status: ParticipationStatus

    enum CodingKeys: String, CodingKey {
        case participantId = "participant_id"
        case locationId = "location_id"
        case status
    }

    init(participantId: UUID, locationId: UUID, status: ParticipationStatus = .invited) {
        self.participantId = participantId
        self.locationId = locationId
        self.status = status
    }
}

// MARK: - Update DTO

struct UpdateTripParticipantLocation: Encodable {
    let status: ParticipationStatus
}
