import SwiftUI

struct FriendRecommendationsSection: View {
    let tripId: UUID
    let tripLocations: [TripLocation]

    @State private var recommendations: [SharedRecommendation] = []
    @State private var isLoading = false
    @State private var addedRecommendationIds: Set<UUID> = []
    @State private var savedRecommendationIds: Set<UUID> = []

    private var cityIds: [UUID] {
        tripLocations.compactMap { $0.cityId }
    }

    /// Group recommendations by category
    private var groupedRecommendations: [(category: RecommendationCategory, items: [SharedRecommendation])] {
        let grouped = Dictionary(grouping: recommendations, by: { $0.category })
        return RecommendationCategory.allCases.compactMap { category in
            guard let items = grouped[category], !items.isEmpty else { return nil }
            return (category: category, items: items)
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: SeeyaSpacing.sm) {
            // Section Header
            SectionHeader(
                title: "From Your Circle",
                icon: "person.2.fill"
            )

            if isLoading {
                loadingView
            } else if recommendations.isEmpty {
                emptyView
            } else {
                recommendationsContent
            }
        }
        .task {
            await fetchRecommendations()
        }
    }

    // MARK: - Loading

    private var loadingView: some View {
        HStack {
            Spacer()
            VStack(spacing: SeeyaSpacing.xs) {
                ProgressView()
                Text("Checking friend recommendations...")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .padding()
            Spacer()
        }
        .background(Color.seeyaCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: SeeyaRadius.card))
    }

    // MARK: - Empty State

    private var emptyView: some View {
        HStack(spacing: SeeyaSpacing.sm) {
            Image(systemName: "person.2")
                .font(.title3)
                .foregroundStyle(.tertiary)

            VStack(alignment: .leading, spacing: 2) {
                Text("No friend recommendations yet")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                Text("When friends share tips for these destinations, they will appear here.")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.seeyaCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: SeeyaRadius.card))
    }

    // MARK: - Recommendations Content

    private var recommendationsContent: some View {
        LazyVStack(spacing: SeeyaSpacing.sm) {
            ForEach(groupedRecommendations, id: \.category) { group in
                VStack(alignment: .leading, spacing: SeeyaSpacing.xs) {
                    // Category header
                    HStack(spacing: SeeyaSpacing.xs) {
                        Image(systemName: group.category.icon)
                            .font(.caption)
                            .foregroundStyle(categoryColor(group.category))
                        Text(group.category.displayName)
                            .font(SeeyaTypography.headlineSmall)
                        Text("\(group.items.count)")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .padding(.horizontal, 6)
                            .padding(.vertical, 2)
                            .background(Color(.systemGray5))
                            .clipShape(Capsule())
                    }

                    // Recommendation cards
                    VStack(spacing: 0) {
                        ForEach(Array(group.items.enumerated()), id: \.element.id) { index, rec in
                            if index > 0 {
                                Divider()
                            }
                            friendRecommendationCard(rec)
                        }
                    }
                    .background(Color.seeyaCardBackground)
                    .clipShape(RoundedRectangle(cornerRadius: SeeyaRadius.card))
                    .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
                }
            }
        }
    }

    // MARK: - Friend Recommendation Card

