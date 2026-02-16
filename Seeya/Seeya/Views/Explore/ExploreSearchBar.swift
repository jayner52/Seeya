import SwiftUI

struct ExploreSearchBar: View {
    @Binding var searchQuery: String
    let countries: [Country]
    let selectedCountry: Country?
    let onCountrySelect: (Country?) -> Void

    @State private var predictions: [PlacePrediction] = []
    @State private var autocompleteTask: Task<Void, Never>?

    var body: some View {
        VStack(alignment: .leading, spacing: SeeyaSpacing.sm) {
            // Search Field
            HStack(spacing: SeeyaSpacing.sm) {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(Color.seeyaTextTertiary)

                TextField("Where would you like to explore?", text: $searchQuery)
                    .font(SeeyaTypography.bodyMedium)
                    .onChange(of: searchQuery) { _, newValue in
                        autocompleteTask?.cancel()
                        guard !newValue.isEmpty, newValue.count >= 2 else {
                            predictions = []
                            return
                        }
                        autocompleteTask = Task {
                            try? await Task.sleep(nanoseconds: 300_000_000)
                            guard !Task.isCancelled else { return }
                            do {
                                let results = try await PlacesService.shared.autocomplete(query: newValue)
                                if !Task.isCancelled {
                                    predictions = results
                                }
                            } catch {
                                if !Task.isCancelled {
                                    predictions = []
                                }
                            }
                        }
                    }

                if !searchQuery.isEmpty {
                    Button {
                        searchQuery = ""
                        predictions = []
                        autocompleteTask?.cancel()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(Color.seeyaTextTertiary)
                    }
                }
            }
            .padding(SeeyaSpacing.sm)
            .background(Color.seeyaSurface)
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .overlay(alignment: .top) {
                if !predictions.isEmpty {
                    VStack(spacing: 0) {
                        ForEach(predictions) { prediction in
                            Button {
                                searchQuery = prediction.mainText
                                predictions = []
                                autocompleteTask?.cancel()
                            } label: {
                                HStack(spacing: SeeyaSpacing.xs) {
                                    Image(systemName: "mappin.circle.fill")
                                        .foregroundStyle(Color.seeyaPurple)
                                        .font(.body)
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(prediction.mainText)
                                            .font(SeeyaTypography.labelSmall)
                                            .foregroundStyle(Color.seeyaTextPrimary)
                                        if !prediction.secondaryText.isEmpty {
                                            Text(prediction.secondaryText)
                                                .font(SeeyaTypography.caption)
                                                .foregroundStyle(Color.seeyaTextTertiary)
                                        }
                                    }
                                    Spacer()
                                }
                                .padding(.horizontal, SeeyaSpacing.sm)
                                .padding(.vertical, SeeyaSpacing.xs)
                            }

                            if prediction.id != predictions.last?.id {
                                Divider()
                                    .padding(.leading, SeeyaSpacing.xl)
                            }
                        }
                    }
                    .background(Color.seeyaSurface)
                    .clipShape(RoundedRectangle(cornerRadius: 10))
                    .shadow(color: .black.opacity(0.15), radius: 8, y: 4)
                    .offset(y: 48)
                }
            }
            .zIndex(1)

            // Country Quick Chips
            if !countries.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: SeeyaSpacing.xs) {
                        ForEach(countries) { country in
                            ExploreCountryChip(
                                country: country,
                                isSelected: selectedCountry?.id == country.id,
                                onTap: { onCountrySelect(country) }
                            )
                        }
                    }
                }
            }
        }
    }
}

// MARK: - Explore Country Chip

private struct ExploreCountryChip: View {
    let country: Country
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: SeeyaSpacing.xxs) {
                if let flag = country.flagEmoji {
                    Text(flag)
                        .font(.system(size: 14))
                }
                Text(country.name)
                    .font(SeeyaTypography.labelMedium)
            }
            .foregroundStyle(isSelected ? .white : Color.seeyaTextPrimary)
            .padding(.horizontal, SeeyaSpacing.sm)
            .padding(.vertical, SeeyaSpacing.xs)
            .background(isSelected ? Color.seeyaAccent : Color.seeyaSurface)
            .clipShape(Capsule())
        }
    }
}

#Preview {
    ExploreSearchBar(
        searchQuery: .constant(""),
        countries: [],
        selectedCountry: nil,
        onCountrySelect: { _ in }
    )
    .padding()
}
