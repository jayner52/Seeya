import SwiftUI

struct TripPackHeader: View {
    @Bindable var viewModel: TripPackViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Title row with controls
            HStack {
                Text("TripPack")
                    .font(.headline)

                Spacer()

                // View mode picker
                Menu {
                    ForEach(TripPackViewMode.allCases, id: \.self) { mode in
                        Button {
                            viewModel.viewMode = mode
                        } label: {
                            Label(mode.displayName, systemImage: mode.icon)
                        }
                    }
                } label: {
                    Image(systemName: viewModel.viewMode.icon)
                        .font(.body)
                        .foregroundStyle(Color.seeyaPurple)
                }

                // Grouping picker
                Menu {
                    ForEach(TripPackGrouping.allCases, id: \.self) { grouping in
                        Button {
                            viewModel.grouping = grouping
                        } label: {
                            HStack {
                                Text(grouping.displayName)
                                if viewModel.grouping == grouping {
                                    Image(systemName: "checkmark")
                                }
                            }
                        }
                    }
                } label: {
                    Image(systemName: "arrow.up.arrow.down")
                        .font(.body)
                        .foregroundStyle(Color.seeyaPurple)
                }

                // Add button
                Button {
                    viewModel.startAddFlow()
                } label: {
                    Image(systemName: "plus")
                        .font(.body)
                        .foregroundStyle(Color.seeyaPurple)
                }
            }

            // Filter tabs
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(TripPackFilter.allCases, id: \.self) { filter in
                        FilterPill(
                            title: filter.displayName,
                            count: viewModel.categoryFilterCounts[filter] ?? 0,
                            isSelected: viewModel.activeFilter == filter
                        ) {
                            viewModel.activeFilter = filter
                        }
                    }
                }
            }

            // Search bar (collapsed by default, expand on tap)
            if !viewModel.isEmpty {
                HStack(spacing: 8) {
                    Image(systemName: "magnifyingglass")
                        .foregroundStyle(.secondary)

                    TextField("Search TripPack...", text: $viewModel.searchText)
                        .textFieldStyle(.plain)

                    if !viewModel.searchText.isEmpty {
                        Button {
                            viewModel.searchText = ""
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .foregroundStyle(.secondary)
                        }
                    }
                }
                .padding(10)
                .background(Color(.systemGray6))
                .clipShape(RoundedRectangle(cornerRadius: 10))
            }
        }
    }
}

// MARK: - Filter Pill

struct FilterPill: View {
    let title: String
    let count: Int
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 4) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(isSelected ? .semibold : .regular)

                if count > 0 && !isSelected {
                    Text("\(count)")
                        .font(.caption2)
                        .fontWeight(.medium)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color(.systemGray5))
                        .clipShape(Capsule())
                }
            }
            .foregroundStyle(isSelected ? .white : .primary)
            .padding(.horizontal, 14)
            .padding(.vertical, 8)
            .background(isSelected ? Color.seeyaAccent : Color.gray.opacity(0.1))
            .clipShape(Capsule())
        }
    }
}

#Preview {
    VStack {
        TripPackHeader(viewModel: TripPackViewModel(tripId: UUID()))
            .padding()
    }
    .background(Color.seeyaBackground)
}
