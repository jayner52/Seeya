import SwiftUI

struct AddToWanderlistSheet: View {
    @Bindable var viewModel: ProfileViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var isAdding = false

    var body: some View {
        NavigationStack {
            PlaceSearchView(
                viewModel: viewModel,
                isAdding: $isAdding,
                onDismiss: { dismiss() }
            )
            .navigationTitle("Add to Wanderlist")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }
}

// MARK: - Unified Place Search View (Uses Google Places API)

private struct PlaceSearchView: View {
    @Bindable var viewModel: ProfileViewModel
    @Binding var isAdding: Bool
    let onDismiss: () -> Void

    @State private var searchText = ""
    @State private var predictions: [PlacePrediction] = []
    @State private var isSearching = false
    @State private var searchTask: Task<Void, Never>?
    @State private var selectedPlace: PlacePrediction?
    @State private var notes = ""
    @State private var showError = false
    @State private var errorMessage = ""

    var body: some View {
        VStack(spacing: 0) {
            if let place = selectedPlace {
                selectedPlaceView(place)
            } else {
                searchView
            }
        }
        .alert("Error", isPresented: $showError) {
            Button("OK", role: .cancel) { }
        } message: {
            Text(errorMessage)
        }
    }

    private func selectedPlaceView(_ place: PlacePrediction) -> some View {
        VStack(spacing: SeeyaSpacing.md) {
            HStack(spacing: SeeyaSpacing.sm) {
                Image(systemName: "mappin.circle.fill")
                    .font(.system(size: 40))
                    .foregroundStyle(Color.seeyaPurple)

                VStack(alignment: .leading, spacing: SeeyaSpacing.xxs) {
                    Text(place.mainText)
                        .font(SeeyaTypography.headlineLarge)

                    if !place.secondaryText.isEmpty {
                        Text(place.secondaryText)
                            .font(SeeyaTypography.caption)
                            .foregroundStyle(Color.seeyaTextSecondary)
                    }
                }

                Spacer()

                Button {
                    selectedPlace = nil
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.title2)
                        .foregroundStyle(Color.seeyaTextTertiary)
                }
            }
            .padding(SeeyaSpacing.md)
            .background(Color.seeyaPurple.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 12))

            notesField

            Spacer()

            addButton {
                Task {
                    isAdding = true
                    let success = await viewModel.addPlaceToWanderlist(
                        placeName: place.fullText,
                        placeId: place.id,
                        notes: notes.isEmpty ? nil : notes
                    )
                    isAdding = false
                    if success {
                        onDismiss()
                    } else {
                        errorMessage = viewModel.errorMessage ?? "Failed to add place to wanderlist"
                        showError = true
                    }
                }
            }
        }
        .padding(SeeyaSpacing.md)
    }

    private var searchView: some View {
        VStack(spacing: 0) {
            searchBar

            if searchText.isEmpty {
                // Empty state - prompt to search
                VStack(spacing: SeeyaSpacing.md) {
                    Image(systemName: "magnifyingglass")
                        .font(.system(size: 48))
                        .foregroundStyle(.tertiary)

                    Text("Search for a place")
                        .font(SeeyaTypography.headlineMedium)

                    Text("Search for any city or country")
                        .font(SeeyaTypography.bodyMedium)
                        .foregroundStyle(Color.seeyaTextSecondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if predictions.isEmpty && !isSearching {
                // No results
                VStack(spacing: SeeyaSpacing.md) {
                    Image(systemName: "mappin.slash")
                        .font(.system(size: 48))
                        .foregroundStyle(.tertiary)

                    Text("No Results")
                        .font(SeeyaTypography.headlineMedium)

                    Text("Try a different search term")
                        .font(SeeyaTypography.bodyMedium)
                        .foregroundStyle(Color.seeyaTextSecondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else {
                resultsList
            }
        }
    }

    private var searchBar: some View {
        HStack {
            Image(systemName: "magnifyingglass")
                .font(.system(size: SeeyaIconSize.medium))
                .foregroundStyle(Color.seeyaTextSecondary)

            TextField("Search cities, countries...", text: $searchText)
                .font(SeeyaTypography.bodyMedium)
                .textFieldStyle(.plain)
                .onChange(of: searchText) { _, newValue in
                    performSearch(query: newValue)
                }

            if !searchText.isEmpty {
                Button {
                    searchText = ""
                    predictions = []
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: SeeyaIconSize.medium))
                        .foregroundStyle(Color.seeyaTextTertiary)
                }
            }
        }
        .padding(SeeyaSpacing.sm)
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .padding(SeeyaSpacing.md)
    }

    private var resultsList: some View {
        List {
            if isSearching {
                HStack {
                    Spacer()
                    ProgressView()
                    Spacer()
                }
                .listRowBackground(Color.clear)
            }

            ForEach(predictions) { prediction in
                Button {
                    selectedPlace = prediction
                } label: {
                    HStack(spacing: SeeyaSpacing.sm) {
                        Image(systemName: "mappin.circle.fill")
                            .font(.title2)
                            .foregroundStyle(Color.seeyaPurple)

                        VStack(alignment: .leading, spacing: 2) {
                            Text(prediction.mainText)
                                .font(SeeyaTypography.bodyMedium)
                                .foregroundStyle(.primary)

                            if !prediction.secondaryText.isEmpty {
                                Text(prediction.secondaryText)
                                    .font(SeeyaTypography.caption)
                                    .foregroundStyle(Color.seeyaTextSecondary)
                            }
                        }

                        Spacer()

                        Image(systemName: "chevron.right")
                            .font(.system(size: SeeyaIconSize.small))
                            .foregroundStyle(Color.seeyaTextTertiary)
                    }
                }
                .buttonStyle(.plain)
            }
        }
        .listStyle(.plain)
    }

    private var notesField: some View {
        VStack(alignment: .leading, spacing: SeeyaSpacing.xs) {
            Text("Notes (optional)")
                .font(SeeyaTypography.bodySmall)
                .foregroundStyle(Color.seeyaTextSecondary)

            TextField("Why do you want to visit?", text: $notes, axis: .vertical)
                .font(SeeyaTypography.bodyMedium)
                .textFieldStyle(.plain)
                .padding(SeeyaSpacing.sm)
                .background(Color(.systemGray6))
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .lineLimit(3...5)
        }
    }

    private func addButton(action: @escaping () -> Void) -> some View {
        Button(action: action) {
            if isAdding {
                ProgressView()
                    .tint(.white)
            } else {
                Text("Add to Wanderlist")
            }
        }
        .buttonStyle(SeeyaPrimaryButtonStyle(isEnabled: !isAdding))
        .disabled(isAdding)
    }

    private func performSearch(query: String) {
        searchTask?.cancel()

        guard !query.isEmpty else {
            predictions = []
            return
        }

        searchTask = Task {
            try? await Task.sleep(nanoseconds: 300_000_000) // 300ms debounce

            guard !Task.isCancelled else { return }

            await MainActor.run {
                isSearching = true
            }

            do {
                let results = try await PlacesService.shared.autocompleteRegions(query: query)

                guard !Task.isCancelled else { return }

                await MainActor.run {
                    predictions = results
                    isSearching = false
                }
            } catch {
                print("Search error: \(error)")
                await MainActor.run {
                    isSearching = false
                }
            }
        }
    }
}

#Preview {
    AddToWanderlistSheet(viewModel: ProfileViewModel())
}