    private func friendRecommendationCard(_ rec: SharedRecommendation) -> some View {
        VStack(alignment: .leading, spacing: SeeyaSpacing.xs) {
            // Author row
            HStack(spacing: SeeyaSpacing.xs) {
                AvatarView(
                    name: rec.profile?.fullName ?? "User",
                    avatarUrl: rec.profile?.avatarUrl,
                    size: 28
                )

                VStack(alignment: .leading, spacing: 0) {
                    Text(rec.profile?.fullName ?? "A friend")
                        .font(SeeyaTypography.labelMedium)
                    if let username = rec.profile?.username {
                        Text("@\(username)")
                            .font(SeeyaTypography.captionSmall)
                            .foregroundStyle(.tertiary)
                    }
                }

                Spacer()

                // Rating stars
                if let rating = rec.rating, rating > 0 {
                    HStack(spacing: 2) {
                        ForEach(1...5, id: \.self) { star in
                            Image(systemName: star <= rating ? "star.fill" : "star")
                                .font(.caption2)
                                .foregroundStyle(star <= rating ? .yellow : Color(.systemGray4))
                        }
                    }
                }
            }

            // Title and category icon
            HStack(spacing: SeeyaSpacing.xs) {
                Image(systemName: rec.category.icon)
                    .font(.caption)
                    .foregroundStyle(categoryColor(rec.category))
                    .frame(width: 24, height: 24)
                    .background(categoryColor(rec.category).opacity(0.15))
                    .clipShape(RoundedRectangle(cornerRadius: 6))

                Text(rec.title)
                    .font(.subheadline)
                    .fontWeight(.semibold)
            }

            // Tips preview
            if let tips = rec.tips, !tips.isEmpty {
                HStack(alignment: .top, spacing: SeeyaSpacing.xxs) {
                    Image(systemName: "quote.opening")
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                    Text(tips)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }
            }

            // Action buttons
            HStack(spacing: SeeyaSpacing.sm) {
                Spacer()

                // Save button
                Button {
                    toggleSaved(rec)
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: savedRecommendationIds.contains(rec.id) ? "bookmark.fill" : "bookmark")
                            .font(.caption2)
                        Text(savedRecommendationIds.contains(rec.id) ? "Saved" : "Save")
                            .font(.caption2)
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(
                        savedRecommendationIds.contains(rec.id)
                            ? Color.seeyaPurple.opacity(0.15)
                            : Color(.systemGray5)
                    )
                    .foregroundStyle(
                        savedRecommendationIds.contains(rec.id)
                            ? Color.seeyaPurple
                            : .primary
                    )
                    .clipShape(Capsule())
                }

                // Add to Trip button
                Button {
                    addToTrip(rec)
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: addedRecommendationIds.contains(rec.id) ? "checkmark" : "plus")
                            .font(.caption2)
                        Text(addedRecommendationIds.contains(rec.id) ? "Added" : "Add to Trip")
                            .font(.caption2)
                    }
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(
                        addedRecommendationIds.contains(rec.id)
                            ? Color.green.opacity(0.15)
                            : Color.seeyaPurple.opacity(0.15)
                    )
                    .foregroundStyle(
                        addedRecommendationIds.contains(rec.id)
                            ? .green
                            : Color.seeyaPurple
                    )
                    .clipShape(Capsule())
                }
                .disabled(addedRecommendationIds.contains(rec.id))
            }
        }
        .padding()
    }

    // MARK: - Actions

    private func fetchRecommendations() async {
        guard !cityIds.isEmpty else { return }
        isLoading = true

        do {
            recommendations = try await RecommendationService.shared
                .fetchFriendRecommendations(cityIds: cityIds)
        } catch {
            print("[FriendRecommendationsSection] Fetch error: \(error.localizedDescription)")
        }

        isLoading = false
    }

    private func addToTrip(_ rec: SharedRecommendation) {
        Task {
            do {
                _ = try await RecommendationService.shared
                    .addRecommendationToTrip(recommendation: rec, tripId: tripId)
                addedRecommendationIds.insert(rec.id)
            } catch {
                print("[FriendRecommendationsSection] Add to trip error: \(error.localizedDescription)")
            }
        }
    }

    private func toggleSaved(_ rec: SharedRecommendation) {
        // Toggle local state for bookmark visual feedback.
        // A full saved_recommendations table insert could be added here in the future.
        if savedRecommendationIds.contains(rec.id) {
            savedRecommendationIds.remove(rec.id)
        } else {
            savedRecommendationIds.insert(rec.id)
        }
    }

    // MARK: - Helpers

    private func categoryColor(_ category: RecommendationCategory) -> Color {
        switch category {
        case .restaurant: return .orange
        case .activity: return .green
        case .stay: return .blue
        case .tip: return Color(red: 0.85, green: 0.65, blue: 0.0)
        }
    }
}

#Preview {
    ScrollView {
        FriendRecommendationsSection(
            tripId: UUID(),
            tripLocations: []
        )
        .padding()
    }
    .background(Color.seeyaBackground)
}
