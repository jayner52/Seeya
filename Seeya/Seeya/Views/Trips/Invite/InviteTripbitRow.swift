import SwiftUI

struct InviteTripbitRow: View {
    @Bindable var viewModel: InviteViewModel
    let tripbit: TripBit
    let friendId: UUID

    private var isSelected: Bool {
        viewModel.isTripbitSelectedForFriend(tripbit.id, friendId: friendId)
    }

    var body: some View {
        Button {
            viewModel.toggleTripbitForFriend(tripbit.id, friendId: friendId)
        } label: {
            HStack(spacing: 12) {
                // Category icon
                Image(systemName: tripbit.category.icon)
                    .font(.subheadline)
                    .foregroundStyle(tripbit.category.color)
                    .frame(width: 24, height: 24)
                    .background(tripbit.category.color.opacity(0.1))
                    .clipShape(RoundedRectangle(cornerRadius: 6))

                // Tripbit info
                VStack(alignment: .leading, spacing: 2) {
                    Text(tripbit.title)
                        .font(SeeyaTypography.bodyMedium)
                        .foregroundStyle(.primary)
                        .lineLimit(1)

                    if let datetime = tripbit.startDatetime {
                        Text(formatDateTime(datetime))
                            .font(SeeyaTypography.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                // Checkbox
                tripbitCheckbox
            }
            .contentShape(Rectangle())
            .padding(.horizontal)
            .padding(.vertical, 10)
        }
        .buttonStyle(.plain)
    }

    // MARK: - Checkbox

    private var tripbitCheckbox: some View {
        Group {
            if isSelected {
                Image(systemName: "checkmark.square.fill")
                    .font(.body)
                    .foregroundStyle(Color(red: 0.95, green: 0.85, blue: 0.4))
            } else {
                Image(systemName: "square")
                    .font(.body)
                    .foregroundStyle(.tertiary)
            }
        }
    }

    // MARK: - Helpers

    private func formatDateTime(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d, h:mm a"
        return formatter.string(from: date)
    }
}

#Preview {
    VStack {
        InviteTripbitRow(
            viewModel: InviteViewModel(),
            tripbit: TripBit(
                id: UUID(),
                tripId: UUID(),
                createdBy: UUID(),
                category: .flight,
                title: "Flight to Mexico City",
                status: .confirmed,
                startDatetime: Date(),
                endDatetime: nil,
                locationId: nil,
                notes: nil,
                orderIndex: 0,
                createdAt: Date(),
                updatedAt: Date()
            ),
            friendId: UUID()
        )
    }
    .background(Color.seeyaBackground)
}
