import SwiftUI

struct TrendingWanderlistSection: View {
    let items: [TrendingWanderlistItem]

    var body: some View {
        VStack(alignment: .leading, spacing: SeeyaSpacing.sm) {
            SectionHeader(
                title: "Trending Wanderlist",
                icon: "heart"
            )

            Text("Places your travel pals dream of visiting")
                .font(SeeyaTypography.caption)
                .foregroundStyle(Color.seeyaTextTertiary)

            if items.isEmpty {
                emptyState
            } else {
                // Horizontal scrolling chips
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: SeeyaSpacing.xs) {
                        ForEach(items) { item in
                            TrendingWanderlistChip(item: item)
                        }
                    }
                }
            }
        }
    }

    private var emptyState: some View {
        HStack(spacing: SeeyaSpacing.md) {
            Image(systemName: "heart.circle.fill")
                .font(.system(size: 32))
                .foregroundStyle(Color.pink.opacity(0.6))

            VStack(alignment: .leading, spacing: SeeyaSpacing.xxs) {
                Text("See dream destinations")
                    .font(SeeyaTypography.labelMedium)
                    .foregroundStyle(Color.seeyaTextPrimary)

                Text("Connect with friends to discover where they want to travel")
                    .font(SeeyaTypography.caption)
                    .foregroundStyle(Color.seeyaTextSecondary)
            }

            Spacer()
        }
        .padding(SeeyaSpacing.md)
        .background(Color.pink.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

// MARK: - Trending Wanderlist Chip

private struct TrendingWanderlistChip: View {
    let item: TrendingWanderlistItem

    var body: some View {
        VStack(alignment: .leading, spacing: SeeyaSpacing.xs) {
            // Flag and name
            HStack(spacing: SeeyaSpacing.xxs) {
                Text(item.countryEmoji ?? "🌍")
                    .font(.system(size: 16))

                Text(item.name)
                    .font(SeeyaTypography.labelMedium)
                    .foregroundStyle(Color.seeyaTextPrimary)
                    .lineLimit(1)
            }

            // Friend count
            HStack(spacing: SeeyaSpacing.xxs) {
                Image(systemName: "person.2.fill")
                    .font(.system(size: 10))
                    .foregroundStyle(Color.seeyaPurple)

                Text(item.friendCountLabel)
                    .font(SeeyaTypography.captionSmall)
                    .foregroundStyle(Color.seeyaTextSecondary)
            }
        }
        .padding(.horizontal, SeeyaSpacing.sm)
        .padding(.vertical, SeeyaSpacing.sm)
        .background(Color.seeyaPurple.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(Color.seeyaPurple.opacity(0.2), lineWidth: 1)
        )
    }
}

#Preview {
    TrendingWanderlistSection(
        items: [
            TrendingWanderlistItem(
                name: "Santorini",
                googlePlaceId: nil,
                cityId: nil,
                countryId: nil,
                friendCount: 3,
                countryEmoji: "🇬🇷",
                countryName: "Greece"
            ),
            TrendingWanderlistItem(
                name: "Bali",
                googlePlaceId: nil,
                cityId: nil,
                countryId: nil,
                friendCount: 2,
                countryEmoji: "🇮🇩",
                countryName: "Indonesia"
            )
        ]
    )
    .padding()
}
