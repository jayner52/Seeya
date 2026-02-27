import SwiftUI
import Supabase

/// Sheet for selecting which trip to add an AI recommendation to,
/// with trip grouping (Current / Upcoming / Past), destination-match sorting,
/// a success state, and an optional inline details form.
struct AddToTripSheet: View {
    @Environment(\.dismiss) private var dismiss

    let recommendation: AIService.AIRecommendation
    let destination: String
    let onSuccess: (String) -> Void  // called with trip name on completion

    // MARK: - Sheet navigation
    @State private var sheetView: SheetView = .selectTrip

    // MARK: - Select trip state
    @State private var trips: [Trip] = []
    @State private var selectedTrip: Trip?
    @State private var isLoadingTrips = true
    @State private var isAdding = false
    @State private var addError: String?

    // MARK: - Success state
    @State private var addedTripBitId: UUID?
    @State private var addedTripName: String = ""

    // MARK: - Details form state
    @State private var detailDate = Date()
    @State private var detailEndDate = Date().addingTimeInterval(86400)
    @State private var hasDate = false
    @State private var hasTime = false
    @State private var detailTime = Date()
    @State private var detailStatus: TripBitStatus = .idea
    @State private var detailConfirmation: String = ""
    @State private var detailPartySize: Int = 2
    @State private var detailParticipants: Set<UUID> = []
    @State private var tripParticipants: [SimpleParticipant] = []
    @State private var isSavingDetails = false
    @State private var detailsError: String?

    // MARK: - Nested types
    enum SheetView { case selectTrip, success, details }
    enum TripGroup: Equatable { case current, upcoming, past }

    struct SimpleParticipant: Identifiable {
        let id: UUID
        let fullName: String
        let avatarUrl: String?
    }

    // MARK: - Body

    var body: some View {
        NavigationStack {
            Group {
                switch sheetView {
                case .selectTrip: selectTripView
                case .success:    successView
                case .details:    detailsFormView
                }
            }
            .background(Color.seeyaBackground)
            .navigationTitle(navigationTitle)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar { toolbarContent }
        }
        .task { await fetchTrips() }
    }

    private var navigationTitle: String {
        switch sheetView {
        case .selectTrip: return "Add to Trip"
        case .success:    return "Added!"
        case .details:    return "Add Details"
        }
    }

    @ToolbarContentBuilder
    private var toolbarContent: some ToolbarContent {
        ToolbarItem(placement: .topBarLeading) {
            switch sheetView {
            case .selectTrip:
                Button("Cancel") { dismiss() }
            case .details:
                Button("Skip") {
                    onSuccess(addedTripName)
                    dismiss()
                }
                .foregroundStyle(Color.seeyaTextSecondary)
            default:
                EmptyView()
            }
        }
        ToolbarItem(placement: .topBarTrailing) {
            if sheetView == .selectTrip, selectedTrip != nil {
                Button {
                    Task { await handleAdd() }
                } label: {
                    if isAdding {
                        ProgressView().tint(Color.seeyaPurple)
                    } else {
                        Text("Add")
                            .fontWeight(.semibold)
                            .foregroundStyle(Color.seeyaPurple)
                    }
                }
                .disabled(isAdding)
            }
        }
    }

    // MARK: - Select Trip View

    private var selectTripView: some View {
        VStack(spacing: 0) {
            recommendationPreview
                .padding(SeeyaSpacing.md)
                .background(Color.seeyaSurface)

            if isLoadingTrips {
                Spacer()
                ProgressView().scaleEffect(1.2)
                Spacer()
            } else if trips.isEmpty {
                emptyTripsView
            } else {
                tripsListView
            }

            if let error = addError {
                Text(error)
                    .font(SeeyaTypography.caption)
                    .foregroundStyle(Color.seeyaError)
                    .padding(.horizontal, SeeyaSpacing.md)
                    .padding(.bottom, SeeyaSpacing.sm)
            }
        }
    }

