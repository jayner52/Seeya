import Foundation

struct Trip: Codable, Identifiable, Sendable, Hashable {
    static func == (lhs: Trip, rhs: Trip) -> Bool {
        lhs.id == rhs.id
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    let id: UUID
    let userId: UUID
    let name: String
    let description: String?
    let startDate: Date?
    let endDate: Date?
    let isFlexible: Bool?
    let visibility: VisibilityLevel?
    let isPast: Bool?
    let createdAt: Date?
    let updatedAt: Date?

    // Relationships
    var locations: [TripLocation]?
    var participants: [TripParticipant]?
    var owner: Profile?
    var recommendations: [TripRecommendation]?
    var tripTypes: [TripType]?

    // Alias for semantic clarity
    var ownerId: UUID { userId }

    // MARK: - Initializer (for previews and testing)

    init(
        id: UUID,
        userId: UUID,
        name: String,
        description: String?,
        startDate: Date?,
        endDate: Date?,
        isFlexible: Bool?,
        visibility: VisibilityLevel?,
        isPast: Bool?,
        createdAt: Date?,
        updatedAt: Date?,
        locations: [TripLocation]?,
        participants: [TripParticipant]?,
        owner: Profile?,
        recommendations: [TripRecommendation]?,
        tripTypes: [TripType]?
    ) {
        self.id = id
        self.userId = userId
        self.name = name
        self.description = description
        self.startDate = startDate
        self.endDate = endDate
        self.isFlexible = isFlexible
        self.visibility = visibility
        self.isPast = isPast
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.locations = locations
        self.participants = participants
        self.owner = owner
        self.recommendations = recommendations
        self.tripTypes = tripTypes
    }

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case name
        case description
        case startDate = "start_date"
        case endDate = "end_date"
        case isFlexible = "is_flexible"
        case visibility
        case isPast = "is_past"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case locations = "trip_locations"
        case participants = "trip_participants"
        case owner = "profiles"
        case recommendations = "trip_recommendations"
        case tripTypes = "trip_trip_types"
    }

    // MARK: - Computed Properties

    /// Primary destination (first location)
    var destination: String {
        locations?.first?.displayName ?? "Destination TBD"
    }

    /// All destination names joined
    var allDestinations: String {
        guard let locations = locations, !locations.isEmpty else {
            return "Destination TBD"
        }
        let names = locations.sorted { $0.orderIndex < $1.orderIndex }.map { $0.displayName }
        return names.joined(separator: " → ")
    }

    var dateRangeText: String {
        if isFlexible == true {
            return "Flexible dates"
        }
        guard let start = startDate, let end = endDate else {
            return "Dates TBD"
        }
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        let yearFormatter = DateFormatter()
        yearFormatter.dateFormat = "yyyy"

        let startStr = formatter.string(from: start)
        let endStr = formatter.string(from: end)
        let year = yearFormatter.string(from: end)

        return "\(startStr) - \(endStr), \(year)"
    }

    var hasDates: Bool {
        startDate != nil && endDate != nil
    }

    var isCurrent: Bool {
        guard let start = startDate, let end = endDate else { return false }
        let now = Date()
        return now >= start && now <= end
    }

    var isUpcoming: Bool {
        guard let start = startDate else { return false }
        return start > Date()
    }

    var confirmedParticipants: [TripParticipant] {
        participants?.filter { $0.status == .confirmed } ?? []
    }

    var invitedParticipants: [TripParticipant] {
        participants?.filter { $0.status == .invited } ?? []
    }

    var participantCount: Int {
        confirmedParticipants.count
    }

    var participantText: String {
        let count = participantCount
        if count == 0 {
            return "Just you"
        } else if count == 1 {
            return "1 friend going"
        } else {
            return "\(count) friends going"
        }
    }

    // MARK: - Itinerary Computed Properties

    /// Trip duration text (e.g., "15 days, 14 nights")
    var tripDurationText: String {
        guard let start = startDate, let end = endDate else {
            return "Duration TBD"
        }
        let calendar = Calendar.current
        let days = calendar.dateComponents([.day], from: start, to: end).day ?? 0
        let totalDays = days + 1 // Include both start and end dates
        let nights = days

        if totalDays == 1 {
            return "Day trip"
        } else if nights == 1 {
            return "1 day, 1 night"
        } else {
            return "\(totalDays) days, \(nights) nights"
        }
    }

    /// Full date range text (e.g., "February 8 - February 22, 2026")
    var fullDateRangeText: String {
        guard let start = startDate, let end = endDate else {
            return "Dates TBD"
        }
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM d"
        let yearFormatter = DateFormatter()
        yearFormatter.dateFormat = "yyyy"

        let startStr = formatter.string(from: start)
        let endStr = formatter.string(from: end)
        let year = yearFormatter.string(from: end)

        return "\(startStr) - \(endStr), \(year)"
    }

    /// Array of all dates in the trip (from start to end, inclusive)
    var allDatesInTrip: [Date] {
        guard let start = startDate, let end = endDate else { return [] }

        var dates: [Date] = []
        let calendar = Calendar.current
        var currentDate = calendar.startOfDay(for: start)
        let endDay = calendar.startOfDay(for: end)

        while currentDate <= endDay {
            dates.append(currentDate)
            guard let nextDate = calendar.date(byAdding: .day, value: 1, to: currentDate) else { break }
            currentDate = nextDate
        }

        return dates
    }

    /// Sorted trip locations by order index
    var sortedLocations: [TripLocation] {
        locations?.sorted { $0.orderIndex < $1.orderIndex } ?? []
    }

    /// All destinations formatted with arrows (e.g., "Mexico City → Playa del Carmen → Valladolid")
    var destinationsWithArrows: String {
        guard let locations = locations, !locations.isEmpty else {
            return "Destination TBD"
        }
        let names = locations.sorted { $0.orderIndex < $1.orderIndex }.map { $0.displayName }
        return names.joined(separator: " → ")
    }

    /// Total traveler count (owner + confirmed participants)
    var totalTravelerCount: Int {
        1 + confirmedParticipants.count // Owner plus confirmed participants
    }

    /// All travelers (owner and participants) with their profiles
    var allTravelers: [Profile] {
        var travelers: [Profile] = []
        if let owner = owner {
            travelers.append(owner)
        }
        if let participants = participants {
            travelers.append(contentsOf: participants.compactMap { $0.user })
        }
        return travelers
    }
}

// MARK: - Create/Update DTOs

struct CreateTrip: Encodable {
    let userId: UUID
    let name: String
    let description: String?
    let startDate: Date?
    let endDate: Date?
    let isFlexible: Bool
    let visibility: VisibilityLevel

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case name
        case description
        case startDate = "start_date"
        case endDate = "end_date"
        case isFlexible = "is_flexible"
        case visibility
    }
}

struct UpdateTrip: Encodable {
    let name: String
    let description: String?
    let startDate: Date?
    let endDate: Date?
    let isFlexible: Bool
    let visibility: VisibilityLevel

    enum CodingKeys: String, CodingKey {
        case name
        case description
        case startDate = "start_date"
        case endDate = "end_date"
        case isFlexible = "is_flexible"
        case visibility
    }
}
