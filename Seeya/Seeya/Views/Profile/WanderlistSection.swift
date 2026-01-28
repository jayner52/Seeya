import SwiftUI

// MARK: - Country Group Model

/// Represents a country with its cities for wanderlist display
struct WanderlistCountryGroup: Identifiable {
    let id = UUID()
    let countryName: String
    let countryItem: WanderlistItem?  // The country itself if explicitly added
    let cities: [WanderlistItem]  // Cities within this country
    let flagEmoji: String

    var hasExplicitCountry: Bool { countryItem != nil }
    var totalItemCount: Int { (countryItem != nil ? 1 : 0) + cities.count }
}

// MARK: - Wanderlist Section

struct WanderlistSection: View {
    let items: [WanderlistItem]
    let onAddTapped: () -> Void
    let onRemoveItem: (WanderlistItem) -> Void

    private let allContinents = [
        "Europe", "Asia", "North America", "South America", "Africa", "Oceania", "Antarctica"
    ]

    @State private var expandedContinents: Set<String> = []
    @State private var expandedCountries: Set<String> = []
    @State private var selectedFilter: String? = nil

    // MARK: - Data Grouping

    private var groupedData: [String: [WanderlistCountryGroup]] {
        var result: [String: [WanderlistCountryGroup]] = [:]

        var countryItems: [String: WanderlistItem] = [:]
        var cityItems: [String: [WanderlistItem]] = [:]
        var itemContinents: [String: String] = [:]

        for item in items {
            let continent = item.continent?.name ?? inferContinent(from: item) ?? "Other"
            let (country, city) = parseCountryAndCity(from: item)

            if city != nil {
                cityItems[country, default: []].append(item)
                itemContinents[country] = continent
            } else {
                countryItems[country] = item
                itemContinents[country] = continent
            }
        }

        let allCountries = Set(countryItems.keys).union(Set(cityItems.keys))

        for country in allCountries {
            let continent = itemContinents[country] ?? "Other"
            let group = WanderlistCountryGroup(
                countryName: country,
                countryItem: countryItems[country],
                cities: cityItems[country] ?? [],
                flagEmoji: WanderlistItem.flagEmoji(fromPlaceName: country)
            )
            result[continent, default: []].append(group)
        }

        for (continent, groups) in result {
            result[continent] = groups.sorted { $0.countryName < $1.countryName }
        }

        return result
    }

    private var continentsWithItems: [String] {
        allContinents.filter { groupedData[$0] != nil }
    }

    private var continentCount: Int {
        continentsWithItems.count
    }

    // MARK: - Body

    var body: some View {
        VStack(alignment: .leading, spacing: SeeyaSpacing.sm) {
            headerView

            VStack(spacing: 0) {
                if items.isEmpty {
                    emptyStateView
                } else {
                    filterButtonsRow
                        .padding(.horizontal, SeeyaSpacing.md)
                        .padding(.vertical, SeeyaSpacing.sm)

                    Divider()

                    continentSectionsView
                }

                Divider()

                addButtonView
            }
            .background(Color.seeyaCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .shadow(color: .black.opacity(0.05), radius: 5, y: 2)
        }
    }

    // MARK: - Header View

    private var headerView: some View {
        HStack(alignment: .top) {
            VStack(alignment: .leading, spacing: SeeyaSpacing.xxs) {
                HStack(spacing: SeeyaSpacing.xs) {
                    SeeyaIcon(systemName: "globe.americas.fill", size: SeeyaIconSize.medium)
                    Text("My Wanderlist")
                        .font(SeeyaTypography.headlineMedium)
                }
                Text("Countries you dream of visiting")
                    .font(SeeyaTypography.caption)
                    .foregroundStyle(Color.seeyaTextSecondary)
            }

            Spacer()

            HStack(spacing: SeeyaSpacing.xxs) {
                Image(systemName: "sparkles")
                    .font(.system(size: SeeyaIconSize.small))
                Text("\(continentCount)/7 continents")
                    .font(SeeyaTypography.caption)
            }
            .foregroundStyle(Color.seeyaPurple)
            .padding(.horizontal, SeeyaSpacing.xs)
            .padding(.vertical, SeeyaSpacing.xxs)
            .background(Color.seeyaPurple.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 4))
        }
    }

    // MARK: - Filter Buttons Row

