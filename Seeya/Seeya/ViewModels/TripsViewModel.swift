import Foundation
import Supabase

@Observable
@MainActor
final class TripsViewModel {
    var trips: [Trip] = []
    var selectedTrip: Trip?
    var cities: [City] = []
    var tripTypes: [TripType] = []
    var friends: [Profile] = []
    var isLoading = false
    var errorMessage: String?

    private var cachedUserId: UUID?

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

    // MARK: - Ensure Profile Exists

    private func ensureProfileExists(userId: UUID) async -> Bool {
        do {
            // Check if profile exists
            let existingProfiles: [Profile] = try await SupabaseService.shared.client
                .from("profiles")
                .select()
                .eq("id", value: userId.uuidString)
                .execute()
                .value

            if !existingProfiles.isEmpty {
                print("✅ [TripsViewModel] Profile exists for user \(userId)")
                return true
            }

            // Profile doesn't exist, create it
            print("📝 [TripsViewModel] Creating profile for user \(userId)")

            // Get user metadata from auth
            let session = try await SupabaseService.shared.client.auth.session
            let userMetadata = session.user.userMetadata

            let fullName = userMetadata["full_name"]?.stringValue ?? "User"
            let username = userMetadata["username"]?.stringValue

            struct CreateProfile: Encodable {
                let id: UUID
                let fullName: String
                let username: String?

                enum CodingKeys: String, CodingKey {
                    case id
                    case fullName = "full_name"
                    case username
                }
            }

            let newProfile = CreateProfile(id: userId, fullName: fullName, username: username)

            try await SupabaseService.shared.client
                .from("profiles")
                .insert(newProfile)
                .execute()

            print("✅ [TripsViewModel] Profile created successfully")
            return true
        } catch {
            print("❌ [TripsViewModel] Error ensuring profile exists: \(error)")
            errorMessage = "Failed to create user profile: \(error.localizedDescription)"
            return false
        }
    }

    func isOwner(of trip: Trip) -> Bool {
        guard let userId = cachedUserId else { return false }
        return trip.ownerId == userId
    }

    // MARK: - Computed Properties

    var upcomingTrips: [Trip] {
        // Include trips that are upcoming, current, OR have flexible/no dates (not past)
        trips.filter { trip in
            // If trip has no dates, show in upcoming (it's planned but not past)
            if trip.startDate == nil {
                return true
            }
            // Otherwise check if upcoming or current
            return trip.isUpcoming || trip.isCurrent
        }
        .sorted { ($0.startDate ?? .distantFuture) < ($1.startDate ?? .distantFuture) }
    }

    var pastTrips: [Trip] {
        trips.filter { trip in
            // Only show as past if we have dates AND the trip has ended
            guard let endDate = trip.endDate else { return false }
            return endDate < Date()
        }
        .sorted { ($0.endDate ?? .distantPast) > ($1.endDate ?? .distantPast) }
    }

    var pendingInvitations: [Trip] {
        guard let userId = cachedUserId else { return [] }
        return trips.filter { trip in
            trip.ownerId != userId &&
            trip.participants?.contains { $0.userId == userId && $0.status == .invited } == true
        }
    }

    // MARK: - Fetch Trips

