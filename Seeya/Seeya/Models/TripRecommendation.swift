import Foundation

struct TripRecommendation: Codable, Identifiable, Sendable {
    let id: UUID
    let tripId: UUID
    let userId: UUID
    let title: String
    let description: String?
    let category: RecommendationCategory
    let createdAt: Date?
    var user: Profile?

    enum CodingKeys: String, CodingKey {
        case id
        case tripId = "trip_id"
        case userId = "user_id"
        case title
        case description
        case category
        case createdAt = "created_at"
        case user = "profiles"
    }
}

// MARK: - Create DTO

struct CreateRecommendation: Encodable {
    let tripId: UUID
    let userId: UUID
    let title: String
    let description: String?
    let category: RecommendationCategory

    enum CodingKeys: String, CodingKey {
        case tripId = "trip_id"
        case userId = "user_id"
        case title
        case description
        case category
    }
}