    private var recommendationPreview: some View {
        VStack(alignment: .leading, spacing: SeeyaSpacing.xs) {
            Text("Adding:")
                .font(SeeyaTypography.caption)
                .foregroundStyle(Color.seeyaTextSecondary)

            HStack(spacing: SeeyaSpacing.sm) {
                Image(systemName: tripBitCategory.icon)
                    .font(.title3)
                    .foregroundStyle(tripBitCategory.color)
                    .frame(width: 32, height: 32)
                    .background(tripBitCategory.color.opacity(0.15))
                    .clipShape(Circle())

                VStack(alignment: .leading, spacing: 2) {
                    Text(recommendation.title)
                        .font(SeeyaTypography.labelMedium)
                        .fontWeight(.semibold)
                        .foregroundStyle(Color.seeyaTextPrimary)
                        .lineLimit(1)
                    Text(tripBitCategory.displayName)
                        .font(SeeyaTypography.caption)
                        .foregroundStyle(Color.seeyaTextSecondary)
                }
            }
        }
    }

    private var emptyTripsView: some View {
        VStack(spacing: SeeyaSpacing.md) {
            Spacer()
            Image(systemName: "airplane.circle")
                .font(.system(size: 48))
                .foregroundStyle(Color.seeyaTextTertiary)
            Text("No trips yet")
                .font(SeeyaTypography.headlineSmall)
                .foregroundStyle(Color.seeyaTextPrimary)
            Text("Create a trip first to add this recommendation.")
                .font(SeeyaTypography.bodySmall)
                .foregroundStyle(Color.seeyaTextSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, SeeyaSpacing.xl)
            Spacer()
        }
    }

    private var tripsListView: some View {
        ScrollView {
            LazyVStack(spacing: SeeyaSpacing.sm) {
                let currentTrips  = groupedTrips(.current)
                let upcomingTrips = groupedTrips(.upcoming)
                let pastTrips     = groupedTrips(.past)

                if !currentTrips.isEmpty {
                    tripGroupHeader("Current", dotColor: .green)
                    ForEach(currentTrips) { trip in
                        tripRow(trip, isCurrentTrip: true)
                    }
                }

                if !upcomingTrips.isEmpty {
                    tripGroupHeader("Upcoming", dotColor: nil)
                    ForEach(upcomingTrips) { trip in
                        tripRow(trip, isCurrentTrip: false)
                    }
                }

                if !pastTrips.isEmpty {
                    ForEach(pastTrips) { trip in
                        tripRow(trip, isCurrentTrip: false)
                    }
                }
            }
            .padding(SeeyaSpacing.md)
        }
    }

    private func tripGroupHeader(_ title: String, dotColor: Color?) -> some View {
        HStack(spacing: SeeyaSpacing.xxs) {
            if let color = dotColor {
                Circle().fill(color).frame(width: 6, height: 6)
            }
            Text(title.uppercased())
                .font(SeeyaTypography.captionSmall)
                .foregroundStyle(Color.seeyaTextTertiary)
            Spacer()
        }
        .padding(.top, SeeyaSpacing.xs)
    }

