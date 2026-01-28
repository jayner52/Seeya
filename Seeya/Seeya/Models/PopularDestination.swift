import Foundation

/// Represents a popular destination in the user's travel circle
struct PopularDestination: Codable, Identifiable, Hashable, Sendable {
    let locationName: String
    let countryEmoji: String?
    let countryName: String?
    let tripCount: Int
    let isCountry: Bool

    var id: String { locationName }

    enum CodingKeys: String, CodingKey {
        case locationName = "location_name"
        case countryEmoji = "country_emoji"
        case countryName = "country_name"
        case tripCount = "trip_count"
        case isCountry = "is_country"
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(locationName)
    }

    static func == (lhs: PopularDestination, rhs: PopularDestination) -> Bool {
        lhs.locationName == rhs.locationName
    }

    // MARK: - Computed Properties

    /// Display string with flag emoji
    var displayWithEmoji: String {
        let flag = countryEmoji ?? "🌍"
        return "\(flag) \(locationName)"
    }

    /// Trip count label
    var tripCountLabel: String {
        tripCount == 1 ? "1 trip" : "\(tripCount) trips"
    }
}
