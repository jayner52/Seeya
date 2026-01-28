import SwiftUI

struct SavedRecommendationsSection: View {
    let savedRecommendations: [SavedRecommendation]
    let onRemove: (SavedRecommendation) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            SectionHeader(title: "Saved Recommendations")

            if savedRecommendations.isEmpty {
                EmptyStateView(
                    icon: "bookmark",
                    title: "No saved recommendations",
                    message: "Save recommendations from trips to find them here"
                )
                .frame(maxWidth: .infinity)
                .seeyaCard()
            } else {
                VStack(spacing: 8) {
                    ForEach(savedRecommendations, id: \.id) { saved in
                        SavedRecommendationRow(saved: saved)
                            .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                                Button(role: .destructive) {
                                    onRemove(saved)
                                } label: {
                                    Label("Remove", systemImage: "bookmark.slash")
                                }
                            }
                    }
                }
                .seeyaCard()
            }
        }
    }
}

struct SavedRecommendationRow: View {
    let saved: SavedRecommendation

    var body: some View {
        HStack(spacing: 12) {
            // Category icon
            Image(systemName: categoryIcon)
                .font(.title3)
                .foregroundStyle(.white)
                .frame(width: 40, height: 40)
                .background(categoryColor)
                .clipShape(RoundedRectangle(cornerRadius: 8))

            VStack(alignment: .leading, spacing: 4) {
                Text(saved.sharedRecommendation?.title ?? "Recommendation")
                    .font(.subheadline)
                    .fontWeight(.medium)

                if let description = saved.sharedRecommendation?.description, !description.isEmpty {
                    Text(description)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }

                if let category = saved.sharedRecommendation?.category {
                    Text(category.rawValue.capitalized)
                        .font(.caption2)
                        .foregroundStyle(categoryColor)
                }
            }

            Spacer()

            Image(systemName: "bookmark.fill")
                .foregroundStyle(Color.seeyaPurple)
        }
        .padding(12)
    }

    private var categoryIcon: String {
        switch saved.sharedRecommendation?.category {
        case .restaurant:
            return "fork.knife"
        case .activity:
            return "figure.hiking"
        case .stay:
            return "bed.double"
        case .tip:
            return "lightbulb"
        case .none:
            return "star"
        }
    }

    private var categoryColor: Color {
        switch saved.sharedRecommendation?.category {
        case .restaurant:
            return .orange
        case .activity:
            return .green
        case .stay:
            return .blue
        case .tip:
            return .purple
        case .none:
            return .gray
        }
    }
}

#Preview {
    SavedRecommendationsSection(
        savedRecommendations: [],
        onRemove: { _ in }
    )
    .padding()
}
