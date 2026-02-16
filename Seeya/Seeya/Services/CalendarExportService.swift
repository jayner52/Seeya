import Foundation

/// Service for generating ICS calendar files from trip data
actor CalendarExportService {
    static let shared = CalendarExportService()

    private init() {}

    // MARK: - Category Emoji Mapping

    private func emoji(for category: TripBitCategory) -> String {
        switch category {
        case .flight: return "\u{2708}\u{FE0F}"      // ✈️
        case .stay: return "\u{1F3E8}"                // 🏨
        case .car: return "\u{1F697}"                 // 🚗
        case .activity: return "\u{1F3AF}"            // 🎯
        case .transport: return "\u{1F68C}"           // 🚌
        case .reservation: return "\u{1F4C5}"         // 📅
        case .document: return "\u{1F4C4}"            // 📄
        case .money: return "\u{1F4B0}"               // 💰
        case .photos: return "\u{1F4F8}"              // 📸
        case .other: return "\u{1F4CC}"               // 📌
        }
    }

    // MARK: - ICS Date Formatting

    private static let icsDateTimeFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyyMMdd'T'HHmmss'Z'"
        formatter.timeZone = TimeZone(identifier: "UTC")
        formatter.locale = Locale(identifier: "en_US_POSIX")
        return formatter
    }()

    private static let icsDateFormatter: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyyMMdd"
        formatter.timeZone = TimeZone(identifier: "UTC")
        formatter.locale = Locale(identifier: "en_US_POSIX")
        return formatter
    }()

    private func icsDateTime(_ date: Date) -> String {
        Self.icsDateTimeFormatter.string(from: date)
    }

    private func icsDate(_ date: Date) -> String {
        Self.icsDateFormatter.string(from: date)
    }

    private func icsTimestamp() -> String {
        icsDateTime(Date())
    }

    // MARK: - Text Escaping for ICS

    private func escapeICSText(_ text: String) -> String {
        text
            .replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: ";", with: "\\;")
            .replacingOccurrences(of: ",", with: "\\,")
            .replacingOccurrences(of: "\n", with: "\\n")
    }

    // MARK: - Fold long ICS lines (RFC 5545: max 75 octets per line)

    private func foldLine(_ line: String) -> String {
        guard line.utf8.count > 75 else { return line }

        var result = ""
        var currentLine = ""

        for char in line {
            let charUTF8Count = String(char).utf8.count
            if (currentLine.utf8.count + charUTF8Count) > 75 {
                result += currentLine + "\r\n "
                currentLine = String(char)
            } else {
                currentLine += String(char)
            }
        }
        result += currentLine
        return result
    }

    // MARK: - Generate Trip ICS

    /// Generates a full ICS calendar string for a trip and its trip bits
    func generateTripICS(trip: Trip, tripBits: [TripBit]) -> String {
        var lines: [String] = []

        lines.append("BEGIN:VCALENDAR")
        lines.append("VERSION:2.0")
        lines.append("PRODID:-//Seeya//Trip Itinerary//EN")
        lines.append("CALSCALE:GREGORIAN")
        lines.append("METHOD:PUBLISH")
        lines.append(foldLine("X-WR-CALNAME:\(escapeICSText(trip.name))"))

        // Add trip locations as all-day events spanning the trip dates
        if let locations = trip.locations,
           let tripStart = trip.startDate,
           let tripEnd = trip.endDate {
            let sortedLocations = locations.sorted { $0.orderIndex < $1.orderIndex }
            for location in sortedLocations {
                let uid = "location-\(location.id.uuidString.lowercased())@seeya.app"
                let stamp = icsTimestamp()
                let summary = escapeICSText(location.displayName)

                // All-day events use VALUE=DATE and end date is exclusive (next day)
                let dtStart = icsDate(tripStart)
                let calendar = Calendar.current
                let dayAfterEnd = calendar.date(byAdding: .day, value: 1, to: tripEnd) ?? tripEnd
                let dtEnd = icsDate(dayAfterEnd)

                lines.append("BEGIN:VEVENT")
                lines.append(foldLine("UID:\(uid)"))
                lines.append("DTSTAMP:\(stamp)")
                lines.append("DTSTART;VALUE=DATE:\(dtStart)")
                lines.append("DTEND;VALUE=DATE:\(dtEnd)")
                lines.append(foldLine("SUMMARY:\(summary)"))
                lines.append("END:VEVENT")
            }
        }

        // Add trip bits as events
        for tripBit in tripBits {
            let eventICS = generateEventLines(tripBit: tripBit)
            lines.append(contentsOf: eventICS)
        }

        lines.append("END:VCALENDAR")

        return lines.joined(separator: "\r\n")
    }

    // MARK: - Generate Single Event ICS

    /// Generates an ICS file for a single trip bit
    func generateSingleEventICS(tripBit: TripBit) -> String {
        var lines: [String] = []

        lines.append("BEGIN:VCALENDAR")
        lines.append("VERSION:2.0")
        lines.append("PRODID:-//Seeya//Trip Itinerary//EN")
        lines.append("CALSCALE:GREGORIAN")
        lines.append("METHOD:PUBLISH")

        let eventLines = generateEventLines(tripBit: tripBit)
        lines.append(contentsOf: eventLines)

        lines.append("END:VCALENDAR")

        return lines.joined(separator: "\r\n")
    }

    // MARK: - Generate Event Lines for a TripBit

    private func generateEventLines(tripBit: TripBit) -> [String] {
        var lines: [String] = []

        let uid = "tripbit-\(tripBit.id.uuidString.lowercased())@seeya.app"
        let stamp = icsTimestamp()
        let categoryEmoji = emoji(for: tripBit.category)
        let summary = escapeICSText("\(categoryEmoji) \(tripBit.title)")

        lines.append("BEGIN:VEVENT")
        lines.append(foldLine("UID:\(uid)"))
        lines.append("DTSTAMP:\(stamp)")

        if let start = tripBit.startDatetime {
            lines.append("DTSTART:\(icsDateTime(start))")

            if let end = tripBit.endDatetime {
                lines.append("DTEND:\(icsDateTime(end))")
            } else {
                // Default to 1 hour duration
                let defaultEnd = start.addingTimeInterval(3600)
                lines.append("DTEND:\(icsDateTime(defaultEnd))")
            }
        } else {
            // No datetime - create an all-day event for today as fallback
            let today = Date()
            let calendar = Calendar.current
            let tomorrow = calendar.date(byAdding: .day, value: 1, to: today) ?? today
            lines.append("DTSTART;VALUE=DATE:\(icsDate(today))")
            lines.append("DTEND;VALUE=DATE:\(icsDate(tomorrow))")
        }

        lines.append(foldLine("SUMMARY:\(summary)"))

        // Build description from notes and details
        var descriptionParts: [String] = []

        if let notes = tripBit.notes, !notes.isEmpty {
            descriptionParts.append(notes)
        }

        // Add category-specific details
        if let details = tripBit.details {
            let detailLines = buildDetailDescription(category: tripBit.category, details: details)
            if !detailLines.isEmpty {
                descriptionParts.append(detailLines)
            }
        }

        if let status = tripBit.status {
            descriptionParts.append("Status: \(status.displayName)")
        }

        if !descriptionParts.isEmpty {
            let description = escapeICSText(descriptionParts.joined(separator: "\n"))
            lines.append(foldLine("DESCRIPTION:\(description)"))
        }

        // Add category as ICS CATEGORIES
        lines.append("CATEGORIES:\(tripBit.category.displayName)")

        lines.append("END:VEVENT")

        return lines
    }

    // MARK: - Build Detail Description

    private func buildDetailDescription(category: TripBitCategory, details: TripBitDetails) -> String {
        var parts: [String] = []

        switch category {
        case .flight:
            if let airline = details.airline { parts.append("Airline: \(airline)") }
            if let flightNumber = details.flightNumber { parts.append("Flight: \(flightNumber)") }
            if let departure = details.departureAirport { parts.append("From: \(departure)") }
            if let arrival = details.arrivalAirport { parts.append("To: \(arrival)") }
            if let confirmation = details.confirmationNumber { parts.append("Confirmation: \(confirmation)") }
            if let terminal = details.terminal { parts.append("Terminal: \(terminal)") }
            if let gate = details.gate { parts.append("Gate: \(gate)") }
            if let seat = details.seatAssignments { parts.append("Seat: \(seat)") }

        case .stay:
            if let property = details.propertyName { parts.append("Property: \(property)") }
            if let propertyType = details.propertyType { parts.append("Type: \(propertyType)") }
            if let address = details.address { parts.append("Address: \(address)") }
            if let checkIn = details.checkInTime { parts.append("Check-in: \(checkIn)") }
            if let checkOut = details.checkOutTime { parts.append("Check-out: \(checkOut)") }
            if let roomType = details.roomType { parts.append("Room: \(roomType)") }
            if let confirmation = details.confirmationNumber { parts.append("Confirmation: \(confirmation)") }

        case .car:
            if let company = details.rentalCompany { parts.append("Company: \(company)") }
            if let vehicle = details.vehicleType { parts.append("Vehicle: \(vehicle)") }
            if let pickup = details.pickupLocation { parts.append("Pickup: \(pickup)") }
            if let dropoff = details.dropoffLocation { parts.append("Dropoff: \(dropoff)") }
            if let confirmation = details.confirmationNumber { parts.append("Confirmation: \(confirmation)") }

        case .activity:
            if let venue = details.venueName { parts.append("Venue: \(venue)") }
            if let duration = details.duration { parts.append("Duration: \(duration)") }
            if let meetingPoint = details.meetingPoint { parts.append("Meeting Point: \(meetingPoint)") }
            if let ticketType = details.ticketType { parts.append("Ticket: \(ticketType)") }
            if let confirmation = details.confirmationNumber { parts.append("Confirmation: \(confirmation)") }

        case .transport:
            if let transportType = details.transportType { parts.append("Type: \(transportType)") }
            if let op = details.transportOperator { parts.append("Operator: \(op)") }
            if let departure = details.departureStation { parts.append("From: \(departure)") }
            if let arrival = details.arrivalStation { parts.append("To: \(arrival)") }
            if let platform = details.platform { parts.append("Platform: \(platform)") }
            if let confirmation = details.confirmationNumber { parts.append("Confirmation: \(confirmation)") }

        case .reservation:
            if let venue = details.venueName { parts.append("Venue: \(venue)") }
            if let venueType = details.venueType { parts.append("Type: \(venueType)") }
            if let time = details.reservationTime { parts.append("Time: \(time)") }
            if let partySize = details.partySize { parts.append("Party Size: \(partySize)") }
            if let confirmation = details.confirmationNumber { parts.append("Confirmation: \(confirmation)") }

        case .document:
            if let docType = details.documentType { parts.append("Type: \(docType)") }
            if let docNumber = details.documentNumber { parts.append("Number: \(docNumber)") }
            if let holder = details.holderName { parts.append("Holder: \(holder)") }
            if let expiry = details.expiryDate { parts.append("Expires: \(expiry)") }

        case .money:
            if let moneyType = details.moneyType { parts.append("Type: \(moneyType)") }
            if let currency = details.currency { parts.append("Currency: \(currency)") }
            if let amount = details.amount { parts.append("Amount: \(String(format: "%.2f", amount))") }

        case .photos:
            if let album = details.albumName { parts.append("Album: \(album)") }
            if let count = details.photoCount { parts.append("Photos: \(count)") }

        case .other:
            if let customType = details.customType { parts.append("Type: \(customType)") }
            if let desc = details.customDescription { parts.append("Description: \(desc)") }
        }

        return parts.joined(separator: "\n")
    }

    // MARK: - Export Trip Calendar to File

    /// Generates ICS content, writes to a temp file, and returns the URL for sharing
    func exportTripCalendar(trip: Trip, tripBits: [TripBit]) throws -> URL {
        let icsContent = generateTripICS(trip: trip, tripBits: tripBits)

        // Sanitize filename
        let safeName = trip.name
            .replacingOccurrences(of: "[^a-zA-Z0-9\\s-]", with: "", options: .regularExpression)
            .replacingOccurrences(of: " ", with: "_")
            .prefix(50)

        let fileName = "\(safeName)_itinerary.ics"
        let tempDir = FileManager.default.temporaryDirectory
        let fileURL = tempDir.appendingPathComponent(fileName)

        try icsContent.write(to: fileURL, atomically: true, encoding: .utf8)

        return fileURL
    }

    // MARK: - Export Single Event to File

    /// Generates ICS for a single trip bit, writes to temp file, returns URL
    func exportSingleEvent(tripBit: TripBit) throws -> URL {
        let icsContent = generateSingleEventICS(tripBit: tripBit)

        let safeName = tripBit.title
            .replacingOccurrences(of: "[^a-zA-Z0-9\\s-]", with: "", options: .regularExpression)
            .replacingOccurrences(of: " ", with: "_")
            .prefix(50)

        let fileName = "\(safeName).ics"
        let tempDir = FileManager.default.temporaryDirectory
        let fileURL = tempDir.appendingPathComponent(fileName)

        try icsContent.write(to: fileURL, atomically: true, encoding: .utf8)

        return fileURL
    }

    // MARK: - Generate Text Itinerary Summary

    /// Creates a plain text itinerary summary for sharing/printing
    func generateItinerarySummary(trip: Trip, tripBits: [TripBit]) -> String {
        var lines: [String] = []

        // Header
        lines.append("===================================")
        lines.append(trip.name.uppercased())
        lines.append("===================================")
        lines.append("")

        // Trip info
        lines.append("Destination: \(trip.allDestinations)")
        lines.append("Dates: \(trip.fullDateRangeText)")
        lines.append("Duration: \(trip.tripDurationText)")

        if trip.totalTravelerCount > 1 {
            lines.append("Travelers: \(trip.totalTravelerCount)")
        }

        if let description = trip.description, !description.isEmpty {
            lines.append("")
            lines.append(description)
        }

        lines.append("")
        lines.append("-----------------------------------")
        lines.append("ITINERARY")
        lines.append("-----------------------------------")

        // Group trip bits by date
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "EEEE, MMMM d, yyyy"

        let timeFormatter = DateFormatter()
        timeFormatter.dateFormat = "h:mm a"

        // Sort trip bits by start date
        let sorted = tripBits.sorted { a, b in
            let dateA = a.startDatetime ?? Date.distantFuture
            let dateB = b.startDatetime ?? Date.distantFuture
            return dateA < dateB
        }

        // Group by date
        var groupedByDate: [(String, [TripBit])] = []
        var currentDateKey = ""
        var currentGroup: [TripBit] = []

        for tripBit in sorted {
            let dateKey: String
            if let start = tripBit.startDatetime {
                dateKey = dateFormatter.string(from: start)
            } else {
                dateKey = "Unscheduled"
            }

            if dateKey != currentDateKey {
                if !currentGroup.isEmpty {
                    groupedByDate.append((currentDateKey, currentGroup))
                }
                currentDateKey = dateKey
                currentGroup = [tripBit]
            } else {
                currentGroup.append(tripBit)
            }
        }
        if !currentGroup.isEmpty {
            groupedByDate.append((currentDateKey, currentGroup))
        }

        for (dateKey, bits) in groupedByDate {
            lines.append("")
            lines.append(dateKey)
            lines.append("")

            for bit in bits {
                let categoryEmoji = emoji(for: bit.category)
                var line = "  \(categoryEmoji) \(bit.title)"

                if let start = bit.startDatetime {
                    let timeStr = timeFormatter.string(from: start)
                    if let end = bit.endDatetime {
                        let endStr = timeFormatter.string(from: end)
                        line += " (\(timeStr) - \(endStr))"
                    } else {
                        line += " (\(timeStr))"
                    }
                }

                lines.append(line)

                // Add key details
                if let details = bit.details {
                    let detailStr = buildDetailDescription(category: bit.category, details: details)
                    if !detailStr.isEmpty {
                        let indentedDetails = detailStr
                            .components(separatedBy: "\n")
                            .map { "    \($0)" }
                            .joined(separator: "\n")
                        lines.append(indentedDetails)
                    }
                }

                if let notes = bit.notes, !notes.isEmpty {
                    lines.append("    Note: \(notes)")
                }

                if let status = bit.status {
                    lines.append("    Status: \(status.displayName)")
                }
            }
        }

        lines.append("")
        lines.append("-----------------------------------")
        lines.append("Generated by Seeya")
        lines.append("-----------------------------------")

        return lines.joined(separator: "\n")
    }

    /// Writes the text itinerary summary to a temp file and returns the URL
    func exportItinerarySummary(trip: Trip, tripBits: [TripBit]) throws -> URL {
        let summary = generateItinerarySummary(trip: trip, tripBits: tripBits)

        let safeName = trip.name
            .replacingOccurrences(of: "[^a-zA-Z0-9\\s-]", with: "", options: .regularExpression)
            .replacingOccurrences(of: " ", with: "_")
            .prefix(50)

        let fileName = "\(safeName)_itinerary.txt"
        let tempDir = FileManager.default.temporaryDirectory
        let fileURL = tempDir.appendingPathComponent(fileName)

        try summary.write(to: fileURL, atomically: true, encoding: .utf8)

        return fileURL
    }
}