    private var filterButtonsRow: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: SeeyaSpacing.xs) {
                ForEach(allContinents, id: \.self) { continent in
                    let hasItems = groupedData[continent] != nil
                    let isSelected = selectedFilter == continent
                    let color = Color.forContinent(continent)
                    let icon = Color.iconForContinent(continent)

                    Button {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            selectedFilter = selectedFilter == continent ? nil : continent
                        }
                    } label: {
                        Image(systemName: icon)
                            .font(.system(size: SeeyaIconSize.small))
                            .foregroundStyle(isSelected ? .white : (hasItems ? color : color.opacity(0.3)))
                            .frame(width: 32, height: 32)
                            .background(isSelected ? color : color.opacity(hasItems ? 0.15 : 0.05))
                            .clipShape(Circle())
                    }
                    .disabled(!hasItems)
                }
            }
        }
    }

    // MARK: - Continent Sections

    @ViewBuilder
    private var continentSectionsView: some View {
        let continentsToShow = selectedFilter != nil ? [selectedFilter!] : allContinents
        let filteredContinents = continentsToShow.filter { groupedData[$0] != nil }

        ForEach(filteredContinents, id: \.self) { continent in
            if let countryGroups = groupedData[continent] {
                WanderlistContinentSection(
                    continentName: continent,
                    countryGroups: countryGroups,
                    isExpanded: expandedContinents.contains(continent),
                    expandedCountries: $expandedCountries,
                    onToggleExpand: {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            if expandedContinents.contains(continent) {
                                expandedContinents.remove(continent)
                            } else {
                                expandedContinents.insert(continent)
                            }
                        }
                    },
                    onRemoveItem: onRemoveItem
                )
            }
        }
    }

    // MARK: - Empty State

    private var emptyStateView: some View {
        VStack(spacing: SeeyaSpacing.sm) {
            Image(systemName: "globe")
                .font(.system(size: 40))
                .foregroundStyle(.tertiary)
            Text("No places yet")
                .font(SeeyaTypography.bodyMedium)
                .foregroundStyle(Color.seeyaTextSecondary)
            Text("Add countries or cities you want to visit")
                .font(SeeyaTypography.caption)
                .foregroundStyle(Color.seeyaTextTertiary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, SeeyaSpacing.xl)
    }

    // MARK: - Add Button

    private var addButtonView: some View {
        Button(action: onAddTapped) {
            HStack(spacing: SeeyaSpacing.xs) {
                Image(systemName: "plus")
                    .font(.system(size: SeeyaIconSize.small))
                Text("Add place")
                    .font(SeeyaTypography.bodyMedium)
            }
            .foregroundStyle(Color.seeyaPurple)
            .padding(.vertical, SeeyaSpacing.sm)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, SeeyaSpacing.md)
    }

    // MARK: - Helpers

    private func parseCountryAndCity(from item: WanderlistItem) -> (country: String, city: String?) {
        guard let placeName = item.placeName else {
            return (item.displayName, nil)
        }

        let components = placeName.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }

        if components.count >= 2 {
            let country = components.last!
            let city = components.dropLast().joined(separator: ", ")
            return (country, city)
        } else {
            return (placeName, nil)
        }
    }

    private func inferContinent(from item: WanderlistItem) -> String? {
        guard let placeName = item.placeName?.lowercased() else { return nil }

        let countryToContinentMap: [String: String] = [
            "japan": "Asia", "china": "Asia", "india": "Asia", "korea": "Asia", "south korea": "Asia",
            "thailand": "Asia", "vietnam": "Asia", "indonesia": "Asia", "malaysia": "Asia",
            "singapore": "Asia", "philippines": "Asia", "taiwan": "Asia", "hong kong": "Asia",
            "france": "Europe", "germany": "Europe", "italy": "Europe", "spain": "Europe",
            "portugal": "Europe", "united kingdom": "Europe", "uk": "Europe", "greece": "Europe",
            "netherlands": "Europe", "belgium": "Europe", "switzerland": "Europe", "austria": "Europe",
            "sweden": "Europe", "norway": "Europe", "denmark": "Europe", "finland": "Europe",
            "poland": "Europe", "czech republic": "Europe", "czechia": "Europe", "ireland": "Europe",
            "croatia": "Europe", "hungary": "Europe", "iceland": "Europe", "turkey": "Europe",
            "united states": "North America", "usa": "North America", "canada": "North America",
            "mexico": "North America", "costa rica": "North America", "panama": "North America",
            "cuba": "North America", "jamaica": "North America", "puerto rico": "North America",
            "brazil": "South America", "argentina": "South America", "chile": "South America",
            "peru": "South America", "colombia": "South America", "ecuador": "South America",
            "bolivia": "South America", "uruguay": "South America", "venezuela": "South America",
            "egypt": "Africa", "south africa": "Africa", "morocco": "Africa", "kenya": "Africa",
            "tanzania": "Africa", "nigeria": "Africa", "ethiopia": "Africa", "ghana": "Africa",
            "tunisia": "Africa", "rwanda": "Africa", "namibia": "Africa", "botswana": "Africa",
            "australia": "Oceania", "new zealand": "Oceania", "fiji": "Oceania",
            "antarctica": "Antarctica"
        ]

        for (country, continent) in countryToContinentMap {
            if placeName.contains(country) {
                return continent
            }
        }

        return nil
    }
}

// MARK: - Continent Section View

struct WanderlistContinentSection: View {
    let continentName: String
    let countryGroups: [WanderlistCountryGroup]
    let isExpanded: Bool
    @Binding var expandedCountries: Set<String>
    let onToggleExpand: () -> Void
    let onRemoveItem: (WanderlistItem) -> Void

