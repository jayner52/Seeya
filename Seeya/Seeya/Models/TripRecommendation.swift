import Foundation

struct TripRecommendation: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let tripId: UUID
    let userId: UUID
    let locationId: UUID?
    let title: String
    let description: String?
    let category: RecommendationCategory
    let googlePlaceId: String?
    let createdAt: Date?

    // Relationships
    var user: Profile?
    var location: TripLocation?

    enum CodingKeys: String, CodingKey {
        case id
        case tripId = "trip_id"
        case userId = "user_id"
        case locationId = "location_id"
        case title
        case description
        case category
        case googlePlaceId = "google_place_id"
        case createdAt = "created_at"
        case user = "profiles"
        case location = "trip_locations"
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    static func == (lhs: TripRecommendation, rhs: TripRecommendation) -> Bool {
        lhs.id == rhs.id
    }
}

// MARK: - Create DTO

struct CreateTripRecommendation: Encodable {
    let tripId: UUID
    let userId: UUID
    let locationId: UUID?
    let title: String
    let description: String?
    let category: RecommendationCategory
    let googlePlaceId: String?

    enum CodingKeys: String, CodingKey {
        case tripId = "trip_id"
        case userId = "user_id"
        case locationId = "location_id"
        case title
        case description
        case category
        case googlePlaceId = "google_place_id"
    }
}
