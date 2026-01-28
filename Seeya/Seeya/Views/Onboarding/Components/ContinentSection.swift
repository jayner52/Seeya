import SwiftUI

struct ContinentSection: View {
    let continent: Continent
    let countries: [Country]
    let isExpanded: Bool
    let selectedCountryIds: Set<UUID>
    let onToggleExpand: () -> Void
    let onToggleCountry: (UUID) -> Void

    private var continentEmoji: String {
        switch continent.name.lowercased() {
        case "europe": return "🌍"
        case "asia": return "🌏"
        case "north america": return "🌎"
        case "south america": return "🌎"
        case "africa": return "🌍"
        case "oceania", "australia": return "🌏"
        case "antarctica": return "🌐"
        default: return "🌐"
        }
    }

    private let columns = [
        GridItem(.adaptive(minimum: 120), spacing: 8)
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Header
            Button(action: onToggleExpand) {
                HStack {
                    Text(continentEmoji)
                        .font(.system(size: 18))

                    Text(continent.name)
                        .font(SeeyaTypography.headlineSmall)
                        .foregroundStyle(Color.seeyaTextPrimary)

                    Text("(\(countries.count))")
                        .font(SeeyaTypography.bodySmall)
                        .foregroundStyle(Color.seeyaTextSecondary)

                    Spacer()

                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(Color.seeyaTextSecondary)
                }
                .padding(.vertical, SeeyaSpacing.sm)
            }
            .buttonStyle(.plain)

            // Countries grid
            if isExpanded {
                LazyVGrid(columns: columns, alignment: .leading, spacing: 8) {
                    ForEach(countries) { country in
                        CountryChip(
                            country: country,
                            isSelected: selectedCountryIds.contains(country.id),
                            action: { onToggleCountry(country.id) }
                        )
                    }
                }
                .padding(.vertical, SeeyaSpacing.sm)
            }
        }
    }
}

#Preview {
    let continent = Continent(id: UUID(), name: "Europe", orderIndex: 1, createdAt: nil)
    let countries = [
        Country(id: UUID(), name: "France", code: "FR", flagEmoji: "🇫🇷", continentId: continent.id, createdAt: nil, continent: nil),
        Country(id: UUID(), name: "Germany", code: "DE", flagEmoji: "🇩🇪", continentId: continent.id, createdAt: nil, continent: nil),
        Country(id: UUID(), name: "Italy", code: "IT", flagEmoji: "🇮🇹", continentId: continent.id, createdAt: nil, continent: nil),
        Country(id: UUID(), name: "Spain", code: "ES", flagEmoji: "🇪🇸", continentId: continent.id, createdAt: nil, continent: nil),
        Country(id: UUID(), name: "Portugal", code: "PT", flagEmoji: "🇵🇹", continentId: continent.id, createdAt: nil, continent: nil)
    ]

    VStack {
        ContinentSection(
            continent: continent,
            countries: countries,
            isExpanded: true,
            selectedCountryIds: [countries[0].id, countries[2].id],
            onToggleExpand: {},
            onToggleCountry: { _ in }
        )

        ContinentSection(
            continent: continent,
            countries: countries,
            isExpanded: false,
            selectedCountryIds: [],
            onToggleExpand: {},
            onToggleCountry: { _ in }
        )
    }
    .padding()
    .background(Color.seeyaBackground)
}
