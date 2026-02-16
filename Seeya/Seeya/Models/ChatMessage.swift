import Foundation

struct ChatMessage: Codable, Identifiable, Sendable {
    let id: UUID
    let tripId: UUID
    let userId: UUID
    let content: String
    let createdAt: Date?

    // Relationship: joined sender profile
    var sender: Profile?

    enum CodingKeys: String, CodingKey {
        case id
        case tripId = "trip_id"
        case userId = "user_id"
        case content
        case createdAt = "created_at"
        case sender = "profiles"
    }
}

// MARK: - Create DTO

struct CreateChatMessage: Encodable {
    let tripId: UUID
    let userId: UUID
    let content: String

    enum CodingKeys: String, CodingKey {
        case tripId = "trip_id"
        case userId = "user_id"
        case content
    }
}

// MARK: - Chat Read Tracking

struct ChatRead: Codable, Sendable {
    let id: UUID?
    let userId: UUID
    let tripId: UUID
    let lastReadAt: Date

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case tripId = "trip_id"
        case lastReadAt = "last_read_at"
    }
}

struct UpsertChatRead: Encodable {
    let userId: UUID
    let tripId: UUID
    let lastReadAt: Date

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case tripId = "trip_id"
        case lastReadAt = "last_read_at"
    }
}

// MARK: - Conversation Preview

struct ConversationPreview: Identifiable, Sendable {
    let trip: Trip
    let lastMessage: ChatMessage?
    let unreadCount: Int

    var id: UUID { trip.id }

    var lastMessageText: String {
        guard let message = lastMessage else {
            return "No messages yet"
        }
        let senderName = message.sender?.fullName ?? "Someone"
        return "\(senderName): \(message.content)"
    }

    var lastMessageDate: Date? {
        lastMessage?.createdAt
    }
}
