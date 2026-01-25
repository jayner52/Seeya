import SwiftUI

struct LocationSearchView: View {
    @Environment(\.dismiss) private var dismiss
    @Binding var selectedLocation: String
    @Binding var selectedPlaceId: String?

    @State private var searchText = ""
    @State private var predictions: [PlacePrediction] = []
    @State private var isSearching = false
    @State private var searchTask: Task<Void, Never>?

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Search results
                if predictions.isEmpty && !searchText.isEmpty && !isSearching {
                    emptyState
                } else {
                    resultsList
                }
            }
            .navigationTitle("Search Location")
            .navigationBarTitleDisplayMode(.inline)
            .searchable(text: $searchText, prompt: "Search cities...")
            .onChange(of: searchText) { _, newValue in
                performSearch(query: newValue)
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "mappin.slash")
                .font(.system(size: 48))
                .foregroundStyle(.tertiary)

            Text("No Results")
                .font(.headline)

            Text("Try a different search term")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
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
                    selectLocation(prediction)
                } label: {
                    HStack(spacing: 12) {
                        Image(systemName: "mappin.circle.fill")
                            .font(.title2)
                            .foregroundStyle(Color.seeyaPurple)

                        VStack(alignment: .leading, spacing: 2) {
                            Text(prediction.mainText)
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundStyle(.primary)

                            if !prediction.secondaryText.isEmpty {
                                Text(prediction.secondaryText)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }

                        Spacer()

                        Image(systemName: "chevron.right")
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                    }
                }
                .buttonStyle(.plain)
            }

            // Manual entry option
            if !searchText.isEmpty {
                Button {
                    selectManualEntry()
                } label: {
                    HStack(spacing: 12) {
                        Image(systemName: "pencil.circle.fill")
                            .font(.title2)
                            .foregroundStyle(.secondary)

                        VStack(alignment: .leading, spacing: 2) {
                            Text("Use \"\(searchText)\"")
                                .font(.subheadline)
                                .fontWeight(.medium)
                                .foregroundStyle(.primary)

                            Text("Enter as custom location")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }

                        Spacer()
                    }
                }
                .buttonStyle(.plain)
            }
        }
        .listStyle(.plain)
    }

    private func performSearch(query: String) {
        // Cancel any existing search
        searchTask?.cancel()

        guard !query.isEmpty else {
            predictions = []
            return
        }

        // Debounce search
        searchTask = Task {
            try? await Task.sleep(nanoseconds: 300_000_000) // 300ms debounce

            guard !Task.isCancelled else { return }

            await MainActor.run {
                isSearching = true
            }

            do {
                let results = try await PlacesService.shared.autocomplete(query: query)

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

    private func selectLocation(_ prediction: PlacePrediction) {
        selectedLocation = prediction.fullText
        selectedPlaceId = prediction.id
        dismiss()
    }

    private func selectManualEntry() {
        selectedLocation = searchText
        selectedPlaceId = nil
        dismiss()
    }
}

// MARK: - Location Field (for forms)

struct LocationField: View {
    let title: String
    @Binding var location: String
    @Binding var placeId: String?
    @State private var showSearch = false

    var body: some View {
        Button {
            showSearch = true
        } label: {
            HStack {
                Text(title)
                    .foregroundStyle(.primary)

                Spacer()

                if location.isEmpty {
                    Text("Select location")
                        .foregroundStyle(.secondary)
                } else {
                    Text(location)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }

                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
            }
        }
        .buttonStyle(.plain)
        .sheet(isPresented: $showSearch) {
            LocationSearchView(
                selectedLocation: $location,
                selectedPlaceId: $placeId
            )
        }
    }
}

#Preview {
    NavigationStack {
        Form {
            LocationField(
                title: "Destination",
                location: .constant("Paris, France"),
                placeId: .constant(nil)
            )
        }
    }
}
