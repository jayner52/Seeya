import Foundation

struct City: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let name: String
    let countryId: UUID?
    let latitude: Double?
    let longitude: Double?
    let createdAt: Date?

    // Relationship
    var country: Country?

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case countryId = "country_id"
        case latitude
        case longitude
        case createdAt = "created_at"
        case country = "countries"
    }

    // Display name with country
    var displayName: String {
        if let country = country {
            return "\(name), \(country.name)"
        }
        return name
    }
}

struct Country: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let name: String
    let code: String?
    let flagEmoji: String?
    let createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case code
        case flagEmoji = "flag_emoji"
        case createdAt = "created_at"
    }
}
