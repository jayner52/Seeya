import Foundation

struct UserSettings: Codable, Sendable {
    var defaultTripVisibility: VisibilityLevel
    var delayedTripVisibility: Bool
    var calendarSharing: Bool
    var notifyTravelPalRequests: Bool
    var notifyTripInvitations: Bool
    var notifyTripMessages: Bool
    var notifyAddedToTripbit: Bool

    static let `default` = UserSettings(
        defaultTripVisibility: .busyOnly,
        delayedTripVisibility: false,
        calendarSharing: true,
        notifyTravelPalRequests: true,
        notifyTripInvitations: true,
        notifyTripMessages: true,
        notifyAddedToTripbit: true
    )

    enum CodingKeys: String, CodingKey {
        case defaultTripVisibility = "default_trip_visibility"
        case delayedTripVisibility = "delayed_trip_visibility"
        case calendarSharing = "calendar_sharing"
        case notifyTravelPalRequests = "notify_travel_pal_requests"
        case notifyTripInvitations = "notify_trip_invitations"
        case notifyTripMessages = "notify_trip_messages"
        case notifyAddedToTripbit = "notify_added_to_tripbit"
    }
}
