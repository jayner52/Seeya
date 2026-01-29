import Foundation

/// Service for AI-powered features using OpenRouter
actor AIService {
    static let shared = AIService()

    private var apiKey: String {
        SecretsManager.openRouterAPIKey
    }
    private let baseURL = "https://openrouter.ai/api/v1/chat/completions"

    private init() {}

    var isConfigured: Bool {
        !apiKey.isEmpty
    }

    // MARK: - Parse Booking Screenshot

    func parseBookingScreenshot(imageData: Data) async throws -> ParsedTripBit {
        guard let url = URL(string: baseURL) else {
            throw AIServiceError.invalidURL
        }

        let base64Image = imageData.base64EncodedString()

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        request.addValue("Seeya Travel App", forHTTPHeaderField: "X-Title")

        let systemPrompt = """
        You are a travel booking data extractor. Analyze the provided screenshot or image of a booking confirmation and extract relevant travel information.

        Return a JSON object with these fields:
        {
            "category": "flight|stay|car|activity|transport|reservation|document|other",
            "title": "Brief descriptive title",
            "startDatetime": "ISO 8601 datetime or null",
            "endDatetime": "ISO 8601 datetime or null",
            "confidence": 0.0 to 1.0,
            "details": {
                // Category-specific fields based on what you can extract
            }
        }

        Category-specific detail fields:
        - flight: airline, flightNumber, departureAirport, arrivalAirport, confirmationNumber, seatAssignments, terminal, gate
        - stay: propertyName, propertyType, address, checkInTime, checkOutTime, roomType, confirmationNumber
        - car: rentalCompany, vehicleType, pickupLocation, dropoffLocation, confirmationNumber
        - activity: venueName, address, duration, meetingPoint, ticketType, confirmationNumber
        - transport: transportType, operator, departureStation, arrivalStation, platform, confirmationNumber
        - reservation: venueName, venueType, address, reservationTime, partySize, confirmationNumber
        - document: documentType, documentNumber, expiryDate, holderName
        - other: customType, description, confirmationNumber

        Only include fields you can confidently extract. Set confidence based on image quality and data clarity.
        Return ONLY valid JSON, no additional text.
        """

        let body: [String: Any] = [
            "model": "anthropic/claude-3.5-sonnet",
            "messages": [
                ["role": "system", "content": systemPrompt],
                [
                    "role": "user",
                    "content": [
                        [
                            "type": "image_url",
                            "image_url": [
                                "url": "data:image/jpeg;base64,\(base64Image)"
                            ]
                        ],
                        [
                            "type": "text",
                            "text": "Extract the booking information from this image."
                        ]
                    ]
                ]
            ],
            "max_tokens": 1000,
            "temperature": 0.1
        ]

        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw AIServiceError.invalidResponse
        }

        guard httpResponse.statusCode == 200 else {
            let errorBody = String(data: data, encoding: .utf8) ?? "Unknown error"
            print("❌ [AIService] API error (\(httpResponse.statusCode)): \(errorBody)")
            throw AIServiceError.apiError(statusCode: httpResponse.statusCode, message: errorBody)
        }

        // Parse response
        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let choices = json["choices"] as? [[String: Any]],
              let firstChoice = choices.first,
              let message = firstChoice["message"] as? [String: Any],
              let content = message["content"] as? String else {
            throw AIServiceError.parsingError
        }

        // Parse the JSON content
        return try parseBookingJSON(content)
    }

    // MARK: - Parse Booking Text

    func parseBookingText(_ text: String) async throws -> ParsedTripBit {
        let prompt = """
        Extract travel booking information from this text. Pay VERY close attention to dates.

        Text to analyze:
        ---
        \(text)
        ---

        CRITICAL DATE EXTRACTION:
        1. Search the text for dates like "16 May, 2025", "May 16, 2025", "Fri 16 May, 2025"
        2. For flights, find the DEPARTURE date (not booking date or issue date)
        3. Look for patterns like "Depart • Fri 16 May, 2025" or "Departure: May 16, 2025"
        4. Extract the YEAR from the text - do NOT assume current year
        5. Combine date and time (e.g., "16 May 2025" + "12:10" = "2025-05-16T12:10:00")
        6. If you find "16 May, 2025" and time "12:10", return "2025-05-16T12:10:00"
        7. NEVER use today's date or current date - only use dates found in the text

        Return JSON:
        {
            "category": "flight|stay|car|activity|transport|reservation|document|other",
            "title": "Brief title (e.g., 'Air Canada LAS-YYZ')",
            "startDatetime": "YYYY-MM-DDTHH:MM:SS format or null if not found",
            "endDatetime": "YYYY-MM-DDTHH:MM:SS format or null if not found",
            "confidence": 0.0 to 1.0,
            "details": {
                "airline": "...",
                "flightNumber": "...",
                "departureAirport": "...",
                "arrivalAirport": "...",
                "confirmationNumber": "...",
                "departureTime": "...",
                "arrivalTime": "..."
            }
        }

        For flights include: airline, flightNumber, departureAirport, arrivalAirport, confirmationNumber
        For stays include: propertyName, address, checkInTime, checkOutTime, confirmationNumber
        For other categories, include relevant details.

        Return ONLY valid JSON, no explanation.
        """

        let response = try await callOpenRouter(prompt: prompt, maxTokens: 800)
        return try parseBookingJSON(response)
    }

    private func parseBookingJSON(_ jsonString: String) throws -> ParsedTripBit {
        // Clean up the response - remove markdown code blocks if present
        let cleanedJSON = jsonString
            .replacingOccurrences(of: "```json", with: "")
            .replacingOccurrences(of: "```", with: "")
            .trimmingCharacters(in: .whitespacesAndNewlines)

        print("🔍 [AIService] Parsing JSON: \(cleanedJSON)")

        guard let jsonData = cleanedJSON.data(using: .utf8),
              let json = try JSONSerialization.jsonObject(with: jsonData) as? [String: Any] else {
            throw AIServiceError.parsingError
        }

        // Parse category
        let categoryString = json["category"] as? String ?? "other"
        let category = TripBitCategory(rawValue: categoryString) ?? .other

        // Parse title
        let title = json["title"] as? String ?? "Untitled"

        // Parse dates with multiple format support
        var startDatetime: Date?
        if let startString = json["startDatetime"] as? String {
            print("🔍 [AIService] Attempting to parse startDatetime: '\(startString)'")
            startDatetime = parseFlexibleDate(startString)
            print("🔍 [AIService] Parsed startDatetime result: \(String(describing: startDatetime))")
        }

        var endDatetime: Date?
        if let endString = json["endDatetime"] as? String {
            print("🔍 [AIService] Attempting to parse endDatetime: '\(endString)'")
            endDatetime = parseFlexibleDate(endString)
            print("🔍 [AIService] Parsed endDatetime result: \(String(describing: endDatetime))")
        }

        // Parse confidence
        let confidence = json["confidence"] as? Double ?? 0.5

        // Parse details
        let details = json["details"] as? [String: Any] ?? [:]

        return ParsedTripBit(
            category: category,
            title: title,
            startDatetime: startDatetime,
            endDatetime: endDatetime,
            details: details,
            confidence: confidence
        )
    }

    /// Parse dates in multiple formats since AI may return various ISO8601 variations
    private func parseFlexibleDate(_ dateString: String) -> Date? {
        // Try ISO8601 with timezone (full format)
        let iso8601Full = ISO8601DateFormatter()
        iso8601Full.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = iso8601Full.date(from: dateString) {
            return date
        }

        // Try ISO8601 without fractional seconds
        iso8601Full.formatOptions = [.withInternetDateTime]
        if let date = iso8601Full.date(from: dateString) {
            return date
        }

        // Try common formats that AI might return without timezone
        let formatters: [String] = [
            "yyyy-MM-dd'T'HH:mm:ss",       // 2025-05-16T10:30:00
            "yyyy-MM-dd'T'HH:mm",          // 2025-05-16T10:30
            "yyyy-MM-dd HH:mm:ss",         // 2025-05-16 10:30:00
            "yyyy-MM-dd HH:mm",            // 2025-05-16 10:30
            "yyyy-MM-dd",                  // 2025-05-16
            "MMM d, yyyy 'at' h:mm a",     // May 16, 2025 at 10:30 AM
            "MMM d, yyyy h:mm a",          // May 16, 2025 10:30 AM
            "MMM d, yyyy",                 // May 16, 2025
            "d MMM, yyyy",                 // 16 May, 2025
            "d MMM yyyy HH:mm",            // 16 May 2025 10:30
            "d MMM yyyy",                  // 16 May 2025
            "EEE d MMM, yyyy",             // Fri 16 May, 2025
            "EEE, d MMM yyyy",             // Fri, 16 May 2025
            "EEEE, MMMM d, yyyy",          // Friday, May 16, 2025
        ]

        let dateFormatter = DateFormatter()
        dateFormatter.locale = Locale(identifier: "en_US_POSIX")

        for format in formatters {
            dateFormatter.dateFormat = format
            if let date = dateFormatter.date(from: dateString) {
                return date
            }
        }

        return nil
    }

    // MARK: - Generate Destination Recommendations

    struct AIRecommendation: Codable, Identifiable, Sendable {
        let id: UUID
        let title: String
        let description: String
        let category: String
        let tips: String?
        let estimatedCost: String?
        let bestTimeToVisit: String?

        init(id: UUID = UUID(), title: String, description: String, category: String, tips: String? = nil, estimatedCost: String? = nil, bestTimeToVisit: String? = nil) {
            self.id = id
            self.title = title
            self.description = description
            self.category = category
            self.tips = tips
            self.estimatedCost = estimatedCost
            self.bestTimeToVisit = bestTimeToVisit
        }
    }

    struct AIRecommendationsResponse: Codable, Sendable {
        let restaurants: [AIRecommendation]
        let activities: [AIRecommendation]
        let stays: [AIRecommendation]
        let tips: [AIRecommendation]
    }

    func generateDestinationRecommendations(
        destination: String,
        tripDates: (start: Date?, end: Date?)? = nil,
        interests: [String] = [],
        travelStyle: String? = nil
    ) async throws -> AIRecommendationsResponse {
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "MMMM yyyy"

        var contextParts: [String] = []
        if let dates = tripDates, let start = dates.start {
            contextParts.append("traveling in \(dateFormatter.string(from: start))")
        }
        if !interests.isEmpty {
            contextParts.append("interests include \(interests.joined(separator: ", "))")
        }
        if let style = travelStyle {
            contextParts.append("travel style is \(style)")
        }

        let contextString = contextParts.isEmpty ? "" : " (\(contextParts.joined(separator: "; ")))"

        let prompt = """
        Generate travel recommendations for \(destination)\(contextString).

        Provide authentic, local-favorite recommendations that a well-traveled friend would suggest. Focus on quality over tourist traps.

        Return a JSON object with these arrays:
        {
            "restaurants": [
                {
                    "title": "Name of restaurant",
                    "description": "Brief description of cuisine and vibe",
                    "category": "restaurant",
                    "tips": "Insider tip (best dish, reservation advice, etc.)",
                    "estimatedCost": "$, $$, $$$, or $$$$",
                    "bestTimeToVisit": "lunch, dinner, late night, etc."
                }
            ],
            "activities": [
                {
                    "title": "Name of activity or attraction",
                    "description": "What makes it special",
                    "category": "activity",
                    "tips": "Insider tip (best time, what to bring, etc.)",
                    "estimatedCost": "Free, $, $$, etc.",
                    "bestTimeToVisit": "morning, afternoon, sunset, etc."
                }
            ],
            "stays": [
                {
                    "title": "Neighborhood or area name",
                    "description": "Why stay here, vibe of the area",
                    "category": "stay",
                    "tips": "What's nearby, transportation tips"
                }
            ],
            "tips": [
                {
                    "title": "Tip title",
                    "description": "Local knowledge or travel hack",
                    "category": "tip"
                }
            ]
        }

        Provide 3-4 items per category. Be specific with real places. Return ONLY valid JSON.
        """

        let response = try await callOpenRouter(prompt: prompt, maxTokens: 2000, temperature: 0.7)
        return try parseRecommendationsJSON(response)
    }

    private func parseRecommendationsJSON(_ jsonString: String) throws -> AIRecommendationsResponse {
        let cleanedJSON = jsonString
            .replacingOccurrences(of: "```json", with: "")
            .replacingOccurrences(of: "```", with: "")
            .trimmingCharacters(in: .whitespacesAndNewlines)

        guard let jsonData = cleanedJSON.data(using: .utf8) else {
            throw AIServiceError.parsingError
        }

        struct RawRecommendation: Decodable {
            let title: String
            let description: String
            let category: String
            let tips: String?
            let estimatedCost: String?
            let bestTimeToVisit: String?
        }

        struct RawResponse: Decodable {
            let restaurants: [RawRecommendation]?
            let activities: [RawRecommendation]?
            let stays: [RawRecommendation]?
            let tips: [RawRecommendation]?
        }

        let decoder = JSONDecoder()
        let raw = try decoder.decode(RawResponse.self, from: jsonData)

        func convert(_ items: [RawRecommendation]?) -> [AIRecommendation] {
            (items ?? []).map { item in
                AIRecommendation(
                    title: item.title,
                    description: item.description,
                    category: item.category,
                    tips: item.tips,
                    estimatedCost: item.estimatedCost,
                    bestTimeToVisit: item.bestTimeToVisit
                )
            }
        }

        return AIRecommendationsResponse(
            restaurants: convert(raw.restaurants),
            activities: convert(raw.activities),
            stays: convert(raw.stays),
            tips: convert(raw.tips)
        )
    }

    // MARK: - Generate Trip Names

    func generateTripNames(
        destinations: [String],
        vibes: [String],
        month: String? = nil,
        count: Int = 4
    ) async throws -> [String] {
        let destinationText = destinations.joined(separator: ", ")
        let vibeText = vibes.isEmpty ? "a fun trip" : vibes.joined(separator: ", ")
        let timeText = month != nil ? " in \(month!)" : ""

        let prompt = """
        Generate \(count) creative, catchy trip names for a trip to \(destinationText).
        The vibe is: \(vibeText)\(timeText).

        Rules:
        - Keep names short (2-5 words max)
        - Be creative, fun, and memorable
        - Mix styles: some punny, some elegant, some adventurous
        - Include the destination name or a clever reference to it
        - Match the vibe energy (e.g., bachelor party = wild/fun, honeymoon = romantic)

        Return ONLY the names, one per line, no numbering or extra text.
        """

        let response = try await callOpenRouter(prompt: prompt, maxTokens: 150, temperature: 0.9)

        // Parse response into array of names
        let names = response
            .components(separatedBy: .newlines)
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty && $0.count < 50 }
            .prefix(count)

        return Array(names)
    }

    // MARK: - Parse Booking Link

    func parseBookingLink(_ urlString: String) async throws -> ParsedTripBit {
        // First, try to detect category from the URL itself
        let detectedCategory = detectCategoryFromURL(urlString)

        let prompt = """
        Analyze this booking/travel URL and extract any information you can from the URL structure:

        URL: \(urlString)

        Based on the URL pattern, determine:
        1. What category of travel item this is (flight, stay, car, activity, transport, reservation, document, other)
        2. Any identifiable information like confirmation numbers, dates, locations from the URL

        Return a JSON object with these fields:
        {
            "category": "flight|stay|car|activity|transport|reservation|document|other",
            "title": "Brief descriptive title based on URL",
            "startDatetime": "ISO 8601 datetime or null",
            "endDatetime": "ISO 8601 datetime or null",
            "confidence": 0.0 to 1.0,
            "details": {
                // Any identifiable details from URL
            }
        }

        Common URL patterns:
        - Airlines: delta.com, united.com, aa.com, southwest.com, jetblue.com
        - Hotels: marriott.com, hilton.com, airbnb.com, booking.com, hotels.com, vrbo.com
        - Car rentals: hertz.com, enterprise.com, avis.com, budget.com, turo.com
        - Activities: viator.com, getyourguide.com, tripadvisor.com
        - Trains: amtrak.com, trainline.com
        - Restaurants: opentable.com, resy.com, yelp.com

        Return ONLY valid JSON, no additional text.
        """

        let response = try await callOpenRouter(prompt: prompt, maxTokens: 500)

        // Parse the response
        var result = try parseBookingJSON(response)

        // If we detected a category from URL with high confidence, use it
        if let detected = detectedCategory {
            result = ParsedTripBit(
                category: detected,
                title: result.title,
                startDatetime: result.startDatetime,
                endDatetime: result.endDatetime,
                details: result.details,
                confidence: max(result.confidence, 0.7)
            )
        }

        return result
    }

    /// Detects category from URL domain patterns
    private func detectCategoryFromURL(_ urlString: String) -> TripBitCategory? {
        let lowercased = urlString.lowercased()

        // Flight URLs
        let flightDomains = ["delta.com", "united.com", "aa.com", "american.com", "southwest.com",
                            "jetblue.com", "alaska", "spirit.com", "frontier.com", "british", "lufthansa",
                            "airfrance", "emirates", "qantas", "aircanada", "klm.com", "google.com/flights"]
        if flightDomains.contains(where: { lowercased.contains($0) }) {
            return .flight
        }

        // Hotel/Stay URLs
        let stayDomains = ["marriott.com", "hilton.com", "hyatt.com", "ihg.com", "airbnb.com",
                          "booking.com", "hotels.com", "expedia.com/hotels", "vrbo.com", "homeaway",
                          "hostelworld", "agoda.com", "trivago.com"]
        if stayDomains.contains(where: { lowercased.contains($0) }) {
            return .stay
        }

        // Car rental URLs
        let carDomains = ["hertz.com", "enterprise.com", "avis.com", "budget.com", "national.com",
                         "alamo.com", "turo.com", "sixt.com", "dollar.com", "thrifty.com"]
        if carDomains.contains(where: { lowercased.contains($0) }) {
            return .car
        }

        // Activity URLs
        let activityDomains = ["viator.com", "getyourguide.com", "tripadvisor.com/attraction",
                              "klook.com", "civitatis", "musement.com", "expedia.com/things-to-do"]
        if activityDomains.contains(where: { lowercased.contains($0) }) {
            return .activity
        }

        // Transport URLs
        let transportDomains = ["amtrak.com", "trainline.com", "eurostar.com", "greyhound.com",
                               "flixbus.com", "uber.com", "lyft.com", "rome2rio"]
        if transportDomains.contains(where: { lowercased.contains($0) }) {
            return .transport
        }

        // Reservation URLs
        let reservationDomains = ["opentable.com", "resy.com", "yelp.com/reservations", "tock.com",
                                 "sevenrooms.com"]
        if reservationDomains.contains(where: { lowercased.contains($0) }) {
            return .reservation
        }

        return nil
    }

    // MARK: - Detect Category from Link (lightweight)

    func detectCategoryFromLink(_ urlString: String) -> TripBitCategory? {
        return detectCategoryFromURL(urlString)
    }

    // MARK: - OpenRouter API Call

    private func callOpenRouter(prompt: String, maxTokens: Int = 200, temperature: Double = 0.1) async throws -> String {
        guard let url = URL(string: baseURL) else {
            throw AIServiceError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.addValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        request.addValue("application/json", forHTTPHeaderField: "Content-Type")
        request.addValue("Seeya Travel App", forHTTPHeaderField: "X-Title")

        let body: [String: Any] = [
            "model": "anthropic/claude-3.5-haiku",
            "messages": [
                ["role": "user", "content": prompt]
            ],
            "max_tokens": maxTokens,
            "temperature": temperature
        ]

        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw AIServiceError.invalidResponse
        }

        guard httpResponse.statusCode == 200 else {
            let errorBody = String(data: data, encoding: .utf8) ?? "Unknown error"
            print("❌ [AIService] API error (\(httpResponse.statusCode)): \(errorBody)")
            throw AIServiceError.apiError(statusCode: httpResponse.statusCode, message: errorBody)
        }

        // Parse response
        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              let choices = json["choices"] as? [[String: Any]],
              let firstChoice = choices.first,
              let message = firstChoice["message"] as? [String: Any],
              let content = message["content"] as? String else {
            throw AIServiceError.parsingError
        }

        return content
    }
}

// MARK: - Errors

enum AIServiceError: Error, LocalizedError {
    case invalidURL
    case invalidResponse
    case apiError(statusCode: Int, message: String)
    case parsingError

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid API URL"
        case .invalidResponse:
            return "Invalid response from server"
        case .apiError(let code, let message):
            return "API error (\(code)): \(message)"
        case .parsingError:
            return "Failed to parse AI response"
        }
    }
}
