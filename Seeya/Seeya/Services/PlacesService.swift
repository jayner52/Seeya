import Foundation

// MARK: - Place Models

struct PlacePrediction: Identifiable, Hashable {
    let id: String // place_id
    let mainText: String // Primary text (e.g., "Paris")
    let secondaryText: String // Secondary text (e.g., "France")

    var fullText: String {
        if secondaryText.isEmpty {
            return mainText
        }
        return "\(mainText), \(secondaryText)"
    }
}

struct PlaceDetails {
    let placeId: String
    let name: String
    let formattedAddress: String
    let latitude: Double?
    let longitude: Double?
}

// MARK: - Places Service

actor PlacesService {
    static let shared = PlacesService()

    private let apiKey = "AIzaSyBS0e5TnVyJd1PCBESPBACkdQt4Dbej6Rw"

    private let baseURL = "https://maps.googleapis.com/maps/api/place"

    private init() {}

    var isConfigured: Bool {
        !apiKey.isEmpty
    }

    // MARK: - Autocomplete

    func autocomplete(query: String) async throws -> [PlacePrediction] {
        guard !query.isEmpty else { return [] }
        guard isConfigured else {
            print("⚠️ [PlacesService] API key not configured")
            return []
        }

        let encodedQuery = query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? query
        let urlString = "\(baseURL)/autocomplete/json?input=\(encodedQuery)&types=(cities)&key=\(apiKey)"

        guard let url = URL(string: urlString) else {
            throw PlacesError.invalidURL
        }

        let (data, response) = try await URLSession.shared.data(from: url)

        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw PlacesError.invalidResponse
        }

        let result = try JSONDecoder().decode(AutocompleteResponse.self, from: data)

        if result.status != "OK" && result.status != "ZERO_RESULTS" {
            print("⚠️ [PlacesService] API error: \(result.status)")
            throw PlacesError.apiError(result.status)
        }

        return result.predictions.map { prediction in
            PlacePrediction(
                id: prediction.place_id,
                mainText: prediction.structured_formatting.main_text,
                secondaryText: prediction.structured_formatting.secondary_text ?? ""
            )
        }
    }

    // MARK: - Place Details

    func getPlaceDetails(placeId: String) async throws -> PlaceDetails {
        guard isConfigured else {
            throw PlacesError.notConfigured
        }

        let urlString = "\(baseURL)/details/json?place_id=\(placeId)&fields=name,formatted_address,geometry&key=\(apiKey)"

        guard let url = URL(string: urlString) else {
            throw PlacesError.invalidURL
        }

        let (data, response) = try await URLSession.shared.data(from: url)

        guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
            throw PlacesError.invalidResponse
        }

        let result = try JSONDecoder().decode(PlaceDetailsResponse.self, from: data)

        guard result.status == "OK", let place = result.result else {
            throw PlacesError.apiError(result.status)
        }

        return PlaceDetails(
            placeId: placeId,
            name: place.name,
            formattedAddress: place.formatted_address,
            latitude: place.geometry?.location.lat,
            longitude: place.geometry?.location.lng
        )
    }
}

// MARK: - Errors

enum PlacesError: LocalizedError {
    case notConfigured
    case invalidURL
    case invalidResponse
    case apiError(String)

    var errorDescription: String? {
        switch self {
        case .notConfigured:
            return "Google Places API key not configured"
        case .invalidURL:
            return "Invalid URL"
        case .invalidResponse:
            return "Invalid response from server"
        case .apiError(let status):
            return "API error: \(status)"
        }
    }
}

// MARK: - API Response Models

private struct AutocompleteResponse: Decodable {
    let predictions: [Prediction]
    let status: String

    struct Prediction: Decodable {
        let place_id: String
        let structured_formatting: StructuredFormatting

        struct StructuredFormatting: Decodable {
            let main_text: String
            let secondary_text: String?
        }
    }
}

private struct PlaceDetailsResponse: Decodable {
    let result: PlaceResult?
    let status: String

    struct PlaceResult: Decodable {
        let name: String
        let formatted_address: String
        let geometry: Geometry?

        struct Geometry: Decodable {
            let location: Location

            struct Location: Decodable {
                let lat: Double
                let lng: Double
            }
        }
    }
}
