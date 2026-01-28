import Foundation

/// Represents a trending wanderlist destination in the user's travel circle
struct TrendingWanderlistItem: Codable, Identifiable, Hashable, Sendable {
    let name: String
    let googlePlaceId: String?
    let cityId: UUID?
    let countryId: UUID?
    let friendCount: Int
    let countryEmoji: String?
    let countryName: String?

    var id: String { name }

    enum CodingKeys: String, CodingKey {
        case name
        case googlePlaceId = "google_place_id"
        case cityId = "city_id"
        case countryId = "country_id"
        case friendCount = "friend_count"
        case countryEmoji = "country_emoji"
        case countryName = "country_name"
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(name)
    }

    static func == (lhs: TrendingWanderlistItem, rhs: TrendingWanderlistItem) -> Bool {
        lhs.name == rhs.name
    }

    // MARK: - Computed Properties

    /// Display string with flag emoji
    var displayWithEmoji: String {
        let flag = countryEmoji ?? "🌍"
        return "\(flag) \(name)"
    }

    /// Friend count label
    var friendCountLabel: String {
        friendCount == 1 ? "1 travel pal" : "\(friendCount) travel pals"
    }
}