    private var color: Color { Color.forContinent(continentName) }
    private var icon: String { Color.iconForContinent(continentName) }

    private var totalItems: Int {
        countryGroups.reduce(0) { $0 + $1.totalItemCount }
    }

    var body: some View {
        VStack(spacing: 0) {
            Button(action: onToggleExpand) {
                HStack(spacing: SeeyaSpacing.sm) {
                    Image(systemName: icon)
                        .font(.system(size: SeeyaIconSize.medium))
                        .foregroundStyle(color)

                    Text(continentName)
                        .font(SeeyaTypography.headlineSmall)
                        .foregroundStyle(color)

                    Spacer()

                    Text("\(totalItems)")
                        .font(SeeyaTypography.bodySmall)
                        .foregroundStyle(color)

                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.system(size: SeeyaIconSize.small))
                        .foregroundStyle(color)
                }
                .padding(.horizontal, SeeyaSpacing.md)
                .padding(.vertical, SeeyaSpacing.sm)
                .background(color.opacity(0.05))
            }
            .buttonStyle(.plain)

            if isExpanded {
                ForEach(countryGroups) { group in
                    WanderlistCountryRow(
                        group: group,
                        isExpanded: expandedCountries.contains(group.countryName),
                        onToggleExpand: {
                            withAnimation(.easeInOut(duration: 0.2)) {
                                if expandedCountries.contains(group.countryName) {
                                    expandedCountries.remove(group.countryName)
                                } else {
                                    expandedCountries.insert(group.countryName)
                                }
                            }
                        },
                        onRemoveItem: onRemoveItem
                    )
                }
            }
        }
    }
}

// MARK: - Country Row View

struct WanderlistCountryRow: View {
    let group: WanderlistCountryGroup
    let isExpanded: Bool
    let onToggleExpand: () -> Void
    let onRemoveItem: (WanderlistItem) -> Void

    var body: some View {
        VStack(spacing: 0) {
            HStack(spacing: SeeyaSpacing.sm) {
                if !group.cities.isEmpty {
                    Button(action: onToggleExpand) {
                        Image(systemName: isExpanded ? "chevron.down" : "chevron.right")
                            .font(.system(size: SeeyaIconSize.small))
                            .foregroundStyle(Color.seeyaTextTertiary)
                            .frame(width: 20)
                    }
                    .buttonStyle(.plain)
                } else {
                    Color.clear.frame(width: 20)
                }

                Text(group.flagEmoji)
                    .font(.title3)

                Text(group.countryName)
                    .font(SeeyaTypography.bodyMedium)
                    .foregroundStyle(.primary)

                if !group.cities.isEmpty {
                    Text("\(group.cities.count) \(group.cities.count == 1 ? "city" : "cities")")
                        .font(SeeyaTypography.captionSmall)
                        .foregroundStyle(Color.seeyaTextTertiary)
                }

                Spacer()

                if let countryItem = group.countryItem {
                    Button { onRemoveItem(countryItem) } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: SeeyaIconSize.small))
                            .foregroundStyle(Color.seeyaTextTertiary)
                    }
                }
            }
            .padding(.horizontal, SeeyaSpacing.md)
            .padding(.vertical, SeeyaSpacing.sm)

            if isExpanded {
                ForEach(group.cities, id: \.id) { city in
                    WanderlistCityRow(item: city, onRemove: { onRemoveItem(city) })

                    if city.id != group.cities.last?.id {
                        Divider()
                            .padding(.leading, SeeyaSpacing.xl + SeeyaSpacing.lg)
                    }
                }
            }

            Divider()
                .padding(.leading, SeeyaSpacing.md)
        }
    }
}

// MARK: - City Row View

struct WanderlistCityRow: View {
    let item: WanderlistItem
    let onRemove: () -> Void

    private var cityName: String {
        guard let placeName = item.placeName else { return item.displayName }
        let components = placeName.split(separator: ",").map { $0.trimmingCharacters(in: .whitespaces) }
        return components.dropLast().joined(separator: ", ")
    }

    var body: some View {
        HStack(spacing: SeeyaSpacing.sm) {
            Color.clear.frame(width: 20)

            Image(systemName: "mappin.circle.fill")
                .font(.system(size: SeeyaIconSize.medium))
                .foregroundStyle(Color.seeyaPurple.opacity(0.6))

            Text(cityName)
                .font(SeeyaTypography.bodySmall)
                .foregroundStyle(Color.seeyaTextSecondary)

            Spacer()

            Button(action: onRemove) {
                Image(systemName: "xmark")
                    .font(.system(size: SeeyaIconSize.small))
                    .foregroundStyle(Color.seeyaTextTertiary)
            }
        }
        .padding(.leading, SeeyaSpacing.lg)
        .padding(.trailing, SeeyaSpacing.md)
        .padding(.vertical, SeeyaSpacing.xs)
    }
}

#Preview {
    WanderlistSection(
        items: [],
        onAddTapped: {},
        onRemoveItem: { _ in }
    )
    .padding()
    .background(Color.seeyaBackground)
}
