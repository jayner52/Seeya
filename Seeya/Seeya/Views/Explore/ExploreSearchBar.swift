import SwiftUI

struct ExploreSearchBar: View {
    @Binding var searchQuery: String
    let countries: [Country]
    let selectedCountry: Country?
    let onCountrySelect: (Country?) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: SeeyaSpacing.sm) {
            // Search Field
            HStack(spacing: SeeyaSpacing.sm) {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(Color.seeyaTextTertiary)

                TextField("Where would you like to explore?", text: $searchQuery)
                    .font(SeeyaTypography.bodyMedium)

                if !searchQuery.isEmpty {
                    Button {
                        searchQuery = ""
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(Color.seeyaTextTertiary)
                    }
                }
            }
            .padding(SeeyaSpacing.sm)
            .background(Color.seeyaSurface)
            .clipShape(RoundedRectangle(cornerRadius: 10))

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
