import Foundation
import Supabase

@Observable
@MainActor
final class ExploreViewModel {
    // MARK: - State

    var recommendations: [SharedRecommendation] = []
    var circleTrips: [CircleTrip] = []
    var popularDestinations: [PopularDestination] = []
    var trendingWanderlist: [TrendingWanderlistItem] = []
    var countries: [Country] = []
    var savedRecommendationIds: Set<UUID> = []

    var isLoading = false
    var errorMessage: String?

    // Filters
    var searchQuery = ""
    var selectedCategory: RecommendationCategory?
    var selectedCountry: Country?

    private var cachedUserId: UUID?

    // MARK: - Computed Properties

    var filteredRecommendations: [SharedRecommendation] {
        var filtered = recommendations

        // Filter by category
        if let category = selectedCategory {
            filtered = filtered.filter { $0.category == category }
        }

        // Filter by country
        if let country = selectedCountry {
            filtered = filtered.filter { $0.countryId == country.id || $0.city?.countryId == country.id }
        }

        // Filter by search query
        if !searchQuery.isEmpty {
            filtered = filtered.filter {
                $0.title.localizedCaseInsensitiveContains(searchQuery) ||
                ($0.description?.localizedCaseInsensitiveContains(searchQuery) ?? false) ||
                ($0.city?.name.localizedCaseInsensitiveContains(searchQuery) ?? false) ||
                ($0.country?.name.localizedCaseInsensitiveContains(searchQuery) ?? false)
            }
        }

        return filtered
    }

    var travelingNow: [CircleTrip] {
        circleTrips.filter { $0.isTravelingNow }
    }

    var upcomingTrips: [CircleTrip] {
        circleTrips.filter { $0.isUpcoming && !$0.isTravelingNow }
    }

    var allTravelingTrips: [CircleTrip] {
        travelingNow + upcomingTrips
    }

    var recommendationsWithCoordinates: [SharedRecommendation] {
        filteredRecommendations.filter { $0.hasCoordinates }
    }

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

    // MARK: - Fetch All Data

    func fetchAllData() async {
        isLoading = true
        errorMessage = nil

        await withTaskGroup(of: Void.self) { group in
            group.addTask { await self.fetchRecommendations() }
            group.addTask { await self.fetchCircleTrips() }
            group.addTask { await self.fetchPopularDestinations() }
            group.addTask { await self.fetchTrendingWanderlist() }
            group.addTask { await self.fetchCountries() }
            group.addTask { await self.fetchSavedRecommendationIds() }
        }

        isLoading = false
    }

    // MARK: - Fetch Recommendations

    func fetchRecommendations() async {
        do {
            let results: [SharedRecommendation] = try await SupabaseService.shared.client
                .from("shared_recommendations")
                .select("""
                    *,
                    profiles:profiles!shared_recommendations_user_id_fkey(*),
                    cities:cities!shared_recommendations_city_id_fkey(*, countries:countries!cities_country_id_fkey(*)),
                    countries:countries!shared_recommendations_country_id_fkey(*)
                """)
                .order("created_at", ascending: false)
                .limit(100)
                .execute()
                .value

            recommendations = results
            print("✅ [ExploreViewModel] Fetched \(recommendations.count) recommendations")
        } catch {
            print("❌ [ExploreViewModel] Error fetching recommendations: \(error)")
            // Table might not exist yet, set empty
            recommendations = []
        }
    }

    // MARK: - Fetch Circle Trips (RPC)

    func fetchCircleTrips() async {
        guard let userId = await getCurrentUserId() else {
            print("❌ [ExploreViewModel] No user ID for circle trips")
            return
        }

        do {
            let results: [CircleTrip] = try await SupabaseService.shared.client
                .rpc("get_circle_trips", params: ["_user_id": userId.uuidString])
                .execute()
                .value

            circleTrips = results
            print("✅ [ExploreViewModel] Fetched \(circleTrips.count) circle trips")
        } catch {
            print("❌ [ExploreViewModel] Error fetching circle trips: \(error)")
            // RPC might not exist yet, set empty
            circleTrips = []
        }
    }

    // MARK: - Fetch Popular Destinations (RPC)

    func fetchPopularDestinations() async {
        guard let userId = await getCurrentUserId() else {
            print("❌ [ExploreViewModel] No user ID for popular destinations")
            return
        }

        do {
            let results: [PopularDestination] = try await SupabaseService.shared.client
                .rpc("get_popular_locations", params: ["_user_id": userId.uuidString])
                .execute()
                .value

            popularDestinations = results
            print("✅ [ExploreViewModel] Fetched \(popularDestinations.count) popular destinations")
        } catch {
            print("❌ [ExploreViewModel] Error fetching popular destinations: \(error)")
            // RPC might not exist yet, set empty
            popularDestinations = []
        }
    }

    // MARK: - Fetch Trending Wanderlist (RPC)

