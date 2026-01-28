import SwiftUI

struct AIRecommendationsSheet: View {
    @Environment(\.dismiss) private var dismiss

    let trip: Trip
    let onAddRecommendation: (String, String?, RecommendationCategory) async -> Bool

    @State private var isLoading = false
    @State private var recommendations: AIService.AIRecommendationsResponse?
    @State private var errorMessage: String?
    @State private var selectedCategory: RecommendationCategory? = nil
    @State private var addedIds: Set<UUID> = []

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    loadingView
                } else if let recs = recommendations {
                    recommendationsView(recs)
                } else if let error = errorMessage {
                    errorView(error)
                } else {
                    loadingView
                }
            }
            .navigationTitle("AI Recommendations")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Done") {
                        dismiss()
                    }
                }

                if recommendations != nil {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button {
                            generateRecommendations()
                        } label: {
                            Image(systemName: "arrow.clockwise")
                        }
                    }
                }
            }
            .task {
                if recommendations == nil {
                    generateRecommendations()
                }
            }
        }
    }

    // MARK: - Loading View

    private var loadingView: some View {
        VStack(spacing: SeeyaSpacing.lg) {
            Spacer()

            VStack(spacing: SeeyaSpacing.md) {
                Image(systemName: "sparkles")
                    .font(.system(size: 48))
                    .foregroundStyle(Color.seeyaPurple)
                    .symbolEffect(.pulse)

                Text("Getting recommendations for")
                    .font(SeeyaTypography.bodyMedium)
                    .foregroundStyle(Color.seeyaTextSecondary)

                Text(trip.destination)
                    .font(SeeyaTypography.headlineMedium)
                    .foregroundStyle(Color.seeyaTextPrimary)

                ProgressView()
                    .padding(.top, SeeyaSpacing.sm)
            }

            Spacer()

            Text("AI is finding the best local spots...")
                .font(SeeyaTypography.caption)
                .foregroundStyle(Color.seeyaTextTertiary)
                .padding(.bottom, SeeyaSpacing.xl)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.seeyaBackground)
    }

    // MARK: - Error View

    private func errorView(_ error: String) -> some View {
        VStack(spacing: SeeyaSpacing.lg) {
            Spacer()

            VStack(spacing: SeeyaSpacing.md) {
                Image(systemName: "exclamationmark.triangle")
                    .font(.system(size: 48))
                    .foregroundStyle(.orange)

                Text("Couldn't generate recommendations")
                    .font(SeeyaTypography.headlineSmall)
                    .foregroundStyle(Color.seeyaTextPrimary)

                Text(error)
                    .font(SeeyaTypography.bodySmall)
                    .foregroundStyle(Color.seeyaTextSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal)

                Button {
                    generateRecommendations()
                } label: {
                    Label("Try Again", systemImage: "arrow.clockwise")
                }
                .buttonStyle(SeeyaPrimaryButtonStyle())
                .padding(.top, SeeyaSpacing.md)
            }

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.seeyaBackground)
    }

    // MARK: - Recommendations View

    private func recommendationsView(_ recs: AIService.AIRecommendationsResponse) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: SeeyaSpacing.lg) {
                // Header
                VStack(alignment: .leading, spacing: SeeyaSpacing.xs) {
                    HStack {
                        if let flag = trip.locations?.first?.flagEmoji {
                            Text(flag)
                                .font(.title2)
                        }
                        Text(trip.destination)
                            .font(SeeyaTypography.headlineMedium)
                    }

                    Text("AI-curated recommendations just for your trip")
                        .font(SeeyaTypography.bodySmall)
                        .foregroundStyle(Color.seeyaTextSecondary)
                }
                .padding(.horizontal)

                // Category Filter
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: SeeyaSpacing.xs) {
                        FilterChip(
                            title: "All",
                            isSelected: selectedCategory == nil,
                            onTap: { selectedCategory = nil }
                        )

                        FilterChip(
                            title: "Restaurants",
                            icon: "fork.knife",
                            color: .orange,
                            isSelected: selectedCategory == .restaurant,
                            onTap: { selectedCategory = .restaurant }
                        )

                        FilterChip(
                            title: "Activities",
                            icon: "figure.hiking",
                            color: .green,
                            isSelected: selectedCategory == .activity,
                            onTap: { selectedCategory = .activity }
                        )

                        FilterChip(
                            title: "Stays",
                            icon: "bed.double",
                            color: .blue,
                            isSelected: selectedCategory == .stay,
                            onTap: { selectedCategory = .stay }
                        )

                        FilterChip(
                            title: "Tips",
                            icon: "lightbulb",
                            color: Color(red: 0.85, green: 0.65, blue: 0.0),
                            isSelected: selectedCategory == .tip,
                            onTap: { selectedCategory = .tip }
                        )
                    }
                    .padding(.horizontal)
                }

                // Recommendations by category
                VStack(spacing: SeeyaSpacing.lg) {
                    if selectedCategory == nil || selectedCategory == .restaurant {
                        if !recs.restaurants.isEmpty {
                            categorySection(
                                title: "Where to Eat",
                                icon: "fork.knife",
                                color: .orange,
                                items: recs.restaurants,
                                category: .restaurant
                            )
                        }
                    }

                    if selectedCategory == nil || selectedCategory == .activity {
                        if !recs.activities.isEmpty {
                            categorySection(
                                title: "Things to Do",
                                icon: "figure.hiking",
                                color: .green,
                                items: recs.activities,
                                category: .activity
                            )
                        }
                    }

                    if selectedCategory == nil || selectedCategory == .stay {
                        if !recs.stays.isEmpty {
                            categorySection(
                                title: "Where to Stay",
                                icon: "bed.double",
                                color: .blue,
                                items: recs.stays,
                                category: .stay
                            )
                        }
                    }

                    if selectedCategory == nil || selectedCategory == .tip {
                        if !recs.tips.isEmpty {
                            categorySection(
                                title: "Local Tips",
                                icon: "lightbulb",
                                color: Color(red: 0.85, green: 0.65, blue: 0.0),
                                items: recs.tips,
                                category: .tip
                            )
                        }
                    }
                }
                .padding(.horizontal)

                // Footer
                HStack {
                    Image(systemName: "sparkles")
                        .font(.caption)
                    Text("Generated by AI. Verify details before booking.")
                        .font(SeeyaTypography.caption)
                }
                .foregroundStyle(Color.seeyaTextTertiary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, SeeyaSpacing.lg)
            }
            .padding(.vertical)
        }
        .background(Color.seeyaBackground)
    }

    // MARK: - Category Section

    private func categorySection(
        title: String,
        icon: String,
        color: Color,
        items: [AIService.AIRecommendation],
        category: RecommendationCategory
    ) -> some View {
        VStack(alignment: .leading, spacing: SeeyaSpacing.sm) {
            HStack(spacing: SeeyaSpacing.xs) {
                Image(systemName: icon)
                    .foregroundStyle(color)
                Text(title)
                    .font(SeeyaTypography.headlineSmall)
            }

            VStack(spacing: SeeyaSpacing.sm) {
                ForEach(items) { item in
                    AIRecommendationCard(
                        recommendation: item,
                        color: color,
                        isAdded: addedIds.contains(item.id),
                        onAdd: {
                            addRecommendation(item, category: category)
                        }
                    )
                }
            }
        }
    }

    // MARK: - Actions

    private func generateRecommendations() {
        isLoading = true
        errorMessage = nil

        Task {
            do {
                let recs = try await AIService.shared.generateDestinationRecommendations(
                    destination: trip.destination,
                    tripDates: (trip.startDate, trip.endDate)
                )
                recommendations = recs
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }

    private func addRecommendation(_ item: AIService.AIRecommendation, category: RecommendationCategory) {
        Task {
            let description = item.tips != nil
                ? "\(item.description)\n\nTip: \(item.tips!)"
                : item.description

            let success = await onAddRecommendation(item.title, description, category)
            if success {
                addedIds.insert(item.id)
            }
        }
    }
}

// MARK: - Filter Chip

private struct FilterChip: View {
    let title: String
    var icon: String? = nil
    var color: Color = Color.seeyaPurple
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 4) {
                if let icon = icon {
                    Image(systemName: icon)
                        .font(.caption)
                }
                Text(title)
                    .font(SeeyaTypography.labelSmall)
            }
            .foregroundStyle(isSelected ? .white : color)
            .padding(.horizontal, SeeyaSpacing.sm)
            .padding(.vertical, SeeyaSpacing.xs)
            .background(isSelected ? color : color.opacity(0.1))
            .clipShape(Capsule())
        }
    }
}

