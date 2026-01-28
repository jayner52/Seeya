import Foundation
import Supabase
import UIKit

// MARK: - Calendar Types

enum CalendarViewMode: String, CaseIterable {
    case full = "Full"
    case split = "Split"
    case grid = "Grid"

    var columnCount: Int {
        switch self {
        case .full: return 1
        case .split: return 2
        case .grid: return 3
        }
    }

    var isCompact: Bool {
        self != .full
    }

    var isExtraCompact: Bool {
        self == .grid
    }
}

enum CalendarTripFilter: String, CaseIterable {
    case all = "All"
    case myTrips = "My Trips"
    case shared = "Shared"
}

enum TripRole {
    case owner
    case accepted
    case invited
    case viewing
}

// MARK: - Calendar Trip Model

struct CalendarTrip: Identifiable, Hashable {
    let id: UUID
    let name: String
    let startDate: Date
    let endDate: Date
    let destination: String?
    let owner: Profile
    let role: TripRole
    let color: Color
    let visibility: VisibilityLevel

    static func == (lhs: CalendarTrip, rhs: CalendarTrip) -> Bool {
        lhs.id == rhs.id
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
}

// MARK: - Travel Pal with Trip Info

struct TravelPalWithTrips: Identifiable {
    let id: UUID
    let profile: Profile
    let tripCount: Int
    let color: Color
    var isEnabled: Bool = false
}

// MARK: - Upcoming Trip

struct UpcomingTripInfo: Identifiable {
    let id: UUID
    let name: String
    let destination: String?
    let startDate: Date
    let endDate: Date
    let daysUntil: Int

    var dateRange: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        let startStr = formatter.string(from: startDate)
        let endStr = formatter.string(from: endDate)
        return "\(startStr) - \(endStr)"
    }
}

// MARK: - ViewModel

@Observable
@MainActor
final class CalendarViewModel {
    // State
    var viewMode: CalendarViewMode = .split
    var currentDate: Date = Date()
    var filter: CalendarTripFilter = .all

    // Infinite scroll state
    var monthsBeforeCurrent: Int = 12  // Load 12 months before
    var monthsAfterCurrent: Int = 24   // Load 24 months after

    // Data
    var userTrips: [CalendarTrip] = []
    var travelPals: [TravelPalWithTrips] = []
    var palTrips: [CalendarTrip] = []
    var upcomingTrips: [UpcomingTripInfo] = []

    // UI State
    var isLoading = false
    var errorMessage: String?
    var selectedTrip: CalendarTrip?
    var selectedDate: Date?
    var showMonthPicker = false
    var showDetailSheet = false
    var showCreateTripSheet = false
    var createTripStartDate: Date?
    var tripIdToNavigate: UUID? // For navigating to full trip view

    private var cachedUserId: UUID?

    // MARK: - Color Palette for Travel Pals

    static let palColors: [Color] = [
        Color(red: 0.49, green: 0.83, blue: 0.99), // Sky blue
        Color(red: 0.65, green: 0.84, blue: 0.65), // Green
        Color(red: 1.0, green: 0.67, blue: 0.57),  // Orange/coral
        Color(red: 0.81, green: 0.58, blue: 0.85), // Purple
        Color(red: 0.96, green: 0.56, blue: 0.69), // Pink
        Color(red: 0.50, green: 0.87, blue: 0.92), // Teal
        Color(red: 0.74, green: 0.67, blue: 0.64), // Brown
    ]

    static let legendColors: (yourTrips: Color, accepted: Color, invited: Color, viewing: Color, today: Color) = (
        yourTrips: Color(red: 1.0, green: 0.88, blue: 0.4),  // Yellow
        accepted: Color(red: 0.65, green: 0.84, blue: 0.65), // Green
        invited: Color(red: 1.0, green: 0.67, blue: 0.57),   // Orange
        viewing: Color(red: 0.9, green: 0.9, blue: 0.9),     // Gray
        today: Color.seeyaPurple
    )

    // MARK: - User ID

    private func getCurrentUserId() async -> UUID? {
        if let cached = cachedUserId {
            return cached
        }
        do {
            let session = try await SupabaseService.shared.client.auth.session
            cachedUserId = session.user.id
            return session.user.id
        } catch {
            return nil
        }
    }

    // MARK: - Computed Properties

