import Foundation
import SwiftUI
import Supabase

@Observable
@MainActor
final class TripPackViewModel {
    // MARK: - State

    var tripBits: [TripBit] = []
    var viewMode: TripPackViewMode = .full
    var grouping: TripPackGrouping = .byDate
    var activeFilter: TripPackFilter = .all
    var searchText: String = ""

    var isLoading = false
    var errorMessage: String?

    // Traveler filter for Itinerary view
    var selectedTravelerFilter: UUID? = nil

    // Sheet states
    var showAddTripBit = false
    var showAIQuickAdd = false
    var selectedTripBit: TripBit?
    var selectedCategory: TripBitCategory?

    // MARK: - Private

    private let tripId: UUID
    private let supabase = SupabaseService.shared.client

    // MARK: - Init

    init(tripId: UUID) {
        self.tripId = tripId
    }

    // MARK: - Computed Properties

    var filteredTripBits: [TripBit] {
        var result = tripBits

        // Apply category filter
        if let category = activeFilter.category {
            result = result.filter { $0.category == category }
        }

        // Apply search filter
        if !searchText.isEmpty {
            let query = searchText.lowercased()
            result = result.filter { tripBit in
                tripBit.title.lowercased().contains(query) ||
                tripBit.notes?.lowercased().contains(query) == true ||
                tripBit.details?.confirmationNumber?.lowercased().contains(query) == true
            }
        }

        return result
    }

    var groupedTripBits: [(key: String, items: [TripBit])] {
        let bits = filteredTripBits

        switch grouping {
        case .byDate:
            return groupByDate(bits)
        case .byLocation:
            return groupByLocation(bits)
        case .byType:
            return groupByType(bits)
        }
    }

    var categoryFilterCounts: [TripPackFilter: Int] {
        var counts: [TripPackFilter: Int] = [:]

        for filter in TripPackFilter.allCases {
            if filter == .all {
                counts[filter] = tripBits.count
            } else if let category = filter.category {
                counts[filter] = tripBits.filter { $0.category == category }.count
            }
        }

        return counts
    }

    var isEmpty: Bool {
        tripBits.isEmpty
    }

    var hasFilteredResults: Bool {
        !filteredTripBits.isEmpty
    }

    /// Filter trip bits by selected traveler (for itinerary view)
    var travelerFilteredTripBits: [TripBit] {
        guard let travelerId = selectedTravelerFilter else {
            return tripBits
        }

        return tripBits.filter { tripBit in
            // If applies to all, include for everyone
            if tripBit.travelers?.first?.appliesToAll == true {
                return true
            }
            // Check if traveler is assigned
            return tripBit.travelers?.contains { $0.userId == travelerId } ?? false
        }
    }

    /// Get trip bits for a specific date
    func tripBits(for date: Date) -> [TripBit] {
        let calendar = Calendar.current
        let targetDay = calendar.startOfDay(for: date)

        return travelerFilteredTripBits.filter { tripBit in
            guard let startDate = tripBit.startDatetime else { return false }
            let startDay = calendar.startOfDay(for: startDate)

            if let endDate = tripBit.endDatetime {
                let endDay = calendar.startOfDay(for: endDate)
                // Multi-day event: check if date is within range
                return targetDay >= startDay && targetDay <= endDay
            } else {
                // Single-day event: check if same day
                return calendar.isDate(targetDay, inSameDayAs: startDay)
            }
        }
    }

    /// Get trip bits sorted by time for a specific date
    func sortedTripBits(for date: Date) -> [TripBit] {
        tripBits(for: date).sorted { bit1, bit2 in
            let time1 = bit1.startDatetime ?? .distantFuture
            let time2 = bit2.startDatetime ?? .distantFuture
            return time1 < time2
        }
    }

    /// Get stay events that span across the given date
    func activeStays(for date: Date) -> [TripBit] {
        tripBits(for: date).filter { $0.category == .stay }
    }

    /// Group trip bits by date for chronological list view
    var tripBitsByDate: [(date: Date, items: [TripBit])] {
        let calendar = Calendar.current
        var groups: [Date: [TripBit]] = [:]

        for tripBit in travelerFilteredTripBits {
            guard let startDate = tripBit.startDatetime else { continue }
            let dayStart = calendar.startOfDay(for: startDate)

            if groups[dayStart] == nil {
                groups[dayStart] = []
            }
            groups[dayStart]?.append(tripBit)
        }

        // Sort groups by date
        let sortedDates = groups.keys.sorted()

        return sortedDates.map { date in
            let items = groups[date]?.sorted { bit1, bit2 in
                let time1 = bit1.startDatetime ?? .distantFuture
                let time2 = bit2.startDatetime ?? .distantFuture
                return time1 < time2
            } ?? []
            return (date: date, items: items)
        }
    }

