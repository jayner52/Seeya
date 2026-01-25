import Foundation

enum FriendshipStatus: String, Codable, Sendable {
    case pending
    case accepted
    case declined
}

enum VisibilityLevel: String, Codable, Sendable, CaseIterable {
    case onlyMe = "only_me"
    case busyOnly = "busy_only"
    case datesOnly = "dates_only"
    case locationOnly = "location_only"
    case fullDetails = "full_details"

    var displayName: String {
        switch self {
        case .onlyMe: return "Only me"
        case .busyOnly: return "Show I'm busy"
        case .datesOnly: return "Show dates"
        case .locationOnly: return "Show destination"
        case .fullDetails: return "Full details"
        }
    }

    var description: String {
        switch self {
        case .onlyMe: return "Private - only you can see this trip"
        case .busyOnly: return "Friends see you're traveling"
        case .datesOnly: return "Friends see when you're traveling"
        case .locationOnly: return "Friends see where you're going"
        case .fullDetails: return "Friends see all trip details"
        }
    }

    var icon: String {
        switch self {
        case .onlyMe: return "lock.fill"
        case .busyOnly: return "eye.slash"
        case .datesOnly: return "calendar"
        case .locationOnly: return "mappin"
        case .fullDetails: return "globe"
        }
    }
}

enum ParticipationStatus: String, Codable, Sendable {
    case invited
    case confirmed
    case declined

    var displayName: String {
        switch self {
        case .invited: return "Invited"
        case .confirmed: return "Going"
        case .declined: return "Can't Go"
        }
    }

    var color: String {
        switch self {
        case .invited: return "orange"
        case .confirmed: return "green"
        case .declined: return "red"
        }
    }
}

enum RecommendationCategory: String, Codable, Sendable, CaseIterable {
    case restaurant
    case activity
    case stay
    case tip

    var displayName: String {
        switch self {
        case .restaurant: return "Restaurant"
        case .activity: return "Activity"
        case .stay: return "Stay"
        case .tip: return "Tip"
        }
    }

    var icon: String {
        switch self {
        case .restaurant: return "fork.knife"
        case .activity: return "figure.run"
        case .stay: return "bed.double"
        case .tip: return "lightbulb"
        }
    }
}

enum TripFilter: String, CaseIterable {
    case all = "All Trips"
    case myTrips = "My Trips"
    case invited = "Invited"
}
