import SwiftUI

struct InviteReceivedView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var viewModel = InviteViewModel()

    let inviteCode: String
    var onJoinSuccess: (() -> Void)?

    @State private var isLoading = true
    @State private var loadError: String?
    @State private var selectedLocations: Set<UUID> = []
    @State private var isJoining = false

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    loadingView
                } else if let error = loadError {
                    errorView(error)
                } else if let trip = viewModel.pendingInviteTrip {
                    inviteContent(trip)
                } else {
                    errorView("Unable to load invite details")
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
        .task {
            await loadInviteDetails()
        }
    }

    // MARK: - Loading View

    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .scaleEffect(1.2)

            Text("Loading invite...")
                .font(SeeyaTypography.bodyMedium)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Error View

    private func errorView(_ message: String) -> some View {
        VStack(spacing: 24) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 56))
                .foregroundStyle(.orange)

            Text("Couldn't Load Invite")
                .font(SeeyaTypography.headlineLarge)

            Text(message)
                .font(SeeyaTypography.bodyMedium)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Button("Try Again") {
                Task {
                    await loadInviteDetails()
                }
            }
            .buttonStyle(SeeyaSecondaryButtonStyle())
        }
        .padding()
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Invite Content

    private func inviteContent(_ trip: Trip) -> some View {
        ScrollView {
            VStack(spacing: 24) {
                // Header
                inviteHeader(trip)

                // Trip Card
                tripInfoCard(trip)

                // Location Selection
                if !viewModel.tripLocations.isEmpty {
                    locationSelectionSection
                }

                // Join Button
                joinButton
            }
            .padding()
        }
        .background(Color.seeyaBackground)
    }

    // MARK: - Invite Header

    private func inviteHeader(_ trip: Trip) -> some View {
        VStack(spacing: 12) {
            // Celebration icon
            Image(systemName: "airplane.departure")
                .font(.system(size: 48))
                .foregroundStyle(Color.seeyaPurple)

            Text("You're Invited!")
                .font(.system(size: 28, weight: .bold))

            if let owner = trip.owner {
                Text("\(owner.fullName) invited you to join their trip")
                    .font(SeeyaTypography.bodyMedium)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }
        }
        .padding(.top, 16)
    }

    // MARK: - Trip Info Card

    private func tripInfoCard(_ trip: Trip) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            // Trip name
            Text(trip.name)
                .font(SeeyaTypography.displayMedium)

            // Destinations
            HStack(spacing: 8) {
                Image(systemName: "mappin.and.ellipse")
                    .foregroundStyle(Color.seeyaPurple)

                Text(trip.allDestinations)
                    .font(SeeyaTypography.bodyMedium)
            }

            // Dates
            if trip.hasDates {
                HStack(spacing: 8) {
                    Image(systemName: "calendar")
                        .foregroundStyle(Color.seeyaPurple)

                    Text(trip.fullDateRangeText)
                        .font(SeeyaTypography.bodyMedium)
                }
            }

            // Duration
            if trip.hasDates {
                HStack(spacing: 8) {
                    Image(systemName: "clock")
                        .foregroundStyle(Color.seeyaPurple)

                    Text(trip.tripDurationText)
                        .font(SeeyaTypography.bodyMedium)
                }
            }

            // Participants
            if trip.participantCount > 0 {
                HStack(spacing: 8) {
                    Image(systemName: "person.2")
                        .foregroundStyle(Color.seeyaPurple)

                    Text(trip.participantText)
                        .font(SeeyaTypography.bodyMedium)
                }
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.seeyaCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
    }

    // MARK: - Location Selection Section

    private var locationSelectionSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Choose which legs to join")
                .font(SeeyaTypography.headlineMedium)

            Text("You can join some or all legs of this trip")
                .font(SeeyaTypography.caption)
                .foregroundStyle(.secondary)

            VStack(spacing: 0) {
                ForEach(viewModel.tripLocations) { location in
                    RecipientLocationRow(
                        location: location,
                        isSelected: selectedLocations.contains(location.id),
                        isAvailable: isLocationAvailable(location.id)
                    ) {
                        toggleLocation(location.id)
                    }

                    if location.id != viewModel.tripLocations.last?.id {
                        Divider()
                            .padding(.leading, 48)
                    }
                }
            }
            .background(Color.seeyaCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
        }
    }

    // MARK: - Join Button

    private var joinButton: some View {
        Button {
            joinTrip()
        } label: {
            HStack {
                if isJoining {
                    ProgressView()
                        .tint(.white)
                } else {
                    Image(systemName: "checkmark.circle.fill")
                    Text(joinButtonText)
                }
            }
            .font(.headline)
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(selectedLocations.isEmpty ? Color.gray : Color.seeyaPurple)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .disabled(selectedLocations.isEmpty || isJoining)
        .padding(.top, 8)
    }

    private var joinButtonText: String {
        if selectedLocations.isEmpty {
            return "Select at least one leg"
        } else if selectedLocations.count == viewModel.tripLocations.count {
            return "Join Full Trip"
        } else {
            return "Join \(selectedLocations.count) Leg\(selectedLocations.count == 1 ? "" : "s")"
        }
    }

    // MARK: - Helpers

    private func isLocationAvailable(_ locationId: UUID) -> Bool {
        // Check if this location is included in the invite link
        guard let link = viewModel.pendingInviteLink else { return true }
        if link.isFullTrip { return true }
        return link.locationIds?.contains(locationId) ?? false
    }

    private func toggleLocation(_ locationId: UUID) {
        guard isLocationAvailable(locationId) else { return }

        if selectedLocations.contains(locationId) {
            selectedLocations.remove(locationId)
        } else {
            selectedLocations.insert(locationId)
        }
    }

    // MARK: - Actions

    private func loadInviteDetails() async {
        isLoading = true
        loadError = nil

        let success = await viewModel.fetchInviteLinkDetails(code: inviteCode)

        if success {
            // Pre-select available locations
            selectedLocations = viewModel.selectedLocationsForLink
        } else {
            loadError = viewModel.errorMessage ?? "Unable to load invite"
        }

        isLoading = false
    }

    private func joinTrip() {
        isJoining = true

        Task {
            let success = await viewModel.acceptInviteFromLink(selectedLocationIds: selectedLocations)

            if success {
                onJoinSuccess?()
                dismiss()
            } else {
                // Show error
                loadError = viewModel.errorMessage
            }

            isJoining = false
        }
    }
}

