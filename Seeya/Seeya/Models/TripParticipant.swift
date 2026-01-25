import Foundation

struct TripParticipant: Codable, Identifiable, Sendable {
    let id: UUID
    let tripId: UUID
    let userId: UUID
    let status: ParticipationStatus
    let invitedAt: Date?
    let respondedAt: Date?
    var user: Profile?

    enum CodingKeys: String, CodingKey {
        case id
        case tripId = "trip_id"
        case userId = "user_id"
        case status
        case invitedAt = "invited_at"
        case respondedAt = "responded_at"
        case user = "profiles"
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
