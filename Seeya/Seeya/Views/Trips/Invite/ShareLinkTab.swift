import SwiftUI

struct ShareLinkTab: View {
    @Bindable var viewModel: InviteViewModel
    let trip: Trip

    @State private var showCopiedToast = false
    @State private var copiedLinkId: UUID?

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                // Create New Link Section
                createLinkSection

                // Active Links Section
                if !viewModel.activeLinks.isEmpty {
                    activeLinksSection
                }
            }
            .padding()
        }
        .overlay(alignment: .bottom) {
            if showCopiedToast {
                copiedToast
            }
        }
    }

    // MARK: - Create Link Section

    private var createLinkSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Create a Shareable Link")
                .font(SeeyaTypography.headlineMedium)

            Text("Share this link with anyone to invite them to your trip. They can choose which legs to join.")
                .font(SeeyaTypography.bodySmall)
                .foregroundStyle(.secondary)

            // Location Selection
            if !viewModel.tripLocations.isEmpty {
                locationSelectionSection
            }

            // Expiration Toggle
            expirationSection

            // Create Button
            createButton
        }
        .padding()
        .background(Color.seeyaCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
    }

    // MARK: - Location Selection

    private var locationSelectionSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Include Locations")
                    .font(SeeyaTypography.labelLarge)

                Spacer()

                Button {
                    if viewModel.selectedLocationsForLink.count == viewModel.tripLocations.count {
                        viewModel.deselectAllLocationsForLink()
                    } else {
                        viewModel.selectAllLocationsForLink()
                    }
                } label: {
                    Text(viewModel.selectedLocationsForLink.count == viewModel.tripLocations.count ? "Deselect all" : "Select all")
                        .font(SeeyaTypography.caption)
                        .foregroundStyle(Color.seeyaPurple)
                }
            }

            VStack(spacing: 0) {
                ForEach(viewModel.tripLocations) { location in
                    ShareLinkLocationRow(
                        location: location,
                        isSelected: viewModel.isLocationSelectedForLink(location.id)
                    ) {
                        viewModel.toggleLocationForLink(location.id)
                    }

                    if location.id != viewModel.tripLocations.last?.id {
                        Divider()
                            .padding(.leading, 48)
                    }
                }
            }
            .background(Color(.systemGray6))
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
    }

    // MARK: - Expiration Section

    private var expirationSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Toggle(isOn: $viewModel.hasExpiration) {
                Text("Set Expiration")
                    .font(SeeyaTypography.labelLarge)
            }
            .tint(Color.seeyaPurple)

            if viewModel.hasExpiration {
                DatePicker(
                    "Expires on",
                    selection: Binding(
                        get: { viewModel.linkExpirationDate ?? Date().addingTimeInterval(7 * 24 * 60 * 60) },
                        set: { viewModel.linkExpirationDate = $0 }
                    ),
                    in: Date()...,
                    displayedComponents: [.date, .hourAndMinute]
                )
                .datePickerStyle(.compact)
            }
        }
    }

    // MARK: - Create Button

    private var createButton: some View {
        Button {
            createLink()
        } label: {
            HStack {
                if viewModel.isCreatingLink {
                    ProgressView()
                        .tint(.white)
                } else {
                    Image(systemName: "link.badge.plus")
                    Text("Create New Link")
                }
            }
            .font(.headline)
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
            .background(Color.seeyaAccent)
            .clipShape(RoundedRectangle(cornerRadius: 10))
        }
        .disabled(viewModel.isCreatingLink)
    }

    // MARK: - Active Links Section

    private var activeLinksSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Active Links")
                .font(SeeyaTypography.headlineMedium)

            VStack(spacing: 0) {
                ForEach(viewModel.activeLinks) { link in
                    ActiveLinkRow(
                        link: link,
                        onCopy: {
                            copyLink(link)
                        },
                        onDelete: {
                            deleteLink(link)
                        }
                    )

                    if link.id != viewModel.activeLinks.last?.id {
                        Divider()
                    }
                }
            }
            .background(Color.seeyaCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
        }
    }

    // MARK: - Copied Toast

    private var copiedToast: some View {
        HStack(spacing: 8) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(.green)
            Text("Link copied!")
                .font(SeeyaTypography.bodyMedium)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(Color.seeyaCardBackground)
        .clipShape(Capsule())
        .shadow(color: .black.opacity(0.15), radius: 8, y: 4)
        .padding(.bottom, 16)
        .transition(.move(edge: .bottom).combined(with: .opacity))
    }

    // MARK: - Actions

    private func createLink() {
        Task {
            if let link = await viewModel.createInviteLink(tripId: trip.id) {
                copyLink(link)
            }
        }
    }

    private func copyLink(_ link: TripInviteLink) {
        UIPasteboard.general.string = link.shareableUrl
        copiedLinkId = link.id

        withAnimation {
            showCopiedToast = true
        }

        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            withAnimation {
                showCopiedToast = false
            }
        }
    }

    private func deleteLink(_ link: TripInviteLink) {
        Task {
            _ = await viewModel.deleteInviteLink(linkId: link.id)
        }
    }
}

// MARK: - Share Link Location Row

struct ShareLinkLocationRow: View {
    let location: TripLocation
    let isSelected: Bool
    let onToggle: () -> Void

    var body: some View {
        Button(action: onToggle) {
            HStack(spacing: 12) {
                Image(systemName: "mappin.circle.fill")
                    .font(.title3)
                    .foregroundStyle(Color(red: 0.95, green: 0.85, blue: 0.4))

                HStack(spacing: 6) {
                    if let flag = location.flagEmoji {
                        Text(flag)
                    }
                    Text(location.displayName)
                        .font(SeeyaTypography.bodyMedium)
                        .foregroundStyle(.primary)
                }

                Spacer()

                Image(systemName: isSelected ? "checkmark.square.fill" : "square")
                    .font(.title3)
                    .foregroundStyle(isSelected ? Color(red: 0.95, green: 0.85, blue: 0.4) : Color.gray.opacity(0.4))
            }
            .contentShape(Rectangle())
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    ShareLinkTab(
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
