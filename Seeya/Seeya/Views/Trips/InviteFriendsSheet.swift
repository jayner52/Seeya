import SwiftUI

struct InviteFriendsSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var viewModel: TripsViewModel
    let tripId: UUID

    @State private var searchText = ""
    @State private var selectedFriends: Set<UUID> = []
    @State private var isInviting = false

    private var filteredFriends: [Profile] {
        if searchText.isEmpty {
            return viewModel.friends
        }
        return viewModel.friends.filter {
            $0.fullName.localizedCaseInsensitiveContains(searchText) ||
            ($0.username?.localizedCaseInsensitiveContains(searchText) ?? false)
        }
    }

    private var currentTrip: Trip? {
        viewModel.trips.first { $0.id == tripId }
    }

    private var alreadyInvitedIds: Set<UUID> {
        Set(currentTrip?.participants?.map { $0.userId } ?? [])
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                if viewModel.friends.isEmpty {
                    emptyState
                } else {
                    friendsList
                }
            }
            .navigationTitle("Invite Friends")
            .navigationBarTitleDisplayMode(.inline)
            .searchable(text: $searchText, prompt: "Search friends")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("Send Invites") {
                        sendInvites()
                    }
                    .fontWeight(.semibold)
                    .disabled(selectedFriends.isEmpty || isInviting)
                }
            }
            .task {
                await viewModel.fetchFriends()
            }
        }
    }

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

    private var friendsList: some View {
        List {
            ForEach(filteredFriends) { friend in
                FriendRow(
                    friend: friend,
                    isSelected: selectedFriends.contains(friend.id),
                    isAlreadyInvited: alreadyInvitedIds.contains(friend.id)
                ) {
                    toggleSelection(friend.id)
                }
            }
        }
        .listStyle(.plain)
    }

    private func toggleSelection(_ id: UUID) {
        guard !alreadyInvitedIds.contains(id) else { return }

        if selectedFriends.contains(id) {
            selectedFriends.remove(id)
        } else {
            selectedFriends.insert(id)
        }
    }

    private func sendInvites() {
        isInviting = true

        Task {
            for friendId in selectedFriends {
                _ = await viewModel.inviteParticipant(tripId: tripId, userId: friendId)
            }

            isInviting = false
            dismiss()
        }
    }
}

struct FriendRow: View {
    let friend: Profile
    let isSelected: Bool
    let isAlreadyInvited: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 12) {
                AvatarView(name: friend.fullName, avatarUrl: friend.avatarUrl, size: 44)

                VStack(alignment: .leading, spacing: 2) {
                    Text(friend.fullName)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(.primary)

                    if let username = friend.username {
                        Text("@\(username)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                if isAlreadyInvited {
                    Text("Invited")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color(.systemGray6))
                        .clipShape(Capsule())
                } else if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.title2)
                        .foregroundStyle(Color.seeyaPurple)
                } else {
                    Image(systemName: "circle")
                        .font(.title2)
                        .foregroundStyle(.tertiary)
                }
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .disabled(isAlreadyInvited)
        .opacity(isAlreadyInvited ? 0.6 : 1.0)
    }
}

#Preview {
    InviteFriendsSheet(viewModel: TripsViewModel(), tripId: UUID())
}
