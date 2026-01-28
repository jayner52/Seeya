import SwiftUI

struct PopularDestinationsSection: View {
    let destinations: [PopularDestination]

    var body: some View {
        VStack(alignment: .leading, spacing: SeeyaSpacing.sm) {
            SectionHeader(
                title: "Popular in Your Circle",
                icon: "flame"
            )

            if destinations.isEmpty {
                emptyState
            } else {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: SeeyaSpacing.sm) {
                        ForEach(Array(destinations.enumerated()), id: \.element.id) { index, destination in
                            PopularDestinationCard(
                                destination: destination,
                                rank: index + 1
                            )
                        }
                    }
                }
            }
        }
    }

    private var emptyState: some View {
        HStack(spacing: SeeyaSpacing.md) {
            Image(systemName: "map.fill")
                .font(.system(size: 32))
                .foregroundStyle(Color.orange.opacity(0.6))

            VStack(alignment: .leading, spacing: SeeyaSpacing.xxs) {
                Text("Discover trending destinations")
                    .font(SeeyaTypography.labelMedium)
                    .foregroundStyle(Color.seeyaTextPrimary)

                Text("Grow your travel circle to see where everyone's going")
                    .font(SeeyaTypography.caption)
                    .foregroundStyle(Color.seeyaTextSecondary)
            }

            Spacer()
        }
        .padding(SeeyaSpacing.md)
        .background(Color.orange.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

// MARK: - Popular Destination Card

private struct PopularDestinationCard: View {
    let destination: PopularDestination
    let rank: Int

    var body: some View {
        VStack(alignment: .leading, spacing: SeeyaSpacing.sm) {
            // Rank badge (only for #1)
            if rank == 1 {
                HStack(spacing: SeeyaSpacing.xxs) {
                    Image(systemName: "crown.fill")
                        .font(.system(size: 10))
                    Text("#1")
                        .font(SeeyaTypography.labelSmall)
                }
                .foregroundStyle(.white)
                .padding(.horizontal, SeeyaSpacing.xs)
                .padding(.vertical, SeeyaSpacing.xxs)
                .background(Color.orange)
                .clipShape(Capsule())
            }

            // Flag and destination name
            HStack(spacing: SeeyaSpacing.xs) {
                Text(destination.countryEmoji ?? "🌍")
                    .font(.system(size: 32))

                VStack(alignment: .leading, spacing: 2) {
                    Text(destination.locationName)
                        .font(SeeyaTypography.headlineSmall)
                        .foregroundStyle(Color.seeyaTextPrimary)
                        .lineLimit(1)

                    if let countryName = destination.countryName, !destination.isCountry {
                        Text(countryName)
                            .font(SeeyaTypography.caption)
                            .foregroundStyle(Color.seeyaTextTertiary)
                    }
                }
            }

            // Trip count
            HStack(spacing: SeeyaSpacing.xxs) {
                Image(systemName: "airplane")
                    .font(.system(size: SeeyaIconSize.small))
                    .foregroundStyle(Color.seeyaPurple)

                Text(destination.tripCountLabel)
                    .font(SeeyaTypography.caption)
                    .foregroundStyle(Color.seeyaTextSecondary)
            }
        }
        .padding(SeeyaSpacing.md)
        .frame(width: 180)
        .background(Color.seeyaCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
        .overlay(
            rank == 1 ?
            RoundedRectangle(cornerRadius: 12)
                .stroke(Color.orange.opacity(0.3), lineWidth: 2)
            : nil
        )
    }
}

#Preview {
    PopularDestinationsSection(
        destinations: [
            PopularDestination(
                locationName: "Tokyo",
                countryEmoji: "🇯🇵",
                countryName: "Japan",
                tripCount: 5,
                isCountry: false
            ),
            PopularDestination(
                locationName: "Paris",
                countryEmoji: "🇫🇷",
                countryName: "France",
                tripCount: 3,
                isCountry: false
            )
        ]
    )
    .padding()
}
