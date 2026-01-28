import SwiftUI

struct TravelCircleView: View {
    @State private var viewModel = TravelCircleViewModel()
    @State private var showAddPalSheet = false
    @State private var showPendingRequests = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: SeeyaSpacing.lg) {
                    headerSection

                    if viewModel.hasPendingRequests {
                        pendingRequestsBanner
                    }

                    TravelPalsHorizontalSection(
                        travelPals: viewModel.filteredTravelPals,
                        onAddPalTapped: { showAddPalSheet = true }
                    )

                    TripmatesSection(
                        tripmates: viewModel.filteredTripmates,
                        sentRequestIds: Set(viewModel.sentRequests.map { $0.addresseeId }),
                        onAddAsPal: { profile in
                            Task {
                                _ = await viewModel.addTripmateAsPal(profile)
                            }
                        }
                    )
                }
                .padding(.horizontal, SeeyaSpacing.md)
                .padding(.vertical, SeeyaSpacing.sm)
            }
            .background(Color.seeyaBackground)
            .navigationTitle("Travel Circle")
            .searchable(
                text: $viewModel.searchText,
                prompt: "Search travel circle..."
            )
            .refreshable {
                await viewModel.fetchAllData()
            }
            .task {
                await viewModel.fetchAllData()
            }
            .sheet(isPresented: $showAddPalSheet) {
                AddPalSheet(viewModel: viewModel)
            }
            .sheet(isPresented: $showPendingRequests) {
                PendingRequestsView(viewModel: viewModel)
            }
            .overlay {
                if viewModel.isLoading && viewModel.travelPals.isEmpty && viewModel.tripmates.isEmpty {
                    ProgressView()
                        .scaleEffect(1.2)
                }
            }
        }
    }

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: SeeyaSpacing.xs) {
            Text("Your Travel Circle")
                .font(SeeyaTypography.headlineLarge)
                .foregroundStyle(Color.seeyaTextPrimary)

            Text("Connect with travel pals and tripmates")
                .font(SeeyaTypography.bodyMedium)
                .foregroundStyle(Color.seeyaTextSecondary)
        }
    }

    private var pendingRequestsBanner: some View {
        Button {
            showPendingRequests = true
        } label: {
            HStack(spacing: SeeyaSpacing.sm) {
                Image(systemName: "bell.badge.fill")
                    .font(.system(size: SeeyaIconSize.medium))
                    .foregroundStyle(Color.seeyaPurple)

                VStack(alignment: .leading, spacing: 2) {
                    Text("Pending Requests")
                        .font(SeeyaTypography.labelMedium)
                        .foregroundStyle(Color.seeyaTextPrimary)

                    Text("\(viewModel.pendingRequestCount) friend \(viewModel.pendingRequestCount == 1 ? "request" : "requests") waiting")
                        .font(SeeyaTypography.caption)
                        .foregroundStyle(Color.seeyaTextSecondary)
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.system(size: SeeyaIconSize.small))
                    .foregroundStyle(Color.seeyaTextTertiary)
            }
            .padding(SeeyaSpacing.md)
            .background(Color.seeyaPurple.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .buttonStyle(.plain)
    }
}

#Preview {
    TravelCircleView()
}