    // MARK: - Grouping Helpers

    private func groupByDate(_ bits: [TripBit]) -> [(key: String, items: [TripBit])] {
        let sorted = bits.sorted { ($0.startDatetime ?? .distantFuture) < ($1.startDatetime ?? .distantFuture) }

        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "EEEE, MMM d"

        var groups: [String: [TripBit]] = [:]
        var groupOrder: [String] = []

        for bit in sorted {
            let key: String
            if let date = bit.startDatetime {
                key = dateFormatter.string(from: date)
            } else {
                key = "No Date"
            }

            if groups[key] == nil {
                groups[key] = []
                groupOrder.append(key)
            }
            groups[key]?.append(bit)
        }

        return groupOrder.map { (key: $0, items: groups[$0] ?? []) }
    }

    private func groupByLocation(_ bits: [TripBit]) -> [(key: String, items: [TripBit])] {
        var groups: [String: [TripBit]] = [:]
        var groupOrder: [String] = []

        for bit in bits {
            let key = bit.location?.displayName ?? "No Location"

            if groups[key] == nil {
                groups[key] = []
                groupOrder.append(key)
            }
            groups[key]?.append(bit)
        }

        return groupOrder.map { (key: $0, items: groups[$0] ?? []) }
    }

    private func groupByType(_ bits: [TripBit]) -> [(key: String, items: [TripBit])] {
        var groups: [TripBitCategory: [TripBit]] = [:]

        for bit in bits {
            if groups[bit.category] == nil {
                groups[bit.category] = []
            }
            groups[bit.category]?.append(bit)
        }

        // Sort by category order in enum
        let sortedCategories = TripBitCategory.allCases.filter { groups[$0] != nil }

        return sortedCategories.map { (key: $0.displayName, items: groups[$0] ?? []) }
    }

    // MARK: - CRUD Operations

