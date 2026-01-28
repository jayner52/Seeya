import Foundation
import Supabase

@Observable
@MainActor
final class ProfileViewModel {
    var profile: Profile?
    var trips: [Trip] = []
    var friends: [Profile] = []
    var wanderlistItems: [WanderlistItem] = []
    var savedRecommendations: [SavedRecommendation] = []
    var continents: [Continent] = []
    var countries: [Country] = []
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

    // MARK: - Computed Stats

    var tripCount: Int {
        trips.count
    }

    var recommendationCount: Int {
        trips.reduce(0) { $0 + ($1.recommendations?.count ?? 0) }
    }

    var countriesVisitedCount: Int {
        let pastTrips = trips.filter { trip in
            guard let endDate = trip.endDate else { return false }
            return endDate < Date()
        }
        var countryIds = Set<UUID>()
        for trip in pastTrips {
            if let locations = trip.locations {
                for location in locations {
                    if let countryId = location.countryId {
                        countryIds.insert(countryId)
                    }
                }
            }
        }
        return countryIds.count
    }

    var citiesVisitedCount: Int {
        let pastTrips = trips.filter { trip in
            guard let endDate = trip.endDate else { return false }
            return endDate < Date()
        }
        var cityIds = Set<UUID>()
        for trip in pastTrips {
            if let locations = trip.locations {
                for location in locations {
                    if let cityId = location.cityId {
                        cityIds.insert(cityId)
                    }
                }
            }
        }
        return cityIds.count
    }

    var upcomingTrips: [Trip] {
        trips.filter { trip in
            if trip.startDate == nil {
                return true
            }
            return trip.isUpcoming || trip.isCurrent
        }
        .sorted { ($0.startDate ?? .distantFuture) < ($1.startDate ?? .distantFuture) }
    }

    var pastTrips: [Trip] {
        trips.filter { trip in
            guard let endDate = trip.endDate else { return false }
            return endDate < Date()
        }
        .sorted { ($0.endDate ?? .distantPast) > ($1.endDate ?? .distantPast) }
    }

    // Group wanderlist by continent (supports both countries and cities/places)
    var wanderlistByContinent: [Continent: [WanderlistItem]] {
        var grouped: [Continent: [WanderlistItem]] = [:]
        for item in wanderlistItems {
            // Try to get continent from country first, then from city's country
            if let continent = item.continent {
                grouped[continent, default: []].append(item)
            }
            // Note: Places without a known continent won't appear in grouped view
            // They'll appear in ungroupedWanderlistItems
        }
        return grouped
    }

    /// Items that don't have a known continent (e.g., Google Places cities)
    var ungroupedWanderlistItems: [WanderlistItem] {
        wanderlistItems.filter { $0.continent == nil }
    }

    var continentsWithWanderlist: [Continent] {
        Array(wanderlistByContinent.keys).sorted { ($0.orderIndex ?? 0) < ($1.orderIndex ?? 0) }
    }

    var wanderlistContinentCount: Int {
        continentsWithWanderlist.count
    }

    /// Total count of all wanderlist items
    var totalWanderlistCount: Int {
        wanderlistItems.count
    }

    // MARK: - Fetch All Data

