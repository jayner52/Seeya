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
    @State private var selectedCategory: RecommendationCategory?

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
                headerCard

                // TripPack Section
                if let packViewModel = tripPackViewModel {
                    tripPackSection(packViewModel)

                    // Documents Hub
                    documentsSection(packViewModel)
                }

                // Participants Section
                participantsSection

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
            if isOwner {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
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
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
        }
        .sheet(isPresented: $showEditSheet) {
            EditTripView(viewModel: viewModel, trip: currentTrip)
        }
        .sheet(isPresented: $showInviteSheet) {
            InviteFriendsSheet(viewModel: viewModel, tripId: currentTrip.id)
        }
        .sheet(isPresented: $showAddRecommendation) {
            AddRecommendationSheet(viewModel: viewModel, tripId: currentTrip.id)
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
    }

    // MARK: - TripPack Section

    private func tripPackSection(_ packViewModel: TripPackViewModel) -> some View {
        TripPackSection(viewModel: packViewModel, trip: currentTrip)
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
        VStack(alignment: .leading, spacing: 16) {
            // Destination
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    // Flag + Destination
                    HStack(spacing: 6) {
                        if let flag = currentTrip.locations?.first?.flagEmoji {
                            Text(flag)
                                .font(.title2)
                        }
                        Text(currentTrip.destination)
                    }
                        .font(.title2)
                        .fontWeight(.bold)

                    Text(currentTrip.dateRangeText)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                if isOwner {
                    StatusBadge(text: "Organizer", color: Color.seeyaPurple)
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
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.seeyaCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
    }

    // MARK: - Participants Section

    private var participantsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(title: "Who's Going", action: isOwner ? { showInviteSheet = true } : nil)

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
            }
            .background(Color.seeyaCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
        }
    }

    // MARK: - Recommendations Section

    private var recommendationsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(title: "Recommendations", action: { showAddRecommendation = true })

            // Category Filter
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    CategoryPill(title: "All", isSelected: selectedCategory == nil) {
                        selectedCategory = nil
                    }

                    ForEach(RecommendationCategory.allCases, id: \.self) { category in
                        CategoryPill(
                            title: category.displayName,
                            isSelected: selectedCategory == category
                        ) {
                            selectedCategory = category
                        }
                    }
                }
            }

            // Recommendations List
            let recommendations = filteredRecommendations

            if recommendations.isEmpty {
                EmptyStateView(
                    icon: "lightbulb",
                    title: "No Recommendations",
                    message: "Add the first recommendation!",
                    buttonTitle: "Add Recommendation",
                    buttonAction: { showAddRecommendation = true }
                )
                .seeyaCard()
            } else {
                VStack(spacing: 0) {
                    ForEach(Array(recommendations.enumerated()), id: \.element.id) { index, recommendation in
                        if index > 0 {
                            Divider()
                        }
                        RecommendationRow(recommendation: recommendation)
                    }
                }
                .background(Color.seeyaCardBackground)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
            }
        }
    }

    private var filteredRecommendations: [TripRecommendation] {
        guard let recommendations = currentTrip.recommendations else { return [] }

        if let category = selectedCategory {
            return recommendations.filter { $0.category == category }
        }
        return recommendations
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
