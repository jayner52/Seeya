import Foundation
import SwiftUI

// MARK: - TripBit Category

enum TripBitCategory: String, Codable, Sendable, CaseIterable {
    case flight
    case stay
    case car
    case activity
    case transport
    case money
    case reservation
    case document
    case photos
    case other

    var displayName: String {
        switch self {
        case .flight: return "Flight"
        case .stay: return "Stay"
        case .car: return "Car Rental"
        case .activity: return "Activity"
        case .transport: return "Transport"
        case .money: return "Money"
        case .reservation: return "Reservation"
        case .document: return "Document"
        case .photos: return "Photos"
        case .other: return "Other"
        }
    }

    var icon: String {
        switch self {
        case .flight: return "airplane"
        case .stay: return "bed.double.fill"
        case .car: return "car.fill"
        case .activity: return "figure.hiking"
        case .transport: return "tram.fill"
        case .money: return "creditcard.fill"
        case .reservation: return "calendar.badge.clock"
        case .document: return "doc.text.fill"
        case .photos: return "photo.on.rectangle"
        case .other: return "ellipsis.circle.fill"
        }
    }

    var color: Color {
        switch self {
        case .flight: return .blue
        case .stay: return .purple
        case .car: return .orange
        case .activity: return .green
        case .transport: return .cyan
        case .money: return .yellow
        case .reservation: return .pink
        case .document: return .gray
        case .photos: return .indigo
        case .other: return .secondary
        }
    }
}

// MARK: - TripBit Status

enum TripBitStatus: String, Codable, Sendable, CaseIterable {
    case confirmed
    case pending
    case cancelled

    var displayName: String {
        switch self {
        case .confirmed: return "Confirmed"
        case .pending: return "Pending"
        case .cancelled: return "Cancelled"
        }
    }

    var color: Color {
        switch self {
        case .confirmed: return .green
        case .pending: return .orange
        case .cancelled: return .red
        }
    }
}

// MARK: - TripBit

struct TripBit: Codable, Identifiable, Sendable, Hashable {
    static func == (lhs: TripBit, rhs: TripBit) -> Bool {
        lhs.id == rhs.id
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    let id: UUID
    let tripId: UUID
    let createdBy: UUID
    let category: TripBitCategory
    let title: String
    let status: TripBitStatus?
    let startDatetime: Date?
    let endDatetime: Date?
    let locationId: UUID?
    let notes: String?
    let orderIndex: Int?
    let createdAt: Date?
    let updatedAt: Date?

    // Relationships
    var details: TripBitDetails?
    var travelers: [TripBitTraveler]?
    var attachments: [TripBitAttachment]?
    var location: TripLocation?
    var creator: Profile?

    enum CodingKeys: String, CodingKey {
        case id
        case tripId = "trip_id"
        case createdBy = "created_by"
        case category
        case title
        case status
        case startDatetime = "start_datetime"
        case endDatetime = "end_datetime"
        case locationId = "location_id"
        case notes
        case orderIndex = "order_index"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case details = "trip_bit_details"
        case travelers = "trip_bit_travelers"
        case attachments = "trip_bit_attachments"
        case location = "trip_locations"
        case creator = "profiles"
    }

    // MARK: - Computed Properties

    var displayStatus: TripBitStatus {
        status ?? .confirmed
    }

    var formattedDateTime: String {
        guard let start = startDatetime else { return "No date" }

        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "MMM d"

        let timeFormatter = DateFormatter()
        timeFormatter.dateFormat = "h:mm a"

        let dateStr = dateFormatter.string(from: start)
        let timeStr = timeFormatter.string(from: start)

        return "\(dateStr) at \(timeStr)"
    }

    var formattedDateRange: String {
        guard let start = startDatetime else { return "No date" }

        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "MMM d"

        let startStr = dateFormatter.string(from: start)

        if let end = endDatetime {
            let endStr = dateFormatter.string(from: end)
            return "\(startStr) - \(endStr)"
        }

        return startStr
    }

    var formattedTime: String {
        guard let start = startDatetime else { return "" }

        let formatter = DateFormatter()
        formatter.dateFormat = "h:mm a"
        return formatter.string(from: start)
    }

    var assignedTravelerNames: String {
        guard let travelers = travelers, !travelers.isEmpty else {
            return "Everyone"
        }

        if travelers.first?.appliesToAll == true {
            return "Everyone"
        }

        let names = travelers.compactMap { $0.user?.fullName.components(separatedBy: " ").first }

        if names.count <= 2 {
            return names.joined(separator: " & ")
        } else {
            return "\(names.prefix(2).joined(separator: ", ")) +\(names.count - 2)"
        }
    }

    // MARK: - Initializer

    init(
        id: UUID,
        tripId: UUID,
        createdBy: UUID,
        category: TripBitCategory,
        title: String,
        status: TripBitStatus? = .confirmed,
        startDatetime: Date? = nil,
        endDatetime: Date? = nil,
        locationId: UUID? = nil,
        notes: String? = nil,
        orderIndex: Int? = 0,
        createdAt: Date? = nil,
        updatedAt: Date? = nil,
        details: TripBitDetails? = nil,
        travelers: [TripBitTraveler]? = nil,
        attachments: [TripBitAttachment]? = nil,
        location: TripLocation? = nil,
        creator: Profile? = nil
    ) {
        self.id = id
        self.tripId = tripId
        self.createdBy = createdBy
        self.category = category
        self.title = title
        self.status = status
        self.startDatetime = startDatetime
        self.endDatetime = endDatetime
        self.locationId = locationId
        self.notes = notes
        self.orderIndex = orderIndex
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.details = details
        self.travelers = travelers
        self.attachments = attachments
        self.location = location
        self.creator = creator
    }
}

// MARK: - TripBitDetails

struct TripBitDetails: Codable, Identifiable, Sendable {
    let id: UUID
    let tripBitId: UUID
    let details: [String: AnyCodable]
    let createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case tripBitId = "trip_bit_id"
        case details
        case createdAt = "created_at"
    }

