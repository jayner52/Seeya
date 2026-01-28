import SwiftUI

struct RecommendationCard: View {
    let recommendation: SharedRecommendation
    let isSaved: Bool
    let onToggleSave: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: SeeyaSpacing.sm) {
            // Header with category badge
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: SeeyaSpacing.xxs) {
                    // Category badge
                    HStack(spacing: SeeyaSpacing.xxs) {
                        Image(systemName: recommendation.category.icon)
                            .font(.system(size: SeeyaIconSize.small))
                        Text(recommendation.category.displayName)
                            .font(SeeyaTypography.labelSmall)
                    }
                    .foregroundStyle(categoryColor)
                    .padding(.horizontal, SeeyaSpacing.xs)
                    .padding(.vertical, SeeyaSpacing.xxs)
                    .background(categoryColor.opacity(0.1))
                    .clipShape(Capsule())

                    // Title
                    Text(recommendation.title)
                        .font(SeeyaTypography.headlineSmall)
                        .foregroundStyle(Color.seeyaTextPrimary)
                        .lineLimit(2)
                }

                Spacer()

                // Save button
                Button {
                    onToggleSave()
                } label: {
                    Image(systemName: isSaved ? "bookmark.fill" : "bookmark")
                        .font(.system(size: SeeyaIconSize.medium))
                        .foregroundStyle(isSaved ? Color.seeyaPurple : Color.seeyaTextTertiary)
                }
            }

            // Description
            if let description = recommendation.description, !description.isEmpty {
                Text(description)
                    .font(SeeyaTypography.bodySmall)
                    .foregroundStyle(Color.seeyaTextSecondary)
                    .lineLimit(2)
            }

            // Tips
            if let tips = recommendation.tips, !tips.isEmpty {
                HStack(spacing: SeeyaSpacing.xxs) {
                    Image(systemName: "lightbulb.fill")
                        .font(.system(size: SeeyaIconSize.small))
                        .foregroundStyle(Color.orange)
                    Text(tips)
                        .font(SeeyaTypography.caption)
                        .foregroundStyle(Color.seeyaTextSecondary)
                        .lineLimit(1)
                }
            }

            Divider()

            // Footer with location and author
            HStack {
                // Location
                HStack(spacing: SeeyaSpacing.xxs) {
                    Text(recommendation.flagEmoji)
                        .font(.system(size: 12))
                    Text(recommendation.locationDisplay)
                        .font(SeeyaTypography.caption)
                        .foregroundStyle(Color.seeyaTextSecondary)
                }

                Spacer()

                // Author
                if let profile = recommendation.profile {
                    HStack(spacing: SeeyaSpacing.xxs) {
                        AvatarView(
                            name: profile.fullName,
                            avatarUrl: profile.avatarUrl,
                            size: 20
                        )
                        Text(profile.fullName)
                            .font(SeeyaTypography.caption)
                            .foregroundStyle(Color.seeyaTextTertiary)
                    }
                }
            }

            // Rating
            if let rating = recommendation.rating, rating > 0 {
                HStack(spacing: 2) {
                    ForEach(1...5, id: \.self) { star in
                        Image(systemName: star <= rating ? "star.fill" : "star")
                            .font(.system(size: 10))
                            .foregroundStyle(star <= rating ? Color.orange : Color.seeyaTextTertiary)
                    }
                }
            }
        }
        .padding(SeeyaSpacing.md)
        .background(Color.seeyaCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
    }

    private var categoryColor: Color {
        switch recommendation.category {
        case .restaurant: return .orange
        case .activity: return .green
        case .stay: return .blue
        case .tip: return Color(red: 0.85, green: 0.65, blue: 0.0)
        }
    }
}

#Preview {
    RecommendationCard(
        recommendation: SharedRecommendation(
            id: UUID(),
            userId: UUID(),
            cityId: nil,
            countryId: nil,
            title: "Best Ramen in Tokyo",
            description: "Ichiran Ramen in Shibuya is absolutely incredible. The solo booths are perfect for enjoying your meal in peace.",
            category: .restaurant,
            rating: 5,
            tips: "Order the extra chashu!",
            url: nil,
            googlePlaceId: nil,
            latitude: nil,
            longitude: nil,
            sourceTripId: nil,
            sourceResourceId: nil,
            createdAt: Date()
        ),
        isSaved: false,
        onToggleSave: {}
    )
    .padding()
}
