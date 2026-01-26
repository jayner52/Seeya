import Foundation
import Supabase

@Observable
@MainActor
final class InviteViewModel {
    // MARK: - Friends Tab State

    var selectedFriendIds: Set<UUID> = []
    var selectedLocationsByFriend: [UUID: Set<UUID>] = [:] // friendId -> locationIds
    var selectedTripbitsByFriend: [UUID: Set<UUID>] = [:] // friendId -> tripbitIds
    var expandedFriendIds: Set<UUID> = []
    var expandedLocationIds: Set<UUID> = []

    // MARK: - Share Link State

    var selectedLocationsForLink: Set<UUID> = []
    var linkExpirationDate: Date?
    var hasExpiration: Bool = false
    var activeLinks: [TripInviteLink] = []
    var isCreatingLink = false

    // MARK: - General State

    var friends: [Profile] = []
    var tripLocations: [TripLocation] = []
    var tripBits: [TripBit] = []
    var isLoading = false
    var isSendingInvites = false
    var errorMessage: String?

    // MARK: - Invite Received State

    var pendingInviteLink: TripInviteLink?
    var pendingInviteTrip: Trip?

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

    // MARK: - Fetch Data

    func fetchFriends() async {
        guard let userId = await getCurrentUserId() else { return }

        do {
            let asRequester: [Friendship] = try await SupabaseService.shared.client
                .from("friendships")
                .select("*, addressee:profiles!friendships_addressee_id_fkey(*)")
                .eq("requester_id", value: userId.uuidString)
                .eq("status", value: FriendshipStatus.accepted.rawValue)
                .execute()
                .value

            let asAddressee: [Friendship] = try await SupabaseService.shared.client
                .from("friendships")
                .select("*, requester:profiles!friendships_requester_id_fkey(*)")
                .eq("addressee_id", value: userId.uuidString)
                .eq("status", value: FriendshipStatus.accepted.rawValue)
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
            print("❌ [InviteViewModel] Error fetching friends: \(error)")
        }
    }

