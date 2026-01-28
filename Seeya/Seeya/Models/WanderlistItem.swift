import Foundation

struct WanderlistItem: Codable, Identifiable, Hashable, Sendable {
    let id: UUID
    let userId: UUID
    let countryId: UUID?
    let cityId: UUID?
    let placeName: String?
    let placeId: String?
    let notes: String?
    let createdAt: Date?

    // Relationships (populated when queried with select joins)
    var countries: Country?  // Matches Supabase table name
    var cities: City?  // Matches Supabase table name

    // Convenience aliases
    var country: Country? { countries }
    var city: City? { cities }

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case countryId = "country_id"
        case cityId = "city_id"
        case placeName = "place_name"
        case placeId = "place_id"
        case notes
        case createdAt = "created_at"
        case countries
        case cities
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    static func == (lhs: WanderlistItem, rhs: WanderlistItem) -> Bool {
        lhs.id == rhs.id
    }

    /// Whether this is a city/place entry vs a country entry
    var isCity: Bool {
        cityId != nil || placeName != nil
    }

    /// Display name for the item
    var displayName: String {
        if let city = city {
            return city.name
        }
        if let placeName = placeName {
            return placeName
        }
        return country?.name ?? "Unknown"
    }

    /// The continent this item belongs to (from country or city's country)
    var continent: Continent? {
        if let city = city, let country = city.country {
            return country.continent
        }
        return country?.continent
    }

    /// Flag emoji for display
    var flagEmoji: String {
        // First try from relationships
        if let city = city, let country = city.country, let flag = country.flagEmoji {
            return flag
        }
        if let flag = country?.flagEmoji {
            return flag
        }

        // For Google Places items, try to extract country and get flag
        if let placeName = placeName {
            return Self.flagEmoji(fromPlaceName: placeName)
        }

        return "🏳️"
    }

    /// Extract flag emoji from a place name like "Tokyo, Japan" or "Perth, WA, Australia"
    static func flagEmoji(fromPlaceName placeName: String) -> String {
        // Get the last component (usually the country)
        let components = placeName.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }
        guard let lastComponent = components.last else { return "🏳️" }

        // Try to find a matching country code
        if let code = countryNameToCode[lastComponent.lowercased()] {
            return flagEmoji(fromCountryCode: code)
        }

        // Also check the second-to-last component for cases like "Perth, WA, Australia"
        if components.count >= 2 {
            let secondLast = components[components.count - 1]
            if let code = countryNameToCode[secondLast.lowercased()] {
                return flagEmoji(fromCountryCode: code)
            }
        }

        return "🏳️"
    }

    /// Convert a 2-letter country code to flag emoji
    static func flagEmoji(fromCountryCode code: String) -> String {
        let base: UInt32 = 127397 // Regional Indicator Symbol base
        var emoji = ""
        for scalar in code.uppercased().unicodeScalars {
            if let unicode = UnicodeScalar(base + scalar.value) {
                emoji.append(String(unicode))
            }
        }
        return emoji.isEmpty ? "🏳️" : emoji
    }

    /// Mapping of country names to ISO 3166-1 alpha-2 codes
    private static let countryNameToCode: [String: String] = [
        // Asia
        "japan": "JP", "china": "CN", "india": "IN", "south korea": "KR", "korea": "KR",
        "thailand": "TH", "vietnam": "VN", "indonesia": "ID", "malaysia": "MY",
        "singapore": "SG", "philippines": "PH", "taiwan": "TW", "hong kong": "HK",
        "myanmar": "MM", "cambodia": "KH", "laos": "LA", "nepal": "NP", "sri lanka": "LK",
        "bangladesh": "BD", "pakistan": "PK", "mongolia": "MN", "brunei": "BN",

        // Europe
        "france": "FR", "germany": "DE", "italy": "IT", "spain": "ES", "portugal": "PT",
        "united kingdom": "GB", "uk": "GB", "england": "GB", "scotland": "GB", "wales": "GB",
        "ireland": "IE", "netherlands": "NL", "belgium": "BE", "switzerland": "CH",
        "austria": "AT", "greece": "GR", "sweden": "SE", "norway": "NO", "denmark": "DK",
        "finland": "FI", "poland": "PL", "czech republic": "CZ", "czechia": "CZ",
        "hungary": "HU", "romania": "RO", "croatia": "HR", "slovenia": "SI", "slovakia": "SK",
        "bulgaria": "BG", "serbia": "RS", "ukraine": "UA", "russia": "RU", "turkey": "TR",
        "iceland": "IS", "luxembourg": "LU", "monaco": "MC", "malta": "MT", "cyprus": "CY",
        "estonia": "EE", "latvia": "LV", "lithuania": "LT", "albania": "AL",
        "north macedonia": "MK", "montenegro": "ME", "bosnia and herzegovina": "BA",

        // North America
        "united states": "US", "usa": "US", "us": "US", "canada": "CA", "mexico": "MX",
        "guatemala": "GT", "belize": "BZ", "honduras": "HN", "el salvador": "SV",
        "nicaragua": "NI", "costa rica": "CR", "panama": "PA", "cuba": "CU",
        "jamaica": "JM", "haiti": "HT", "dominican republic": "DO", "puerto rico": "PR",
        "bahamas": "BS", "trinidad and tobago": "TT", "barbados": "BB",

        // South America
        "brazil": "BR", "argentina": "AR", "chile": "CL", "peru": "PE", "colombia": "CO",
        "venezuela": "VE", "ecuador": "EC", "bolivia": "BO", "paraguay": "PY",
        "uruguay": "UY", "guyana": "GY", "suriname": "SR", "french guiana": "GF",

        // Africa
        "egypt": "EG", "south africa": "ZA", "morocco": "MA", "kenya": "KE",
        "tanzania": "TZ", "nigeria": "NG", "ethiopia": "ET", "ghana": "GH",
        "algeria": "DZ", "tunisia": "TN", "libya": "LY", "sudan": "SD",
        "uganda": "UG", "rwanda": "RW", "senegal": "SN", "ivory coast": "CI",
        "cameroon": "CM", "zimbabwe": "ZW", "botswana": "BW", "namibia": "NA",
        "mauritius": "MU", "madagascar": "MG", "mozambique": "MZ", "zambia": "ZM",

        // Oceania
        "australia": "AU", "new zealand": "NZ", "fiji": "FJ", "papua new guinea": "PG",
        "samoa": "WS", "tonga": "TO", "vanuatu": "VU", "solomon islands": "SB",
        "new caledonia": "NC", "french polynesia": "PF", "guam": "GU",

        // Middle East
        "israel": "IL", "jordan": "JO", "lebanon": "LB", "syria": "SY",
        "saudi arabia": "SA", "united arab emirates": "AE", "uae": "AE", "qatar": "QA",
        "kuwait": "KW", "bahrain": "BH", "oman": "OM", "yemen": "YE", "iraq": "IQ",
        "iran": "IR",

        // Antarctica
        "antarctica": "AQ"
    ]
}

// MARK: - Create DTOs

/// For creating country-based wanderlist items (original schema)
struct CreateCountryWanderlistItem: Encodable {
    let userId: UUID
    let countryId: UUID
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case countryId = "country_id"
        case notes
    }
}

/// For creating place-based wanderlist items (requires schema update)
struct CreatePlaceWanderlistItem: Encodable {
    let userId: UUID
    let placeName: String
    let placeId: String
    let notes: String?

    enum CodingKeys: String, CodingKey {
        case userId = "user_id"
        case placeName = "place_name"
        case placeId = "place_id"
        case notes
    }
}