    var displayTrips: [CalendarTrip] {
        var trips = userTrips

        // Apply filter
        switch filter {
        case .all:
            break
        case .myTrips:
            trips = trips.filter { $0.role == .owner }
        case .shared:
            trips = trips.filter { $0.role != .owner }
        }

        // Add enabled pal trips
        let enabledPalIds = Set(travelPals.filter { $0.isEnabled }.map { $0.id })
        let enabledPalTrips = palTrips.filter { enabledPalIds.contains($0.owner.id) }
        trips.append(contentsOf: enabledPalTrips)

        return trips
    }

    var myTripsCount: Int {
        userTrips.filter { $0.role == .owner }.count
    }

    var sharedTripsCount: Int {
        userTrips.filter { $0.role != .owner }.count
    }

    var nextTrip: UpcomingTripInfo? {
        upcomingTrips.first
    }

    var monthsToDisplay: [Date] {
        var months: [Date] = []
        let calendar = Calendar.current
        let startOfCurrentMonth = calendar.startOfMonth(for: Date())

        // Generate months from (monthsBeforeCurrent) ago to (monthsAfterCurrent) ahead
        for i in -monthsBeforeCurrent...monthsAfterCurrent {
            if let month = calendar.date(byAdding: .month, value: i, to: startOfCurrentMonth) {
                months.append(month)
            }
        }

        return months
    }

    // Index of current month in the array (for scroll positioning)
    var currentMonthIndex: Int {
        monthsBeforeCurrent
    }

    func loadMorePastMonths() {
        monthsBeforeCurrent += 12
    }

    func loadMoreFutureMonths() {
        monthsAfterCurrent += 12
    }