    func fetchTrendingWanderlist() async {
        guard let userId = await getCurrentUserId() else {
            print("❌ [ExploreViewModel] No user ID for trending wanderlist")
            return
        }

        do {
            let results: [TrendingWanderlistItem] = try await SupabaseService.shared.client
                .rpc("get_trending_wanderlist", params: ["_user_id": userId.uuidString])
                .execute()
                .value

            trendingWanderlist = results
            print("✅ [ExploreViewModel] Fetched \(trendingWanderlist.count) trending wanderlist items")
        } catch {
            print("❌ [ExploreViewModel] Error fetching trending wanderlist: \(error)")
            // RPC might not exist yet, set empty
            trendingWanderlist = []
        }
    }

    // MARK: - Fetch Countries (for quick chips)

    func fetchCountries() async {
        do {
            let results: [Country] = try await SupabaseService.shared.client
                .from("countries")
                .select()
                .order("name")
                .execute()
                .value

            countries = results
            print("✅ [ExploreViewModel] Fetched \(countries.count) countries")
        } catch {
            print("❌ [ExploreViewModel] Error fetching countries: \(error)")
        }
    }

    // MARK: - Filter Actions

    func selectCategory(_ category: RecommendationCategory?) {
        if selectedCategory == category {
            selectedCategory = nil
        } else {
            selectedCategory = category
        }
    }

    func selectCountry(_ country: Country?) {
        if selectedCountry?.id == country?.id {
            selectedCountry = nil
        } else {
            selectedCountry = country
        }
    }

    func clearFilters() {
        selectedCategory = nil
        selectedCountry = nil
        searchQuery = ""
    }

    // MARK: - Saved Recommendations

    func fetchSavedRecommendationIds() async {
        guard let userId = await getCurrentUserId() else { return }

        do {
            struct SavedId: Decodable {
                let sharedRecommendationId: UUID

                enum CodingKeys: String, CodingKey {
                    case sharedRecommendationId = "shared_recommendation_id"
                }
            }

            let results: [SavedId] = try await SupabaseService.shared.client
                .from("saved_recommendations")
                .select("shared_recommendation_id")
                .eq("user_id", value: userId.uuidString)
                .execute()
                .value

            savedRecommendationIds = Set(results.map { $0.sharedRecommendationId })
            print("✅ [ExploreViewModel] Loaded \(savedRecommendationIds.count) saved recommendation IDs")
        } catch {
            print("❌ [ExploreViewModel] Error fetching saved IDs: \(error)")
        }
    }

    func isRecommendationSaved(_ id: UUID) -> Bool {
        savedRecommendationIds.contains(id)
    }

    func saveRecommendation(_ recommendationId: UUID) async -> Bool {
        guard let userId = await getCurrentUserId() else {
            errorMessage = "Not authenticated"
            return false
        }

        do {
            struct CreateSaved: Encodable {
                let userId: UUID
                let sharedRecommendationId: UUID

                enum CodingKeys: String, CodingKey {
                    case userId = "user_id"
                    case sharedRecommendationId = "shared_recommendation_id"
                }
            }

            try await SupabaseService.shared.client
                .from("saved_recommendations")
                .insert(CreateSaved(userId: userId, sharedRecommendationId: recommendationId))
                .execute()

            savedRecommendationIds.insert(recommendationId)
            print("✅ [ExploreViewModel] Saved recommendation")
            return true
        } catch {
            print("❌ [ExploreViewModel] Error saving recommendation: \(error)")
            errorMessage = error.localizedDescription
            return false
        }
    }

    func unsaveRecommendation(_ recommendationId: UUID) async -> Bool {
        guard let userId = await getCurrentUserId() else {
            errorMessage = "Not authenticated"
            return false
        }

        do {
            try await SupabaseService.shared.client
                .from("saved_recommendations")
                .delete()
                .eq("user_id", value: userId.uuidString)
                .eq("shared_recommendation_id", value: recommendationId.uuidString)
                .execute()

            savedRecommendationIds.remove(recommendationId)
            print("✅ [ExploreViewModel] Unsaved recommendation")
            return true
        } catch {
            print("❌ [ExploreViewModel] Error unsaving recommendation: \(error)")
            errorMessage = error.localizedDescription
            return false
        }
    }

    func toggleSaveRecommendation(_ recommendationId: UUID) async -> Bool {
        if isRecommendationSaved(recommendationId) {
            return await unsaveRecommendation(recommendationId)
        } else {
            return await saveRecommendation(recommendationId)
        }
    }

    // MARK: - Quick Chip Countries

    /// Returns popular countries for quick filter chips
    var quickChipCountries: [Country] {
        // Return countries that have recommendations, or fall back to common travel destinations
        let countriesWithRecs = Set(recommendations.compactMap { $0.countryId ?? $0.city?.countryId })
        let relevantCountries = countries.filter { countriesWithRecs.contains($0.id) }

        if relevantCountries.isEmpty {
            // Fall back to some common countries
            let commonNames = ["Japan", "France", "Italy", "Spain", "Thailand", "Mexico", "United Kingdom", "Australia"]
            return countries.filter { commonNames.contains($0.name) }.prefix(8).map { $0 }
        }

        return Array(relevantCountries.prefix(8))
    }
}
