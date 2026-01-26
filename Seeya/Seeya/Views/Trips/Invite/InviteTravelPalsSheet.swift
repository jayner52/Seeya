import SwiftUI

enum InviteTab: String, CaseIterable {
    case friends = "Friends"
    case shareLink = "Share Link"
}

struct InviteTravelPalsSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var viewModel = InviteViewModel()
    @State private var selectedTab: InviteTab = .friends

    let trip: Trip
    var onInvitesSent: (() -> Void)?

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Tab Picker
                Picker("", selection: $selectedTab) {
                    ForEach(InviteTab.allCases, id: \.self) { tab in
                        Text(tab.rawValue).tag(tab)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)
                .padding(.top, 8)

                // Content
                switch selectedTab {
                case .friends:
                    InviteFriendsTab(
                        viewModel: viewModel,
                        trip: trip,
                        onDismiss: {
                            onInvitesSent?()
                            dismiss()
                        }
                    )
                case .shareLink:
                    ShareLinkTab(
                        viewModel: viewModel,
                        trip: trip
                    )
                }
            }
            .background(Color.seeyaBackground)
            .navigationTitle("Invite Travel Pals")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
            .task {
                await viewModel.fetchFriends()
                await viewModel.fetchTripData(tripId: trip.id)
                await viewModel.fetchActiveLinks(tripId: trip.id)
            }
        }
    }
}

#Preview {
    InviteTravelPalsSheet(
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
