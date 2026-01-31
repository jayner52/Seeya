import SwiftUI

struct ExploreView: View {
    @State private var viewModel = ExploreViewModel()
    @State private var showMapView = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: SeeyaSpacing.lg) {
                    // Header
                    headerSection

                    // AI Recommendations Section (New!)
                    ExploreAISection()

                    Divider()
                        .padding(.vertical, SeeyaSpacing.sm)

                    // Social Section Header
                    socialSectionHeader

                    // Search Bar for Social Content
                    ExploreSearchBar(
                        searchQuery: $viewModel.searchQuery,
                        countries: viewModel.quickChipCountries,
                        selectedCountry: viewModel.selectedCountry,
                        onCountrySelect: { viewModel.selectCountry($0) }
                    )

                    // Category Filter
                    ExploreCategoryFilter(
                        selectedCategory: viewModel.selectedCategory,
                        onCategorySelect: { viewModel.selectCategory($0) }
                    )

                    // Recommendations Section (from friends)
                    if !viewModel.filteredRecommendations.isEmpty {
                        RecommendationsSection(
                            recommendations: viewModel.filteredRecommendations,
                            savedIds: viewModel.savedRecommendationIds,
                            onToggleSave: { id in
                                Task {
                                    _ = await viewModel.toggleSaveRecommendation(id)
                                }
                            }
                        )
                    }

                    // Map Section
                    if !viewModel.recommendationsWithCoordinates.isEmpty {
                        ExploreMapSection(
                            recommendations: viewModel.recommendationsWithCoordinates,
                            isExpanded: $showMapView
                        )
                    }

                    // Traveling Now & Upcoming
                    TravelingNowSection(trips: viewModel.allTravelingTrips)

                    // Popular in Your Circle
                    PopularDestinationsSection(destinations: viewModel.popularDestinations)

                    // Trending Wanderlist
                    TrendingWanderlistSection(items: viewModel.trendingWanderlist)

                    // Bottom padding
                    Spacer().frame(height: SeeyaSpacing.xl)
                }
                .padding(.horizontal, SeeyaSpacing.md)
                .padding(.vertical, SeeyaSpacing.sm)
            }
            .background(Color.seeyaBackground)
            .navigationTitle("Explore")
            .refreshable {
                await viewModel.fetchAllData()
            }
            .task {
                await viewModel.fetchAllData()
            }
            .overlay {
                if viewModel.isLoading && viewModel.recommendations.isEmpty {
                    ProgressView()
                        .scaleEffect(1.2)
                }
            }
        }
    }

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: SeeyaSpacing.xs) {
            Text("Discover")
                .font(SeeyaTypography.headlineLarge)
                .foregroundStyle(Color.seeyaTextPrimary)

            Text("AI recommendations & inspiration from your circle")
                .font(SeeyaTypography.bodyMedium)
                .foregroundStyle(Color.seeyaTextSecondary)
        }
    }

    private var socialSectionHeader: some View {
        VStack(alignment: .leading, spacing: SeeyaSpacing.xxs) {
            HStack(spacing: SeeyaSpacing.xs) {
                Image(systemName: "person.2.fill")
                    .foregroundStyle(Color.seeyaPurple)
                Text("From Your Circle")
                    .font(SeeyaTypography.headlineMedium)
                    .foregroundStyle(Color.seeyaTextPrimary)
            }

            Text("See what your travel friends are recommending")
                .font(SeeyaTypography.bodySmall)
                .foregroundStyle(Color.seeyaTextSecondary)
        }
    }
}

#Preview {
    ExploreView()
}