    func fetchTrips() async {
        guard let userId = await getCurrentUserId() else {
            errorMessage = "Not authenticated"
            return
        }

        isLoading = true
        errorMessage = nil

        do {
            // Fetch trips where user is owner
            let ownedTrips: [Trip] = try await SupabaseService.shared.client
                .from("trips")
                .select("*, trip_locations(*, cities(*, countries(*))), trip_participants(*, profiles:profiles!trip_participants_user_id_fkey(*)), trip_recommendations(*)")
                .eq("user_id", value: userId.uuidString)
                .execute()
                .value

            // Fetch trips where user is a participant
            let participatingTrips: [Trip] = try await SupabaseService.shared.client
                .from("trips")
                .select("*, trip_locations(*, cities(*, countries(*))), trip_participants!inner(*, profiles:profiles!trip_participants_user_id_fkey(*)), trip_recommendations(*)")
                .eq("trip_participants.user_id", value: userId.uuidString)
                .neq("user_id", value: userId.uuidString)
                .execute()
                .value

            // Combine and deduplicate
            var allTrips = ownedTrips
            for trip in participatingTrips {
                if !allTrips.contains(where: { $0.id == trip.id }) {
                    allTrips.append(trip)
                }
            }

            trips = allTrips
            print("✅ [TripsViewModel] Fetched \(trips.count) trips")
        } catch {
            print("❌ [TripsViewModel] Error fetching trips: \(error)")
            print("❌ [TripsViewModel] Full error: \(String(describing: error))")
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    // MARK: - Fetch Single Trip

    func fetchTrip(id: UUID) async {
        isLoading = true

        do {
            let trip: Trip = try await SupabaseService.shared.client
                .from("trips")
                .select("*, trip_locations(*, cities(*, countries(*))), trip_participants(*, profiles:profiles!trip_participants_user_id_fkey(*)), trip_recommendations(*)")
                .eq("id", value: id.uuidString)
                .single()
                .execute()
                .value

            selectedTrip = trip

            if let index = trips.firstIndex(where: { $0.id == id }) {
                trips[index] = trip
            }
        } catch {
            print("❌ [TripsViewModel] Error fetching trip: \(error)")
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    // MARK: - Fetch Cities

    func fetchCities(search: String = "") async {
        do {
            print("[TripsViewModel] Searching cities: '\(search)'")

            let query = SupabaseService.shared.client
                .from("cities")
                .select("*, countries(*)")

            let results: [City]
            if !search.isEmpty {
                results = try await query
                    .ilike("name", pattern: "%\(search)%")
                    .limit(20)
                    .execute()
                    .value
            } else {
                results = try await query
                    .limit(20)
                    .execute()
                    .value
            }

            cities = results
            print("[TripsViewModel] Fetched \(cities.count) cities")

            if cities.isEmpty && !search.isEmpty {
                print("[TripsViewModel] No cities found for '\(search)'")
            }
        } catch {
            print("[TripsViewModel] Error fetching cities: \(error)")
            // Try without the join in case countries relationship fails
            do {
                let fallbackResults: [City] = try await SupabaseService.shared.client
                    .from("cities")
                    .select()
                    .ilike("name", pattern: "%\(search)%")
                    .limit(20)
                    .execute()
                    .value
                cities = fallbackResults
                print("[TripsViewModel] Fallback fetched \(cities.count) cities")
            } catch {
                print("[TripsViewModel] Fallback also failed: \(error)")
            }
        }
    }

    // MARK: - Fetch Trip Types

    func fetchTripTypes() async {
        do {
            tripTypes = try await SupabaseService.shared.client
                .from("trip_types")
                .select()
                .execute()
                .value
            print("✅ [TripsViewModel] Fetched \(tripTypes.count) trip types")
        } catch {
            print("❌ [TripsViewModel] Error fetching trip types: \(error)")
        }
    }

    // MARK: - Create Trip

    /// Destination for trip creation - can be a city from DB or custom text
    struct TripDestination: Identifiable, Hashable {
        let id = UUID()
        var city: City?
        var customLocation: String?
        var startDate: Date?
        var endDate: Date?

        var displayName: String {
            city?.displayName ?? customLocation ?? "Unknown"
        }

        var flagEmoji: String? {
            city?.country?.flagEmoji
        }

        var hasDates: Bool {
            startDate != nil && endDate != nil
        }

        var dateRangeText: String {
            guard let start = startDate, let end = endDate else {
                return "Dates not set"
            }
            let formatter = DateFormatter()
            formatter.dateFormat = "MMM d"
            return "\(formatter.string(from: start)) - \(formatter.string(from: end))"
        }
    }

    func createTrip(
        name: String,
        description: String?,
        startDate: Date?,
        endDate: Date?,
        isFlexible: Bool,
        visibility: VisibilityLevel,
        destinations: [TripDestination]
    ) async -> Trip? {
        guard let userId = await getCurrentUserId() else {
            errorMessage = "Not authenticated"
            print("❌ [TripsViewModel] Not authenticated")
            return nil
        }

        isLoading = true
        errorMessage = nil

        // Ensure user has a profile before creating trip
        guard await ensureProfileExists(userId: userId) else {
            isLoading = false
            return nil
        }

        do {
            // 1. Create the trip
            let newTrip = CreateTrip(
                userId: userId,
                name: name,
                description: description,
                startDate: startDate,
                endDate: endDate,
                isFlexible: isFlexible,
                visibility: visibility
            )

            print("📝 [TripsViewModel] Creating trip: \(name)")
            print("📝 [TripsViewModel] userId: \(userId)")
            print("📝 [TripsViewModel] startDate: \(String(describing: startDate))")
            print("📝 [TripsViewModel] endDate: \(String(describing: endDate))")
            print("📝 [TripsViewModel] isFlexible: \(isFlexible)")
            print("📝 [TripsViewModel] visibility: \(visibility.rawValue)")

            // Debug: print JSON being sent
            let encoder = JSONEncoder()
            encoder.dateEncodingStrategy = .iso8601
            if let jsonData = try? encoder.encode(newTrip),
               let jsonString = String(data: jsonData, encoding: .utf8) {
                print("📝 [TripsViewModel] JSON payload: \(jsonString)")
            }

            let createdTrip: Trip = try await SupabaseService.shared.client
                .from("trips")
                .insert(newTrip)
                .select()
                .single()
                .execute()
                .value

            print("✅ [TripsViewModel] Trip created with ID: \(createdTrip.id)")

            // 2. Add all locations
            for (index, destination) in destinations.enumerated() {
                var countryId: UUID? = nil
                if let city = destination.city {
                    countryId = city.countryId
                }

                let location = CreateTripLocation(
                    tripId: createdTrip.id,
                    countryId: countryId,
                    cityId: destination.city?.id,
                    customLocation: destination.city == nil ? destination.customLocation : nil,
                    orderIndex: index
                )

                try await SupabaseService.shared.client
                    .from("trip_locations")
                    .insert(location)
                    .execute()

                print("✅ [TripsViewModel] Added location: \(destination.displayName)")
            }

            // 3. Fetch the complete trip with relationships
            await fetchTrip(id: createdTrip.id)

            if let fullTrip = selectedTrip {
                trips.insert(fullTrip, at: 0)
                isLoading = false
                print("✅ [TripsViewModel] Trip creation complete!")
                return fullTrip
            }

            isLoading = false
            return createdTrip
        } catch {
            // Print full error details
            print("❌ [TripsViewModel] Error creating trip: \(error)")
            print("❌ [TripsViewModel] Error type: \(type(of: error))")
            print("❌ [TripsViewModel] Full error description: \(String(describing: error))")

            // Get the most descriptive error message possible
            let errorString = String(describing: error)
            errorMessage = errorString

            // Try to make it more user-friendly
            if errorString.contains("JWTExpired") || errorString.contains("invalid token") || errorString.contains("not authenticated") {
                errorMessage = "Session expired. Please sign in again."
            } else if errorString.contains("permission denied") || errorString.contains("policy") || errorString.contains("row-level security") {
                errorMessage = "Permission denied. RLS policy may be blocking this action."
            } else if errorString.contains("violates") || errorString.contains("constraint") {
                errorMessage = "Database constraint error: \(errorString)"
            } else if errorString.contains("null value") {
                errorMessage = "Missing required field: \(errorString)"
            }

            isLoading = false
            return nil
        }
    }

    // Legacy single-destination method for compatibility
    func createTrip(
        name: String,
        description: String?,
        startDate: Date?,
        endDate: Date?,
        isFlexible: Bool,
        visibility: VisibilityLevel,
        cityId: UUID?,
        customLocation: String?
    ) async -> Trip? {
        var destinations: [TripDestination] = []

        if let cityId = cityId, let city = cities.first(where: { $0.id == cityId }) {
            destinations.append(TripDestination(city: city, customLocation: nil))
        } else if let customLocation = customLocation, !customLocation.isEmpty {
            destinations.append(TripDestination(city: nil, customLocation: customLocation))
        }

        return await createTrip(
            name: name,
            description: description,
            startDate: startDate,
            endDate: endDate,
            isFlexible: isFlexible,
            visibility: visibility,
            destinations: destinations
        )
    }

    // MARK: - Update Trip

    func updateTrip(
        id: UUID,
        name: String,
        description: String?,
        startDate: Date?,
        endDate: Date?,
        isFlexible: Bool,
        visibility: VisibilityLevel
    ) async -> Bool {
        isLoading = true
        errorMessage = nil

        do {
            let updates = UpdateTrip(
                name: name,
                description: description,
                startDate: startDate,
                endDate: endDate,
                isFlexible: isFlexible,
                visibility: visibility
            )

            try await SupabaseService.shared.client
                .from("trips")
                .update(updates)
                .eq("id", value: id.uuidString)
                .execute()

            await fetchTrip(id: id)
            isLoading = false
            return true
        } catch {
            print("❌ [TripsViewModel] Error updating trip: \(error)")
            errorMessage = error.localizedDescription
            isLoading = false
            return false
        }
    }

    // MARK: - Delete Trip

    func deleteTrip(id: UUID) async -> Bool {
        isLoading = true
        errorMessage = nil

        do {
            try await SupabaseService.shared.client
                .from("trips")
                .delete()
                .eq("id", value: id.uuidString)
                .execute()

            trips.removeAll { $0.id == id }
            isLoading = false
            return true
        } catch {
            print("❌ [TripsViewModel] Error deleting trip: \(error)")
            errorMessage = error.localizedDescription
            isLoading = false
            return false
        }
    }

    // MARK: - Trip Locations

    func addLocation(tripId: UUID, cityId: UUID?, customLocation: String?, orderIndex: Int) async -> Bool {
        do {
            var countryId: UUID? = nil
            if let cityId = cityId, let city = cities.first(where: { $0.id == cityId }) {
                countryId = city.countryId
            }

            let location = CreateTripLocation(
                tripId: tripId,
                countryId: countryId,
                cityId: cityId,
                customLocation: customLocation,
                orderIndex: orderIndex
            )

            try await SupabaseService.shared.client
                .from("trip_locations")
                .insert(location)
                .execute()

            await fetchTrip(id: tripId)
            return true
        } catch {
            print("❌ [TripsViewModel] Error adding location: \(error)")
            errorMessage = error.localizedDescription
            return false
        }
    }

    func removeLocation(id: UUID, tripId: UUID) async -> Bool {
        do {
            try await SupabaseService.shared.client
                .from("trip_locations")
                .delete()
                .eq("id", value: id.uuidString)
                .execute()

            await fetchTrip(id: tripId)
            return true
        } catch {
            print("❌ [TripsViewModel] Error removing location: \(error)")
            return false
        }
    }

    // MARK: - Participants

    func inviteParticipant(tripId: UUID, userId: UUID) async -> Bool {
        do {
            let invite = InviteParticipant(tripId: tripId, userId: userId)

            try await SupabaseService.shared.client
                .from("trip_participants")
                .insert(invite)
                .execute()

            await fetchTrip(id: tripId)
            return true
        } catch {
            print("❌ [TripsViewModel] Error inviting participant: \(error)")
            errorMessage = error.localizedDescription
            return false
        }
    }

    func updateParticipationStatus(participantId: UUID, tripId: UUID, status: ParticipationStatus) async -> Bool {
        do {
            let update = UpdateParticipantStatus(status: status, respondedAt: Date())

            try await SupabaseService.shared.client
                .from("trip_participants")
                .update(update)
                .eq("id", value: participantId.uuidString)
                .execute()

            await fetchTrip(id: tripId)
            return true
        } catch {
            print("❌ [TripsViewModel] Error updating participation: \(error)")
            errorMessage = error.localizedDescription
            return false
        }
    }

    func respondToInvitation(tripId: UUID, accept: Bool) async -> Bool {
        guard let userId = cachedUserId else { return false }

        guard let trip = trips.first(where: { $0.id == tripId }),
              let participant = trip.participants?.first(where: { $0.userId == userId }) else {
            return false
        }

        let status: ParticipationStatus = accept ? .confirmed : .declined
        return await updateParticipationStatus(participantId: participant.id, tripId: tripId, status: status)
    }

    // MARK: - Invite with Location Selection

    func inviteParticipantWithLocations(tripId: UUID, userId: UUID, locationIds: [UUID]?) async -> Bool {
        do {
            // Create the participant record
            let invite = InviteParticipant(tripId: tripId, userId: userId)

            let createdParticipant: TripParticipant = try await SupabaseService.shared.client
                .from("trip_participants")
                .insert(invite)
                .select()
                .single()
                .execute()
                .value

            print("✅ [TripsViewModel] Created participant: \(createdParticipant.id)")

            // Add location-level participation if locations are specified
            if let locationIds = locationIds, !locationIds.isEmpty {
                for locationId in locationIds {
                    let locationParticipation = CreateTripParticipantLocation(
                        participantId: createdParticipant.id,
                        locationId: locationId
                    )

                    try await SupabaseService.shared.client
                        .from("trip_participant_locations")
                        .insert(locationParticipation)
                        .execute()
                }
                print("✅ [TripsViewModel] Added \(locationIds.count) location participations")
            }

            await fetchTrip(id: tripId)
            return true
        } catch {
            print("❌ [TripsViewModel] Error inviting participant with locations: \(error)")
            errorMessage = error.localizedDescription
            return false
        }
    }

    // MARK: - Respond to Location-Level Invitation

    func respondToLocationInvitation(participantLocationId: UUID, tripId: UUID, accept: Bool) async -> Bool {
        do {
            let status: ParticipationStatus = accept ? .confirmed : .declined
            let update = UpdateTripParticipantLocation(status: status)

            try await SupabaseService.shared.client
                .from("trip_participant_locations")
                .update(update)
                .eq("id", value: participantLocationId.uuidString)
                .execute()

            await fetchTrip(id: tripId)
            return true
        } catch {
            print("❌ [TripsViewModel] Error updating location participation: \(error)")
            errorMessage = error.localizedDescription
            return false
        }
    }

    // MARK: - Recommendations

    func addRecommendation(
        tripId: UUID,
        title: String,
        description: String?,
        category: RecommendationCategory,
        locationId: UUID? = nil,
        googlePlaceId: String? = nil
    ) async -> Bool {
        guard let userId = await getCurrentUserId() else {
            errorMessage = "Not authenticated"
            return false
        }

        do {
            let recommendation = CreateTripRecommendation(
                tripId: tripId,
                userId: userId,
                locationId: locationId,
                title: title,
                description: description,
                category: category,
                googlePlaceId: googlePlaceId
            )

            try await SupabaseService.shared.client
                .from("trip_recommendations")
                .insert(recommendation)
                .execute()

            await fetchTrip(id: tripId)
            return true
        } catch {
            print("❌ [TripsViewModel] Error adding recommendation: \(error)")
            errorMessage = error.localizedDescription
            return false
        }
    }

    func deleteRecommendation(id: UUID, tripId: UUID) async -> Bool {
        do {
            try await SupabaseService.shared.client
                .from("trip_recommendations")
                .delete()
                .eq("id", value: id.uuidString)
                .execute()

            await fetchTrip(id: tripId)
            return true
        } catch {
            print("❌ [TripsViewModel] Error deleting recommendation: \(error)")
            errorMessage = error.localizedDescription
            return false
        }
    }

    // MARK: - Friends

    func fetchFriends() async {
        guard let userId = await getCurrentUserId() else { return }

        do {
            let asRequester: [Friendship] = try await SupabaseService.shared.client
                .from("friendships")
                .select("*, addressee:profiles!friendships_addressee_id_fkey(*)")
                .eq("requester_id", value: userId.uuidString)
                .eq("status", value: "accepted")
                .execute()
                .value

            let asAddressee: [Friendship] = try await SupabaseService.shared.client
                .from("friendships")
                .select("*, requester:profiles!friendships_requester_id_fkey(*)")
                .eq("addressee_id", value: userId.uuidString)
                .eq("status", value: "accepted")
                .execute()
                .value

            var friendProfiles: [Profile] = []

            for friendship in asRequester {
                if let profile = friendship.addressee {
                    friendProfiles.append(profile)
                }
            }

            for friendship in asAddressee {
                if let profile = friendship.requester {
                    friendProfiles.append(profile)
                }
            }

            friends = friendProfiles
        } catch {
            print("❌ [TripsViewModel] Error fetching friends: \(error)")
        }
    }
}