    private func tripRow(_ trip: Trip, isCurrentTrip: Bool) -> some View {
        let isSelected = selectedTrip?.id == trip.id

        return Button {
            selectedTrip = trip
        } label: {
            HStack(spacing: SeeyaSpacing.sm) {
                VStack(alignment: .leading, spacing: SeeyaSpacing.xxs) {
                    HStack(spacing: SeeyaSpacing.xs) {
                        Text(trip.name)
                            .font(SeeyaTypography.labelMedium)
                            .fontWeight(.semibold)
                            .foregroundStyle(Color.seeyaTextPrimary)
                            .lineLimit(1)

                        if isCurrentTrip {
                            Text("NOW")
                                .font(SeeyaTypography.captionSmall)
                                .fontWeight(.bold)
                                .foregroundStyle(.white)
                                .padding(.horizontal, 5)
                                .padding(.vertical, 2)
                                .background(Color.green)
                                .clipShape(Capsule())
                        }
                    }

                    HStack(spacing: SeeyaSpacing.xs) {
                        if let flag = trip.locations?.first?.flagEmoji {
                            Text(flag).font(.caption)
                        }
                        Text(trip.destination)
                            .font(SeeyaTypography.bodySmall)
                            .foregroundStyle(Color.seeyaTextSecondary)
                            .lineLimit(1)
                    }

                    if trip.hasDates {
                        HStack(spacing: 4) {
                            Image(systemName: "calendar").font(.caption2)
                            Text(trip.dateRangeText).font(SeeyaTypography.caption)
                        }
                        .foregroundStyle(Color.seeyaTextTertiary)
                    }
                }

                Spacer()

                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.title2)
                        .foregroundStyle(Color.seeyaPurple)
                }
            }
            .padding(SeeyaSpacing.md)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color.seeyaCardBackground)
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(isSelected ? Color.seeyaPurple : Color.clear, lineWidth: 2)
                    )
            )
        }
        .buttonStyle(.plain)
    }

    // MARK: - Success View

    private var successView: some View {
        VStack(spacing: SeeyaSpacing.lg) {
            Spacer()

            ZStack {
                Circle()
                    .fill(Color.green.opacity(0.15))
                    .frame(width: 80, height: 80)
                Image(systemName: "checkmark")
                    .font(.system(size: 36, weight: .semibold))
                    .foregroundStyle(.green)
            }

            VStack(spacing: SeeyaSpacing.xs) {
                Text(recommendation.title)
                    .font(SeeyaTypography.headlineMedium)
                    .foregroundStyle(Color.seeyaTextPrimary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, SeeyaSpacing.md)
                Text("added to \(addedTripName)")
                    .font(SeeyaTypography.bodyMedium)
                    .foregroundStyle(Color.seeyaTextSecondary)
            }

            Spacer()

            VStack(spacing: SeeyaSpacing.sm) {
                Button {
                    sheetView = .details
                    Task { await fetchParticipants() }
                } label: {
                    Label("Add details", systemImage: "chevron.right")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(SeeyaPrimaryButtonStyle())

                Button("Done") {
                    onSuccess(addedTripName)
                    dismiss()
                }
                .font(SeeyaTypography.bodyMedium)
                .foregroundStyle(Color.seeyaTextSecondary)
            }
            .padding(SeeyaSpacing.md)
        }
    }

    // MARK: - Details Form View

    private var detailsFormView: some View {
        ScrollView {
            VStack(spacing: SeeyaSpacing.md) {
                // Status toggle
                statusToggle

                // Date fields — stay gets check-in/out, others get single date + optional time
                if tripBitCategory == .stay {
                    stayDateFields
                } else {
                    standardDateFields
                }

                // Party size (dining / reservation)
                if tripBitCategory == .dining || tripBitCategory == .reservation {
                    partySizeField
                }

                // Participant chips (dining / reservation / activity)
                if (tripBitCategory == .dining || tripBitCategory == .reservation || tripBitCategory == .activity),
                   !tripParticipants.isEmpty {
                    participantsField
                }

                // Confirmation number (when status = confirmed)
                if detailStatus == .confirmed {
                    confirmationField
                }

                if let error = detailsError {
                    Text(error)
                        .font(SeeyaTypography.caption)
                        .foregroundStyle(Color.seeyaError)
                }

                Button {
                    Task { await saveDetails() }
                } label: {
                    if isSavingDetails {
                        ProgressView()
                    } else {
                        Text("Save Details").frame(maxWidth: .infinity)
                    }
                }
                .buttonStyle(SeeyaPrimaryButtonStyle())
                .padding(.top, SeeyaSpacing.sm)
            }
            .padding(SeeyaSpacing.md)
        }
    }

    private var statusToggle: some View {
        VStack(alignment: .leading, spacing: SeeyaSpacing.xs) {
            Text("Status")
                .font(SeeyaTypography.labelMedium)
                .foregroundStyle(Color.seeyaTextSecondary)

            HStack(spacing: SeeyaSpacing.xs) {
                statusPill("Idea 💡", status: .idea)
                let bookedLabel = (tripBitCategory == .dining || tripBitCategory == .reservation)
                    ? "Made reservation ✓" : "Booked ✓"
                statusPill(bookedLabel, status: .confirmed)
            }
        }
        .padding(SeeyaSpacing.md)
        .background(Color.seeyaCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func statusPill(_ label: String, status: TripBitStatus) -> some View {
        Button {
            detailStatus = status
        } label: {
            Text(label)
                .font(SeeyaTypography.labelSmall)
                .foregroundStyle(detailStatus == status ? .white : Color.seeyaTextSecondary)
                .padding(.horizontal, SeeyaSpacing.sm)
                .padding(.vertical, SeeyaSpacing.xs)
                .background(detailStatus == status ? Color.seeyaPurple : Color.seeyaBackground)
                .clipShape(Capsule())
        }
    }

    private var standardDateFields: some View {
        VStack(spacing: SeeyaSpacing.sm) {
            Toggle(isOn: $hasDate.animation()) {
                Label("Date", systemImage: "calendar")
                    .font(SeeyaTypography.labelMedium)
                    .foregroundStyle(Color.seeyaTextPrimary)
            }
            .tint(Color.seeyaPurple)
            .padding(SeeyaSpacing.md)
            .background(Color.seeyaCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 12))

            if hasDate {
                DatePicker("Date", selection: $detailDate, displayedComponents: .date)
                    .datePickerStyle(.compact)
                    .padding(SeeyaSpacing.md)
                    .background(Color.seeyaCardBackground)
                    .clipShape(RoundedRectangle(cornerRadius: 12))

                Toggle(isOn: $hasTime.animation()) {
                    Label("Time", systemImage: "clock")
                        .font(SeeyaTypography.labelMedium)
                        .foregroundStyle(Color.seeyaTextPrimary)
                }
                .tint(Color.seeyaPurple)
                .padding(SeeyaSpacing.md)
                .background(Color.seeyaCardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 12))

                if hasTime {
                    DatePicker("Time", selection: $detailTime, displayedComponents: .hourAndMinute)
                        .datePickerStyle(.compact)
                        .padding(SeeyaSpacing.md)
                        .background(Color.seeyaCardBackground)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
        }
    }

    private var stayDateFields: some View {
        VStack(spacing: SeeyaSpacing.sm) {
            VStack(alignment: .leading, spacing: SeeyaSpacing.xs) {
                Label("Check-in", systemImage: "calendar.badge.plus")
                    .font(SeeyaTypography.caption)
                    .foregroundStyle(Color.seeyaTextSecondary)
                DatePicker("Check-in", selection: $detailDate, displayedComponents: .date)
                    .datePickerStyle(.compact)
                    .labelsHidden()
            }
            .padding(SeeyaSpacing.md)
            .background(Color.seeyaCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 12))

            VStack(alignment: .leading, spacing: SeeyaSpacing.xs) {
                Label("Check-out", systemImage: "calendar.badge.minus")
                    .font(SeeyaTypography.caption)
                    .foregroundStyle(Color.seeyaTextSecondary)
                DatePicker("Check-out", selection: $detailEndDate, in: detailDate..., displayedComponents: .date)
                    .datePickerStyle(.compact)
                    .labelsHidden()
            }
            .padding(SeeyaSpacing.md)
            .background(Color.seeyaCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }

    private var partySizeField: some View {
        HStack {
            Label("Party size", systemImage: "person.2")
                .font(SeeyaTypography.labelMedium)
                .foregroundStyle(Color.seeyaTextPrimary)
            Spacer()
            Stepper("\(detailPartySize)", value: $detailPartySize, in: 1...20)
                .fixedSize()
        }
        .padding(SeeyaSpacing.md)
        .background(Color.seeyaCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private var participantsField: some View {
        VStack(alignment: .leading, spacing: SeeyaSpacing.xs) {
            Label("Who's going", systemImage: "person.2")
                .font(SeeyaTypography.labelMedium)
                .foregroundStyle(Color.seeyaTextSecondary)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: SeeyaSpacing.xs) {
                    ForEach(tripParticipants) { participant in
                        let isSelected = detailParticipants.contains(participant.id)
                        Button {
                            if isSelected {
                                detailParticipants.remove(participant.id)
                            } else {
                                detailParticipants.insert(participant.id)
                            }
                        } label: {
                            HStack(spacing: 4) {
                                AvatarView(
                                    name: participant.fullName,
                                    avatarUrl: participant.avatarUrl,
                                    size: 20
                                )
                                Text(participant.fullName.components(separatedBy: " ").first ?? participant.fullName)
                                    .font(SeeyaTypography.caption)
                                    .foregroundStyle(isSelected ? .white : Color.seeyaTextPrimary)
                            }
                            .padding(.horizontal, SeeyaSpacing.xs)
                            .padding(.vertical, SeeyaSpacing.xxs)
                            .background(isSelected ? Color.seeyaPurple : Color.seeyaBackground)
                            .clipShape(Capsule())
                            .overlay(
                                Capsule()
                                    .stroke(isSelected ? Color.clear : Color.seeyaBorder, lineWidth: 1)
                            )
                        }
                    }
                }
            }
        }
        .padding(SeeyaSpacing.md)
        .background(Color.seeyaCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private var confirmationField: some View {
        VStack(alignment: .leading, spacing: SeeyaSpacing.xs) {
            Label("Confirmation number", systemImage: "number")
                .font(SeeyaTypography.caption)
                .foregroundStyle(Color.seeyaTextSecondary)
            TextField("e.g. ABC-123", text: $detailConfirmation)
                .font(SeeyaTypography.bodySmall)
                .textFieldStyle(.plain)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.characters)
        }
        .padding(SeeyaSpacing.md)
        .background(Color.seeyaCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Computed Helpers

    private var tripBitCategory: TripBitCategory {
        switch recommendation.category.lowercased() {
        case "restaurant", "dining": return .dining
        case "activity":             return .activity
        case "stay":                 return .stay
        default:                     return .other
        }
    }

    private func getTripGroup(_ trip: Trip) -> TripGroup {
        // Supabase date-only strings (e.g. "2026-02-27") are decoded as UTC midnight.
        // Use a UTC calendar to extract the intended year/month/day, then build
        // a local-midnight Date for comparison — same fix as the web app.
        var utcCal = Calendar(identifier: .gregorian)
        utcCal.timeZone = TimeZone(identifier: "UTC")!
        let localCal = Calendar.current

        let nowComponents = localCal.dateComponents([.year, .month, .day], from: Date())
        guard let today = localCal.date(from: nowComponents) else { return .upcoming }
        guard let startDate = trip.startDate else { return .upcoming }

        let startComponents = utcCal.dateComponents([.year, .month, .day], from: startDate)
        guard let start = localCal.date(from: startComponents) else { return .upcoming }

        let end: Date? = trip.endDate.flatMap {
            let comps = utcCal.dateComponents([.year, .month, .day], from: $0)
            return localCal.date(from: comps)
        }

        if let end, end < today { return .past }
        if start <= today && (end == nil || end! >= today) { return .current }
        return .upcoming
    }

    private func destinationScore(_ trip: Trip) -> Int {
        let destLower = destination.lowercased()
        if let locations = trip.locations {
            for loc in locations {
                if let cityName = loc.city?.name,
                   cityName.lowercased().contains(destLower) || destLower.contains(cityName.lowercased()) {
                    return 2
                }
                if let countryName = loc.city?.country?.name,
                   countryName.lowercased().contains(destLower) || destLower.contains(countryName.lowercased()) {
                    return 1
                }
            }
        }
        if trip.name.lowercased().contains(destLower) { return 1 }
        return 0
    }

    private func groupedTrips(_ group: TripGroup) -> [Trip] {
        let filtered = trips.filter { getTripGroup($0) == group }
        if group == .past {
            return filtered.sorted { ($0.startDate ?? .distantPast) > ($1.startDate ?? .distantPast) }
        } else {
            return filtered.sorted { a, b in
                let scoreA = destinationScore(a)
                let scoreB = destinationScore(b)
                if scoreA != scoreB { return scoreA > scoreB }
                return (a.startDate ?? .distantFuture) < (b.startDate ?? .distantFuture)
            }
        }
    }

    // MARK: - Actions

    private func fetchTrips() async {
        isLoadingTrips = true
        do {
            let session = try await SupabaseService.shared.client.auth.session
            let userId = session.user.id

            let ownedTrips: [Trip] = try await SupabaseService.shared.client
                .from("trips")
                .select("*, trip_locations(*, cities(*, countries(*)))")
                .eq("user_id", value: userId.uuidString)
                .execute()
                .value

            let participatingTrips: [Trip] = try await SupabaseService.shared.client
                .from("trips")
                .select("*, trip_locations(*, cities(*, countries(*))), trip_participants!inner(*)")
                .eq("trip_participants.user_id", value: userId.uuidString)
                .neq("user_id", value: userId.uuidString)
                .execute()
                .value

            var allTrips = ownedTrips
            for trip in participatingTrips {
                if !allTrips.contains(where: { $0.id == trip.id }) {
                    allTrips.append(trip)
                }
            }

            await MainActor.run {
                trips = allTrips
                isLoadingTrips = false
            }
        } catch {
            print("❌ [AddToTripSheet] Error fetching trips: \(error)")
            await MainActor.run { isLoadingTrips = false }
        }
    }

    private func handleAdd() async {
        guard let trip = selectedTrip else { return }
        await MainActor.run {
            isAdding = true
            addError = nil
        }

        do {
            let session = try await SupabaseService.shared.client.auth.session
            let userId = session.user.id

            var notesParts: [String] = [recommendation.description]
            if let tips = recommendation.tips { notesParts.append("Tip: \(tips)") }
            if let cost = recommendation.estimatedCost { notesParts.append("Estimated cost: \(cost)") }
            if let time = recommendation.bestTimeToVisit { notesParts.append("Best time: \(time)") }

            let tripBit = CreateTripBit(
                tripId: trip.id,
                createdBy: userId,
                category: tripBitCategory,
                title: recommendation.title,
                status: .idea,
                startDatetime: nil,
                endDatetime: nil,
                locationId: nil,
                notes: notesParts.joined(separator: "\n\n"),
                orderIndex: nil
            )

            struct InsertedRow: Decodable { let id: UUID }
            let inserted: InsertedRow = try await SupabaseService.shared.client
                .from("trip_bits")
                .insert(tripBit)
                .select("id")
                .single()
                .execute()
                .value

            await MainActor.run {
                addedTripBitId = inserted.id
                addedTripName = trip.name
                isAdding = false
                sheetView = .success
            }
        } catch {
            await MainActor.run {
                addError = error.localizedDescription
                isAdding = false
            }
        }
    }

    private func fetchParticipants() async {
        guard let trip = selectedTrip else { return }

        struct ParticipantRow: Decodable {
            let userId: UUID
            let profiles: ProfileRow?

            enum CodingKeys: String, CodingKey {
                case userId = "user_id"
                case profiles
            }

            struct ProfileRow: Decodable {
                let fullName: String?
                let avatarUrl: String?

                enum CodingKeys: String, CodingKey {
                    case fullName = "full_name"
                    case avatarUrl = "avatar_url"
                }
            }
        }

        do {
            let rows: [ParticipantRow] = try await SupabaseService.shared.client
                .from("trip_participants")
                .select("user_id, profiles(full_name, avatar_url)")
                .eq("trip_id", value: trip.id.uuidString)
                .eq("status", value: "confirmed")
                .execute()
                .value

            var participants: [SimpleParticipant] = rows.compactMap { row in
                guard let profile = row.profiles, let name = profile.fullName else { return nil }
                return SimpleParticipant(id: row.userId, fullName: name, avatarUrl: profile.avatarUrl)
            }

            // Add the trip owner if not already in the list
            let ownerId = trip.userId
            if !participants.contains(where: { $0.id == ownerId }) {
                struct OwnerProfile: Decodable {
                    let fullName: String?
                    let avatarUrl: String?
                    enum CodingKeys: String, CodingKey {
                        case fullName = "full_name"
                        case avatarUrl = "avatar_url"
                    }
                }
                if let profile: OwnerProfile = try? await SupabaseService.shared.client
                    .from("profiles")
                    .select("full_name, avatar_url")
                    .eq("id", value: ownerId.uuidString)
                    .single()
                    .execute()
                    .value, let name = profile.fullName {
                    participants.insert(
                        SimpleParticipant(id: ownerId, fullName: name, avatarUrl: profile.avatarUrl),
                        at: 0
                    )
                }
            }

            await MainActor.run {
                tripParticipants = participants
            }
        } catch {
            print("❌ [AddToTripSheet] Error fetching participants: \(error)")
        }
    }

    private func saveDetails() async {
        guard let tripBitId = addedTripBitId else { return }
        await MainActor.run {
            isSavingDetails = true
            detailsError = nil
        }

        do {
            // Build start datetime
            var startDatetime: Date? = nil
            var endDatetime: Date? = nil

            if tripBitCategory == .stay {
                startDatetime = detailDate
                endDatetime = detailEndDate
            } else if hasDate {
                var components = Calendar.current.dateComponents([.year, .month, .day], from: detailDate)
                if hasTime {
                    let timeComponents = Calendar.current.dateComponents([.hour, .minute], from: detailTime)
                    components.hour = timeComponents.hour
                    components.minute = timeComponents.minute
                }
                startDatetime = Calendar.current.date(from: components)
            }

            let update = UpdateTripBit(
                category: nil,
                title: nil,
                status: detailStatus,
                startDatetime: startDatetime,
                endDatetime: endDatetime,
                locationId: nil,
                notes: nil,
                orderIndex: nil
            )

            try await SupabaseService.shared.client
                .from("trip_bits")
                .update(update)
                .eq("id", value: tripBitId.uuidString)
                .execute()

            // Save details JSONB
            var detailsDict: [String: AnyCodable] = [:]
            if !detailConfirmation.isEmpty {
                detailsDict["confirmationNumber"] = AnyCodable(detailConfirmation)
            }
            if tripBitCategory == .dining || tripBitCategory == .reservation {
                detailsDict["partySize"] = AnyCodable(detailPartySize)
            }

            if !detailsDict.isEmpty {
                let details = CreateTripBitDetails(tripBitId: tripBitId, details: detailsDict)
                try await SupabaseService.shared.client
                    .from("trip_bit_details")
                    .upsert(details, onConflict: "trip_bit_id")
                    .execute()
            }

            // Save participant assignments
            if !detailParticipants.isEmpty {
                let travelers = detailParticipants.map { userId in
                    CreateTripBitTraveler(tripBitId: tripBitId, userId: userId, appliesToAll: false)
                }
                try await SupabaseService.shared.client
                    .from("trip_bit_travelers")
                    .insert(travelers)
                    .execute()
            }

            await MainActor.run {
                isSavingDetails = false
                onSuccess(addedTripName)
                dismiss()
            }
        } catch {
            await MainActor.run {
                detailsError = error.localizedDescription
                isSavingDetails = false
            }
        }
    }
}

#Preview {
    AddToTripSheet(
        recommendation: AIService.AIRecommendation(
            title: "Senso-ji Temple",
            description: "Tokyo's oldest and most significant Buddhist temple",
            category: "activity",
            tips: "Go early morning to avoid crowds",
            estimatedCost: "Free",
            bestTimeToVisit: "Morning"
        ),
        destination: "Tokyo",
        onSuccess: { _ in }
    )
}
