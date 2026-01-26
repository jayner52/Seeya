import SwiftUI

struct InviteFriendsTab: View {
    @Bindable var viewModel: InviteViewModel
    let trip: Trip
    var onDismiss: (() -> Void)?

    @State private var searchText = ""

    private var filteredFriends: [Profile] {
        if searchText.isEmpty {
            return viewModel.friends
        }
        return viewModel.friends.filter {
            $0.fullName.localizedCaseInsensitiveContains(searchText) ||
            ($0.username?.localizedCaseInsensitiveContains(searchText) ?? false)
        }
    }

    private var alreadyInvitedIds: Set<UUID> {
        Set(trip.participants?.map { $0.userId } ?? [])
    }

    var body: some View {
        VStack(spacing: 0) {
            if viewModel.friends.isEmpty {
                emptyState
            } else {
                friendsList
            }

            // Bottom Action Bar
            if !viewModel.selectedFriendIds.isEmpty {
                inviteButton
            }
        }
        .searchable(text: $searchText, prompt: "Search friends")
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "person.2.slash")
                .font(.system(size: 48))
                .foregroundStyle(.tertiary)

            Text("No Friends Yet")
                .font(.headline)

            Text("Add friends to invite them to your trips!")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Friends List

    private var friendsList: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                ForEach(filteredFriends) { friend in
                    let isAlreadyInvited = alreadyInvitedIds.contains(friend.id)

                    InviteFriendRow(
                        viewModel: viewModel,
                        friend: friend,
                        trip: trip,
                        isAlreadyInvited: isAlreadyInvited
                    )

                    if friend.id != filteredFriends.last?.id {
                        Divider()
                            .padding(.leading, 72)
                    }
                }
            }
            .background(Color.seeyaCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .padding()
        }
    }

    // MARK: - Invite Button

    private var inviteButton: some View {
        VStack(spacing: 0) {
            Divider()

            Button {
                sendInvites()
            } label: {
                HStack {
                    if viewModel.isSendingInvites {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Text(viewModel.inviteSummaryText)
                    }
                }
                .font(.headline)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(Color.seeyaAccent)
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }
            .disabled(viewModel.isSendingInvites)
            .padding()
        }
        .background(Color.seeyaCardBackground)
    }

    // MARK: - Actions

    private func sendInvites() {
        Task {
            let success = await viewModel.sendInvites(tripId: trip.id)
            if success {
                onDismiss?()
            }
        }
    }
}

#Preview {
    InviteFriendsTab(
        viewModel: InviteViewModel(),
        trip: Trip(
            id: UUID(),
            userId: UUID(),
            name: "Mexico Adventure",
            description: nil,
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
