import SwiftUI

struct ProfileView: View {
    @Bindable var authViewModel: AuthViewModel
    @State private var viewModel = ProfileViewModel()
    @State private var tripsViewModel = TripsViewModel()
    @State private var showingEditProfile = false
    @State private var showingAddWanderlist = false
    @State private var showingSettings = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    ProfileHeaderView(
                        profile: viewModel.profile,
                        onEditTapped: { showingEditProfile = true }
                    )

                    ProfileStatsRow(
                        tripCount: viewModel.tripCount,
                        recommendationCount: viewModel.recommendationCount,
                        countriesCount: viewModel.countriesVisitedCount,
                        citiesCount: viewModel.citiesVisitedCount
                    )

                    WanderlistSection(
                        items: viewModel.wanderlistItems,
                        onAddTapped: { showingAddWanderlist = true },
                        onRemoveItem: { item in
                            Task {
                                _ = await viewModel.removeFromWanderlist(itemId: item.id)
                            }
                        }
                    )

                    TravelPalsSection(friends: viewModel.friends)

                    ProfileTripsSection(
                        upcomingTrips: viewModel.upcomingTrips,
                        pastTrips: viewModel.pastTrips,
                        tripsViewModel: tripsViewModel
                    )

                    if !viewModel.savedRecommendations.isEmpty {
                        SavedRecommendationsSection(
                            savedRecommendations: viewModel.savedRecommendations,
                            onRemove: { saved in
                                Task {
                                    _ = await viewModel.unsaveRecommendation(savedId: saved.id)
                                }
                            }
                        )
                    }

                    Spacer()
                        .frame(height: SeeyaSpacing.xl)
                }
                .padding()
            }
            .background(Color.seeyaBackground)
            .navigationTitle("Profile")
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showingSettings = true
                    } label: {
                        Image(systemName: "gearshape")
                            .font(.system(size: SeeyaIconSize.medium))
                            .foregroundStyle(Color.seeyaTextSecondary)
                    }
                }
            }
            .task {
                await viewModel.fetchAllData()
            }
            .refreshable {
                await viewModel.fetchAllData()
            }
            .sheet(isPresented: $showingEditProfile) {
                EditProfileView(viewModel: viewModel)
            }
            .sheet(isPresented: $showingAddWanderlist) {
                AddToWanderlistSheet(viewModel: viewModel)
            }
            .sheet(isPresented: $showingSettings) {
                SettingsView(authViewModel: authViewModel)
            }
        }
    }
}

#Preview {
    ProfileView(authViewModel: AuthViewModel())
}