    // MARK: - Type-safe accessors for common fields

    func string(for key: String) -> String? {
        details[key]?.value as? String
    }

    func int(for key: String) -> Int? {
        details[key]?.value as? Int
    }

    func double(for key: String) -> Double? {
        details[key]?.value as? Double
    }

    func bool(for key: String) -> Bool? {
        details[key]?.value as? Bool
    }

    func date(for key: String) -> Date? {
        if let dateString = details[key]?.value as? String {
            let formatter = ISO8601DateFormatter()
            return formatter.date(from: dateString)
        }
        return nil
    }

    // MARK: - Flight-specific accessors
    var airline: String? { string(for: "airline") }
    var flightNumber: String? { string(for: "flightNumber") }
    var departureAirport: String? { string(for: "departureAirport") }
    var arrivalAirport: String? { string(for: "arrivalAirport") }
    var confirmationNumber: String? { string(for: "confirmationNumber") }
    var seatAssignments: String? { string(for: "seatAssignments") }
    var terminal: String? { string(for: "terminal") }
    var gate: String? { string(for: "gate") }

    // MARK: - Stay-specific accessors
    var propertyName: String? { string(for: "propertyName") }
    var propertyType: String? { string(for: "propertyType") }
    var address: String? { string(for: "address") }
    var checkInTime: String? { string(for: "checkInTime") }
    var checkOutTime: String? { string(for: "checkOutTime") }
    var roomType: String? { string(for: "roomType") }

    // MARK: - Car-specific accessors
    var rentalCompany: String? { string(for: "rentalCompany") }
    var vehicleType: String? { string(for: "vehicleType") }
    var pickupLocation: String? { string(for: "pickupLocation") }
    var dropoffLocation: String? { string(for: "dropoffLocation") }

    // MARK: - Activity-specific accessors
    var venueName: String? { string(for: "venueName") }
    var duration: String? { string(for: "duration") }
    var meetingPoint: String? { string(for: "meetingPoint") }
    var ticketType: String? { string(for: "ticketType") }

    // MARK: - Transport-specific accessors
    var transportType: String? { string(for: "transportType") }
    var transportOperator: String? { string(for: "operator") }
    var departureStation: String? { string(for: "departureStation") }
    var arrivalStation: String? { string(for: "arrivalStation") }
    var platform: String? { string(for: "platform") }

    // MARK: - Money-specific accessors
    var moneyType: String? { string(for: "type") }
    var currency: String? { string(for: "currency") }
    var amount: Double? { double(for: "amount") }

    // MARK: - Reservation-specific accessors
    var venueType: String? { string(for: "venueType") }
    var reservationTime: String? { string(for: "reservationTime") }
    var partySize: Int? { int(for: "partySize") }

    // MARK: - Document-specific accessors
    var documentType: String? { string(for: "documentType") }
    var documentNumber: String? { string(for: "documentNumber") }
    var expiryDate: String? { string(for: "expiryDate") }
    var holderName: String? { string(for: "holderName") }

    // MARK: - Photos-specific accessors
    var albumName: String? { string(for: "albumName") }
    var photoCount: Int? { int(for: "photoCount") }
    var coverPhotoUrl: String? { string(for: "coverPhotoUrl") }

    // MARK: - Other-specific accessors
    var customType: String? { string(for: "customType") }
    var customDescription: String? { string(for: "description") }
}

// MARK: - TripBitTraveler

struct TripBitTraveler: Codable, Identifiable, Sendable {
    let id: UUID
    let tripBitId: UUID
    let userId: UUID
    let appliesToAll: Bool?
    let createdAt: Date?

    // Relationship
    var user: Profile?

    enum CodingKeys: String, CodingKey {
        case id
        case tripBitId = "trip_bit_id"
        case userId = "user_id"
        case appliesToAll = "applies_to_all"
        case createdAt = "created_at"
        case user = "profiles"
    }
}

// MARK: - TripBitAttachment

