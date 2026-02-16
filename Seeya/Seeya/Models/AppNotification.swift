import Foundation

enum NotificationType: String, Codable, Sendable {
    case friendRequest = "friend_request"
    case friendAccepted = "friend_accepted"
    case tripInvite = "trip_invite"
    case tripAccepted = "trip_accepted"
    case tripDeclined = "trip_declined"
    case friendTrip = "friend_trip"
    case tripMessage = "trip_message"
    case tripResource = "trip_resource"
    case tripRecommendation = "trip_recommendation"
    case tripTripbit = "trip_tripbit"
    case joinRequest = "join_request"
    case tripbitParticipantAdded = "tripbit_participant_added"

    var displayTitle: String {
        switch self {
        case .friendRequest: return "Friend Request"
        case .friendAccepted: return "Friend Added"
        case .tripInvite: return "Trip Invitation"
        case .tripAccepted: return "Invite Accepted"
        case .tripDeclined: return "Invite Declined"
        case .friendTrip: return "Friend Trip"
        case .tripMessage: return "New Message"
        case .tripResource: return "New Resource"
        case .tripRecommendation: return "New Recommendation"
        case .tripTripbit: return "New TripBit"
        case .joinRequest: return "Join Request"
        case .tripbitParticipantAdded: return "Added to TripBit"
        }
    }

    var iconName: String {
        switch self {
        case .friendRequest: return "person.badge.plus"
        case .friendAccepted: return "person.badge.shield.checkmark"
        case .tripInvite: return "airplane"
        case .tripAccepted: return "checkmark.circle"
        case .tripDeclined: return "xmark.circle"
        case .friendTrip: return "airplane"
        case .tripMessage: return "message"
        case .tripResource: return "doc.text"
        case .tripRecommendation: return "sparkles"
        case .tripTripbit: return "suitcase"
        case .joinRequest: return "person.2"
        case .tripbitParticipantAdded: return "person.badge.plus"
        }
    }
}

struct AppNotification: Codable, Identifiable, Sendable {
    let id: UUID
    let userId: UUID
    let type: NotificationType
    let title: String
    let message: String?
    var isRead: Bool
    let fromUserId: UUID?
    let tripId: UUID?
    let friendshipId: UUID?
    let createdAt: Date?

    // Relationships
    var fromUser: Profile?
    var trip: Trip?

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case type
        case title
        case message
        case isRead = "is_read"
        case fromUserId = "from_user_id"
        case tripId = "trip_id"
        case friendshipId = "friendship_id"
        case createdAt = "created_at"
        case fromUser = "from_user"
        case trip = "trips"
    }
}
