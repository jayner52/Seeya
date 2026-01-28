import Foundation
import Supabase

@Observable
@MainActor
final class RecommendationsViewModel {
    // MARK: - State

    // Trip recommendations (within a specific trip)
    var tripRecommendations: [TripRecommendation] = []

    // Shared recommendations (for Explore feed)
    var sharedRecommendations: [SharedRecommendation] = []

    // User's saved/bookmarked recommendations
    var savedRecommendations: [SavedRecommendation] = []

    // User's own shared recommendations (for profile)
    var userRecommendations: [SharedRecommendation] = []

    // Set of saved recommendation IDs for quick lookup
    var savedRecommendationIds: Set<UUID> = []

    var isLoading = false
    var isSaving = false
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

    // MARK: - Fetch Trip Recommendations

    /// Fetch recommendations for a specific trip
    func fetchTripRecommendations(tripId: UUID) async {
        isLoading = true
        errorMessage = nil

        do {
            let results: [TripRecommendation] = try await SupabaseService.shared.client
                .from("trip_recommendations")
                .select("""
                    *,
                    profiles:profiles!trip_recommendations_user_id_fkey(*),
                    trip_locations:trip_locations!trip_recommendations_location_id_fkey(*)
                """)
                .eq("trip_id", value: tripId.uuidString)
                .order("created_at", ascending: false)
                .execute()
                .value

            tripRecommendations = results
            print("✅ [RecommendationsViewModel] Fetched \(results.count) trip recommendations")
        } catch {
            print("❌ [RecommendationsViewModel] Error fetching trip recommendations: \(error)")
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    // MARK: - Fetch Shared Recommendations (Explore)

    /// Fetch shared recommendations for the Explore feed (excludes current user's)
    func fetchSharedRecommendations() async {
        guard let userId = await getCurrentUserId() else {
            print("❌ [RecommendationsViewModel] No user ID for shared recommendations")
            return
        }

        isLoading = true
        errorMessage = nil

        do {
            let results: [SharedRecommendation] = try await SupabaseService.shared.client
                .from("shared_recommendations")
                .select("""
                    *,
                    profiles:profiles!shared_recommendations_user_id_fkey(*),
                    cities:cities!shared_recommendations_city_id_fkey(*, countries:countries!cities_country_id_fkey(*)),
                    countries:countries!shared_recommendations_country_id_fkey(*)
                """)
                .neq("user_id", value: userId.uuidString)
                .order("created_at", ascending: false)
                .limit(100)
                .execute()
                .value

            sharedRecommendations = results
            print("✅ [RecommendationsViewModel] Fetched \(results.count) shared recommendations")
        } catch {
            print("❌ [RecommendationsViewModel] Error fetching shared recommendations: \(error)")
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    // MARK: - Fetch User's Own Recommendations (Profile)

    /// Fetch recommendations created by a specific user
    func fetchUserRecommendations(userId: UUID? = nil) async {
        var targetUserId = userId
        if targetUserId == nil {
            targetUserId = await getCurrentUserId()
        }
        guard let targetUserId else {
            print("❌ [RecommendationsViewModel] No user ID for user recommendations")
            return
        }

        isLoading = true

        do {
            let results: [SharedRecommendation] = try await SupabaseService.shared.client
                .from("shared_recommendations")
                .select("""
                    *,
                    profiles:profiles!shared_recommendations_user_id_fkey(*),
                    cities:cities!shared_recommendations_city_id_fkey(*, countries:countries!cities_country_id_fkey(*)),
                    countries:countries!shared_recommendations_country_id_fkey(*)
                """)
                .eq("user_id", value: targetUserId.uuidString)
                .order("created_at", ascending: false)
                .execute()
                .value

            userRecommendations = results
            print("✅ [RecommendationsViewModel] Fetched \(results.count) user recommendations")
        } catch {
            print("❌ [RecommendationsViewModel] Error fetching user recommendations: \(error)")
        }

        isLoading = false
    }

    // MARK: - Fetch Saved Recommendations

    /// Fetch user's saved/bookmarked recommendations
    func fetchSavedRecommendations() async {
        guard let userId = await getCurrentUserId() else {
            print("❌ [RecommendationsViewModel] No user ID for saved recommendations")
            return
        }

        isLoading = true

        do {
            let results: [SavedRecommendation] = try await SupabaseService.shared.client
                .from("saved_recommendations")
                .select("""
                    *,
                    shared_recommendations:shared_recommendations!saved_recommendations_shared_recommendation_id_fkey(
                        *,
                        profiles:profiles!shared_recommendations_user_id_fkey(*),
                        cities:cities!shared_recommendations_city_id_fkey(*, countries:countries!cities_country_id_fkey(*)),
                        countries:countries!shared_recommendations_country_id_fkey(*)
                    )
                """)
                .eq("user_id", value: userId.uuidString)
                .order("created_at", ascending: false)
                .execute()
                .value

            savedRecommendations = results
            savedRecommendationIds = Set(results.map { $0.sharedRecommendationId })
            print("✅ [RecommendationsViewModel] Fetched \(results.count) saved recommendations")
        } catch {
            print("❌ [RecommendationsViewModel] Error fetching saved recommendations: \(error)")
        }

        isLoading = false
    }

    // MARK: - Add Trip Recommendation

    /// Add a recommendation to a trip (also creates shared recommendation)
    func addTripRecommendation(
        tripId: UUID,
        locationId: UUID?,
        title: String,
        description: String?,
        category: RecommendationCategory,
        googlePlaceId: String?,
        cityId: UUID?,
        countryId: UUID?,
        latitude: Double?,
        longitude: Double?
    ) async -> Bool {
        guard let userId = await getCurrentUserId() else {
            errorMessage = "Not authenticated"
            return false
        }

        isSaving = true
        errorMessage = nil

        do {
            // 1. Create trip recommendation
            let tripRec = CreateTripRecommendation(
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
                .insert(tripRec)
                .execute()

            // 2. Also create shared recommendation (for Explore & Profile)
            let sharedRec = CreateSharedRecommendation(
                userId: userId,
                cityId: cityId,
                countryId: countryId,
                title: title,
                description: description,
                category: category,
                rating: nil,
                tips: nil,
                url: nil,
                googlePlaceId: googlePlaceId,
                latitude: latitude,
                longitude: longitude,
                sourceTripId: tripId,
                sourceResourceId: nil
            )

            try await SupabaseService.shared.client
                .from("shared_recommendations")
                .insert(sharedRec)
                .execute()

            print("✅ [RecommendationsViewModel] Added recommendation: \(title)")

            // Refresh trip recommendations
            await fetchTripRecommendations(tripId: tripId)

            isSaving = false
            return true
        } catch {
            print("❌ [RecommendationsViewModel] Error adding recommendation: \(error)")
            errorMessage = error.localizedDescription
            isSaving = false
            return false
        }
    }

    // MARK: - Add Shared Recommendation (Direct)

    /// Add a shared recommendation directly (e.g., from profile/onboarding)
    func addSharedRecommendation(
        title: String,
        description: String?,
        category: RecommendationCategory,
        rating: Int?,
        tips: String?,
        url: String?,
        googlePlaceId: String?,
        cityId: UUID?,
        countryId: UUID?,
        latitude: Double?,
        longitude: Double?
    ) async -> Bool {
        guard let userId = await getCurrentUserId() else {
            errorMessage = "Not authenticated"
            return false
        }

        isSaving = true
        errorMessage = nil

        do {
            let rec = CreateSharedRecommendation(
                userId: userId,
                cityId: cityId,
                countryId: countryId,
                title: title,
                description: description,
                category: category,
                rating: rating,
                tips: tips,
                url: url,
                googlePlaceId: googlePlaceId,
                latitude: latitude,
                longitude: longitude,
                sourceTripId: nil,
                sourceResourceId: nil
            )

            try await SupabaseService.shared.client
                .from("shared_recommendations")
                .insert(rec)
                .execute()

            print("✅ [RecommendationsViewModel] Added shared recommendation: \(title)")

            // Refresh user recommendations
            await fetchUserRecommendations()

            isSaving = false
            return true
        } catch {
            print("❌ [RecommendationsViewModel] Error adding shared recommendation: \(error)")
            errorMessage = error.localizedDescription
            isSaving = false
            return false
        }
    }

    // MARK: - Save/Unsave Recommendation

    /// Check if a recommendation is saved
    func isSaved(_ recommendationId: UUID) -> Bool {
        savedRecommendationIds.contains(recommendationId)
    }

    /// Save a recommendation to user's wishlist
    func saveRecommendation(_ recommendationId: UUID) async -> Bool {
        guard let userId = await getCurrentUserId() else {
            errorMessage = "Not authenticated"
            return false
        }

        // Optimistic update
        savedRecommendationIds.insert(recommendationId)

        do {
            let saved = CreateSavedRecommendation(
                userId: userId,
                sharedRecommendationId: recommendationId
            )

            try await SupabaseService.shared.client
                .from("saved_recommendations")
                .insert(saved)
                .execute()

            print("✅ [RecommendationsViewModel] Saved recommendation: \(recommendationId)")
            return true
        } catch {
            // Revert optimistic update
            savedRecommendationIds.remove(recommendationId)
            print("❌ [RecommendationsViewModel] Error saving recommendation: \(error)")
            errorMessage = error.localizedDescription
            return false
        }
    }

    /// Unsave a recommendation from user's wishlist
    func unsaveRecommendation(_ recommendationId: UUID) async -> Bool {
        guard let userId = await getCurrentUserId() else {
            errorMessage = "Not authenticated"
            return false
        }

        // Optimistic update
        savedRecommendationIds.remove(recommendationId)

        do {
            try await SupabaseService.shared.client
                .from("saved_recommendations")
                .delete()
                .eq("user_id", value: userId.uuidString)
                .eq("shared_recommendation_id", value: recommendationId.uuidString)
                .execute()

            // Also remove from local array
            savedRecommendations.removeAll { $0.sharedRecommendationId == recommendationId }

            print("✅ [RecommendationsViewModel] Unsaved recommendation: \(recommendationId)")
            return true
        } catch {
            // Revert optimistic update
            savedRecommendationIds.insert(recommendationId)
            print("❌ [RecommendationsViewModel] Error unsaving recommendation: \(error)")
            errorMessage = error.localizedDescription
            return false
        }
    }

    /// Toggle save/unsave for a recommendation
    func toggleSave(_ recommendationId: UUID) async -> Bool {
        if isSaved(recommendationId) {
            return await unsaveRecommendation(recommendationId)
        } else {
            return await saveRecommendation(recommendationId)
        }
    }

    // MARK: - Delete Recommendation

    /// Delete a trip recommendation (only if user is the author)
    func deleteTripRecommendation(_ id: UUID, tripId: UUID) async -> Bool {
        do {
            try await SupabaseService.shared.client
                .from("trip_recommendations")
                .delete()
                .eq("id", value: id.uuidString)
                .execute()

            // Remove from local array
            tripRecommendations.removeAll { $0.id == id }

            print("✅ [RecommendationsViewModel] Deleted trip recommendation: \(id)")
            return true
        } catch {
            print("❌ [RecommendationsViewModel] Error deleting recommendation: \(error)")
            errorMessage = error.localizedDescription
            return false
        }
    }

    /// Delete a shared recommendation
    func deleteSharedRecommendation(_ id: UUID) async -> Bool {
        do {
            try await SupabaseService.shared.client
                .from("shared_recommendations")
                .delete()
                .eq("id", value: id.uuidString)
                .execute()

            // Remove from local arrays
            userRecommendations.removeAll { $0.id == id }
            sharedRecommendations.removeAll { $0.id == id }

            print("✅ [RecommendationsViewModel] Deleted shared recommendation: \(id)")
            return true
        } catch {
            print("❌ [RecommendationsViewModel] Error deleting shared recommendation: \(error)")
            errorMessage = error.localizedDescription
            return false
        }
    }

    // MARK: - Grouped Recommendations (for Profile display)

    /// Group user recommendations by country, then by city
    var groupedUserRecommendations: [String: [String: [SharedRecommendation]]] {
        var grouped: [String: [String: [SharedRecommendation]]] = [:]

        for rec in userRecommendations {
            let countryName = rec.country?.name ?? rec.city?.country?.name ?? "Other"
            let cityName = rec.city?.name ?? "General"

            if grouped[countryName] == nil {
                grouped[countryName] = [:]
            }
            if grouped[countryName]?[cityName] == nil {
                grouped[countryName]?[cityName] = []
            }
            grouped[countryName]?[cityName]?.append(rec)
        }

        return grouped
    }

    /// Group saved recommendations by country, then by city
    var groupedSavedRecommendations: [String: [String: [SavedRecommendation]]] {
        var grouped: [String: [String: [SavedRecommendation]]] = [:]

        for saved in savedRecommendations {
            guard let rec = saved.sharedRecommendation else { continue }
            let countryName = rec.country?.name ?? rec.city?.country?.name ?? "Other"
            let cityName = rec.city?.name ?? "General"

            if grouped[countryName] == nil {
                grouped[countryName] = [:]
            }
            if grouped[countryName]?[cityName] == nil {
                grouped[countryName]?[cityName] = []
            }
            grouped[countryName]?[cityName]?.append(saved)
        }

        return grouped
    }
}
