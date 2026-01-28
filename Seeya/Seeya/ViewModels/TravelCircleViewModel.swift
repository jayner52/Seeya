import Foundation
import Supabase

@Observable
@MainActor
final class TravelCircleViewModel {
    var travelPals: [Profile] = []
    var tripmates: [Profile] = []
    var pendingRequests: [Friendship] = []
    var sentRequests: [Friendship] = []
    var searchResults: [Profile] = []
    var searchText = ""
    var isLoading = false
    var errorMessage: String?

    private var cachedUserId: UUID?
    private var friendIds: Set<UUID> = []

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

    var filteredTravelPals: [Profile] {
        if searchText.isEmpty {
            return travelPals
        }
        return travelPals.filter {
            $0.fullName.localizedCaseInsensitiveContains(searchText) ||
            ($0.username?.localizedCaseInsensitiveContains(searchText) ?? false)
        }
    }

    var filteredTripmates: [Profile] {
        if searchText.isEmpty {
            return tripmates
        }
        return tripmates.filter {
            $0.fullName.localizedCaseInsensitiveContains(searchText) ||
            ($0.username?.localizedCaseInsensitiveContains(searchText) ?? false)
        }
    }

    var hasPendingRequests: Bool {
        !pendingRequests.isEmpty
    }

    var pendingRequestCount: Int {
        pendingRequests.count
    }

    // MARK: - Fetch All Data

