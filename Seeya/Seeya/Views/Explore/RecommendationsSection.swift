import SwiftUI

struct RecommendationsSection: View {
    let recommendations: [SharedRecommendation]
    let savedIds: Set<UUID>
    let onToggleSave: (UUID) -> Void

    private let columns = [
        GridItem(.flexible(), spacing: SeeyaSpacing.md),
        GridItem(.flexible(), spacing: SeeyaSpacing.md)
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: SeeyaSpacing.sm) {
            SectionHeader(
                title: "Recommendations",
                icon: "sparkles",
                count: recommendations.count
            )

            if recommendations.isEmpty {
                emptyState
            } else {
                LazyVGrid(columns: columns, spacing: SeeyaSpacing.md) {
                    ForEach(recommendations) { recommendation in
                        RecommendationCard(
                            recommendation: recommendation,
                            isSaved: savedIds.contains(recommendation.id),
                            onToggleSave: { onToggleSave(recommendation.id) }
                        )
                    }
                }
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: SeeyaSpacing.md) {
            Image(systemName: "sparkles")
                .font(.system(size: 40))
                .foregroundStyle(Color.seeyaTextTertiary)

            Text("No recommendations yet")
                .font(SeeyaTypography.bodyMedium)
                .foregroundStyle(Color.seeyaTextSecondary)

            Text("Be the first to share a travel tip with your circle!")
                .font(SeeyaTypography.caption)
                .foregroundStyle(Color.seeyaTextTertiary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, SeeyaSpacing.xl)
    }
}

#Preview {
    RecommendationsSection(
        recommendations: [],
        savedIds: [],
        onToggleSave: { _ in }
    )
    .padding()
}
