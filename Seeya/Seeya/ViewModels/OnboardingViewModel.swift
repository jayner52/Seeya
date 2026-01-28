import Foundation
import Supabase

@Observable
@MainActor
final class OnboardingViewModel {
    // MARK: - State

    var currentStep: OnboardingStep = .welcome
    var onboardingData = OnboardingData()

    // Data
    var continents: [Continent] = []
    var countriesByContinent: [UUID: [Country]] = [:]
    var allCountries: [Country] = []

    // UI State
    var isLoading = false
    var isSaving = false
    var errorMessage: String?

    // Home city search
    var homeCityQuery = ""
    var homeCityPredictions: [PlacePrediction] = []
    var isSearchingCity = false
    var selectedHomeCity: PlacePrediction?

    // Country search
    var countrySearchQuery = ""
    var expandedContinentIds: Set<UUID> = []

    // Popular countries for wanderlist quick-add (common travel destinations)
    let popularCountryCodes = ["JP", "FR", "IT", "TH", "ES", "AU", "MX", "GR", "PT", "GB", "DE", "NL"]

    private var searchTask: Task<Void, Never>?
    private var cachedUserId: UUID?

    // MARK: - Computed Properties

    var filteredCountries: [Country] {
        guard !countrySearchQuery.isEmpty else { return allCountries }
        return allCountries.filter { $0.name.localizedCaseInsensitiveContains(countrySearchQuery) }
    }

    var filteredCountriesByContinent: [UUID: [Country]] {
        guard !countrySearchQuery.isEmpty else { return countriesByContinent }
        var filtered: [UUID: [Country]] = [:]
        for (continentId, countries) in countriesByContinent {
            let matchingCountries = countries.filter { $0.name.localizedCaseInsensitiveContains(countrySearchQuery) }
            if !matchingCountries.isEmpty {
                filtered[continentId] = matchingCountries
            }
        }
        return filtered
    }

    var popularCountries: [Country] {
        allCountries.filter { country in
            guard let code = country.code else { return false }
            return popularCountryCodes.contains(code.uppercased())
        }
    }

    var visitedCountries: [Country] {
        allCountries.filter { onboardingData.visitedCountryIds.contains($0.id) }
    }

    var wanderlistCountries: [Country] {
        allCountries.filter { onboardingData.wanderlistCountryIds.contains($0.id) }
    }

    var canContinue: Bool {
        switch currentStep {
        case .welcome:
            return true
        case .home:
            return true // Home city is optional
        case .visited:
            return true // Visited countries are optional
        case .wanderlist:
            return true // Wanderlist is optional
        case .tips:
            return true
        }
    }

    var shouldShowTipsStep: Bool {
        !onboardingData.visitedCountryIds.isEmpty
    }

