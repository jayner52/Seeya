import Foundation

struct SharedRecommendation: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let userId: UUID
    let cityId: UUID?
    let countryId: UUID?
    let title: String
    let description: String?
    let category: RecommendationCategory
    let rating: Int?
    let tips: String?
    let url: String?
    let googlePlaceId: String?
    let latitude: Double?
    let longitude: Double?
    let sourceTripId: UUID?
    let sourceResourceId: UUID?
    let createdAt: Date?

    // Relationships (populated when queried with select joins)
    var profiles: Profile?
    var cities: City?
    var countries: Country?

    // Convenience aliases
    var profile: Profile? { profiles }
    var city: City? { cities }
    var country: Country? { countries }

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case cityId = "city_id"
        case countryId = "country_id"
        case title
        case description
        case category
        case rating
        case tips
        case url
        case googlePlaceId = "google_place_id"
        case latitude
        case longitude
        case sourceTripId = "source_trip_id"
        case sourceResourceId = "source_resource_id"
        case createdAt = "created_at"
        case profiles
        case cities
        case countries
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    static func == (lhs: SharedRecommendation, rhs: SharedRecommendation) -> Bool {
        lhs.id == rhs.id
    }

    /// Display location string
    var locationDisplay: String {
        if let city = city {
            return city.displayName
        }
        if let country = country {
            return country.name
        }
        return "Unknown location"
    }

    /// Flag emoji for display
    var flagEmoji: String {
        if let city = city, let country = city.country, let flag = country.flagEmoji {
            return flag
        }
        if let flag = country?.flagEmoji {
            return flag
        }
        return "🏳️"
    }

    /// Color for the category marker on maps
    var categoryColor: String {
        switch category {
        case .restaurant: return "orange"
        case .activity: return "green"
        case .stay: return "blue"
        case .tip: return "amber"
        }
    }

    /// Whether this recommendation has valid coordinates for map display
    var hasCoordinates: Bool {
        latitude != nil && longitude != nil
    }
}

// MARK: - Create DTO

struct CreateSharedRecommendation: Encodable {
    let userId: UUID
    let cityId: UUID?
    let countryId: UUID?
    let title: String
    let description: String?
    let category: RecommendationCategory
    let rating: Int?
    let tips: String?
    let url: String?
    let googlePlaceId: String?
    let latitude: Double?
    let longitude: Double?
    let sourceTripId: UUID?
    let sourceResourceId: UUID?

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case cityId = "city_id"
        case countryId = "country_id"
        case title
        case description
        case category
        case rating
        case tips
        case url
        case googlePlaceId = "google_place_id"
        case latitude
        case longitude
        case sourceTripId = "source_trip_id"
        case sourceResourceId = "source_resource_id"
    }
}