// MARK: - Recipient Location Row

struct RecipientLocationRow: View {
    let location: TripLocation
    let isSelected: Bool
    let isAvailable: Bool
    let onToggle: () -> Void

    var body: some View {
        Button(action: onToggle) {
            HStack(spacing: 12) {
                // Location icon
                Image(systemName: "mappin.circle.fill")
                    .font(.title3)
                    .foregroundStyle(isAvailable ? Color(red: 0.95, green: 0.85, blue: 0.4) : .gray)

                // Location info
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        if let flag = location.flagEmoji {
                            Text(flag)
                        }
                        Text(location.displayName)
                            .font(SeeyaTypography.bodyMedium)
                            .foregroundStyle(isAvailable ? .primary : .secondary)
                    }

                    Text("Leg \(location.orderIndex + 1)")
                        .font(SeeyaTypography.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                // Status
                if !isAvailable {
                    Text("Not included")
                        .font(SeeyaTypography.caption)
                        .foregroundStyle(.secondary)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color(.systemGray5))
                        .clipShape(Capsule())
                } else {
                    Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                        .font(.title3)
                        .foregroundStyle(isSelected ? Color.seeyaPurple : Color.gray.opacity(0.4))
                }
            }
            .contentShape(Rectangle())
            .padding()
        }
        .buttonStyle(.plain)
        .disabled(!isAvailable)
        .opacity(isAvailable ? 1 : 0.6)
    }
}

#Preview {
    InviteReceivedView(inviteCode: "ABC12345")
}
