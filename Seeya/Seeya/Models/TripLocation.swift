import Foundation

struct TripLocation: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let tripId: UUID
    let countryId: UUID?
    let cityId: UUID?
    let customLocation: String?
    let orderIndex: Int
    let arrivalDate: String?
    let departureDate: String?
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
        case arrivalDate = "arrival_date"
        case departureDate = "departure_date"
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
    let arrivalDate: String?
    let departureDate: String?

    enum CodingKeys: String, CodingKey {
        case tripId = "trip_id"
        case countryId = "country_id"
        case cityId = "city_id"
        case customLocation = "custom_location"
        case orderIndex = "order_index"
        case arrivalDate = "arrival_date"
        case departureDate = "departure_date"
    }

    init(tripId: UUID, countryId: UUID?, cityId: UUID?, customLocation: String?, orderIndex: Int, arrivalDate: String? = nil, departureDate: String? = nil) {
        self.tripId = tripId
        self.countryId = countryId
        self.cityId = cityId
        self.customLocation = customLocation
        self.orderIndex = orderIndex
        self.arrivalDate = arrivalDate
        self.departureDate = departureDate
    }
}
