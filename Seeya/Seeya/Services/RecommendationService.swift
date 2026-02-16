import Foundation
import Supabase

/// Service for managing shared recommendations and friend recommendations
actor RecommendationService {
    static let shared = RecommendationService()

    private let client = SupabaseService.shared.client

    private init() {}

    // MARK: - Share Recommendation

    /// Shares a trip bit as a recommendation to the user's profile
    func shareRecommendation(
        tripBit: TripBit,
        trip: Trip?,
        rating: Int,
        tips: String?
    ) async throws -> SharedRecommendation {
        let session = try await client.auth.session
        let userId = session.user.id

        // Resolve city_id and country_id from trip locations
        let cityId = trip?.locations?.first?.cityId
        let countryId = trip?.locations?.first?.countryId

        // Map TripBitCategory to RecommendationCategory
        let category: RecommendationCategory = {
            switch tripBit.category {
            case .reservation: return .restaurant
            case .activity: return .activity
            case .stay: return .stay
            default: return .tip
            }
        }()

        let dto = CreateSharedRecommendation(
            userId: userId,
            cityId: cityId,
            countryId: countryId,
            title: tripBit.title,
            description: tripBit.notes,
            category: category,
            rating: rating,
            tips: tips?.isEmpty == true ? nil : tips,
            url: nil,
            googlePlaceId: nil,
            latitude: nil,
            longitude: nil,
            sourceTripId: trip?.id,
            sourceResourceId: tripBit.id
        )

        let created: SharedRecommendation = try await client
            .from("shared_recommendations")
            .insert(dto)
            .select("*, profiles(*), cities(*, countries(*)), countries(*)")
            .single()
            .execute()
            .value

        print("[RecommendationService] Shared recommendation: \(created.id)")
        return created
    }

    // MARK: - Fetch Friend Recommendations

    /// Fetches shared recommendations from friends/tripmates for the given city IDs
    func fetchFriendRecommendations(cityIds: [UUID]) async throws -> [SharedRecommendation] {
        guard !cityIds.isEmpty else { return [] }

        let session = try await client.auth.session
        let currentUserId = session.user.id

        // Query shared_recommendations where city_id is in the provided set
        // and the author is not the current user.
        // RLS on the server handles friend/tripmate visibility.
        let cityIdStrings = cityIds.map { $0.uuidString }

        let recommendations: [SharedRecommendation] = try await client
            .from("shared_recommendations")
            .select("*, profiles(*), cities(*, countries(*)), countries(*)")
            .in("city_id", values: cityIdStrings)
            .neq("user_id", value: currentUserId.uuidString)
            .order("created_at", ascending: false)
            .execute()
            .value

        print("[RecommendationService] Fetched \(recommendations.count) friend recommendations")
        return recommendations
    }

    // MARK: - Add Recommendation to Trip

    /// Creates a TripBit from a shared recommendation
    func addRecommendationToTrip(
        recommendation: SharedRecommendation,
        tripId: UUID
    ) async throws -> TripBit {
        let session = try await client.auth.session
        let userId = session.user.id

        // Map recommendation category to TripBitCategory
        let category: TripBitCategory = {
            switch recommendation.category {
            case .restaurant: return .reservation
            case .activity: return .activity
            case .stay: return .stay
            case .tip: return .other
            }
        }()

        // Build notes from tips and description
        var notes: String? = nil
        var parts: [String] = []
        if let tips = recommendation.tips, !tips.isEmpty {
            parts.append(tips)
        }
        if let desc = recommendation.description, !desc.isEmpty {
            parts.append(desc)
        }
        if let authorName = recommendation.profile?.fullName {
            parts.append("Recommended by \(authorName)")
        }
        if !parts.isEmpty {
            notes = parts.joined(separator: "\n")
        }

        let createDTO = CreateTripBit(
            tripId: tripId,
            createdBy: userId,
            category: category,
            title: recommendation.title,
            status: .idea,
            startDatetime: nil,
            endDatetime: nil,
            locationId: nil,
            notes: notes,
            orderIndex: nil
        )

        let newBit: TripBit = try await client
            .from("trip_bits")
            .insert(createDTO)
            .select()
            .single()
            .execute()
            .value

        // Also create an "applies to all" traveler record
        let travelerDTO = CreateTripBitTraveler(
            tripBitId: newBit.id,
            userId: userId,
            appliesToAll: true
        )

        try await client
            .from("trip_bit_travelers")
            .insert(travelerDTO)
            .execute()

        print("[RecommendationService] Added recommendation to trip as TripBit: \(newBit.id)")
        return newBit
    }
}
