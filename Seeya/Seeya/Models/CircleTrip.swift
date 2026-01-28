import Foundation

/// Represents a friend's trip for the "Traveling Now & Upcoming" section in Explore
struct CircleTrip: Codable, Identifiable, Hashable, Sendable {
    let tripId: UUID
    let tripName: String
    let destination: String?
    let startDate: Date?
    let endDate: Date?
    let visibility: VisibilityLevel
    let ownerId: UUID
    let ownerUsername: String?
    let ownerFullName: String?
    let ownerAvatarUrl: String?
    let countryEmoji: String?
    let countryName: String?

    var id: UUID { tripId }

    enum CodingKeys: String, CodingKey {
        case tripId = "trip_id"
        case tripName = "trip_name"
        case destination
        case startDate = "start_date"
        case endDate = "end_date"
        case visibility
        case ownerId = "owner_id"
        case ownerUsername = "owner_username"
        case ownerFullName = "owner_full_name"
        case ownerAvatarUrl = "owner_avatar_url"
        case countryEmoji = "country_emoji"
        case countryName = "country_name"
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(tripId)
    }

    static func == (lhs: CircleTrip, rhs: CircleTrip) -> Bool {
        lhs.tripId == rhs.tripId
    }

    // MARK: - Computed Properties

    /// Whether the trip is currently happening
    var isTravelingNow: Bool {
        guard let start = startDate, let end = endDate else { return false }
        let now = Date()
        return now >= start && now <= end
    }

    /// Whether the trip is upcoming (within next 30 days)
    var isUpcoming: Bool {
        guard let start = startDate else { return false }
        let now = Date()
        let thirtyDaysFromNow = Calendar.current.date(byAdding: .day, value: 30, to: now) ?? now
        return start > now && start <= thirtyDaysFromNow
    }

    /// Display name for the owner
    var ownerDisplayName: String {
        ownerFullName ?? ownerUsername ?? "Unknown"
    }

    /// Status badge text
    var statusText: String {
        if isTravelingNow {
            return "Traveling"
        } else if isUpcoming {
            return "Soon"
        }
        return ""
    }

    /// Formatted date range
    var dateRangeDisplay: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"

        guard let start = startDate else { return "" }

        if let end = endDate {
            let startStr = formatter.string(from: start)
            let endStr = formatter.string(from: end)
            return "\(startStr) - \(endStr)"
        }

        return formatter.string(from: start)
    }

    /// Destination with flag emoji
    var destinationDisplay: String {
        let flag = countryEmoji ?? "🌍"
        let place = destination ?? countryName ?? "Unknown"
        return "\(flag) \(place)"
    }
}