    func fetchTripData(tripId: UUID) async {
        isLoading = true

        do {
            // Fetch trip locations
            let locations: [TripLocation] = try await SupabaseService.shared.client
                .from("trip_locations")
                .select("*, cities(*, countries(*))")
                .eq("trip_id", value: tripId.uuidString)
                .order("order_index")
                .execute()
                .value

            tripLocations = locations

            // Fetch trip bits
            let bits: [TripBit] = try await SupabaseService.shared.client
                .from("trip_bits")
                .select("*, trip_locations(*)")
                .eq("trip_id", value: tripId.uuidString)
                .order("start_datetime")
                .execute()
                .value

            tripBits = bits

            print("✅ [InviteViewModel] Fetched \(locations.count) locations, \(bits.count) tripbits")
        } catch {
            print("❌ [InviteViewModel] Error fetching trip data: \(error)")
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func fetchActiveLinks(tripId: UUID) async {
        do {
            let links: [TripInviteLink] = try await SupabaseService.shared.client
                .from("trip_invite_links")
                .select()
                .eq("trip_id", value: tripId.uuidString)
                .order("created_at", ascending: false)
                .execute()
                .value

            activeLinks = links
            print("✅ [InviteViewModel] Fetched \(links.count) active links")
        } catch {
            print("❌ [InviteViewModel] Error fetching active links: \(error)")
        }
    }

    // MARK: - Friend Selection

    func toggleFriend(_ friendId: UUID) {
        if selectedFriendIds.contains(friendId) {
            selectedFriendIds.remove(friendId)
            selectedLocationsByFriend.removeValue(forKey: friendId)
            selectedTripbitsByFriend.removeValue(forKey: friendId)
        } else {
            selectedFriendIds.insert(friendId)
            // Default to all locations
            selectedLocationsByFriend[friendId] = Set(tripLocations.map { $0.id })
            // Default to all tripbits
            selectedTripbitsByFriend[friendId] = Set(tripBits.map { $0.id })
        }
    }

    func toggleFriendExpanded(_ friendId: UUID) {
        if expandedFriendIds.contains(friendId) {
            expandedFriendIds.remove(friendId)
        } else {
            expandedFriendIds.insert(friendId)
        }
    }

    func isFriendSelected(_ friendId: UUID) -> Bool {
        selectedFriendIds.contains(friendId)
    }

    func isFriendExpanded(_ friendId: UUID) -> Bool {
        expandedFriendIds.contains(friendId)
    }

    // MARK: - Location Selection (per friend)

    func toggleLocationForFriend(_ locationId: UUID, friendId: UUID) {
        var locations = selectedLocationsByFriend[friendId] ?? []

        if locations.contains(locationId) {
            locations.remove(locationId)
            // Also remove tripbits for this location
            let tripbitsInLocation = tripBits.filter { $0.locationId == locationId }
            for tripbit in tripbitsInLocation {
                selectedTripbitsByFriend[friendId]?.remove(tripbit.id)
            }
        } else {
            locations.insert(locationId)
            // Also add all tripbits for this location
            let tripbitsInLocation = tripBits.filter { $0.locationId == locationId }
            for tripbit in tripbitsInLocation {
                if selectedTripbitsByFriend[friendId] == nil {
                    selectedTripbitsByFriend[friendId] = []
                }
                selectedTripbitsByFriend[friendId]?.insert(tripbit.id)
            }
        }

        selectedLocationsByFriend[friendId] = locations

        // Update friend selection status
        if locations.isEmpty {
            selectedFriendIds.remove(friendId)
        } else if !selectedFriendIds.contains(friendId) {
            selectedFriendIds.insert(friendId)
        }
    }

    func isLocationSelectedForFriend(_ locationId: UUID, friendId: UUID) -> Bool {
        selectedLocationsByFriend[friendId]?.contains(locationId) ?? false
    }

    func toggleLocationExpanded(_ locationId: UUID) {
        if expandedLocationIds.contains(locationId) {
            expandedLocationIds.remove(locationId)
        } else {
            expandedLocationIds.insert(locationId)
        }
    }

    func isLocationExpanded(_ locationId: UUID) -> Bool {
        expandedLocationIds.contains(locationId)
    }

    // MARK: - Tripbit Selection (per friend)

    func toggleTripbitForFriend(_ tripbitId: UUID, friendId: UUID) {
        var tripbits = selectedTripbitsByFriend[friendId] ?? []

        if tripbits.contains(tripbitId) {
            tripbits.remove(tripbitId)
        } else {
            tripbits.insert(tripbitId)
        }

        selectedTripbitsByFriend[friendId] = tripbits
    }

    func isTripbitSelectedForFriend(_ tripbitId: UUID, friendId: UUID) -> Bool {
        selectedTripbitsByFriend[friendId]?.contains(tripbitId) ?? false
    }

    func tripbitsForLocation(_ locationId: UUID) -> [TripBit] {
        tripBits.filter { $0.locationId == locationId }
    }

    func tripbitCountForLocation(_ locationId: UUID) -> Int {
        tripbitsForLocation(locationId).count
    }

    func selectedTripbitCountForLocation(_ locationId: UUID, friendId: UUID) -> Int {
        let locationTripbits = tripbitsForLocation(locationId)
        let selectedTripbits = selectedTripbitsByFriend[friendId] ?? []
        return locationTripbits.filter { selectedTripbits.contains($0.id) }.count
    }

    // MARK: - Share Link Location Selection

    func toggleLocationForLink(_ locationId: UUID) {
        if selectedLocationsForLink.contains(locationId) {
            selectedLocationsForLink.remove(locationId)
        } else {
            selectedLocationsForLink.insert(locationId)
        }
    }

    func isLocationSelectedForLink(_ locationId: UUID) -> Bool {
        selectedLocationsForLink.contains(locationId)
    }

    func selectAllLocationsForLink() {
        selectedLocationsForLink = Set(tripLocations.map { $0.id })
    }

    func deselectAllLocationsForLink() {
        selectedLocationsForLink.removeAll()
    }

    // MARK: - Send Invites

    func sendInvites(tripId: UUID) async -> Bool {
        guard await getCurrentUserId() != nil else {
            errorMessage = "Not authenticated"
            return false
        }

        guard !selectedFriendIds.isEmpty else {
            errorMessage = "No friends selected"
            return false
        }

        isSendingInvites = true
        errorMessage = nil

        do {
            for friendId in selectedFriendIds {
                // Create the participant record
                let invite = InviteParticipant(tripId: tripId, userId: friendId)

                let createdParticipant: TripParticipant = try await SupabaseService.shared.client
                    .from("trip_participants")
                    .insert(invite)
                    .select()
                    .single()
                    .execute()
                    .value

                print("✅ [InviteViewModel] Created participant: \(createdParticipant.id)")

                // Add location-level participation if not full trip
                let selectedLocations = selectedLocationsByFriend[friendId] ?? []
                let allLocations = Set(tripLocations.map { $0.id })

                if selectedLocations != allLocations && !selectedLocations.isEmpty {
                    for locationId in selectedLocations {
                        let locationParticipation = CreateTripParticipantLocation(
                            participantId: createdParticipant.id,
                            locationId: locationId
                        )

                        try await SupabaseService.shared.client
                            .from("trip_participant_locations")
                            .insert(locationParticipation)
                            .execute()
                    }
                    print("✅ [InviteViewModel] Added \(selectedLocations.count) location participations")
                }

                // Add tripbit-level participation if selective
                let selectedTripbits = selectedTripbitsByFriend[friendId] ?? []
                let allTripbits = Set(tripBits.map { $0.id })

                if selectedTripbits != allTripbits && !selectedTripbits.isEmpty {
                    for tripbitId in selectedTripbits {
                        let tripbitParticipation = CreateTripParticipantTripbit(
                            participantId: createdParticipant.id,
                            tripbitId: tripbitId
                        )

                        try await SupabaseService.shared.client
                            .from("trip_participant_tripbits")
                            .insert(tripbitParticipation)
                            .execute()
                    }
                    print("✅ [InviteViewModel] Added \(selectedTripbits.count) tripbit participations")
                }
            }

            isSendingInvites = false
            return true
        } catch {
            print("❌ [InviteViewModel] Error sending invites: \(error)")
            errorMessage = error.localizedDescription
            isSendingInvites = false
            return false
        }
    }

    // MARK: - Create Invite Link

    func createInviteLink(tripId: UUID) async -> TripInviteLink? {
        guard let userId = await getCurrentUserId() else {
            errorMessage = "Not authenticated"
            return nil
        }

        isCreatingLink = true
        errorMessage = nil

        do {
            let code = TripInviteLink.generateCode()
            let locationIds = selectedLocationsForLink.isEmpty ? nil : Array(selectedLocationsForLink)
            let expiresAt = hasExpiration ? linkExpirationDate : nil

            let newLink = CreateTripInviteLink(
                tripId: tripId,
                createdBy: userId,
                code: code,
                expiresAt: expiresAt,
                locationIds: locationIds
            )

            let createdLink: TripInviteLink = try await SupabaseService.shared.client
                .from("trip_invite_links")
                .insert(newLink)
                .select()
                .single()
                .execute()
                .value

            print("✅ [InviteViewModel] Created invite link: \(createdLink.code)")

            activeLinks.insert(createdLink, at: 0)
            isCreatingLink = false

            // Reset form
            selectedLocationsForLink.removeAll()
            linkExpirationDate = nil
            hasExpiration = false

            return createdLink
        } catch {
            print("❌ [InviteViewModel] Error creating invite link: \(error)")
            errorMessage = error.localizedDescription
            isCreatingLink = false
            return nil
        }
    }

    // MARK: - Delete Invite Link

    func deleteInviteLink(linkId: UUID) async -> Bool {
        do {
            try await SupabaseService.shared.client
                .from("trip_invite_links")
                .delete()
                .eq("id", value: linkId.uuidString)
                .execute()

            activeLinks.removeAll { $0.id == linkId }
            print("✅ [InviteViewModel] Deleted invite link")
            return true
        } catch {
            print("❌ [InviteViewModel] Error deleting invite link: \(error)")
            errorMessage = error.localizedDescription
            return false
        }
    }

    // MARK: - Accept Invite from Link

    func fetchInviteLinkDetails(code: String) async -> Bool {
        do {
            let links: [TripInviteLink] = try await SupabaseService.shared.client
                .from("trip_invite_links")
                .select()
                .eq("code", value: code)
                .execute()
                .value

            guard let link = links.first else {
                errorMessage = "Invite link not found"
                return false
            }

            if link.isExpired {
                errorMessage = "This invite link has expired"
                return false
            }

            pendingInviteLink = link

            // Fetch trip details
            let trip: Trip = try await SupabaseService.shared.client
                .from("trips")
                .select("*, trip_locations(*, cities(*, countries(*))), trip_participants(*, profiles:profiles!trip_participants_user_id_fkey(*)), trip_recommendations(*)")
                .eq("id", value: link.tripId.uuidString)
                .single()
                .execute()
                .value

            pendingInviteTrip = trip

            // Also fetch trip data for location selection
            await fetchTripData(tripId: link.tripId)

            // Pre-select locations from the link
            if let locationIds = link.locationIds, !locationIds.isEmpty {
                selectedLocationsForLink = Set(locationIds)
            } else {
                selectedLocationsForLink = Set(tripLocations.map { $0.id })
            }

            print("✅ [InviteViewModel] Fetched invite link details for trip: \(trip.name)")
            return true
        } catch {
            print("❌ [InviteViewModel] Error fetching invite link details: \(error)")
            errorMessage = error.localizedDescription
            return false
        }
    }

    func acceptInviteFromLink(selectedLocationIds: Set<UUID>) async -> Bool {
        guard let userId = await getCurrentUserId() else {
            errorMessage = "Not authenticated"
            return false
        }

        guard let link = pendingInviteLink else {
            errorMessage = "No pending invite"
            return false
        }

        isLoading = true
        errorMessage = nil

        do {
            // Create participant record
            let invite = InviteParticipant(tripId: link.tripId, userId: userId)

            let createdParticipant: TripParticipant = try await SupabaseService.shared.client
                .from("trip_participants")
                .insert(invite)
                .select()
                .single()
                .execute()
                .value

            // Add location-level participation
            if !selectedLocationIds.isEmpty {
                for locationId in selectedLocationIds {
                    let locationParticipation = CreateTripParticipantLocation(
                        participantId: createdParticipant.id,
                        locationId: locationId,
                        status: .confirmed
                    )

                    try await SupabaseService.shared.client
                        .from("trip_participant_locations")
                        .insert(locationParticipation)
                        .execute()
                }
            }

            // Update participant status to confirmed
            let updateStatus = UpdateParticipantStatus(status: .confirmed, respondedAt: Date())

            try await SupabaseService.shared.client
                .from("trip_participants")
                .update(updateStatus)
                .eq("id", value: createdParticipant.id.uuidString)
                .execute()

            // Increment usage count on the link
            try await SupabaseService.shared.client
                .rpc("increment_invite_link_usage", params: ["link_code": link.code])
                .execute()

            print("✅ [InviteViewModel] Accepted invite from link")

            // Clear pending state
            pendingInviteLink = nil
            pendingInviteTrip = nil

            isLoading = false
            return true
        } catch {
            print("❌ [InviteViewModel] Error accepting invite: \(error)")
            errorMessage = error.localizedDescription
            isLoading = false
            return false
        }
    }

    // MARK: - Reset

    func reset() {
        selectedFriendIds.removeAll()
        selectedLocationsByFriend.removeAll()
        selectedTripbitsByFriend.removeAll()
        expandedFriendIds.removeAll()
        expandedLocationIds.removeAll()
        selectedLocationsForLink.removeAll()
        linkExpirationDate = nil
        hasExpiration = false
        errorMessage = nil
    }

    // MARK: - Summary Text

    var inviteSummaryText: String {
        guard !selectedFriendIds.isEmpty else { return "No friends selected" }

        let friendCount = selectedFriendIds.count
        let friendText = friendCount == 1 ? "1 friend" : "\(friendCount) friends"

        return "Invite \(friendText)"
    }

    func locationSummaryForFriend(_ friendId: UUID) -> String {
        let selectedCount = selectedLocationsByFriend[friendId]?.count ?? 0
        let totalCount = tripLocations.count

        if selectedCount == totalCount {
            return "Full trip"
        } else if selectedCount == 0 {
            return "No legs selected"
        } else {
            return "\(selectedCount) of \(totalCount) legs"
        }
    }
}

