import SwiftUI

struct AddPalSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var viewModel: TravelCircleViewModel

    @State private var searchText = ""
    @State private var searchTask: Task<Void, Never>?
    @State private var sendingRequestTo: UUID?

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                if searchText.isEmpty {
                    emptySearchState
                } else if viewModel.searchResults.isEmpty {
                    noResultsState
                } else {
                    searchResultsList
                }
            }
            .navigationTitle("Add Travel Pal")
            .navigationBarTitleDisplayMode(.inline)
            .searchable(text: $searchText, prompt: "Search by name or username")
            .onChange(of: searchText) { _, newValue in
                performDebouncedSearch(query: newValue)
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }

    private var emptySearchState: some View {
        VStack(spacing: SeeyaSpacing.md) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 48))
                .foregroundStyle(.tertiary)

            Text("Find Travel Pals")
                .font(SeeyaTypography.headlineMedium)

            Text("Search for friends by their name or username")
                .font(SeeyaTypography.bodyMedium)
                .foregroundStyle(Color.seeyaTextSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(SeeyaSpacing.xl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var noResultsState: some View {
        VStack(spacing: SeeyaSpacing.md) {
            Image(systemName: "person.slash")
                .font(.system(size: 48))
                .foregroundStyle(.tertiary)

            Text("No Results")
                .font(SeeyaTypography.headlineMedium)

            Text("No users found matching \"\(searchText)\"")
                .font(SeeyaTypography.bodyMedium)
                .foregroundStyle(Color.seeyaTextSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(SeeyaSpacing.xl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var searchResultsList: some View {
        List {
            ForEach(viewModel.searchResults) { profile in
                SearchResultRow(
                    profile: profile,
                    isSending: sendingRequestTo == profile.id,
                    onAdd: { sendRequest(to: profile) }
                )
            }
        }
        .listStyle(.plain)
    }

    private func performDebouncedSearch(query: String) {
        searchTask?.cancel()

        guard !query.isEmpty else {
            viewModel.searchResults = []
            return
        }

        searchTask = Task {
            try? await Task.sleep(for: .milliseconds(300))

            guard !Task.isCancelled else { return }

            await viewModel.searchUsers(query: query)
        }
    }

    private func sendRequest(to profile: Profile) {
        sendingRequestTo = profile.id

        Task {
            _ = await viewModel.sendFriendRequest(to: profile.id)
            sendingRequestTo = nil
        }
    }
}

private struct SearchResultRow: View {
    let profile: Profile
    let isSending: Bool
    let onAdd: () -> Void

    var body: some View {
        HStack(spacing: SeeyaSpacing.sm) {
            AvatarView(
                name: profile.fullName,
                avatarUrl: profile.avatarUrl,
                size: 44
            )

            VStack(alignment: .leading, spacing: 2) {
                Text(profile.fullName)
                    .font(SeeyaTypography.bodyMedium)
                    .foregroundStyle(Color.seeyaTextPrimary)

                if let username = profile.username {
                    Text("@\(username)")
                        .font(SeeyaTypography.caption)
                        .foregroundStyle(Color.seeyaTextSecondary)
                }
            }

            Spacer()

            Button {
                onAdd()
            } label: {
                if isSending {
                    ProgressView()
                        .scaleEffect(0.8)
                } else {
                    Image(systemName: "plus.circle.fill")
                        .font(.title2)
                        .foregroundStyle(Color.seeyaPurple)
                }
            }
            .buttonStyle(.plain)
            .disabled(isSending)
        }
        .contentShape(Rectangle())
    }
}

#Preview {
    AddPalSheet(viewModel: TravelCircleViewModel())
}