    var dateRangeText: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        return formatter.string(from: Date())
    }

    var monthTitleText: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        return formatter.string(from: currentDate)
    }

    // MARK: - Navigation

    func navigateMonths(_ delta: Int) {
        let calendar = Calendar.current
        if let newDate = calendar.date(byAdding: .month, value: delta, to: currentDate) {
            currentDate = newDate
        }
    }

    func goToToday() {
        currentDate = Date()
        selectedDate = Date()
    }

    func selectDate(_ date: Date) {
        selectedDate = date
        showDetailSheet = true

        // Haptic feedback
        let generator = UIImpactFeedbackGenerator(style: .light)
        generator.impactOccurred()
    }

    // MARK: - Travel Pal Toggle

    func togglePal(_ palId: UUID) {
        if let index = travelPals.firstIndex(where: { $0.id == palId }) {
            travelPals[index].isEnabled.toggle()
        }
    }

    func enableAllPals() {
        for i in travelPals.indices {
            travelPals[i].isEnabled = true
        }
    }

    func disableAllPals() {
        for i in travelPals.indices {
            travelPals[i].isEnabled = false
        }
    }

    // MARK: - Fetch All Data

    func fetchAllData() async {
        isLoading = true
        errorMessage = nil

        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.fetchUserTrips() }
            group.addTask { await self.fetchTravelPals() }
            group.addTask { await self.fetchUpcomingTrips() }
        }

        isLoading = false
    }

    // MARK: - Fetch User Trips

    func fetchUserTrips() async {
        guard let userId = await getCurrentUserId() else {
            errorMessage = "Not authenticated"
            return
        }

        do {
            // Fetch trips where user is owner
            let ownedTrips: [Trip] = try await SupabaseService.shared.client
                .from("trips")
                .select("*, trip_locations(*, cities(*, countries(*))), profiles:profiles!trips_user_id_fkey(*)")
                .eq("user_id", value: userId.uuidString)
                .not("start_date", operator: .is, value: "null")
                .execute()
                .value

            // Fetch trips where user is participant
            let participatingTrips: [Trip] = try await SupabaseService.shared.client
                .from("trips")
                .select("*, trip_locations(*, cities(*, countries(*))), trip_participants!inner(*, profiles:profiles!trip_participants_user_id_fkey(*)), profiles:profiles!trips_user_id_fkey(*)")
                .eq("trip_participants.user_id", value: userId.uuidString)
                .neq("user_id", value: userId.uuidString)
                .not("start_date", operator: .is, value: "null")
                .execute()
                .value

            // Get user profile
            let userProfile: Profile = try await SupabaseService.shared.client
                .from("profiles")
                .select()
                .eq("id", value: userId.uuidString)
                .single()
                .execute()
                .value

            var calendarTrips: [CalendarTrip] = []

            // Process owned trips
            for trip in ownedTrips {
                guard let startDate = trip.startDate, let endDate = trip.endDate else { continue }

                calendarTrips.append(CalendarTrip(
                    id: trip.id,
                    name: trip.name,
                    startDate: startDate,
                    endDate: endDate,
                    destination: trip.destination,
                    owner: userProfile,
                    role: .owner,
                    color: Self.legendColors.yourTrips,
                    visibility: trip.visibility ?? .fullDetails
                ))
            }

            // Process participating trips
            for trip in participatingTrips {
                guard let startDate = trip.startDate, let endDate = trip.endDate else { continue }
                guard trip.userId != userId else { continue } // Skip if already added as owner

                let isAccepted = trip.participants?.contains { $0.userId == userId && $0.status == .confirmed } ?? false
                let role: TripRole = isAccepted ? .accepted : .invited
                let color = role == .accepted ? Self.legendColors.accepted : Self.legendColors.invited

                calendarTrips.append(CalendarTrip(
                    id: trip.id,
                    name: trip.name,
                    startDate: startDate,
                    endDate: endDate,
                    destination: trip.destination,
                    owner: trip.owner ?? userProfile,
                    role: role,
                    color: color,
                    visibility: trip.visibility ?? .fullDetails
                ))
            }

            userTrips = calendarTrips
            print("✅ [CalendarViewModel] Fetched \(userTrips.count) user trips")
        } catch {
            print("❌ [CalendarViewModel] Error fetching user trips: \(error)")
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Fetch Travel Pals

    func fetchTravelPals() async {
        guard let userId = await getCurrentUserId() else { return }

        do {
            // Friendships where user is the requester
            let asRequester: [Friendship] = try await SupabaseService.shared.client
                .from("friendships")
                .select("*, addressee:profiles!friendships_addressee_id_fkey(*)")
                .eq("requester_id", value: userId.uuidString)
                .eq("status", value: "accepted")
                .execute()
                .value

            // Friendships where user is the addressee
            let asAddressee: [Friendship] = try await SupabaseService.shared.client
                .from("friendships")
                .select("*, requester:profiles!friendships_requester_id_fkey(*)")
                .eq("addressee_id", value: userId.uuidString)
                .eq("status", value: "accepted")
                .execute()
                .value

            var pals: [TravelPalWithTrips] = []
            var colorIndex = 0

            for friendship in asRequester {
                if let profile = friendship.addressee {
                    // Get trip count for this pal
                    let tripCount = await fetchTripCountForUser(profile.id)

                    pals.append(TravelPalWithTrips(
                        id: profile.id,
                        profile: profile,
                        tripCount: tripCount,
                        color: Self.palColors[colorIndex % Self.palColors.count]
                    ))
                    colorIndex += 1
                }
            }

            for friendship in asAddressee {
                if let profile = friendship.requester {
                    let tripCount = await fetchTripCountForUser(profile.id)

                    pals.append(TravelPalWithTrips(
                        id: profile.id,
                        profile: profile,
                        tripCount: tripCount,
                        color: Self.palColors[colorIndex % Self.palColors.count]
                    ))
                    colorIndex += 1
                }
            }

            travelPals = pals.sorted { $0.profile.fullName < $1.profile.fullName }
            print("✅ [CalendarViewModel] Fetched \(travelPals.count) travel pals")

            // Fetch pal trips
            await fetchPalTrips()
        } catch {
            print("❌ [CalendarViewModel] Error fetching travel pals: \(error)")
        }
    }

    private func fetchTripCountForUser(_ userId: UUID) async -> Int {
        do {
            let trips: [Trip] = try await SupabaseService.shared.client
                .from("trips")
                .select("id")
                .eq("user_id", value: userId.uuidString)
                .not("start_date", operator: .is, value: "null")
                .execute()
                .value
            return trips.count
        } catch {
            return 0
        }
    }

    // MARK: - Fetch Pal Trips

    func fetchPalTrips() async {
        guard !travelPals.isEmpty else {
            palTrips = []
            return
        }

        let palIds = travelPals.map { $0.id.uuidString }
        let palColorMap = Dictionary(uniqueKeysWithValues: travelPals.map { ($0.id, $0.color) })

        do {
            let trips: [Trip] = try await SupabaseService.shared.client
                .from("trips")
                .select("*, trip_locations(*, cities(*, countries(*))), profiles:profiles!trips_user_id_fkey(*)")
                .in("user_id", values: palIds)
                .not("start_date", operator: .is, value: "null")
                .execute()
                .value

            var calendarTrips: [CalendarTrip] = []

            for trip in trips {
                guard let startDate = trip.startDate, let endDate = trip.endDate else { continue }

                // Respect visibility
                let visibility = trip.visibility ?? .fullDetails
                if visibility == .onlyMe { continue }

                let displayName: String
                let displayDestination: String?

                switch visibility {
                case .busyOnly:
                    displayName = "Busy"
                    displayDestination = nil
                case .datesOnly:
                    displayName = trip.name
                    displayDestination = nil
                case .locationOnly:
                    displayName = trip.name
                    displayDestination = trip.destination
                default:
                    displayName = trip.name
                    displayDestination = trip.destination
                }

                let ownerProfile = trip.owner ?? Profile(
                    id: trip.userId,
                    username: nil,
                    fullName: "Unknown",
                    avatarUrl: nil,
                    bio: nil,
                    homeCity: nil,
                    homeCityPlaceId: nil,
                    onboardingCompleted: nil,
                    createdAt: nil,
                    updatedAt: nil
                )

                calendarTrips.append(CalendarTrip(
                    id: trip.id,
                    name: displayName,
                    startDate: startDate,
                    endDate: endDate,
                    destination: displayDestination,
                    owner: ownerProfile,
                    role: .viewing,
                    color: palColorMap[trip.userId] ?? Self.legendColors.viewing,
                    visibility: visibility
                ))
            }

            palTrips = calendarTrips
            print("✅ [CalendarViewModel] Fetched \(palTrips.count) pal trips")
        } catch {
            print("❌ [CalendarViewModel] Error fetching pal trips: \(error)")
        }
    }

    // MARK: - Fetch Upcoming Trips

    func fetchUpcomingTrips() async {
        guard let userId = await getCurrentUserId() else { return }

        do {
            let today = Calendar.current.startOfDay(for: Date())
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withFullDate]
            let todayStr = formatter.string(from: today)

            // Fetch trips where user is owner
            let ownedTrips: [Trip] = try await SupabaseService.shared.client
                .from("trips")
                .select("*, trip_locations(*, cities(*, countries(*)))")
                .eq("user_id", value: userId.uuidString)
                .gte("start_date", value: todayStr)
                .order("start_date", ascending: true)
                .limit(6)
                .execute()
                .value

            // Get trip IDs where user is participant
            let participations: [TripParticipant] = try await SupabaseService.shared.client
                .from("trip_participants")
                .select("trip_id")
                .eq("user_id", value: userId.uuidString)
                .eq("status", value: "confirmed")
                .execute()
                .value

            var participatingTrips: [Trip] = []
            if !participations.isEmpty {
                let tripIds = participations.map { $0.tripId.uuidString }
                participatingTrips = try await SupabaseService.shared.client
                    .from("trips")
                    .select("*, trip_locations(*, cities(*, countries(*)))")
                    .in("id", values: tripIds)
                    .neq("user_id", value: userId.uuidString) // Exclude owned trips (already fetched)
                    .gte("start_date", value: todayStr)
                    .order("start_date", ascending: true)
                    .limit(6)
                    .execute()
                    .value
            }

            // Combine and sort all trips
            let allTrips = (ownedTrips + participatingTrips).sorted { $0.startDate ?? Date.distantFuture < $1.startDate ?? Date.distantFuture }

            upcomingTrips = allTrips.prefix(6).compactMap { trip in
                guard let startDate = trip.startDate,
                      let endDate = trip.endDate else { return nil }

                let daysUntil = Calendar.current.dateComponents([.day], from: today, to: startDate).day ?? 0

                return UpcomingTripInfo(
                    id: trip.id,
                    name: trip.name,
                    destination: trip.destination,
                    startDate: startDate,
                    endDate: endDate,
                    daysUntil: daysUntil
                )
            }

            print("✅ [CalendarViewModel] Fetched \(upcomingTrips.count) upcoming trips")
        } catch {
            print("❌ [CalendarViewModel] Error fetching upcoming trips: \(error)")
        }
    }

    // MARK: - Get Trips for Date

    func trips(for date: Date) -> [CalendarTrip] {
        let calendar = Calendar.current
        let dayStart = calendar.startOfDay(for: date)

        return displayTrips.filter { trip in
            let tripStart = calendar.startOfDay(for: trip.startDate)
            let tripEnd = calendar.startOfDay(for: trip.endDate)
            return dayStart >= tripStart && dayStart <= tripEnd
        }
    }
}

// MARK: - Calendar Extension

extension Calendar {
    func startOfMonth(for date: Date) -> Date {
        let components = dateComponents([.year, .month], from: date)
        return self.date(from: components) ?? date
    }
}

import SwiftUI
