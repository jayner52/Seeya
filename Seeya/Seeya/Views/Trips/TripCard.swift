import SwiftUI

struct TripCard: View {
    let trip: Trip
    let isOwner: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: SeeyaSpacing.sm) {
            // Destination & Visibility
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: SeeyaSpacing.xxs) {
                    // Flag + Destination
                    HStack(spacing: SeeyaSpacing.xs) {
                        if let flag = trip.locations?.first?.flagEmoji {
                            Text(flag)
                                .font(SeeyaTypography.headlineLarge)
                        }
                        Text(trip.destination)
                            .font(SeeyaTypography.headlineLarge)
                            .lineLimit(1)
                    }

                    Text(trip.dateRangeText)
                        .font(SeeyaTypography.bodyMedium)
                        .foregroundStyle(Color.seeyaTextSecondary)
                }

                Spacer()

                if let visibility = trip.visibility, visibility != .fullDetails {
                    Image(systemName: visibility.icon)
                        .font(.system(size: SeeyaIconSize.small))
                        .foregroundStyle(Color.seeyaTextSecondary)
                        .padding(SeeyaSpacing.xs)
                        .background(Color(.systemGray6))
                        .clipShape(Circle())
                }
            }

            // Trip Name
            Text(trip.name)
                .font(SeeyaTypography.bodyMedium)
                .foregroundStyle(Color.seeyaTextSecondary)
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
                    .font(SeeyaTypography.caption)
                    .foregroundStyle(Color.seeyaTextSecondary)

                if isOwner {
                    Text("Organizer")
                        .font(SeeyaTypography.labelMedium)
                        .foregroundStyle(Color.seeyaPurple)
                        .padding(.horizontal, SeeyaSpacing.xs)
                        .padding(.vertical, SeeyaSpacing.xxs)
                        .background(Color.seeyaPurple.opacity(0.1))
                        .clipShape(Capsule())
                }
            }
        }
        .padding(SeeyaSpacing.md)
        .seeyaCard()
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
