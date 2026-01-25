import SwiftUI

struct TravelerAssignmentView: View {
    let trip: Trip
    @Binding var selectedTravelerIds: Set<UUID>

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Select Travelers")
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(.secondary)

            VStack(spacing: 0) {
                // Trip owner
                if let owner = trip.owner {
                    TravelerSelectionRow(
                        profile: owner,
                        isSelected: selectedTravelerIds.contains(owner.id),
                        isOrganizer: true
                    ) {
                        toggleSelection(owner.id)
                    }
                }

                // Confirmed participants
                ForEach(trip.confirmedParticipants) { participant in
                    if let user = participant.user {
                        Divider()
                        TravelerSelectionRow(
                            profile: user,
                            isSelected: selectedTravelerIds.contains(user.id),
                            isOrganizer: false
                        ) {
                            toggleSelection(user.id)
                        }
                    }
                }
            }
            .background(Color.seeyaCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .shadow(color: .black.opacity(0.05), radius: 5, y: 2)

            // Selection summary
            if !selectedTravelerIds.isEmpty {
                Text("\(selectedTravelerIds.count) traveler\(selectedTravelerIds.count == 1 ? "" : "s") selected")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private func toggleSelection(_ id: UUID) {
        if selectedTravelerIds.contains(id) {
            selectedTravelerIds.remove(id)
        } else {
            selectedTravelerIds.insert(id)
        }
    }
}

// MARK: - Traveler Selection Row

struct TravelerSelectionRow: View {
    let profile: Profile
    let isSelected: Bool
    let isOrganizer: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 12) {
                // Checkbox
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundStyle(isSelected ? Color.seeyaPurple : Color(.systemGray3))

                // Avatar
                AvatarView(name: profile.fullName, avatarUrl: profile.avatarUrl, size: 36)

                // Name
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Text(profile.fullName)
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .foregroundStyle(.primary)

                        if isOrganizer {
                            Text("Organizer")
                                .font(.caption2)
                                .fontWeight(.medium)
                                .foregroundStyle(Color.seeyaPurple)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.seeyaPurple.opacity(0.15))
                                .clipShape(Capsule())
                        }
                    }

                    if let username = profile.username {
                        Text("@\(username)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()
            }
            .padding()
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    TravelerAssignmentView(
        trip: Trip(
            id: UUID(),
            userId: UUID(),
            name: "Sample Trip",
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
        selectedTravelerIds: .constant([])
    )
    .padding()
    .background(Color.seeyaBackground)
}