// MARK: - AI Recommendation Card

private struct AIRecommendationCard: View {
    let recommendation: AIService.AIRecommendation
    let color: Color
    let isAdded: Bool
    let onAdd: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: SeeyaSpacing.sm) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: SeeyaSpacing.xxs) {
                    Text(recommendation.title)
                        .font(SeeyaTypography.labelMedium)
                        .fontWeight(.semibold)
                        .foregroundStyle(Color.seeyaTextPrimary)

                    Text(recommendation.description)
                        .font(SeeyaTypography.bodySmall)
                        .foregroundStyle(Color.seeyaTextSecondary)
                        .lineLimit(3)
                }

                Spacer()

                Button {
                    onAdd()
                } label: {
                    if isAdded {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.title3)
                            .foregroundStyle(.green)
                    } else {
                        Image(systemName: "plus.circle.fill")
                            .font(.title3)
                            .foregroundStyle(color)
                    }
                }
                .disabled(isAdded)
            }

            // Tips and meta info
            HStack(spacing: SeeyaSpacing.md) {
                if let cost = recommendation.estimatedCost {
                    HStack(spacing: 2) {
                        Image(systemName: "dollarsign.circle")
                            .font(.caption2)
                        Text(cost)
                            .font(SeeyaTypography.caption)
                    }
                    .foregroundStyle(Color.seeyaTextTertiary)
                }

                if let time = recommendation.bestTimeToVisit {
                    HStack(spacing: 2) {
                        Image(systemName: "clock")
                            .font(.caption2)
                        Text(time)
                            .font(SeeyaTypography.caption)
                    }
                    .foregroundStyle(Color.seeyaTextTertiary)
                }
            }

            if let tips = recommendation.tips, !tips.isEmpty {
                HStack(alignment: .top, spacing: SeeyaSpacing.xxs) {
                    Image(systemName: "lightbulb.fill")
                        .font(.caption2)
                        .foregroundStyle(.orange)
                    Text(tips)
                        .font(SeeyaTypography.caption)
                        .foregroundStyle(Color.seeyaTextSecondary)
                        .lineLimit(2)
                }
                .padding(.top, 2)
            }
        }
        .padding(SeeyaSpacing.md)
        .background(Color.seeyaCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(isAdded ? Color.green.opacity(0.3) : Color.clear, lineWidth: 2)
        )
    }
}

#Preview {
    AIRecommendationsSheet(
        trip: Trip(
            id: UUID(),
            userId: UUID(),
            name: "Japan Adventure",
            description: nil,
            startDate: Date(),
            endDate: Date().addingTimeInterval(7 * 24 * 60 * 60),
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
        onAddRecommendation: { _, _, _ in true }
    )
}
