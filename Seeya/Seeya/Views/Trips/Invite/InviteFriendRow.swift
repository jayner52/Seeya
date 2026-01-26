import SwiftUI

struct InviteFriendRow: View {
    @Bindable var viewModel: InviteViewModel
    let friend: Profile
    let trip: Trip
    let isAlreadyInvited: Bool

    private var isSelected: Bool {
        viewModel.isFriendSelected(friend.id)
    }

    private var isExpanded: Bool {
        viewModel.isFriendExpanded(friend.id)
    }

    var body: some View {
        VStack(spacing: 0) {
            // Main Row
            mainRow

            // Expanded Content
            if isExpanded && isSelected {
                expandedContent
            }
        }
        .animation(.easeInOut(duration: 0.2), value: isExpanded)
    }

    // MARK: - Main Row

    private var mainRow: some View {
        Button {
            if !isAlreadyInvited {
                viewModel.toggleFriend(friend.id)
            }
        } label: {
            HStack(spacing: 12) {
                // Avatar
                AvatarView(name: friend.fullName, avatarUrl: friend.avatarUrl, size: 44)

                // Name and Username
                VStack(alignment: .leading, spacing: 2) {
                    Text(friend.fullName)
                        .font(SeeyaTypography.bodyMedium)
                        .fontWeight(.medium)
                        .foregroundStyle(.primary)

                    if let username = friend.username {
                        Text("@\(username)")
                            .font(SeeyaTypography.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                // Status/Actions
                if isAlreadyInvited {
                    Text("Invited")
                        .font(SeeyaTypography.caption)
                        .foregroundStyle(.secondary)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color(.systemGray6))
                        .clipShape(Capsule())
                } else {
                    HStack(spacing: 8) {
                        // Expand button (only when selected)
                        if isSelected && !viewModel.tripLocations.isEmpty {
                            Button {
                                viewModel.toggleFriendExpanded(friend.id)
                            } label: {
                                HStack(spacing: 4) {
                                    Text(viewModel.locationSummaryForFriend(friend.id))
                                        .font(SeeyaTypography.caption)
                                        .foregroundStyle(.secondary)

                                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                                        .font(.caption2)
                                        .foregroundStyle(.tertiary)
                                }
                            }
                            .buttonStyle(.plain)
                        }

                        // Selection checkbox
                        checkboxView
                    }
                }
            }
            .contentShape(Rectangle())
            .padding()
        }
        .buttonStyle(.plain)
        .disabled(isAlreadyInvited)
        .opacity(isAlreadyInvited ? 0.6 : 1.0)
    }

    // MARK: - Checkbox View

    private var checkboxView: some View {
        Group {
            if isSelected {
                Image(systemName: "checkmark.circle.fill")
                    .font(.title2)
                    .foregroundStyle(Color(red: 0.95, green: 0.85, blue: 0.4)) // Yellow/gold accent
            } else {
                Image(systemName: "circle")
                    .font(.title2)
                    .foregroundStyle(.tertiary)
            }
        }
    }

    // MARK: - Expanded Content

    private var expandedContent: some View {
        VStack(spacing: 0) {
            // Deselect all link
            HStack {
                Spacer()
                Button {
                    deselectAllLocations()
                } label: {
                    Text("Deselect all")
                        .font(SeeyaTypography.caption)
                        .foregroundStyle(Color.seeyaPurple)
                }
            }
            .padding(.horizontal)
            .padding(.bottom, 8)

            // Location rows
            ForEach(viewModel.tripLocations) { location in
                InviteLocationRow(
                    viewModel: viewModel,
                    location: location,
                    friendId: friend.id
                )
            }
        }
        .padding(.leading, 16)
        .background(Color(.systemGray6).opacity(0.5))
    }

    // MARK: - Actions

    private func deselectAllLocations() {
        for location in viewModel.tripLocations {
            if viewModel.isLocationSelectedForFriend(location.id, friendId: friend.id) {
                viewModel.toggleLocationForFriend(location.id, friendId: friend.id)
            }
        }
    }
}

#Preview {
    VStack {
        InviteFriendRow(
            viewModel: InviteViewModel(),
            friend: Profile(
                id: UUID(),
                username: "johndoe",
                fullName: "John Doe",
                avatarUrl: nil,
                bio: nil,
                homeCity: nil,
                homeCityPlaceId: nil,
                onboardingCompleted: true,
                createdAt: Date(),
                updatedAt: Date()
            ),
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
            isAlreadyInvited: false
        )
    }
    .background(Color.seeyaBackground)
}
