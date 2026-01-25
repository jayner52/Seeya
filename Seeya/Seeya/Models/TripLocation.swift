import Foundation

struct TripLocation: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let tripId: UUID
    let countryId: UUID?
    let cityId: UUID?
    let customLocation: String?
    let orderIndex: Int
    let createdAt: Date?

    // Relationships
    var city: City?
    var country: Country?

    enum CodingKeys: String, CodingKey {
        case id
        case tripId = "trip_id"
        case countryId = "country_id"
        case cityId = "city_id"
        case customLocation = "custom_location"
        case orderIndex = "order_index"
        case createdAt = "created_at"
        case city = "cities"
        case country = "countries"
    }

    // Display name for the location
    var displayName: String {
        if let city = city {
            return city.displayName
        }
        if let customLocation = customLocation, !customLocation.isEmpty {
            return customLocation
        }
        if let country = country {
            return country.name
        }
        return "Unknown Location"
    }

    var flagEmoji: String? {
        country?.flagEmoji ?? city?.country?.flagEmoji
    }
}

// MARK: - Create DTO

struct CreateTripLocation: Encodable {
    let tripId: UUID
    let countryId: UUID?
    let cityId: UUID?
    let customLocation: String?
    let orderIndex: Int

    enum CodingKeys: String, CodingKey {
        case tripId = "trip_id"
        case countryId = "country_id"
        case cityId = "city_id"
        case customLocation = "custom_location"
        case orderIndex = "order_index"
    }
}