    func fetchTripBits() async {
        isLoading = true
        errorMessage = nil

        do {
            let response: [TripBit] = try await supabase
                .from("trip_bits")
                .select("""
                    *,
                    trip_bit_details(*),
                    trip_bit_travelers(*, profiles(*)),
                    trip_bit_attachments(*),
                    trip_locations(*, cities(*, countries(*))),
                    profiles(*)
                """)
                .eq("trip_id", value: tripId.uuidString)
                .order("order_index", ascending: true)
                .order("start_datetime", ascending: true)
                .execute()
                .value

            tripBits = response
            print("✅ [TripPackVM] Fetched \(tripBits.count) trip bits")
        } catch {
            print("❌ [TripPackVM] Fetch error: \(error.localizedDescription)")
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func createTripBit(
        category: TripBitCategory,
        title: String,
        status: TripBitStatus = .confirmed,
        startDatetime: Date? = nil,
        endDatetime: Date? = nil,
        locationId: UUID? = nil,
        notes: String? = nil,
        details: [String: Any]? = nil,
        travelerIds: [UUID]? = nil,
        appliesToAll: Bool = true
    ) async -> TripBit? {
        guard let userId = await getCurrentUserId() else {
            errorMessage = "User not authenticated"
            return nil
        }

        do {
            // 1. Create the trip bit
            let createDTO = CreateTripBit(
                tripId: tripId,
                createdBy: userId,
                category: category,
                title: title,
                status: status,
                startDatetime: startDatetime,
                endDatetime: endDatetime,
                locationId: locationId,
                notes: notes,
                orderIndex: tripBits.count
            )

            let newBit: TripBit = try await supabase
                .from("trip_bits")
                .insert(createDTO)
                .select()
                .single()
                .execute()
                .value

            print("✅ [TripPackVM] Created trip bit: \(newBit.id)")

            // 2. Create details if provided
            if let details = details, !details.isEmpty {
                let detailsDTO = CreateTripBitDetails(
                    tripBitId: newBit.id,
                    details: details.mapValues { AnyCodable($0) }
                )

                try await supabase
                    .from("trip_bit_details")
                    .insert(detailsDTO)
                    .execute()

                print("✅ [TripPackVM] Created details for trip bit")
            }

            // 3. Create traveler assignments
            if appliesToAll {
                let travelerDTO = CreateTripBitTraveler(
                    tripBitId: newBit.id,
                    userId: userId,
                    appliesToAll: true
                )

                try await supabase
                    .from("trip_bit_travelers")
                    .insert(travelerDTO)
                    .execute()
            } else if let ids = travelerIds, !ids.isEmpty {
                for travelerId in ids {
                    let travelerDTO = CreateTripBitTraveler(
                        tripBitId: newBit.id,
                        userId: travelerId,
                        appliesToAll: false
                    )

                    try await supabase
                        .from("trip_bit_travelers")
                        .insert(travelerDTO)
                        .execute()
                }
            }

            print("✅ [TripPackVM] Created traveler assignments")

            // 4. Fetch the complete trip bit with relationships
            await fetchTripBits()

            return tripBits.first { $0.id == newBit.id }
        } catch {
            print("❌ [TripPackVM] Create error: \(error.localizedDescription)")
            errorMessage = error.localizedDescription
            return nil
        }
    }

    func updateTripBit(
        _ tripBit: TripBit,
        category: TripBitCategory? = nil,
        title: String? = nil,
        status: TripBitStatus? = nil,
        startDatetime: Date? = nil,
        endDatetime: Date? = nil,
        locationId: UUID? = nil,
        notes: String? = nil,
        details: [String: Any]? = nil
    ) async -> Bool {
        do {
            let updateDTO = UpdateTripBit(
                category: category,
                title: title,
                status: status,
                startDatetime: startDatetime,
                endDatetime: endDatetime,
                locationId: locationId,
                notes: notes,
                orderIndex: nil
            )

            try await supabase
                .from("trip_bits")
                .update(updateDTO)
                .eq("id", value: tripBit.id.uuidString)
                .execute()

            print("✅ [TripPackVM] Updated trip bit: \(tripBit.id)")

            // Update details if provided
            if let details = details {
                // Delete existing details
                try await supabase
                    .from("trip_bit_details")
                    .delete()
                    .eq("trip_bit_id", value: tripBit.id.uuidString)
                    .execute()

                // Insert new details
                if !details.isEmpty {
                    let detailsDTO = CreateTripBitDetails(
                        tripBitId: tripBit.id,
                        details: details.mapValues { AnyCodable($0) }
                    )

                    try await supabase
                        .from("trip_bit_details")
                        .insert(detailsDTO)
                        .execute()
                }
            }

            await fetchTripBits()
            return true
        } catch {
            print("❌ [TripPackVM] Update error: \(error.localizedDescription)")
            errorMessage = error.localizedDescription
            return false
        }
    }

    func deleteTripBit(_ tripBit: TripBit) async -> Bool {
        do {
            try await supabase
                .from("trip_bits")
                .delete()
                .eq("id", value: tripBit.id.uuidString)
                .execute()

            print("✅ [TripPackVM] Deleted trip bit: \(tripBit.id)")

            tripBits.removeAll { $0.id == tripBit.id }
            return true
        } catch {
            print("❌ [TripPackVM] Delete error: \(error.localizedDescription)")
            errorMessage = error.localizedDescription
            return false
        }
    }

    func reorderTripBits(_ reorderedBits: [TripBit]) async {
        do {
            for (index, bit) in reorderedBits.enumerated() {
                try await supabase
                    .from("trip_bits")
                    .update(["order_index": index])
                    .eq("id", value: bit.id.uuidString)
                    .execute()
            }

            tripBits = reorderedBits
            print("✅ [TripPackVM] Reordered trip bits")
        } catch {
            print("❌ [TripPackVM] Reorder error: \(error.localizedDescription)")
            errorMessage = error.localizedDescription
        }
    }

    // MARK: - Traveler Management

    func updateTravelers(
        for tripBit: TripBit,
        travelerIds: [UUID],
        appliesToAll: Bool
    ) async -> Bool {
        do {
            // Delete existing travelers
            try await supabase
                .from("trip_bit_travelers")
                .delete()
                .eq("trip_bit_id", value: tripBit.id.uuidString)
                .execute()

            // Insert new travelers
            if appliesToAll {
                guard let userId = await getCurrentUserId() else { return false }

                let dto = CreateTripBitTraveler(
                    tripBitId: tripBit.id,
                    userId: userId,
                    appliesToAll: true
                )

                try await supabase
                    .from("trip_bit_travelers")
                    .insert(dto)
                    .execute()
            } else {
                for travelerId in travelerIds {
                    let dto = CreateTripBitTraveler(
                        tripBitId: tripBit.id,
                        userId: travelerId,
                        appliesToAll: false
                    )

                    try await supabase
                        .from("trip_bit_travelers")
                        .insert(dto)
                        .execute()
                }
            }

            await fetchTripBits()
            return true
        } catch {
            print("❌ [TripPackVM] Update travelers error: \(error.localizedDescription)")
            errorMessage = error.localizedDescription
            return false
        }
    }

    // MARK: - Attachment Management

    func addAttachment(
        to tripBit: TripBit,
        fileUrl: String,
        fileName: String?,
        fileType: String?
    ) async -> Bool {
        do {
            let dto = CreateTripBitAttachment(
                tripBitId: tripBit.id,
                fileUrl: fileUrl,
                fileName: fileName,
                fileType: fileType
            )

            try await supabase
                .from("trip_bit_attachments")
                .insert(dto)
                .execute()

            await fetchTripBits()
            return true
        } catch {
            print("❌ [TripPackVM] Add attachment error: \(error.localizedDescription)")
            errorMessage = error.localizedDescription
            return false
        }
    }

    func deleteAttachment(_ attachment: TripBitAttachment) async -> Bool {
        do {
            // First delete from database
            try await supabase
                .from("trip_bit_attachments")
                .delete()
                .eq("id", value: attachment.id.uuidString)
                .execute()

            // Try to delete from storage (extract path from URL)
            if let storagePath = extractStoragePath(from: attachment.fileUrl) {
                try? await SupabaseService.shared.deleteFile(path: storagePath)
            }

            await fetchTripBits()
            return true
        } catch {
            print("❌ [TripPackVM] Delete attachment error: \(error.localizedDescription)")
            errorMessage = error.localizedDescription
            return false
        }
    }

    /// Upload a file and create an attachment record in one operation
    func uploadAndAttach(
        to tripBit: TripBit,
        data: Data,
        fileName: String,
        fileType: String,
        tripId: UUID
    ) async -> Bool {
        do {
            // Generate storage path
            let path = SupabaseService.shared.generateStoragePath(
                tripId: tripId,
                fileName: fileName
            )

            // Upload to storage
            let fileUrl = try await SupabaseService.shared.uploadFile(
                data: data,
                path: path,
                contentType: fileType
            )

            // Create attachment record
            return await addAttachment(
                to: tripBit,
                fileUrl: fileUrl,
                fileName: fileName,
                fileType: fileType
            )
        } catch {
            print("❌ [TripPackVM] Upload and attach error: \(error.localizedDescription)")
            errorMessage = error.localizedDescription
            return false
        }
    }

    /// Extract storage path from a Supabase storage URL
    private func extractStoragePath(from url: String) -> String? {
        // Supabase storage URLs typically look like:
        // https://xxx.supabase.co/storage/v1/object/public/bucket-name/path/to/file
        guard let urlComponents = URLComponents(string: url),
              let pathComponents = urlComponents.path.split(separator: "/").suffix(from: 5) as? ArraySlice<Substring> else {
            return nil
        }

        // Join the path components after 'bucket-name'
        let storagePath = pathComponents.dropFirst().joined(separator: "/")
        return storagePath.isEmpty ? nil : storagePath
    }

    // MARK: - AI Quick Add

    func createFromParsedData(_ parsed: ParsedTripBit) async -> TripBit? {
        return await createTripBit(
            category: parsed.category,
            title: parsed.title,
            startDatetime: parsed.startDatetime,
            endDatetime: parsed.endDatetime,
            details: parsed.details
        )
    }

    // MARK: - Helpers

    private func getCurrentUserId() async -> UUID? {
        do {
            let session = try await supabase.auth.session
            return session.user.id
        } catch {
            print("❌ [TripPackVM] Get user error: \(error.localizedDescription)")
            return nil
        }
    }

    // MARK: - Actions

    func selectTripBit(_ tripBit: TripBit) {
        selectedTripBit = tripBit
    }

    func clearSelection() {
        selectedTripBit = nil
        selectedCategory = nil
    }

    func startAddFlow(category: TripBitCategory? = nil) {
        selectedCategory = category
        showAddTripBit = true
    }

    func startAIQuickAdd() {
        showAIQuickAdd = true
    }
}
