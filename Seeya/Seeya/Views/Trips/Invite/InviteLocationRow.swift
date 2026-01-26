import SwiftUI

struct InviteLocationRow: View {
    @Bindable var viewModel: InviteViewModel
    let location: TripLocation
    let friendId: UUID

    private var isSelected: Bool {
        viewModel.isLocationSelectedForFriend(location.id, friendId: friendId)
    }

    private var isExpanded: Bool {
        viewModel.isLocationExpanded(location.id)
    }

    private var tripbits: [TripBit] {
        viewModel.tripbitsForLocation(location.id)
    }

    private var tripbitCount: Int {
        viewModel.tripbitCountForLocation(location.id)
    }

    private var selectedTripbitCount: Int {
        viewModel.selectedTripbitCountForLocation(location.id, friendId: friendId)
    }

    var body: some View {
        VStack(spacing: 0) {
            // Location Row
            locationRow

            // Expanded Tripbits
            if isExpanded && !tripbits.isEmpty {
                tripbitsList
            }
        }
        .animation(.easeInOut(duration: 0.2), value: isExpanded)
    }

    // MARK: - Location Row

    private var locationRow: some View {
        Button {
            viewModel.toggleLocationForFriend(location.id, friendId: friendId)
        } label: {
            HStack(spacing: 12) {
                // Location pin icon
                Image(systemName: "mappin.circle.fill")
                    .font(.title3)
                    .foregroundStyle(Color(red: 0.95, green: 0.85, blue: 0.4)) // Yellow

                // Location info
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        if let flag = location.flagEmoji {
                            Text(flag)
                                .font(.subheadline)
                        }
                        Text(location.displayName)
                            .font(SeeyaTypography.bodyMedium)
                            .foregroundStyle(.primary)
                    }

                    // Dates if available (would need to be added to location model)
                    // For now show position
                    Text("Leg \(location.orderIndex + 1)")
                        .font(SeeyaTypography.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                // Tripbit count badge and expand
                if tripbitCount > 0 {
                    Button {
                        viewModel.toggleLocationExpanded(location.id)
                    } label: {
                        HStack(spacing: 4) {
                            Text("\(selectedTripbitCount)/\(tripbitCount)")
                                .font(SeeyaTypography.caption)
                                .foregroundStyle(.secondary)

                            Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                                .font(.caption2)
                                .foregroundStyle(.tertiary)
                        }
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color(.systemGray5))
                        .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                }

                // Checkbox
                locationCheckbox
            }
            .contentShape(Rectangle())
            .padding(.horizontal)
            .padding(.vertical, 12)
        }
        .buttonStyle(.plain)
    }

    // MARK: - Checkbox

    private var locationCheckbox: some View {
        Group {
            if isSelected {
                Image(systemName: "checkmark.square.fill")
                    .font(.title3)
                    .foregroundStyle(Color(red: 0.95, green: 0.85, blue: 0.4))
            } else {
                Image(systemName: "square")
                    .font(.title3)
                    .foregroundStyle(.tertiary)
            }
        }
    }

    // MARK: - Tripbits List

    private var tripbitsList: some View {
        VStack(spacing: 0) {
            ForEach(tripbits) { tripbit in
                InviteTripbitRow(
                    viewModel: viewModel,
                    tripbit: tripbit,
                    friendId: friendId
                )
            }
        }
        .padding(.leading, 32)
        .background(Color(.systemGray6).opacity(0.3))
    }
}

#Preview {
    VStack {
        InviteLocationRow(
            viewModel: InviteViewModel(),
            location: TripLocation(
                id: UUID(),
                tripId: UUID(),
                countryId: nil,
                cityId: nil,
                customLocation: "Mexico City",
                orderIndex: 0,
                createdAt: Date(),
                city: nil,
                country: nil
            ),
            friendId: UUID()
        )
    }
    .background(Color.seeyaBackground)
}