    var progressPercentage: Double {
        Double(currentStep.rawValue + 1) / Double(OnboardingStep.totalSteps)
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

    // MARK: - Data Fetching

    func fetchContinentsAndCountries() async {
        isLoading = true
        errorMessage = nil

        do {
            // Fetch continents
            continents = try await SupabaseService.shared.client
                .from("continents")
                .select()
                .order("order_index")
                .execute()
                .value

            // Fetch all countries with continent relationship
            allCountries = try await SupabaseService.shared.client
                .from("countries")
                .select("*, continents(*)")
                .order("name")
                .execute()
                .value

            // Group countries by continent
            countriesByContinent = [:]
            for country in allCountries {
                if let continentId = country.continentId {
                    countriesByContinent[continentId, default: []].append(country)
                }
            }

            print("✅ [OnboardingViewModel] Fetched \(continents.count) continents and \(allCountries.count) countries")
        } catch {
            print("❌ [OnboardingViewModel] Error fetching data: \(error)")
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    // MARK: - Home City Search

    func searchHomeCity(query: String) {
        homeCityQuery = query

        // Cancel previous search
        searchTask?.cancel()

        guard !query.isEmpty else {
            homeCityPredictions = []
            isSearchingCity = false
            return
        }

        isSearchingCity = true

        // Debounce search by 300ms
        searchTask = Task {
            try? await Task.sleep(nanoseconds: 300_000_000)

            guard !Task.isCancelled else { return }

            do {
                let predictions = try await PlacesService.shared.autocomplete(query: query)
                if !Task.isCancelled {
                    homeCityPredictions = predictions
                }
            } catch {
                if !Task.isCancelled {
                    print("❌ [OnboardingViewModel] City search error: \(error)")
                }
            }

            if !Task.isCancelled {
                isSearchingCity = false
            }
        }
    }

    func selectHomeCity(_ prediction: PlacePrediction) {
        selectedHomeCity = prediction
        onboardingData.homeCity = prediction.fullText
        onboardingData.homeCityPlaceId = prediction.id
        homeCityQuery = prediction.fullText
        homeCityPredictions = []
    }

    func clearHomeCity() {
        selectedHomeCity = nil
        onboardingData.homeCity = nil
        onboardingData.homeCityPlaceId = nil
        homeCityQuery = ""
        homeCityPredictions = []
    }

    // MARK: - Country Selection

    func toggleVisitedCountry(_ countryId: UUID) {
        if onboardingData.visitedCountryIds.contains(countryId) {
            onboardingData.visitedCountryIds.remove(countryId)
        } else {
            onboardingData.visitedCountryIds.insert(countryId)
        }
    }

    func toggleWanderlistCountry(_ countryId: UUID) {
        if onboardingData.wanderlistCountryIds.contains(countryId) {
            onboardingData.wanderlistCountryIds.remove(countryId)
        } else {
            onboardingData.wanderlistCountryIds.insert(countryId)
        }
    }

    func isVisited(_ countryId: UUID) -> Bool {
        onboardingData.visitedCountryIds.contains(countryId)
    }

    func isInWanderlist(_ countryId: UUID) -> Bool {
        onboardingData.wanderlistCountryIds.contains(countryId)
    }

    // MARK: - Continent Expansion

    func toggleContinentExpanded(_ continentId: UUID) {
        if expandedContinentIds.contains(continentId) {
            expandedContinentIds.remove(continentId)
        } else {
            expandedContinentIds.insert(continentId)
        }
    }

    func isContinentExpanded(_ continentId: UUID) -> Bool {
        expandedContinentIds.contains(continentId)
    }

    // MARK: - Navigation

    func nextStep() {
        if currentStep == .visited && !shouldShowTipsStep && currentStep.next == .wanderlist {
            // Skip to wanderlist if no visited countries
            if let next = currentStep.next {
                currentStep = next
            }
        } else if let next = currentStep.next {
            currentStep = next
        }
    }

    func previousStep() {
        if let previous = currentStep.previous {
            currentStep = previous
        }
    }

    func goToStep(_ step: OnboardingStep) {
        currentStep = step
    }

    // MARK: - Save Data

    func saveOnboardingData() async -> Bool {
        guard let userId = await getCurrentUserId() else {
            errorMessage = "Not authenticated"
            print("❌ [OnboardingViewModel] Not authenticated")
            return false
        }

        isSaving = true
        errorMessage = nil

        // 1. Update profile with home city and onboarding flag (required)
        do {
            try await updateProfile(userId: userId)
            print("✅ [OnboardingViewModel] Profile updated")
        } catch {
            print("❌ [OnboardingViewModel] Error updating profile: \(error)")
            errorMessage = error.localizedDescription
            isSaving = false
            return false
        }

        // 2. Create past trips for visited countries (optional - don't fail onboarding)
        do {
            try await createPastTrips(userId: userId)
        } catch {
            print("⚠️ [OnboardingViewModel] Error creating past trips (non-fatal): \(error)")
        }

        // 3. Create wanderlist items (optional - don't fail onboarding)
        do {
            try await createWanderlistItems(userId: userId)
        } catch {
            print("⚠️ [OnboardingViewModel] Error creating wanderlist items (non-fatal): \(error)")
        }

        print("✅ [OnboardingViewModel] Onboarding data saved successfully")
        isSaving = false
        return true
    }

    private func updateProfile(userId: UUID) async throws {
        struct UpdateProfileData: Encodable {
            let homeCity: String?
            let homeCityPlaceId: String?
            let onboardingCompleted: Bool

            enum CodingKeys: String, CodingKey {
                case homeCity = "home_city"
                case homeCityPlaceId = "home_city_place_id"
                case onboardingCompleted = "onboarding_completed"
            }
        }

        let updates = UpdateProfileData(
            homeCity: onboardingData.homeCity,
            homeCityPlaceId: onboardingData.homeCityPlaceId,
            onboardingCompleted: true
        )

        try await SupabaseService.shared.client
            .from("profiles")
            .update(updates)
            .eq("id", value: userId.uuidString)
            .execute()
    }

    private func createPastTrips(userId: UUID) async throws {
        guard !onboardingData.visitedCountryIds.isEmpty else { return }

        for countryId in onboardingData.visitedCountryIds {
            guard let country = allCountries.first(where: { $0.id == countryId }) else { continue }

            // Create a past trip for this country
            struct CreatePastTrip: Encodable {
                let userId: UUID
                let name: String
                let isPast: Bool
                let visibility: String

                enum CodingKeys: String, CodingKey {
                    case userId = "user_id"
                    case name
                    case isPast = "is_past"
                    case visibility
                }
            }

            let trip = CreatePastTrip(
                userId: userId,
                name: country.name,
                isPast: true,
                visibility: "private"
            )

            // Insert trip and get the ID back
            let insertedTrips: [Trip] = try await SupabaseService.shared.client
                .from("trips")
                .insert(trip)
                .select()
                .execute()
                .value

            guard let insertedTrip = insertedTrips.first else { continue }

            // Create trip_location for this country
            struct CreateTripLocation: Encodable {
                let tripId: UUID
                let countryId: UUID
                let orderIndex: Int

                enum CodingKeys: String, CodingKey {
                    case tripId = "trip_id"
                    case countryId = "country_id"
                    case orderIndex = "order_index"
                }
            }

            let location = CreateTripLocation(
                tripId: insertedTrip.id,
                countryId: countryId,
                orderIndex: 0
            )

            try await SupabaseService.shared.client
                .from("trip_locations")
                .insert(location)
                .execute()
        }

        print("✅ [OnboardingViewModel] Created \(onboardingData.visitedCountryIds.count) past trips")
    }

    private func createWanderlistItems(userId: UUID) async throws {
        guard !onboardingData.wanderlistCountryIds.isEmpty else { return }

        for countryId in onboardingData.wanderlistCountryIds {
            let item = CreateCountryWanderlistItem(userId: userId, countryId: countryId, notes: nil)

            try await SupabaseService.shared.client
                .from("wanderlist_items")
                .insert(item)
                .execute()
        }

        print("✅ [OnboardingViewModel] Created \(onboardingData.wanderlistCountryIds.count) wanderlist items")
    }

    func skipOnboarding() async -> Bool {
        guard let userId = await getCurrentUserId() else {
            errorMessage = "Not authenticated"
            return false
        }

        isSaving = true

        do {
            struct SkipOnboarding: Encodable {
                let onboardingCompleted: Bool

                enum CodingKeys: String, CodingKey {
                    case onboardingCompleted = "onboarding_completed"
                }
            }

            try await SupabaseService.shared.client
                .from("profiles")
                .update(SkipOnboarding(onboardingCompleted: true))
                .eq("id", value: userId.uuidString)
                .execute()

            isSaving = false
            return true
        } catch {
            print("❌ [OnboardingViewModel] Error skipping onboarding: \(error)")
            errorMessage = error.localizedDescription
            isSaving = false
            return false
        }
    }
}
