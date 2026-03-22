import SwiftUI
import Supabase

// MARK: - Trip Tab

enum TripTab: String, CaseIterable {
    case planning = "Planning"
    case itinerary = "Itinerary"
}

struct TripDetailView: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var viewModel: TripsViewModel
    let trip: Trip

    @State private var showEditSheet = false
    @State private var showInviteSheet = false
    @State private var showAddRecommendation = false
    @State private var showDeleteConfirmation = false
    @State private var selectedCategory: RecommendationCategory = .restaurant

    // AI Recommendations (inline)
    @State private var aiCache: [RecommendationCategory: [AIService.AIRecommendation]] = [:]
    @State private var isLoadingAI = false
    @State private var aiErrorMessage: String?
    @State private var savedAIRecommendationIds: Set<UUID> = []
    @State private var savingAIIds: Set<UUID> = []

    // AI Filters
    @State private var restaurantFilters = AIService.RestaurantFilters()
    @State private var activityFilters = AIService.ActivityFilters()
    @State private var stayFilters = AIService.StayFilters()
    @State private var tipFilters = AIService.TipFilters()
    @State private var showFilters = false

    // Tab selection
    @State private var selectedTab: TripTab = .planning

    // TripPack
    @State private var tripPackViewModel: TripPackViewModel?
    @State private var showAddTripBitSheet = false
    @State private var showAIQuickAddSheet = false
    @State private var showDocumentsHub = false
    @State private var selectedTripBit: TripBit?

    // Current user ID for itinerary filtering
    @State private var currentUserId: UUID?

    // Rate & Share
    @State private var tripBitToRate: TripBit?

    // Publish Itinerary
    @State private var showPublishSheet = false

    // Leave Trip
    @State private var showLeaveConfirmation = false

    // Calendar Export
    @State private var calendarExportURL: URL?
    @State private var itinerarySummaryURL: URL?
    @State private var showExportShare = false
    @State private var showItineraryShare = false
    @State private var exportError: String?
    @State private var showExportError = false

    private var isOwner: Bool {
        viewModel.isOwner(of: trip)
    }

    private var currentTrip: Trip {
        viewModel.selectedTrip ?? trip
    }

    // MARK: - Tab Toggle

    private var tabToggle: some View {
        Picker("", selection: $selectedTab) {
            ForEach(TripTab.allCases, id: \.self) { tab in
                Text(tab.rawValue).tag(tab)
            }
        }
        .pickerStyle(.segmented)
    }

    // MARK: - Planning Content

    private var planningContent: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Header Card
                if isOwner {
                    Button { showEditSheet = true } label: {
                        headerCard
                    }
                    .buttonStyle(.plain)
                } else {
                    headerCard
                }

                // TripPack Section
                if let packViewModel = tripPackViewModel {
                    tripPackSection(packViewModel)

                    // Documents Hub
                    documentsSection(packViewModel)
                }

                // Participants Section
                participantsSection

                // Friend Recommendations Section
                FriendRecommendationsSection(
                    tripId: currentTrip.id,
                    tripLocations: currentTrip.locations ?? []
                )

                // Recommendations Section
                recommendationsSection

                // Actions (for owner)
                if isOwner {
                    actionsSection
                }
            }
            .padding()
        }
    }

    // MARK: - Itinerary Content

    @ViewBuilder
    private var itineraryContent: some View {
        if let packViewModel = tripPackViewModel {
            ItineraryView(
                viewModel: packViewModel,
                trip: currentTrip,
                currentUserId: currentUserId
            )
        } else {
            ProgressView("Loading...")
                .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            // Tab Toggle
            tabToggle
                .padding(.horizontal)
                .padding(.top, 8)
                .padding(.bottom, 4)
                .background(Color.seeyaBackground)

            // Content based on selected tab
            switch selectedTab {
            case .planning:
                planningContent
            case .itinerary:
                itineraryContent
            }
        }
        .background(Color.seeyaBackground)
        .navigationTitle(currentTrip.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    // Export options (available to all)
                    Section {
                        Button {
                            exportCalendar()
                        } label: {
                            Label("Export Calendar (.ics)", systemImage: "calendar.badge.plus")
                        }

                        Button {
                            exportItinerarySummary()
                        } label: {
                            Label("Share Itinerary", systemImage: "doc.text")
                        }
                    }

                    if isOwner {
                        Section {
                            Button {
                                showPublishSheet = true
                            } label: {
                                Label("Publish Itinerary", systemImage: "globe")
                            }
                        }

                        Section {
                            Button {
                                showEditSheet = true
                            } label: {
                                Label("Edit Trip", systemImage: "pencil")
                            }

                            Button(role: .destructive) {
                                showDeleteConfirmation = true
                            } label: {
                                Label("Delete Trip", systemImage: "trash")
                            }
                        }
                    } else {
                        Section {
                            Button(role: .destructive) {
                                showLeaveConfirmation = true
                            } label: {
                                Label("Leave Trip", systemImage: "arrow.right.square")
                            }
                        }
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
        .sheet(isPresented: $showEditSheet) {
            EditTripView(viewModel: viewModel, trip: currentTrip)
        }
        .sheet(isPresented: $showInviteSheet) {
            InviteTravelPalsSheet(trip: currentTrip) {
                Task {
                    await viewModel.fetchTrip(id: currentTrip.id)
                }
            }
        }
        .sheet(isPresented: $showAddRecommendation) {
            AddRecommendationSheet(
                tripId: currentTrip.id,
                tripLocations: currentTrip.locations ?? [],
                onAdd: { title, description, category, locationId, googlePlaceId, lat, lng in
                    await viewModel.addRecommendation(
                        tripId: currentTrip.id,
                        title: title,
                        description: description,
                        category: category,
                        locationId: locationId,
                        googlePlaceId: googlePlaceId
                    )
                }
            )
        }
        .confirmationDialog(
            "Delete Trip",
            isPresented: $showDeleteConfirmation,
            titleVisibility: .visible
        ) {
            Button("Delete", role: .destructive) {
                deleteTrip()
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Are you sure you want to delete this trip? This action cannot be undone.")
        }
        .confirmationDialog(
            "Leave Trip",
            isPresented: $showLeaveConfirmation,
            titleVisibility: .visible
        ) {
            Button("Leave", role: .destructive) {
                leaveTrip()
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("Are you sure you want to leave this trip? You'll need a new invite to rejoin.")
        }
        .task {
            await viewModel.fetchTrip(id: trip.id)

            // Initialize TripPack
            if tripPackViewModel == nil {
                tripPackViewModel = TripPackViewModel(tripId: trip.id)
            }
            await tripPackViewModel?.fetchTripBits()

            // Get current user ID for itinerary filtering
            if let session = try? await SupabaseService.shared.client.auth.session {
                currentUserId = session.user.id
            }
        }
        .sheet(isPresented: $showAddTripBitSheet) {
            if let packViewModel = tripPackViewModel {
                AddTripBitSheet(viewModel: packViewModel, trip: currentTrip)
            }
        }
        .sheet(isPresented: $showAIQuickAddSheet) {
            if let packViewModel = tripPackViewModel {
                AIQuickAddSheet(viewModel: packViewModel, trip: currentTrip)
            }
        }
        .sheet(item: $selectedTripBit) { tripBit in
            if let packViewModel = tripPackViewModel {
                TripBitDetailView(viewModel: packViewModel, tripBit: tripBit, trip: currentTrip)
            }
        }
        .sheet(item: $tripBitToRate) { tripBit in
            RateShareSheet(tripBit: tripBit, trip: currentTrip)
        }
        .onChange(of: tripPackViewModel?.showAddTripBit) { _, newValue in
            if newValue == true {
                showAddTripBitSheet = true
                tripPackViewModel?.showAddTripBit = false
            }
        }
        .onChange(of: tripPackViewModel?.showAIQuickAdd) { _, newValue in
            if newValue == true {
                showAIQuickAddSheet = true
                tripPackViewModel?.showAIQuickAdd = false
            }
        }
        .onChange(of: tripPackViewModel?.selectedTripBit) { _, newValue in
            if let tripBit = newValue {
                selectedTripBit = tripBit
                tripPackViewModel?.clearSelection()
            }
        }
        .sheet(isPresented: $showExportShare) {
            if let url = calendarExportURL {
                ShareSheet(activityItems: [url])
            }
        }
        .sheet(isPresented: $showItineraryShare) {
            if let url = itinerarySummaryURL {
                ShareSheet(activityItems: [url])
            }
        }
        .sheet(isPresented: $showPublishSheet) {
            PublishItinerarySheet(
                trip: currentTrip,
                tripBits: tripPackViewModel?.tripBits ?? []
            )
        }
        .alert("Export Error", isPresented: $showExportError) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(exportError ?? "An unknown error occurred.")
        }
    }

    // MARK: - TripPack Section

    private func tripPackSection(_ packViewModel: TripPackViewModel) -> some View {
        TripPackSection(viewModel: packViewModel, trip: currentTrip) { tripBit in
            tripBitToRate = tripBit
        }
    }

    // MARK: - Documents Section

    private func documentsSection(_ packViewModel: TripPackViewModel) -> some View {
        let documentCount = packViewModel.tripBits.reduce(0) { $0 + ($1.attachments?.count ?? 0) }

        return NavigationLink {
            TripDocumentsView(viewModel: packViewModel, trip: currentTrip)
        } label: {
            HStack(spacing: 12) {
                Image(systemName: "paperclip")
                    .font(.title3)
                    .foregroundStyle(Color.seeyaPurple)
                    .frame(width: 32, height: 32)
                    .background(Color.seeyaPurple.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 8))

                VStack(alignment: .leading, spacing: 2) {
                    Text("Documents")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(.primary)

                    Text(documentCount == 0 ? "No documents yet" : "\(documentCount) document\(documentCount == 1 ? "" : "s")")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
            }
            .padding()
            .background(Color.seeyaCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
        }
        .buttonStyle(.plain)
    }

    // MARK: - Header Card

    private var headerCard: some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(alignment: .leading, spacing: 16) {
                // Destination
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        // Flag + All Destinations
                        HStack(spacing: 6) {
                            if let flag = currentTrip.locations?.first?.flagEmoji {
                                Text(flag)
                                    .font(.title2)
                            }
                            Text(currentTrip.allDestinations)
                        }
                            .font(.title2)
                            .fontWeight(.bold)

                        Text(currentTrip.dateRangeText)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }

                    Spacer()

                    if isOwner {
                        HStack(spacing: 6) {
                            StatusBadge(text: "Organizer", color: Color.seeyaPurple)
                            Image(systemName: "chevron.right")
                                .font(.caption)
                                .foregroundStyle(.tertiary)
                        }
                    }
                }

                // Description
                if let description = currentTrip.description, !description.isEmpty {
                    Text(description)
                        .font(.body)
                        .foregroundStyle(.secondary)
                }

                // Visibility
                if let visibility = currentTrip.visibility {
                    HStack(spacing: 6) {
                        Image(systemName: visibility.icon)
                        Text(visibility.displayName)
                    }
                    .font(.caption)
                    .foregroundStyle(.secondary)
                }
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            if let locations = currentTrip.locations, !locations.isEmpty {
                TripRouteMapView(locations: locations)
            }
        }
        .padding()
        .background(Color.seeyaCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
    }

    // MARK: - Participants Section

    private var participantsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(title: "Who's Going")

            VStack(spacing: 0) {
                // Owner
                if let owner = currentTrip.owner {
                    ParticipantRow(
                        profile: owner,
                        status: nil,
                        isOrganizer: true
                    )
                }

                // Participants
                if let participants = currentTrip.participants {
                    ForEach(participants) { participant in
                        if let user = participant.user {
                            Divider()
                            ParticipantRow(
                                profile: user,
                                status: participant.status,
                                isOrganizer: false
                            )
                        }
                    }
                }

                if currentTrip.participants?.isEmpty ?? true && currentTrip.owner == nil {
                    Text("No participants yet")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity)
                        .padding()
                }

                if isOwner {
                    Divider()
                    Button {
                        showInviteSheet = true
                    } label: {
                        Label("Invite", systemImage: "person.badge.plus")
                            .font(.subheadline)
                            .fontWeight(.semibold)
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .background(Color.seeyaPurple)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                    }
                    .padding(.horizontal, 12)
                    .padding(.bottom, 8)
                }
            }
            .background(Color.seeyaCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
        }
    }

    // MARK: - Recommendations Section

    private var recommendationsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header with destination and Add button
            HStack(spacing: 12) {
                HStack(spacing: 6) {
                    if let flag = currentTrip.locations?.first?.flagEmoji {
                        Text(flag)
                    }
                    Text(currentTrip.allDestinations)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }

                Spacer()

                Button {
                    showAddRecommendation = true
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "plus")
                        Text("Add")
                            .font(.caption)
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(Color.seeyaPurple)
                    .foregroundStyle(.white)
                    .clipShape(Capsule())
                }
            }

            // Category Tabs (no "All" — pick a category to narrow AI calls)
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    ForEach(RecommendationCategory.allCases, id: \.self) { category in
                        Button {
                            if selectedCategory != category {
                                selectedCategory = category
                                showFilters = false
                            }
                        } label: {
                            HStack(spacing: 4) {
                                Image(systemName: category.icon)
                                    .font(.caption)
                                Text(category.displayName)
                                    .font(.caption)
                            }
                            .foregroundStyle(selectedCategory == category ? .white : aiCategoryColor(category))
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(selectedCategory == category ? aiCategoryColor(category) : aiCategoryColor(category).opacity(0.12))
                            .clipShape(Capsule())
                        }
                    }
                }
            }

            // Filters toggle + Get AI button
            HStack(spacing: 8) {
                Button {
                    withAnimation(.spring(response: 0.3)) { showFilters.toggle() }
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "slider.horizontal.3")
                            .font(.caption)
                        Text("Filters")
                            .font(.caption)
                        if hasActiveFilters {
                            Circle().fill(Color.seeyaPurple).frame(width: 5, height: 5)
                        }
                    }
                    .foregroundStyle(showFilters || hasActiveFilters ? Color.seeyaPurple : .secondary)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(showFilters || hasActiveFilters ? Color.seeyaPurple.opacity(0.1) : Color(.systemGray6))
                    .clipShape(Capsule())
                }

                if hasActiveFilters {
                    Button {
                        clearCurrentFilters()
                        aiCache[selectedCategory] = nil
                    } label: {
                        HStack(spacing: 2) {
                            Image(systemName: "xmark").font(.caption2)
                            Text("Clear").font(.caption)
                        }
                        .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                Button {
                    generateAIForSelectedCategory()
                } label: {
                    HStack(spacing: 4) {
                        if isLoadingAI {
                            ProgressView().scaleEffect(0.7)
                        } else {
                            Image(systemName: "sparkles")
                        }
                        Text(aiCache[selectedCategory] != nil ? "Refresh" : "Get AI Suggestions")
                            .font(.caption)
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(Color.seeyaPurple.opacity(0.1))
                    .foregroundStyle(Color.seeyaPurple)
                    .clipShape(Capsule())
                }
                .disabled(isLoadingAI)
            }

            // Filter panel
            if showFilters {
                aiFilterPanel
            }

            // AI results or loading
            if isLoadingAI {
                HStack {
                    Spacer()
                    VStack(spacing: 8) {
                        ProgressView()
                        Text("Finding \(selectedCategory.displayName.lowercased()) in \(currentTrip.destination)...")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .padding()
                    Spacer()
                }
                .background(Color.seeyaCardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            } else if let error = aiErrorMessage {
                HStack(spacing: 8) {
                    Image(systemName: "exclamationmark.triangle")
                        .foregroundStyle(.orange)
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                .padding()
                .background(Color.seeyaCardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            } else if let recs = aiCache[selectedCategory], !recs.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Image(systemName: "sparkles")
                            .foregroundStyle(.orange)
                        Text("AI \(selectedCategory.displayName) in \(currentTrip.destination)")
                            .font(.subheadline)
                            .fontWeight(.medium)
                        Spacer()
                        Button {
                            withAnimation { aiCache[selectedCategory] = nil }
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundStyle(.secondary)
                        }
                    }

                    ForEach(recs) { aiRec in
                        AIRecommendationRow(
                            recommendation: aiRec,
                            isSaved: savedAIRecommendationIds.contains(aiRec.id),
                            isSaving: savingAIIds.contains(aiRec.id),
                            onSaveToTrip: { saveAIRecommendationToTrip(aiRec) }
                        )
                    }
                }
                .padding()
                .background(Color.orange.opacity(0.05))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }

            // Saved Recommendations List (filtered to selected category)
            let recommendations = filteredRecommendations

            if recommendations.isEmpty && aiCache[selectedCategory] == nil && !isLoadingAI {
                EmptyStateView(
                    icon: selectedCategory.icon,
                    title: "No \(selectedCategory.displayName) Yet",
                    message: "Get AI suggestions or add your own!",
                    buttonTitle: "Get AI Suggestions",
                    buttonAction: { generateAIForSelectedCategory() }
                )
                .seeyaCard()
            } else if !recommendations.isEmpty {
                VStack(spacing: 0) {
                    ForEach(Array(recommendations.enumerated()), id: \.element.id) { index, recommendation in
                        if index > 0 { Divider() }
                        RecommendationRow(recommendation: recommendation)
                    }
                }
                .background(Color.seeyaCardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
            }
        }
    }

    // MARK: - AI Filter Panel

    private var aiFilterPanel: some View {
        VStack(spacing: 8) {
            Group {
                switch selectedCategory {
                case .restaurant:
                    VStack(spacing: 8) {
                        HStack {
                            aiFilterPicker(title: "Cuisine",
                                selection: Binding(get: { restaurantFilters.cuisine ?? "" },
                                                   set: { restaurantFilters.cuisine = $0.isEmpty ? nil : $0 }),
                                options: ["", "Italian", "Japanese", "Mexican", "Thai", "Indian", "French", "Chinese", "Mediterranean", "American", "Korean", "Vietnamese", "Local"])
                            aiFilterPicker(title: "Meal",
                                selection: Binding(get: { restaurantFilters.mealType ?? "" },
                                                   set: { restaurantFilters.mealType = $0.isEmpty ? nil : $0 }),
                                options: ["", "breakfast", "brunch", "lunch", "dinner", "late-night"])
                        }
                        HStack {
                            aiFilterPicker(title: "Price",
                                selection: Binding(get: { restaurantFilters.priceRange ?? "" },
                                                   set: { restaurantFilters.priceRange = $0.isEmpty ? nil : $0 }),
                                options: ["", "$", "$$", "$$$", "$$$$"])
                            aiFilterPicker(title: "Vibe",
                                selection: Binding(get: { restaurantFilters.vibe ?? "" },
                                                   set: { restaurantFilters.vibe = $0.isEmpty ? nil : $0 }),
                                options: ["", "romantic", "casual", "family", "trendy", "traditional"])
                        }
                    }
                case .activity:
                    VStack(spacing: 8) {
                        HStack {
                            aiFilterPicker(title: "Type",
                                selection: Binding(get: { activityFilters.type ?? "" },
                                                   set: { activityFilters.type = $0.isEmpty ? nil : $0 }),
                                options: ["", "outdoor", "cultural", "nightlife", "tours", "shopping", "wellness"])
                            aiFilterPicker(title: "Duration",
                                selection: Binding(get: { activityFilters.duration ?? "" },
                                                   set: { activityFilters.duration = $0.isEmpty ? nil : $0 }),
                                options: ["", "quick", "half-day", "full-day"])
                        }
                        Toggle("Kid-friendly", isOn: Binding(
                            get: { activityFilters.kidFriendly ?? false },
                            set: { activityFilters.kidFriendly = $0 ? true : nil }
                        ))
                        .font(.caption)
                    }
                case .stay:
                    HStack {
                        aiFilterPicker(title: "Type",
                            selection: Binding(get: { stayFilters.propertyType ?? "" },
                                               set: { stayFilters.propertyType = $0.isEmpty ? nil : $0 }),
                            options: ["", "hotel", "boutique", "airbnb", "hostel", "resort"])
                        aiFilterPicker(title: "Price",
                            selection: Binding(get: { stayFilters.priceRange ?? "" },
                                               set: { stayFilters.priceRange = $0.isEmpty ? nil : $0 }),
                            options: ["", "$", "$$", "$$$", "$$$$"])
                    }
                case .tip:
                    aiFilterPicker(title: "Topic",
                        selection: Binding(get: { tipFilters.topic ?? "" },
                                           set: { tipFilters.topic = $0.isEmpty ? nil : $0 }),
                        options: ["", "transport", "safety", "culture", "money", "packing", "local-customs", "food", "language"])
                }
            }

            HStack {
                Spacer()
                Button("Apply & Refresh") {
                    showFilters = false
                    aiCache[selectedCategory] = nil
                    generateAIForSelectedCategory()
                }
                .font(.caption)
                .fontWeight(.medium)
                .foregroundStyle(.white)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(Color.seeyaPurple)
                .clipShape(Capsule())
            }
        }
        .padding(12)
        .background(Color.seeyaCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
    }

    private func aiFilterPicker(title: String, selection: Binding<String>, options: [String]) -> some View {
        VStack(alignment: .leading, spacing: 2) {
            Text(title)
                .font(.caption2)
                .foregroundStyle(.secondary)
            Picker(title, selection: selection) {
                ForEach(options, id: \.self) { opt in
                    Text(opt.isEmpty ? "Any" : opt.capitalized).tag(opt)
                }
            }
            .pickerStyle(.menu)
            .tint(Color.seeyaPurple)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var hasActiveFilters: Bool {
        switch selectedCategory {
        case .restaurant: return !restaurantFilters.isEmpty
        case .activity: return !activityFilters.isEmpty
        case .stay: return !stayFilters.isEmpty
        case .tip: return !tipFilters.isEmpty
        }
    }

    private func clearCurrentFilters() {
        switch selectedCategory {
        case .restaurant: restaurantFilters = AIService.RestaurantFilters()
        case .activity: activityFilters = AIService.ActivityFilters()
        case .stay: stayFilters = AIService.StayFilters()
        case .tip: tipFilters = AIService.TipFilters()
        }
    }

    private func aiCategoryColor(_ category: RecommendationCategory) -> Color {
        switch category {
        case .restaurant: return .orange
        case .activity: return .green
        case .stay: return .blue
        case .tip: return Color(red: 0.85, green: 0.65, blue: 0.0)
        }
    }

    private var filteredRecommendations: [TripRecommendation] {
        guard let recommendations = currentTrip.recommendations else { return [] }
        return recommendations.filter { $0.category == selectedCategory }
    }

    private func generateAIForSelectedCategory() {
        guard !isLoadingAI else { return }
        isLoadingAI = true
        aiErrorMessage = nil

        Task {
            do {
                let filters = currentAIFilters()
                let response = try await AIService.shared.generateCategoryRecommendations(
                    destination: currentTrip.destination,
                    category: aiServiceCategory(from: selectedCategory),
                    count: 5,
                    filters: filters,
                    tripDates: (currentTrip.startDate, currentTrip.endDate)
                )
                withAnimation {
                    aiCache[selectedCategory] = response.recommendations
                }
            } catch {
                aiErrorMessage = error.localizedDescription
                print("❌ Error fetching AI recommendations: \(error)")
            }
            isLoadingAI = false
        }
    }

    private func currentAIFilters() -> AIService.CategoryFilters? {
        switch selectedCategory {
        case .restaurant: return restaurantFilters.isEmpty ? nil : .restaurant(restaurantFilters)
        case .activity: return activityFilters.isEmpty ? nil : .activity(activityFilters)
        case .stay: return stayFilters.isEmpty ? nil : .stay(stayFilters)
        case .tip: return tipFilters.isEmpty ? nil : .tip(tipFilters)
        }
    }

    private func aiServiceCategory(from category: RecommendationCategory) -> AIService.RecommendationCategory {
        switch category {
        case .restaurant: return .restaurant
        case .activity: return .activity
        case .stay: return .stay
        case .tip: return .tip
        }
    }

    private func saveAIRecommendationToTrip(_ aiRec: AIService.AIRecommendation) {
        guard !savingAIIds.contains(aiRec.id) else { return }
        savingAIIds.insert(aiRec.id)

        Task {
            let category: RecommendationCategory = {
                switch aiRec.category {
                case "restaurant": return .restaurant
                case "activity": return .activity
                case "stay": return .stay
                case "tip": return .tip
                default: return .tip
                }
            }()

            let description = aiRec.tips != nil
                ? "\(aiRec.description)\n\nTip: \(aiRec.tips!)"
                : aiRec.description

            let success = await viewModel.addRecommendation(
                tripId: currentTrip.id,
                title: aiRec.title,
                description: description,
                category: category
            )

            savingAIIds.remove(aiRec.id)
            if success {
                savedAIRecommendationIds.insert(aiRec.id)
            }
        }
    }

    // MARK: - Actions Section

    private var actionsSection: some View {
        VStack(spacing: 12) {
            Button {
                showEditSheet = true
            } label: {
                Label("Edit Trip", systemImage: "pencil")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(SeeyaSecondaryButtonStyle())

            Button(role: .destructive) {
                showDeleteConfirmation = true
            } label: {
                Label("Delete Trip", systemImage: "trash")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
            .tint(.red)
        }
        .padding(.top)
    }

    private func deleteTrip() {
        Task {
            let success = await viewModel.deleteTrip(id: currentTrip.id)
            if success {
                dismiss()
            }
        }
    }

    private func leaveTrip() {
        Task {
            let success = await viewModel.leaveTrip(id: currentTrip.id)
            if success {
                dismiss()
            }
        }
    }

    // MARK: - Calendar Export

    private func exportCalendar() {
        Task {
            do {
                let tripBits = tripPackViewModel?.tripBits ?? []
                let url = try await CalendarExportService.shared.exportTripCalendar(
                    trip: currentTrip,
                    tripBits: tripBits
                )
                calendarExportURL = url
                showExportShare = true
            } catch {
                exportError = "Failed to generate calendar file: \(error.localizedDescription)"
                showExportError = true
            }
        }
    }

    private func exportItinerarySummary() {
        Task {
            do {
                let tripBits = tripPackViewModel?.tripBits ?? []
                let url = try await CalendarExportService.shared.exportItinerarySummary(
                    trip: currentTrip,
                    tripBits: tripBits
                )
                itinerarySummaryURL = url
                showItineraryShare = true
            } catch {
                exportError = "Failed to generate itinerary: \(error.localizedDescription)"
                showExportError = true
            }
        }
    }
}

// MARK: - Participant Row

struct ParticipantRow: View {
    let profile: Profile
    let status: ParticipationStatus?
    let isOrganizer: Bool

    var body: some View {
        HStack(spacing: 12) {
            AvatarView(name: profile.fullName, avatarUrl: profile.avatarUrl, size: 40)

            VStack(alignment: .leading, spacing: 2) {
                Text(profile.fullName)
                    .font(.subheadline)
                    .fontWeight(.medium)

                if let username = profile.username {
                    Text("@\(username)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()

            if isOrganizer {
                StatusBadge(text: "Organizer", color: Color.seeyaPurple)
            } else if let status = status {
                StatusBadge(
                    text: status.displayName,
                    color: statusColor(for: status)
                )
            }
        }
        .padding()
    }

    private func statusColor(for status: ParticipationStatus) -> Color {
        switch status {
        case .confirmed: return .green
        case .invited: return .orange
        case .declined: return .red
        }
    }
}

// MARK: - Recommendation Row

struct RecommendationRow: View {
    let recommendation: TripRecommendation

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: recommendation.category.icon)
                .font(.title3)
                .foregroundStyle(Color.seeyaPurple)
                .frame(width: 32, height: 32)
                .background(Color.seeyaPurple.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 8))

            VStack(alignment: .leading, spacing: 4) {
                Text(recommendation.title)
                    .font(.subheadline)
                    .fontWeight(.medium)

                if let description = recommendation.description, !description.isEmpty {
                    Text(description)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }

                if let user = recommendation.user {
                    Text("Added by \(user.fullName)")
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }
            }

            Spacer()
        }
        .padding()
    }
}

// MARK: - AI Recommendation Row

struct AIRecommendationRow: View {
    let recommendation: AIService.AIRecommendation
    let isSaved: Bool
    var isSaving: Bool = false
    let onSaveToTrip: () -> Void

    private var categoryColor: Color {
        switch recommendation.category {
        case "restaurant": return .orange
        case "activity": return .green
        case "stay": return .blue
        case "tip": return Color(red: 0.85, green: 0.65, blue: 0.0)
        default: return .gray
        }
    }

    private var categoryIcon: String {
        switch recommendation.category {
        case "restaurant": return "fork.knife"
        case "activity": return "figure.hiking"
        case "stay": return "bed.double"
        case "tip": return "lightbulb"
        default: return "star"
        }
    }

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            // AI indicator (yellow circle)
            Circle()
                .fill(Color.orange)
                .frame(width: 8, height: 8)
                .padding(.top, 6)

            VStack(alignment: .leading, spacing: 6) {
                // Title row
                HStack(alignment: .top) {
                    Text(recommendation.title)
                        .font(.subheadline)
                        .fontWeight(.semibold)

                    Spacer()

                    // Category badge
                    HStack(spacing: 4) {
                        Image(systemName: categoryIcon)
                            .font(.caption2)
                        Text(recommendation.category.capitalized)
                            .font(.caption2)
                    }
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(categoryColor.opacity(0.15))
                    .foregroundStyle(categoryColor)
                    .clipShape(Capsule())

                    // Cost indicator
                    if let cost = recommendation.estimatedCost {
                        Text(cost)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 4)
                            .background(Color(.systemGray5))
                            .clipShape(Capsule())
                    }
                }

                // Description
                Text(recommendation.description)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)

                // Tip if available
                if let tips = recommendation.tips, !tips.isEmpty {
                    HStack(alignment: .top, spacing: 4) {
                        Image(systemName: "lightbulb.fill")
                            .font(.caption2)
                            .foregroundStyle(.orange)
                        Text(tips)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }
                }

                // Footer row
                HStack {
                    // AI Suggestion badge
                    HStack(spacing: 4) {
                        Image(systemName: "sparkles")
                            .font(.caption2)
                        Text("AI Suggestion")
                            .font(.caption2)
                    }
                    .foregroundStyle(.orange)

                    Spacer()

                    // Save to Trip button
                    Button {
                        onSaveToTrip()
                    } label: {
                        HStack(spacing: 4) {
                            if isSaving {
                                ProgressView().scaleEffect(0.6).tint(Color.seeyaPurple)
                            } else {
                                Image(systemName: isSaved ? "checkmark" : "plus")
                                    .font(.caption2)
                            }
                            Text(isSaving ? "Saving..." : isSaved ? "Saved" : "Save to Trip")
                                .font(.caption2)
                        }
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(isSaved ? Color.green.opacity(0.15) : Color.seeyaPurple.opacity(0.15))
                        .foregroundStyle(isSaved ? .green : Color.seeyaPurple)
                        .clipShape(Capsule())
                    }
                    .disabled(isSaved || isSaving)
                }
            }
        }
        .padding()
        .background(Color.seeyaCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}

#Preview {
    NavigationStack {
        TripDetailView(
            viewModel: TripsViewModel(),
            trip: Trip(
                id: UUID(),
                userId: UUID(),
                name: "Summer Vacation",
                description: "A wonderful trip to explore the city",
                startDate: Date(),
                endDate: Date().addingTimeInterval(7 * 24 * 60 * 60),
                isFlexible: false,
                visibility: .fullDetails,
                isPast: false,
                createdAt: Date(),
                updatedAt: Date(),
                locations: nil,
                participants: nil,
                owner: nil,
                recommendations: nil,
                tripTypes: nil
            )
        )
    }
}
