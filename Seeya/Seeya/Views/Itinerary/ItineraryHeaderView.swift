import SwiftUI

struct ItineraryHeaderView: View {
    @Binding var viewMode: ItineraryViewMode
    @Binding var selectedTravelerOption: TravelerFilterOption
    let trip: Trip
    let currentUserId: UUID?

    @State private var showExportOptions = false
    @State private var showComingSoonAlert = false
    @State private var comingSoonFeature = ""

    var body: some View {
        VStack(spacing: 12) {
            // View Mode Toggle & Actions Row
            HStack {
                // View Mode Picker
                HStack(spacing: 0) {
                    ForEach(ItineraryViewMode.allCases, id: \.self) { mode in
                        Button {
                            withAnimation(.easeInOut(duration: 0.2)) {
                                viewMode = mode
                            }
                        } label: {
                            HStack(spacing: 4) {
                                Image(systemName: mode.icon)
                                    .font(.caption)
                                Text(mode.rawValue)
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                            }
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(viewMode == mode ? Color.seeyaAccent : Color.clear)
                            .foregroundStyle(viewMode == mode ? .white : .primary)
                        }
                    }
                }
                .background(Color(.systemGray6))
                .clipShape(RoundedRectangle(cornerRadius: 8))

                Spacer()

                // Action Buttons
                HStack(spacing: 12) {
                    // Export Button
                    Button {
                        showExportOptions = true
                    } label: {
                        Image(systemName: "square.and.arrow.up")
                            .font(.body)
                            .foregroundStyle(Color.seeyaPurple)
                    }

                    // Print Button
                    Button {
                        comingSoonFeature = "Print Itinerary"
                        showComingSoonAlert = true
                    } label: {
                        Image(systemName: "printer")
                            .font(.body)
                            .foregroundStyle(Color.seeyaPurple)
                    }
                }
            }

            // Traveler Filter ("Show for:")
            HStack(spacing: 8) {
                Text("Show for:")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        // All Chip
                        TravelerFilterChip(
                            title: "All",
                            isSelected: selectedTravelerOption == .all
                        ) {
                            selectedTravelerOption = .all
                        }

                        // Me Chip (if current user is part of trip)
                        if currentUserId != nil {
                            TravelerFilterChip(
                                title: "Me",
                                isSelected: selectedTravelerOption == .me
                            ) {
                                selectedTravelerOption = .me
                            }
                        }

                        // Individual Traveler Chips
                        if let owner = trip.owner {
                            TravelerFilterChip(
                                profile: owner,
                                isSelected: selectedTravelerOption == .specific(owner.id),
                                isOwner: owner.id == currentUserId
                            ) {
                                selectedTravelerOption = .specific(owner.id)
                            }
                        }

                        if let participants = trip.participants {
                            ForEach(participants.filter { $0.status == .confirmed }) { participant in
                                if let user = participant.user {
                                    TravelerFilterChip(
                                        profile: user,
                                        isSelected: selectedTravelerOption == .specific(user.id),
                                        isOwner: false
                                    ) {
                                        selectedTravelerOption = .specific(user.id)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        .padding()
        .background(Color.seeyaCardBackground)
        .confirmationDialog("Export Itinerary", isPresented: $showExportOptions) {
            Button("Export to Apple Calendar") {
                comingSoonFeature = "Export to Apple Calendar"
                showComingSoonAlert = true
            }
            Button("Export to Google Calendar") {
                comingSoonFeature = "Export to Google Calendar"
                showComingSoonAlert = true
            }
            Button("Cancel", role: .cancel) {}
        }
        .alert("Coming Soon", isPresented: $showComingSoonAlert) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("\(comingSoonFeature) will be available in a future update.")
        }
    }
}

// MARK: - Traveler Filter Chip

struct TravelerFilterChip: View {
    var title: String? = nil
    var profile: Profile? = nil
    let isSelected: Bool
    var isOwner: Bool = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                if let profile = profile {
                    AvatarView(name: profile.fullName, avatarUrl: profile.avatarUrl, size: 24)
                    Text(profile.fullName.components(separatedBy: " ").first ?? profile.fullName)
                        .font(.subheadline)
                        .fontWeight(isSelected ? .semibold : .regular)
                } else if let title = title {
                    Text(title)
                        .font(.subheadline)
                        .fontWeight(isSelected ? .semibold : .regular)
                }
            }
            .foregroundStyle(isSelected ? .white : .primary)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(isSelected ? Color.seeyaAccent : Color(.systemGray6))
            .clipShape(Capsule())
        }
    }
}

#Preview {
    VStack {
        ItineraryHeaderView(
            viewMode: .constant(.calendar),
            selectedTravelerOption: .constant(.all),
            trip: Trip(
                id: UUID(),
                userId: UUID(),
                name: "Test Trip",
                description: nil,
                startDate: Date(),
                endDate: Date(),
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
            ),
            currentUserId: UUID()
        )
        Spacer()
    }
    .background(Color.seeyaBackground)
}
