import SwiftUI

struct TravelingNowSection: View {
    let trips: [CircleTrip]

    var body: some View {
        VStack(alignment: .leading, spacing: SeeyaSpacing.sm) {
            SectionHeader(
                title: "Traveling Now & Upcoming",
                icon: "airplane.departure"
            )

            if trips.isEmpty {
                emptyState
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: SeeyaSpacing.sm) {
                        ForEach(trips) { trip in
                            TravelingNowCard(trip: trip)
                        }
                    }
                }
            }
        }
    }

    private var emptyState: some View {
        HStack(spacing: SeeyaSpacing.md) {
            Image(systemName: "person.2.badge.plus")
                .font(.system(size: 32))
                .foregroundStyle(Color.seeyaPurple.opacity(0.6))

            VStack(alignment: .leading, spacing: SeeyaSpacing.xxs) {
                Text("See where your friends are headed")
                    .font(SeeyaTypography.labelMedium)
                    .foregroundStyle(Color.seeyaTextPrimary)

                Text("Add travel pals to your circle to see their upcoming adventures")
                    .font(SeeyaTypography.caption)
                    .foregroundStyle(Color.seeyaTextSecondary)
            }

            Spacer()
        }
        .padding(SeeyaSpacing.md)
        .background(Color.seeyaPurple.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

// MARK: - Traveling Now Card

private struct TravelingNowCard: View {
    let trip: CircleTrip

    var body: some View {
        VStack(alignment: .leading, spacing: SeeyaSpacing.sm) {
            // Header with avatar and status
            HStack(spacing: SeeyaSpacing.sm) {
                AvatarView(
                    name: trip.ownerDisplayName,
                    avatarUrl: trip.ownerAvatarUrl,
                    size: 40
                )

                VStack(alignment: .leading, spacing: 2) {
                    Text(trip.ownerDisplayName)
                        .font(SeeyaTypography.labelMedium)
                        .foregroundStyle(Color.seeyaTextPrimary)

                    StatusBadge(
                        text: trip.statusText,
                        color: trip.isTravelingNow ? .green : .blue
                    )
                }
            }

            // Destination
            HStack(spacing: SeeyaSpacing.xxs) {
                Text(trip.countryEmoji ?? "🌍")
                    .font(.system(size: 20))

                Text(trip.destination ?? trip.countryName ?? "Unknown")
                    .font(SeeyaTypography.headlineSmall)
                    .foregroundStyle(Color.seeyaTextPrimary)
            }

            // Dates
            if !trip.dateRangeDisplay.isEmpty {
                HStack(spacing: SeeyaSpacing.xxs) {
                    Image(systemName: "calendar")
                        .font(.system(size: SeeyaIconSize.small))
                        .foregroundStyle(Color.seeyaTextTertiary)

                    Text(trip.dateRangeDisplay)
                        .font(SeeyaTypography.caption)
                        .foregroundStyle(Color.seeyaTextSecondary)
                }
            }
        }
        .padding(SeeyaSpacing.md)
        .frame(width: 200)
        .background(Color.seeyaCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
    }
}

#Preview {
    TravelingNowSection(trips: [])
        .padding()
}