    func fetchAllData() async {
        isLoading = true
        errorMessage = nil

        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.fetchTravelPals() }
            group.addTask { await self.fetchPendingRequests() }
            group.addTask { await self.fetchSentRequests() }
        }

        // Fetch tripmates after pals so we have friendIds populated
        await fetchTripmates()

        isLoading = false
    }

    // MARK: - Fetch Travel Pals

    func fetchTravelPals() async {
        guard let userId = await getCurrentUserId() else {
            errorMessage = "Not authenticated"
            return
        }

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

            var palProfiles: [Profile] = []
            var ids: Set<UUID> = []

            for friendship in asRequester {
                if let profile = friendship.addressee {
                    palProfiles.append(profile)
                    ids.insert(profile.id)
                }
            }

            for friendship in asAddressee {
                if let profile = friendship.requester {
                    palProfiles.append(profile)
                    ids.insert(profile.id)
                }
            }

            travelPals = palProfiles.sorted { $0.fullName < $1.fullName }
            friendIds = ids
            print("✅ [TravelCircleViewModel] Fetched \(travelPals.count) travel pals")
        } catch {
            print("❌ [TravelCircleViewModel] Error fetching travel pals: \(error)")
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Fetch Tripmates

    func fetchTripmates() async {
        guard let userId = await getCurrentUserId() else { return }

        do {
            // Get trips where the user is an owner
            let ownedTrips: [Trip] = try await SupabaseService.shared.client
                .from("trips")
                .select("id")
                .eq("user_id", value: userId.uuidString)
                .execute()
                .value

            // Get trips where the user is a participant
            let participatingTrips: [TripParticipant] = try await SupabaseService.shared.client
                .from("trip_participants")
                .select("trip_id")
                .eq("user_id", value: userId.uuidString)
                .eq("status", value: "confirmed")
                .execute()
                .value

            // Combine trip IDs
            var tripIds = Set(ownedTrips.map { $0.id })
            participatingTrips.forEach { tripIds.insert($0.tripId) }

            guard !tripIds.isEmpty else {
                tripmates = []
                return
            }

            // Get all participants from these trips
            let allParticipants: [TripParticipant] = try await SupabaseService.shared.client
                .from("trip_participants")
                .select("*, profiles:profiles!trip_participants_user_id_fkey(*)")
                .in("trip_id", values: tripIds.map { $0.uuidString })
                .eq("status", value: "confirmed")
                .execute()
                .value

            // Also get trip owners
            let tripOwners: [Trip] = try await SupabaseService.shared.client
                .from("trips")
                .select("user_id, profiles:profiles!trips_user_id_fkey(*)")
                .in("id", values: tripIds.map { $0.uuidString })
                .execute()
                .value

            // Collect profiles, excluding self and friends
            var tripmateProfiles: [Profile] = []
            var seenIds: Set<UUID> = []

            for participant in allParticipants {
                guard let profile = participant.user,
                      profile.id != userId,
                      !friendIds.contains(profile.id),
                      !seenIds.contains(profile.id) else { continue }
                tripmateProfiles.append(profile)
                seenIds.insert(profile.id)
            }

            // Include trip owners as tripmates
            for trip in tripOwners {
                if let owner = trip.owner,
                   owner.id != userId,
                   !friendIds.contains(owner.id),
                   !seenIds.contains(owner.id) {
                    tripmateProfiles.append(owner)
                    seenIds.insert(owner.id)
                }
            }

            tripmates = tripmateProfiles.sorted { $0.fullName < $1.fullName }
            print("✅ [TravelCircleViewModel] Fetched \(tripmates.count) tripmates")
        } catch {
            print("❌ [TravelCircleViewModel] Error fetching tripmates: \(error)")
        }
    }

    // MARK: - Fetch Pending Requests

    func fetchPendingRequests() async {
        guard let userId = await getCurrentUserId() else { return }

        do {
            pendingRequests = try await SupabaseService.shared.client
                .from("friendships")
                .select("*, requester:profiles!friendships_requester_id_fkey(*)")
                .eq("addressee_id", value: userId.uuidString)
                .eq("status", value: "pending")
                .execute()
                .value

            print("✅ [TravelCircleViewModel] Fetched \(pendingRequests.count) pending requests")
        } catch {
            print("❌ [TravelCircleViewModel] Error fetching pending requests: \(error)")
        }
    }

    // MARK: - Fetch Sent Requests

    func fetchSentRequests() async {
        guard let userId = await getCurrentUserId() else { return }

        do {
            sentRequests = try await SupabaseService.shared.client
                .from("friendships")
                .select("*, addressee:profiles!friendships_addressee_id_fkey(*)")
                .eq("requester_id", value: userId.uuidString)
                .eq("status", value: "pending")
                .execute()
                .value

            print("✅ [TravelCircleViewModel] Fetched \(sentRequests.count) sent requests")
        } catch {
            print("❌ [TravelCircleViewModel] Error fetching sent requests: \(error)")
        }
    }

    // MARK: - Search Users

    func searchUsers(query: String) async {
        guard !query.isEmpty else {
            searchResults = []
            return
        }

        guard let userId = await getCurrentUserId() else { return }

        do {
            let results: [Profile] = try await SupabaseService.shared.client
                .from("profiles")
                .select()
                .or("full_name.ilike.%\(query)%,username.ilike.%\(query)%")
                .neq("id", value: userId.uuidString)
                .limit(20)
                .execute()
                .value

            // Filter out existing friends and pending requests
            let existingIds = friendIds.union(Set(sentRequests.map { $0.addresseeId }))
            searchResults = results.filter { !existingIds.contains($0.id) }

            print("✅ [TravelCircleViewModel] Found \(searchResults.count) users for query: \(query)")
        } catch {
            print("❌ [TravelCircleViewModel] Error searching users: \(error)")
        }
    }

    // MARK: - Send Friend Request

    func sendFriendRequest(to userId: UUID) async -> Bool {
        guard let currentUserId = await getCurrentUserId() else {
            errorMessage = "Not authenticated"
            return false
        }

        do {
            struct CreateFriendship: Encodable {
                let requesterId: UUID
                let addresseeId: UUID
                let status: String

                enum CodingKeys: String, CodingKey {
                    case requesterId = "requester_id"
                    case addresseeId = "addressee_id"
                    case status
                }
            }

            let friendship = CreateFriendship(
                requesterId: currentUserId,
                addresseeId: userId,
                status: "pending"
            )

            try await SupabaseService.shared.client
                .from("friendships")
                .insert(friendship)
                .execute()

            // Refresh sent requests
            await fetchSentRequests()

            // Remove from search results
            searchResults.removeAll { $0.id == userId }

            print("✅ [TravelCircleViewModel] Sent friend request to \(userId)")
            return true
        } catch {
            print("❌ [TravelCircleViewModel] Error sending friend request: \(error)")
            errorMessage = error.localizedDescription
            return false
        }
    }

    // MARK: - Accept Request

    func acceptRequest(_ friendship: Friendship) async -> Bool {
        do {
            struct UpdateStatus: Encodable {
                let status: String
            }

            try await SupabaseService.shared.client
                .from("friendships")
                .update(UpdateStatus(status: "accepted"))
                .eq("id", value: friendship.id.uuidString)
                .execute()

            // Refresh data
            await fetchAllData()

            print("✅ [TravelCircleViewModel] Accepted friend request from \(friendship.requester?.fullName ?? "unknown")")
            return true
        } catch {
            print("❌ [TravelCircleViewModel] Error accepting request: \(error)")
            errorMessage = error.localizedDescription
            return false
        }
    }

    // MARK: - Decline Request

    func declineRequest(_ friendship: Friendship) async -> Bool {
        do {
            struct UpdateStatus: Encodable {
                let status: String
            }

            try await SupabaseService.shared.client
                .from("friendships")
                .update(UpdateStatus(status: "declined"))
                .eq("id", value: friendship.id.uuidString)
                .execute()

            // Remove from pending requests
            pendingRequests.removeAll { $0.id == friendship.id }

            print("✅ [TravelCircleViewModel] Declined friend request from \(friendship.requester?.fullName ?? "unknown")")
            return true
        } catch {
            print("❌ [TravelCircleViewModel] Error declining request: \(error)")
            errorMessage = error.localizedDescription
            return false
        }
    }

    // MARK: - Add Tripmate as Pal

    func addTripmateAsPal(_ profile: Profile) async -> Bool {
        let success = await sendFriendRequest(to: profile.id)
        if success {
            // Remove from tripmates list since request is now pending
            tripmates.removeAll { $0.id == profile.id }
        }
        return success
    }

    // MARK: - Check Request Status

    func hasSentRequestTo(_ userId: UUID) -> Bool {
        sentRequests.contains { $0.addresseeId == userId }
    }

    func isFriendWith(_ userId: UUID) -> Bool {
        friendIds.contains(userId)
    }
}
