import SwiftUI

// MARK: - Public Itinerary View

struct PublicItineraryView: View {
    let shareCode: String

    @State private var itinerary: PublicItineraryData?
    @State private var isLoading = true
    @State private var errorMessage: String?
    @State private var showCopySheet = false
    @State private var coverPhotoURL: URL?

    var body: some View {
        Group {
            if isLoading {
                ProgressView("Loading itinerary...")
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if let error = errorMessage {
                errorView(error)
            } else if let itinerary {
                itineraryContent(itinerary)
            }
        }
        .navigationTitle("")
        .navigationBarTitleDisplayMode(.inline)
        .task { await loadItinerary() }
        .sheet(isPresented: $showCopySheet) {
            if let itinerary {
                CopyItinerarySheet(shareCode: shareCode, itineraryTitle: itinerary.title)
            }
        }
    }

    // MARK: - Content

    private func itineraryContent(_ itin: PublicItineraryData) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                // Hero
                heroSection(itin)

                VStack(alignment: .leading, spacing: SeeyaSpacing.lg) {
                    // Copy CTAs
                    copyButtons

                    // Day-by-day
                    if !itin.datedItems.isEmpty {
                        ForEach(itin.datedItems, id: \.dayNumber) { dayGroup in
                            daySection(dayGroup)
                        }
                    }

                    // Undated items
                    if !itin.undatedItems.isEmpty {
                        undatedSection(itin.undatedItems)
                    }
                }
                .padding()
            }
        }
        .background(Color.seeyaBackground)
    }

    private func heroSection(_ itin: PublicItineraryData) -> some View {
        ZStack(alignment: .bottomLeading) {
            // Cover photo or gradient
            if let photoURL = coverPhotoURL {
                AsyncImage(url: photoURL) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().scaledToFill()
                    default:
                        gradientBackground
                    }
                }
                .frame(height: 200)
                .clipped()
            } else {
                gradientBackground
                    .frame(height: 200)
            }

            // Overlay text
            LinearGradient(
                colors: [.clear, .black.opacity(0.6)],
                startPoint: .top, endPoint: .bottom
            )

            VStack(alignment: .leading, spacing: 4) {
                Text(itin.title)
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundStyle(.white)

                HStack(spacing: 12) {
                    Label(itin.destination, systemImage: "mappin.circle.fill")
                    if let days = itin.durationDays {
                        Label("\(days) days", systemImage: "calendar")
                    }
                }
                .font(.caption)
                .foregroundStyle(.white.opacity(0.9))

                if let creator = itin.creator {
                    Label("by \(creator.fullName)", systemImage: "person.fill")
                        .font(.caption)
                        .foregroundStyle(.white.opacity(0.8))
                }
            }
            .padding()
        }
        .frame(height: 200)
    }

    private var gradientBackground: some View {
        LinearGradient(
            colors: [Color.seeyaPurple.opacity(0.6), Color.seeyaPurple],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    private var copyButtons: some View {
        HStack(spacing: SeeyaSpacing.sm) {
            Button {
                showCopySheet = true
            } label: {
                Label("Copy to New Trip", systemImage: "plus.circle.fill")
                    .font(SeeyaTypography.labelSmall)
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(SeeyaPrimaryButtonStyle())

            Button {
                showCopySheet = true
            } label: {
                Label("Add to Trip", systemImage: "arrow.right.circle.fill")
                    .font(SeeyaTypography.labelSmall)
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(SeeyaSecondaryButtonStyle())
        }
    }

    private func daySection(_ group: DayGroup) -> some View {
        VStack(alignment: .leading, spacing: SeeyaSpacing.sm) {
            Text("Day \(group.dayNumber)")
                .font(SeeyaTypography.headlineMedium)
                .foregroundStyle(Color.seeyaTextPrimary)

            VStack(spacing: 0) {
                ForEach(group.items) { item in
                    itemRow(item)
                    if item.id != group.items.last?.id {
                        Divider().padding(.leading, 48)
                    }
                }
            }
            .background(Color.seeyaCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
        }
    }

    private func undatedSection(_ items: [PublicItineraryItem]) -> some View {
        VStack(alignment: .leading, spacing: SeeyaSpacing.sm) {
            Text("Other Activities")
                .font(SeeyaTypography.headlineMedium)
                .foregroundStyle(Color.seeyaTextPrimary)

            VStack(spacing: 0) {
                ForEach(items) { item in
                    itemRow(item)
                    if item.id != items.last?.id {
                        Divider().padding(.leading, 48)
                    }
                }
            }
            .background(Color.seeyaCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .shadow(color: .black.opacity(0.05), radius: 4, y: 2)
        }
    }

    private func itemRow(_ item: PublicItineraryItem) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Text(item.categoryEmoji)
                .font(.title2)
                .frame(width: 36)

            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(item.title)
                        .font(SeeyaTypography.labelSmall)
                        .foregroundStyle(Color.seeyaTextPrimary)
                    Spacer()
                    if let time = item.startTime {
                        Text(time)
                            .font(SeeyaTypography.caption)
                            .foregroundStyle(Color.seeyaTextTertiary)
                    }
                }

                if let location = item.locationName {
                    Label(location, systemImage: "mappin")
                        .font(SeeyaTypography.caption)
                        .foregroundStyle(Color.seeyaTextSecondary)
                }

                if let notes = item.notes, !notes.isEmpty {
                    Text(notes)
                        .font(SeeyaTypography.caption)
                        .foregroundStyle(Color.seeyaTextSecondary)
                        .lineLimit(2)
                }
            }
        }
        .padding(SeeyaSpacing.md)
    }

    private func errorView(_ message: String) -> some View {
        VStack(spacing: SeeyaSpacing.lg) {
            Image(systemName: "map")
                .font(.system(size: 48))
                .foregroundStyle(Color.seeyaTextTertiary)

            Text("Itinerary not found")
                .font(SeeyaTypography.headlineMedium)

            Text(message)
                .font(SeeyaTypography.bodySmall)
                .foregroundStyle(Color.seeyaTextSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Load

    private func loadItinerary() async {
        isLoading = true
        do {
            guard let url = URL(string: "https://seeya-tawny.vercel.app/api/itineraries/\(shareCode)") else { return }
            let (data, response) = try await URLSession.shared.data(from: url)

            guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
                await MainActor.run { errorMessage = "Itinerary not found" }
                return
            }

            let decoded = try JSONDecoder().decode(PublicItineraryResponse.self, from: data)
            let processed = PublicItineraryData(from: decoded)

            await MainActor.run { itinerary = processed }

            // Fetch cover photo
            if let photoURL = await fetchCoverPhotoURL(for: processed.destination) {
                await MainActor.run { coverPhotoURL = photoURL }
            }
        } catch {
            await MainActor.run { errorMessage = error.localizedDescription }
        }
        await MainActor.run { isLoading = false }
    }

    private func fetchCoverPhotoURL(for destination: String) async -> URL? {
        guard let url = URL(string: "https://seeya-tawny.vercel.app/api/unsplash/city-photo?city=\(destination.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? destination)") else { return nil }
        guard let (data, _) = try? await URLSession.shared.data(from: url),
              let json = try? JSONDecoder().decode([String: String].self, from: data),
              let photoURLString = json["photoUrl"] else { return nil }
        return URL(string: photoURLString)
    }
}

// MARK: - Copy Itinerary Sheet

struct CopyItinerarySheet: View {
    let shareCode: String
    let itineraryTitle: String
    @Environment(\.dismiss) private var dismiss
    @State private var mode: CopyMode? = nil
    @State private var newTripName: String
    @State private var trips: [TripOption] = []
    @State private var selectedTripId: String = ""
    @State private var isLoading = false
    @State private var error: String?

    enum CopyMode { case newTrip, existingTrip }

    struct TripOption: Decodable, Identifiable {
        let id: String
        let name: String
    }

    init(shareCode: String, itineraryTitle: String) {
        self.shareCode = shareCode
        self.itineraryTitle = itineraryTitle
        _newTripName = State(initialValue: itineraryTitle)
    }

    var body: some View {
        NavigationStack {
            Group {
                if mode == nil {
                    modeSelectionView
                } else if mode == .newTrip {
                    newTripForm
                } else {
                    existingTripForm
                }
            }
            .navigationTitle("Add to Seeya")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
        .task {
            if mode == .existingTrip || mode == nil {
                await fetchUserTrips()
            }
        }
    }

    private var modeSelectionView: some View {
        VStack(spacing: SeeyaSpacing.lg) {
            Spacer()

            VStack(spacing: SeeyaSpacing.md) {
                Button {
                    mode = .newTrip
                } label: {
                    Label("Copy to New Trip", systemImage: "plus.circle.fill")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(SeeyaPrimaryButtonStyle())

                Button {
                    mode = .existingTrip
                } label: {
                    Label("Add to Existing Trip", systemImage: "arrow.right.circle.fill")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(SeeyaSecondaryButtonStyle())
            }
            .padding()

            Spacer()
        }
        .background(Color.seeyaBackground)
    }

    private var newTripForm: some View {
        Form {
            Section("Trip Name") {
                TextField("Trip name", text: $newTripName)
            }

            if let error {
                Section {
                    Label(error, systemImage: "exclamationmark.triangle.fill")
                        .foregroundStyle(.red)
                }
            }

            Section {
                Button {
                    Task { await copyItinerary(mode: .newTrip) }
                } label: {
                    HStack {
                        Spacer()
                        if isLoading { ProgressView() }
                        else { Text("Create Trip") }
                        Spacer()
                    }
                }
                .disabled(isLoading || newTripName.trimmingCharacters(in: .whitespaces).isEmpty)
                .foregroundStyle(Color.seeyaPurple)
            }
        }
    }

    private var existingTripForm: some View {
        Form {
            Section("Choose a Trip") {
                if trips.isEmpty {
                    Text("Loading trips...")
                        .foregroundStyle(.secondary)
                } else {
                    Picker("Trip", selection: $selectedTripId) {
                        ForEach(trips) { trip in
                            Text(trip.name).tag(trip.id)
                        }
                    }
                    .pickerStyle(.inline)
                }
            }

            if let error {
                Section {
                    Label(error, systemImage: "exclamationmark.triangle.fill")
                        .foregroundStyle(.red)
                }
            }

            Section {
                Button {
                    Task { await copyItinerary(mode: .existingTrip) }
                } label: {
                    HStack {
                        Spacer()
                        if isLoading { ProgressView() }
                        else { Text("Add to Trip") }
                        Spacer()
                    }
                }
                .disabled(isLoading || selectedTripId.isEmpty)
                .foregroundStyle(Color.seeyaPurple)
            }
        }
    }

    private func fetchUserTrips() async {
        do {
            let session = try await SupabaseService.shared.client.auth.session
            let userId = session.user.id.uuidString
            let trips: [TripOption] = try await SupabaseService.shared.client
                .from("trips")
                .select("id, name")
                .eq("user_id", value: userId)
                .order("created_at", ascending: false)
                .limit(20)
                .execute()
                .value
            await MainActor.run {
                self.trips = trips
                if let first = trips.first { selectedTripId = first.id }
            }
        } catch {
            print("❌ [CopyItinerarySheet] Error fetching trips: \(error)")
        }
    }

    private func copyItinerary(mode: CopyMode) async {
        isLoading = true
        error = nil

        do {
            guard let url = URL(string: "https://seeya-tawny.vercel.app/api/itineraries/\(shareCode)/copy") else { return }

            let body: [String: Any]
            if mode == .newTrip {
                body = ["mode": "new_trip", "new_trip_name": newTripName]
            } else {
                body = ["mode": "existing_trip", "trip_id": selectedTripId]
            }

            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try JSONSerialization.data(withJSONObject: body)

            if let session = try? await SupabaseService.shared.client.auth.session {
                request.setValue("Bearer \(session.accessToken)", forHTTPHeaderField: "Authorization")
            }

            let (data, response) = try await URLSession.shared.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse, httpResponse.statusCode == 200 else {
                let msg = String(data: data, encoding: .utf8) ?? "Copy failed"
                throw NSError(domain: "CopyItinerary", code: 0, userInfo: [NSLocalizedDescriptionKey: msg])
            }

            await MainActor.run { dismiss() }
        } catch {
            await MainActor.run { self.error = error.localizedDescription }
        }

        await MainActor.run { isLoading = false }
    }
}

// MARK: - Models

struct PublicItineraryResponse: Decodable {
    let id: String
    let title: String
    let description: String?
    let destination: String
    let durationDays: Int?
    let shareCode: String
    let viewCount: Int
    let itineraryItems: [PublicItineraryItemResponse]
    let creator: CreatorResponse?

    enum CodingKeys: String, CodingKey {
        case id, title, description, destination
        case durationDays = "duration_days"
        case shareCode = "share_code"
        case viewCount = "view_count"
        case itineraryItems = "itinerary_items"
        case creator
    }
}

struct PublicItineraryItemResponse: Decodable {
    let id: String
    let dayNumber: Int?
    let orderIndex: Int
    let category: String
    let title: String
    let notes: String?
    let startTime: String?
    let locationName: String?

    enum CodingKeys: String, CodingKey {
        case id, category, title, notes
        case dayNumber = "day_number"
        case orderIndex = "order_index"
        case startTime = "start_time"
        case locationName = "location_name"
    }
}

struct CreatorResponse: Decodable {
    let fullName: String
    let avatarUrl: String?

    enum CodingKeys: String, CodingKey {
        case fullName = "full_name"
        case avatarUrl = "avatar_url"
    }
}

// MARK: - View Models

struct PublicItineraryData {
    let id: String
    let title: String
    let description: String?
    let destination: String
    let durationDays: Int?
    let datedItems: [DayGroup]
    let undatedItems: [PublicItineraryItem]
    let creator: CreatorResponse?

    init(from response: PublicItineraryResponse) {
        id = response.id
        title = response.title
        description = response.description
        destination = response.destination
        durationDays = response.durationDays
        creator = response.creator

        let items = response.itineraryItems.map { PublicItineraryItem(from: $0) }
        undatedItems = items.filter { $0.dayNumber == nil }

        var grouped: [Int: [PublicItineraryItem]] = [:]
        for item in items where item.dayNumber != nil {
            grouped[item.dayNumber!, default: []].append(item)
        }
        datedItems = grouped.keys.sorted().map { day in
            DayGroup(dayNumber: day, items: grouped[day]!.sorted { $0.orderIndex < $1.orderIndex })
        }
    }
}

struct DayGroup: Identifiable {
    var id: Int { dayNumber }
    let dayNumber: Int
    let items: [PublicItineraryItem]
}

struct PublicItineraryItem: Identifiable {
    let id: String
    let dayNumber: Int?
    let orderIndex: Int
    let category: String
    let title: String
    let notes: String?
    let startTime: String?
    let locationName: String?

    var categoryEmoji: String {
        switch category {
        case "flight": return "✈️"
        case "stay": return "🏨"
        case "car": return "🚗"
        case "activity": return "🎯"
        case "dining": return "🍽️"
        case "transport": return "🚌"
        case "money": return "💳"
        case "reservation": return "📅"
        case "document": return "📄"
        case "photos": return "📸"
        default: return "📌"
        }
    }

    init(from response: PublicItineraryItemResponse) {
        id = response.id
        dayNumber = response.dayNumber
        orderIndex = response.orderIndex
        category = response.category
        title = response.title
        notes = response.notes
        startTime = response.startTime
        locationName = response.locationName
    }
}

#Preview {
    NavigationStack {
        PublicItineraryView(shareCode: "abc12345")
    }
}
