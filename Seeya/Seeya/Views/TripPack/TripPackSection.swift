import SwiftUI

struct TripPackSection: View {
    @Bindable var viewModel: TripPackViewModel
    let trip: Trip

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Header with filters and controls
            TripPackHeader(viewModel: viewModel)

            // Content
            if viewModel.isLoading {
                loadingView
            } else if viewModel.isEmpty {
                emptyStateView
            } else if !viewModel.hasFilteredResults {
                noResultsView
            } else {
                tripBitsList
            }
        }
    }

    // MARK: - Loading View

    private var loadingView: some View {
        VStack(spacing: 12) {
            ProgressView()
            Text("Loading your TripPack...")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 40)
        .seeyaCard()
    }

    // MARK: - Empty State

    private var emptyStateView: some View {
        VStack(spacing: 20) {
            Image(systemName: "suitcase")
                .font(.system(size: 56))
                .foregroundStyle(.tertiary)

            VStack(spacing: 8) {
                Text("Your TripPack is Empty")
                    .font(.title3)
                    .fontWeight(.semibold)

                Text("Add flights, hotels, activities, and more to organize your trip.")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }

            HStack(spacing: 12) {
                Button {
                    viewModel.startAddFlow()
                } label: {
                    Label("Add Item", systemImage: "plus")
                }
                .buttonStyle(SeeyaSecondaryButtonStyle())

                Button {
                    viewModel.startAIQuickAdd()
                } label: {
                    Label("AI Quick Add", systemImage: "sparkles")
                }
                .buttonStyle(SeeyaSecondaryButtonStyle())
            }
        }
        .padding(32)
        .frame(maxWidth: .infinity)
        .seeyaCard()
    }

    // MARK: - No Results View

    private var noResultsView: some View {
        VStack(spacing: 12) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 40))
                .foregroundStyle(.tertiary)

            Text("No items match your filter")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Button {
                viewModel.activeFilter = .all
                viewModel.searchText = ""
            } label: {
                Text("Clear Filters")
            }
            .buttonStyle(SeeyaSecondaryButtonStyle())
        }
        .padding(32)
        .frame(maxWidth: .infinity)
        .seeyaCard()
    }

    // MARK: - Trip Bits List

    @ViewBuilder
    private var tripBitsList: some View {
        switch viewModel.viewMode {
        case .full:
            fullListView
        case .compact:
            compactListView
        case .byType:
            groupedListView
        }
    }

    private var fullListView: some View {
        VStack(spacing: 12) {
            ForEach(viewModel.groupedTripBits, id: \.key) { group in
                VStack(alignment: .leading, spacing: 8) {
                    Text(group.key)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundStyle(.secondary)

                    ForEach(group.items) { tripBit in
                        TripBitCard(tripBit: tripBit) {
                            viewModel.selectTripBit(tripBit)
                        }
                    }
                }
            }
        }
    }

    private var compactListView: some View {
        VStack(spacing: 0) {
            ForEach(Array(viewModel.filteredTripBits.enumerated()), id: \.element.id) { index, tripBit in
                if index > 0 {
                    Divider()
                }
                TripBitCompactRow(tripBit: tripBit) {
                    viewModel.selectTripBit(tripBit)
                }
            }
        }
        .background(Color.seeyaCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
    }

    private var groupedListView: some View {
        VStack(spacing: 16) {
            ForEach(viewModel.groupedTripBits, id: \.key) { group in
                VStack(alignment: .leading, spacing: 8) {
                    HStack(spacing: 8) {
                        if let category = TripBitCategory.allCases.first(where: { $0.displayName == group.key }) {
                            Image(systemName: category.icon)
                                .foregroundStyle(category.color)
                        }
                        Text(group.key)
                            .font(.headline)

                        Spacer()

                        Text("\(group.items.count)")
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundStyle(.secondary)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color(.systemGray5))
                            .clipShape(Capsule())
                    }

                    VStack(spacing: 0) {
                        ForEach(Array(group.items.enumerated()), id: \.element.id) { index, tripBit in
                            if index > 0 {
                                Divider()
                            }
                            TripBitCompactRow(tripBit: tripBit) {
                                viewModel.selectTripBit(tripBit)
                            }
                        }
                    }
                    .background(Color.seeyaCardBackground)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
                }
            }
        }
    }
}

#Preview {
    ScrollView {
        TripPackSection(
            viewModel: TripPackViewModel(tripId: UUID()),
            trip: Trip(
                id: UUID(),
                userId: UUID(),
                name: "Sample Trip",
                description: nil,
                startDate: Date(),
                endDate: Date(),
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
            )
        )
        .padding()
    }
    .background(Color.seeyaBackground)
}