    func fetchAllData() async {
        isLoading = true
        errorMessage = nil

        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.fetchProfile() }
            group.addTask { await self.fetchTrips() }
            group.addTask { await self.fetchFriends() }
            group.addTask { await self.fetchWanderlist() }
            group.addTask { await self.fetchSavedRecommendations() }
            group.addTask { await self.fetchContinents() }
        }

        isLoading = false
    }

    // MARK: - Fetch Profile

    func fetchProfile() async {
        guard let userId = await getCurrentUserId() else {
            errorMessage = "Not authenticated"
            return
        }

        do {
            let profiles: [Profile] = try await SupabaseService.shared.client
                .from("profiles")
                .select()
                .eq("id", value: userId.uuidString)
                .execute()
                .value

            profile = profiles.first
            print("✅ [ProfileViewModel] Fetched profile: \(profile?.fullName ?? "nil")")
        } catch {
            print("❌ [ProfileViewModel] Error fetching profile: \(error)")
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Fetch Trips

    func fetchTrips() async {
        guard let userId = await getCurrentUserId() else { return }

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
            print("✅ [ProfileViewModel] Fetched \(trips.count) trips")
        } catch {
            print("❌ [ProfileViewModel] Error fetching trips: \(error)")
        }
    }

    // MARK: - Fetch Friends

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
            print("✅ [ProfileViewModel] Fetched \(friends.count) friends")
        } catch {
            print("❌ [ProfileViewModel] Error fetching friends: \(error)")
        }
    }

    // MARK: - Wanderlist

    func fetchWanderlist() async {
        guard let userId = await getCurrentUserId() else {
            errorMessage = "Not authenticated for wanderlist fetch"
            return
        }

        do {
            // Fetch all columns from wanderlist_items using Supabase's built-in decoder
            wanderlistItems = try await SupabaseService.shared.client
                .from("wanderlist_items")
                .select()
                .eq("user_id", value: userId.uuidString)
                .execute()
                .value

            print("✅ [ProfileViewModel] Fetched \(wanderlistItems.count) wanderlist items")
        } catch let decodingError as DecodingError {
            print("❌ [ProfileViewModel] Decoding error in fetchWanderlist:")
            switch decodingError {
            case .typeMismatch(let type, let context):
                print("   Type mismatch: expected \(type), path: \(context.codingPath.map { $0.stringValue }.joined(separator: "."))")
            case .valueNotFound(let type, let context):
                print("   Value not found: \(type), path: \(context.codingPath.map { $0.stringValue }.joined(separator: "."))")
            case .keyNotFound(let key, let context):
                print("   Key not found: \(key.stringValue), path: \(context.codingPath.map { $0.stringValue }.joined(separator: "."))")
            case .dataCorrupted(let context):
                print("   Data corrupted: \(context.debugDescription)")
            @unknown default:
                print("   Unknown decoding error: \(decodingError)")
            }
        } catch {
            print("❌ [ProfileViewModel] Error fetching wanderlist: \(error)")
        }
    }

    func addCountryToWanderlist(countryId: UUID, notes: String? = nil) async -> Bool {
        guard let userId = await getCurrentUserId() else {
            errorMessage = "Not authenticated"
            return false
        }

        do {
            let item = CreateCountryWanderlistItem(userId: userId, countryId: countryId, notes: notes)

            try await SupabaseService.shared.client
                .from("wanderlist_items")
                .insert(item)
                .execute()

            await fetchWanderlist()
            print("✅ [ProfileViewModel] Added country to wanderlist")
            return true
        } catch {
            print("❌ [ProfileViewModel] Error adding country to wanderlist: \(error)")
            errorMessage = error.localizedDescription
            return false
        }
    }

    func addPlaceToWanderlist(placeName: String, placeId: String, notes: String? = nil) async -> Bool {
        guard let userId = await getCurrentUserId() else {
            errorMessage = "Not authenticated"
            return false
        }

        // Note: This requires adding place_name and place_id columns to the wanderlist_items table
        do {
            let item = CreatePlaceWanderlistItem(userId: userId, placeName: placeName, placeId: placeId, notes: notes)

            try await SupabaseService.shared.client
                .from("wanderlist_items")
                .insert(item)
                .execute()

            await fetchWanderlist()
            print("✅ [ProfileViewModel] Added place to wanderlist: \(placeName)")
            return true
        } catch {
            print("❌ [ProfileViewModel] Error adding place to wanderlist: \(error)")
            print("⚠️ Make sure your wanderlist_items table has place_name and place_id columns")
            errorMessage = error.localizedDescription
            return false
        }
    }

    func removeFromWanderlist(itemId: UUID) async -> Bool {
        do {
            try await SupabaseService.shared.client
                .from("wanderlist_items")
                .delete()
                .eq("id", value: itemId.uuidString)
                .execute()

            wanderlistItems.removeAll { $0.id == itemId }
            print("✅ [ProfileViewModel] Removed item from wanderlist")
            return true
        } catch {
            print("❌ [ProfileViewModel] Error removing from wanderlist: \(error)")
            errorMessage = error.localizedDescription
            return false
        }
    }

    /// Check if a place is already in the wanderlist
    func isPlaceInWanderlist(placeId: String) -> Bool {
        wanderlistItems.contains { $0.placeId == placeId }
    }

    // MARK: - Saved Recommendations

    func fetchSavedRecommendations() async {
        guard let userId = await getCurrentUserId() else { return }

        do {
            savedRecommendations = try await SupabaseService.shared.client
                .from("saved_recommendations")
                .select("*, trip_recommendations(*)")
                .eq("user_id", value: userId.uuidString)
                .execute()
                .value

            print("✅ [ProfileViewModel] Fetched \(savedRecommendations.count) saved recommendations")
        } catch {
            print("❌ [ProfileViewModel] Error fetching saved recommendations: \(error)")
        }
    }

    func saveRecommendation(recommendationId: UUID) async -> Bool {
        guard let userId = await getCurrentUserId() else {
            errorMessage = "Not authenticated"
            return false
        }

        do {
            let saved = CreateSavedRecommendation(userId: userId, sharedRecommendationId: recommendationId)

            try await SupabaseService.shared.client
                .from("saved_recommendations")
                .insert(saved)
                .execute()

            await fetchSavedRecommendations()
            print("✅ [ProfileViewModel] Saved recommendation")
            return true
        } catch {
            print("❌ [ProfileViewModel] Error saving recommendation: \(error)")
            errorMessage = error.localizedDescription
            return false
        }
    }

    func unsaveRecommendation(savedId: UUID) async -> Bool {
        do {
            try await SupabaseService.shared.client
                .from("saved_recommendations")
                .delete()
                .eq("id", value: savedId.uuidString)
                .execute()

            savedRecommendations.removeAll { $0.id == savedId }
            print("✅ [ProfileViewModel] Unsaved recommendation")
            return true
        } catch {
            print("❌ [ProfileViewModel] Error unsaving recommendation: \(error)")
            errorMessage = error.localizedDescription
            return false
        }
    }

    // MARK: - Continents & Countries

    func fetchContinents() async {
        do {
            continents = try await SupabaseService.shared.client
                .from("continents")
                .select()
                .order("order_index")
                .execute()
                .value

            print("✅ [ProfileViewModel] Fetched \(continents.count) continents")
        } catch {
            print("❌ [ProfileViewModel] Error fetching continents: \(error)")
        }
    }

    func fetchCountries(search: String = "") async {
        do {
            let query = SupabaseService.shared.client
                .from("countries")
                .select("*, continents(*)")

            if !search.isEmpty {
                countries = try await query
                    .ilike("name", pattern: "%\(search)%")
                    .order("name")
                    .limit(50)
                    .execute()
                    .value
            } else {
                countries = try await query
                    .order("name")
                    .limit(50)
                    .execute()
                    .value
            }

            print("✅ [ProfileViewModel] Fetched \(countries.count) countries")
        } catch {
            print("❌ [ProfileViewModel] Error fetching countries: \(error)")
        }
    }

    // MARK: - Update Profile

    func updateProfile(fullName: String, username: String?, bio: String?) async -> Bool {
        guard let userId = await getCurrentUserId() else {
            errorMessage = "Not authenticated"
            return false
        }

        do {
            struct UpdateProfileData: Encodable {
                let fullName: String
                let username: String?
                let bio: String?

                enum CodingKeys: String, CodingKey {
                    case fullName = "full_name"
                    case username
                    case bio
                }
            }

            let updates = UpdateProfileData(fullName: fullName, username: username, bio: bio)

            try await SupabaseService.shared.client
                .from("profiles")
                .update(updates)
                .eq("id", value: userId.uuidString)
                .execute()

            await fetchProfile()
            print("✅ [ProfileViewModel] Profile updated")
            return true
        } catch {
            print("❌ [ProfileViewModel] Error updating profile: \(error)")
            errorMessage = error.localizedDescription
            return false
        }
    }

    func uploadAvatar(imageData: Data) async -> String? {
        guard let userId = await getCurrentUserId() else {
            errorMessage = "Not authenticated"
            return nil
        }

        do {
            let fileName = "\(userId.uuidString)/avatar.jpg"

            try await SupabaseService.shared.client.storage
                .from("avatars")
                .upload(
                    fileName,
                    data: imageData,
                    options: FileOptions(contentType: "image/jpeg", upsert: true)
                )

            let publicURL = try SupabaseService.shared.client.storage
                .from("avatars")
                .getPublicURL(path: fileName)

            // Update profile with new avatar URL
            struct UpdateAvatar: Encodable {
                let avatarUrl: String

                enum CodingKeys: String, CodingKey {
                    case avatarUrl = "avatar_url"
                }
            }

            let update = UpdateAvatar(avatarUrl: publicURL.absoluteString)

            try await SupabaseService.shared.client
                .from("profiles")
                .update(update)
                .eq("id", value: userId.uuidString)
                .execute()

            await fetchProfile()
            print("✅ [ProfileViewModel] Avatar uploaded and profile updated")
            return publicURL.absoluteString
        } catch {
            print("❌ [ProfileViewModel] Error uploading avatar: \(error)")
            errorMessage = error.localizedDescription
            return nil
        }
    }

    // MARK: - Check if country is in wanderlist

    func isInWanderlist(countryId: UUID) -> Bool {
        wanderlistItems.contains { $0.countryId == countryId }
    }
}
