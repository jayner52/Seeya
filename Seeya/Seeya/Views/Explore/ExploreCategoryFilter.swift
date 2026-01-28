import SwiftUI

struct ExploreCategoryFilter: View {
    let selectedCategory: RecommendationCategory?
    let onCategorySelect: (RecommendationCategory?) -> Void

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: SeeyaSpacing.xs) {
                // All category
                CategoryFilterPill(
                    title: "All",
                    icon: "square.grid.2x2",
                    isSelected: selectedCategory == nil,
                    color: .seeyaPurple,
                    onTap: { onCategorySelect(nil) }
                )

                ForEach(RecommendationCategory.allCases, id: \.self) { category in
                    CategoryFilterPill(
                        title: category.displayName,
                        icon: category.icon,
                        isSelected: selectedCategory == category,
                        color: categoryColor(for: category),
                        onTap: { onCategorySelect(category) }
                    )
                }
            }
        }
    }

    private func categoryColor(for category: RecommendationCategory) -> Color {
        switch category {
        case .restaurant: return .orange
        case .activity: return .green
        case .stay: return .blue
        case .tip: return Color(red: 0.85, green: 0.65, blue: 0.0) // Amber
        }
    }
}

// MARK: - Category Filter Pill

private struct CategoryFilterPill: View {
    let title: String
    let icon: String
    let isSelected: Bool
    let color: Color
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: SeeyaSpacing.xxs) {
                Image(systemName: icon)
                    .font(.system(size: SeeyaIconSize.small))
                Text(title)
                    .font(SeeyaTypography.labelMedium)
            }
            .foregroundStyle(isSelected ? .white : color)
            .padding(.horizontal, SeeyaSpacing.sm)
            .padding(.vertical, SeeyaSpacing.xs)
            .background(isSelected ? color : color.opacity(0.1))
            .clipShape(Capsule())
        }
    }
}

#Preview {
    ExploreCategoryFilter(
        selectedCategory: nil,
        onCategorySelect: { _ in }
    )
    .padding()
}
