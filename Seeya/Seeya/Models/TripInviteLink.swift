import Foundation

struct TripInviteLink: Codable, Identifiable, Sendable {
    let id: UUID
    let tripId: UUID
    let createdBy: UUID
    let code: String
    let expiresAt: Date?
    let locationIds: [UUID]?
    let usageCount: Int
    let createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case tripId = "trip_id"
        case createdBy = "created_by"
        case code
        case expiresAt = "expires_at"
        case locationIds = "location_ids"
        case usageCount = "usage_count"
        case createdAt = "created_at"
    }

    // MARK: - Computed Properties

    var isFullTrip: Bool {
        locationIds == nil || locationIds?.isEmpty == true
    }

    var isExpired: Bool {
        guard let expiresAt = expiresAt else { return false }
        return expiresAt < Date()
    }

    var isValid: Bool {
        !isExpired
    }

    var shareableUrl: String {
        "seeya://invite/\(code)"
    }

    var formattedExpirationDate: String? {
        guard let expiresAt = expiresAt else { return nil }
        let formatter = DateFormatter()
        formatter.dateStyle = .medium
        formatter.timeStyle = .short
        return formatter.string(from: expiresAt)
    }

    // MARK: - Initializer (for previews and testing)

    init(
        id: UUID = UUID(),
        tripId: UUID,
        createdBy: UUID,
        code: String,
        expiresAt: Date? = nil,
        locationIds: [UUID]? = nil,
        usageCount: Int = 0,
        createdAt: Date? = Date()
    ) {
        self.id = id
        self.tripId = tripId
        self.createdBy = createdBy
        self.code = code
        self.expiresAt = expiresAt
        self.locationIds = locationIds
        self.usageCount = usageCount
        self.createdAt = createdAt
    }
}

// MARK: - Create DTO

struct CreateTripInviteLink: Encodable {
    let tripId: UUID
    let createdBy: UUID
    let code: String
    let expiresAt: Date?
    let locationIds: [UUID]?

    enum CodingKeys: String, CodingKey {
        case tripId = "trip_id"
        case createdBy = "created_by"
        case code
        case expiresAt = "expires_at"
        case locationIds = "location_ids"
    }
}

// MARK: - Update DTO

struct UpdateTripInviteLinkUsage: Encodable {
    let usageCount: Int

    enum CodingKeys: String, CodingKey {
        case usageCount = "usage_count"
    }
}

// MARK: - Code Generator

extension TripInviteLink {
    /// Generate a random invite code (8 characters, alphanumeric uppercase)
    static func generateCode() -> String {
        let characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // Excludes confusing chars like 0, O, 1, I
        return String((0..<8).map { _ in characters.randomElement()! })
    }
}
