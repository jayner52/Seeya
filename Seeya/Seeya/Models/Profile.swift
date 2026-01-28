import Foundation

struct Profile: Codable, Identifiable, Sendable, Hashable {
    let id: UUID
    let username: String?
    let fullName: String
    let avatarUrl: String?
    let bio: String?
    let homeCity: String?
    let homeCityPlaceId: String?
    let onboardingCompleted: Bool?
    let createdAt: Date?
    let updatedAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case username
        case fullName = "full_name"
        case avatarUrl = "avatar_url"
        case bio
        case homeCity = "home_city"
        case homeCityPlaceId = "home_city_place_id"
        case onboardingCompleted = "onboarding_completed"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    static func == (lhs: Profile, rhs: Profile) -> Bool {
        lhs.id == rhs.id
    }
}
