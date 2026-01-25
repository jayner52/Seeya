import SwiftUI

struct TripCard: View {
    let trip: Trip
    let isOwner: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Destination & Visibility
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    // Flag + Destination
                    HStack(spacing: 6) {
                        if let flag = trip.locations?.first?.flagEmoji {
                            Text(flag)
                                .font(.title3)
                        }
                        Text(trip.destination)
                            .font(.title3)
                            .fontWeight(.semibold)
                            .lineLimit(1)
                    }

                    Text(trip.dateRangeText)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                if let visibility = trip.visibility, visibility != .fullDetails {
                    Image(systemName: visibility.icon)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .padding(6)
                        .background(Color(.systemGray6))
                        .clipShape(Circle())
                }
            }

            // Trip Name
            Text(trip.name)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .lineLimit(1)

            // Participants
            HStack {
                if let participants = trip.participants, !participants.isEmpty {
                    StackedAvatarsView(
                        participants: participants.filter { $0.status == .confirmed },
                        maxVisible: 3,
                        size: 28
                    )
                }

                Spacer()

                Text(trip.participantText)
                    .font(.caption)
                    .foregroundStyle(.secondary)

                if isOwner {
                    Text("Organizer")
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundStyle(Color.seeyaPurple)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.seeyaPurple.opacity(0.1))
                        .clipShape(Capsule())
                }
            }
        }
        .padding()
        .background(Color.seeyaCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
    }
}

#Preview {
    VStack(spacing: 16) {
        TripCard(
            trip: Trip(
                id: UUID(),
                userId: UUID(),
                name: "Anniversary Trip",
                description: "A romantic getaway",
                startDate: Date().addingTimeInterval(7 * 24 * 60 * 60),
                endDate: Date().addingTimeInterval(14 * 24 * 60 * 60),
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
            isOwner: true
        )

        TripCard(
            trip: Trip(
                id: UUID(),
                userId: UUID(),
                name: "Beach Vacation",
                description: nil,
                startDate: nil,
                endDate: nil,
                isFlexible: true,
                visibility: .datesOnly,
                isPast: false,
                createdAt: Date(),
                updatedAt: Date(),
                locations: nil,
                participants: nil,
                owner: nil,
                recommendations: nil,
                tripTypes: nil
            ),
            isOwner: false
        )
    }
    .padding()
    .background(Color.seeyaBackground)
}
