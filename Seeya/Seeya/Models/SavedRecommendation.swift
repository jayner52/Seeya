import Foundation

struct SavedRecommendation: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let userId: UUID
    let sharedRecommendationId: UUID
    let createdAt: Date?

    // Relationship - the shared recommendation that was saved
    var sharedRecommendation: SharedRecommendation?

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case sharedRecommendationId = "shared_recommendation_id"
        case createdAt = "created_at"
        case sharedRecommendation = "shared_recommendations"
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    static func == (lhs: SavedRecommendation, rhs: SavedRecommendation) -> Bool {
        lhs.id == rhs.id
    }
}

// MARK: - Create DTO

struct CreateSavedRecommendation: Encodable {
    let userId: UUID
    let sharedRecommendationId: UUID

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case sharedRecommendationId = "shared_recommendation_id"
    }
}
