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

                    // Search Bar
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

                    // Recommendations Section
                    RecommendationsSection(
                        recommendations: viewModel.filteredRecommendations,
                        savedIds: viewModel.savedRecommendationIds,
                        onToggleSave: { id in
                            Task {
                                _ = await viewModel.toggleSaveRecommendation(id)
                            }
                        }
                    )

                    // Map Section
                    ExploreMapSection(
                        recommendations: viewModel.recommendationsWithCoordinates,
                        isExpanded: $showMapView
                    )

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

            Text("Travel inspiration from your circle")
                .font(SeeyaTypography.bodyMedium)
                .foregroundStyle(Color.seeyaTextSecondary)
        }
    }
}

#Preview {
    ExploreView()
}