struct TripBitAttachment: Codable, Identifiable, Sendable {
    let id: UUID
    let tripBitId: UUID
    let fileUrl: String
    let fileName: String?
    let fileType: String?
    let createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case id
        case tripBitId = "trip_bit_id"
        case fileUrl = "file_url"
        case fileName = "file_name"
        case fileType = "file_type"
        case createdAt = "created_at"
    }
}

// MARK: - Create/Update DTOs

struct CreateTripBit: Encodable {
    let tripId: UUID
    let createdBy: UUID
    let category: TripBitCategory
    let title: String
    let status: TripBitStatus?
    let startDatetime: Date?
    let endDatetime: Date?
    let locationId: UUID?
    let notes: String?
    let orderIndex: Int?

    enum CodingKeys: String, CodingKey {
        case tripId = "trip_id"
        case createdBy = "created_by"
        case category
        case title
        case status
        case startDatetime = "start_datetime"
        case endDatetime = "end_datetime"
        case locationId = "location_id"
        case notes
        case orderIndex = "order_index"
    }
}

struct UpdateTripBit: Encodable {
    let category: TripBitCategory?
    let title: String?
    let status: TripBitStatus?
    let startDatetime: Date?
    let endDatetime: Date?
    let locationId: UUID?
    let notes: String?
    let orderIndex: Int?

    enum CodingKeys: String, CodingKey {
        case category
        case title
        case status
        case startDatetime = "start_datetime"
        case endDatetime = "end_datetime"
        case locationId = "location_id"
        case notes
        case orderIndex = "order_index"
    }
}

struct CreateTripBitDetails: Encodable {
    let tripBitId: UUID
    let details: [String: AnyCodable]

    enum CodingKeys: String, CodingKey {
        case tripBitId = "trip_bit_id"
        case details
    }
}

struct CreateTripBitTraveler: Encodable {
    let tripBitId: UUID
    let userId: UUID
    let appliesToAll: Bool

    enum CodingKeys: String, CodingKey {
        case tripBitId = "trip_bit_id"
        case userId = "user_id"
        case appliesToAll = "applies_to_all"
    }
}

struct CreateTripBitAttachment: Encodable {
    let tripBitId: UUID
    let fileUrl: String
    let fileName: String?
    let fileType: String?

    enum CodingKeys: String, CodingKey {
        case tripBitId = "trip_bit_id"
        case fileUrl = "file_url"
        case fileName = "file_name"
        case fileType = "file_type"
    }
}

// MARK: - AnyCodable Helper

struct AnyCodable: Codable, Sendable {
    let value: Any

    init(_ value: Any) {
        self.value = value
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()

        if let bool = try? container.decode(Bool.self) {
            value = bool
        } else if let int = try? container.decode(Int.self) {
            value = int
        } else if let double = try? container.decode(Double.self) {
            value = double
        } else if let string = try? container.decode(String.self) {
            value = string
        } else if let array = try? container.decode([AnyCodable].self) {
            value = array.map { $0.value }
        } else if let dictionary = try? container.decode([String: AnyCodable].self) {
            value = dictionary.mapValues { $0.value }
        } else {
            value = NSNull()
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()

        switch value {
        case let bool as Bool:
            try container.encode(bool)
        case let int as Int:
            try container.encode(int)
        case let double as Double:
            try container.encode(double)
        case let string as String:
            try container.encode(string)
        case let array as [Any]:
            try container.encode(array.map { AnyCodable($0) })
        case let dictionary as [String: Any]:
            try container.encode(dictionary.mapValues { AnyCodable($0) })
        default:
            try container.encodeNil()
        }
    }
}

// MARK: - View Mode & Grouping Enums

enum TripPackViewMode: String, CaseIterable {
    case full
    case compact
    case byType

    var displayName: String {
        switch self {
        case .full: return "Full"
        case .compact: return "Compact"
        case .byType: return "By Type"
        }
    }

    var icon: String {
        switch self {
        case .full: return "rectangle.stack"
        case .compact: return "list.bullet"
        case .byType: return "square.grid.2x2"
        }
    }
}

enum TripPackGrouping: String, CaseIterable {
    case byDate
    case byLocation
    case byType

    var displayName: String {
        switch self {
        case .byDate: return "By Date"
        case .byLocation: return "By Location"
        case .byType: return "By Type"
        }
    }
}

enum TripPackFilter: String, CaseIterable {
    case all
    case flights
    case stays
    case cars
    case activities
    case reservations

    var displayName: String {
        switch self {
        case .all: return "All"
        case .flights: return "Flights"
        case .stays: return "Stays"
        case .cars: return "Cars"
        case .activities: return "Activities"
        case .reservations: return "Reservations"
        }
    }

    var category: TripBitCategory? {
        switch self {
        case .all: return nil
        case .flights: return .flight
        case .stays: return .stay
        case .cars: return .car
        case .activities: return .activity
        case .reservations: return .reservation
        }
    }
}

// MARK: - AI Parsing Result

struct ParsedTripBit {
    let category: TripBitCategory
    let title: String
    let startDatetime: Date?
    let endDatetime: Date?
    let details: [String: Any]
    let confidence: Double
}
