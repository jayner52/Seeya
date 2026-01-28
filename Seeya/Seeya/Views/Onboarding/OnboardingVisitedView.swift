import SwiftUI

struct OnboardingVisitedView: View {
    @Bindable var viewModel: OnboardingViewModel
    let onContinue: () -> Void
    let onSkip: () -> Void
    let onBack: () -> Void

    private let yellowBackground = Color(red: 0.96, green: 0.84, blue: 0.28)

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(spacing: SeeyaSpacing.lg) {
                    // Icon
                    OnboardingIconCircle(
                        icon: "globe",
                        backgroundColor: yellowBackground,
                        iconColor: .white
                    )
                    .padding(.top, SeeyaSpacing.xl)

                    // Title
                    Text("Where have you been?")
                        .font(.custom("Georgia", size: 28).weight(.medium))
                        .foregroundStyle(Color.seeyaTextPrimary)
                        .multilineTextAlignment(.center)

                    // Subtitle
                    Text("Tap continents to expand and select countries")
                        .font(SeeyaTypography.bodyMedium)
                        .foregroundStyle(Color.seeyaTextSecondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)

                    // Selection badge
                    if !viewModel.onboardingData.visitedCountryIds.isEmpty {
                        Text("\(viewModel.onboardingData.visitedCountryIds.count) countries selected")
                            .font(SeeyaTypography.labelMedium)
                            .foregroundStyle(.white)
                            .padding(.horizontal, SeeyaSpacing.md)
                            .padding(.vertical, SeeyaSpacing.xs)
                            .background(Color.black)
                            .clipShape(Capsule())
                    }

                    // Popular section
                    if !viewModel.popularCountries.isEmpty && viewModel.countrySearchQuery.isEmpty {
                        VStack(alignment: .leading, spacing: SeeyaSpacing.sm) {
                            Text("POPULAR DESTINATIONS")
                                .font(SeeyaTypography.labelSmall)
                                .foregroundStyle(Color.seeyaTextTertiary)
                                .padding(.horizontal)

                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: SeeyaSpacing.xs) {
                                    ForEach(viewModel.popularCountries) { country in
                                        PopularCountryChip(
                                            country: country,
                                            isSelected: viewModel.isVisited(country.id),
                                            onTap: { viewModel.toggleVisitedCountry(country.id) }
                                        )
                                    }
                                }
                                .padding(.horizontal)
                            }
                        }
                    }

                    // Search field
                    HStack {
                        Image(systemName: "magnifyingglass")
                            .foregroundStyle(Color.seeyaTextTertiary)

                        TextField("Search countries...", text: $viewModel.countrySearchQuery)
                            .font(SeeyaTypography.bodyMedium)
                            .autocorrectionDisabled()

                        if !viewModel.countrySearchQuery.isEmpty {
                            Button {
                                viewModel.countrySearchQuery = ""
                            } label: {
                                Image(systemName: "xmark.circle.fill")
                                    .foregroundStyle(Color.seeyaTextTertiary)
                            }
                        }
                    }
                    .padding()
                    .background(Color.seeyaCardBackground)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(Color.gray.opacity(0.2), lineWidth: 1)
                    )
                    .padding(.horizontal)

                    // Continent sections
                    if viewModel.isLoading {
                        ProgressView()
                            .padding(.top, SeeyaSpacing.xl)
                    } else if !viewModel.countrySearchQuery.isEmpty {
                        // Show search results
                        SearchResultsGrid(
                            countries: viewModel.filteredCountries,
                            selectedIds: viewModel.onboardingData.visitedCountryIds,
                            onToggle: { viewModel.toggleVisitedCountry($0) }
                        )
                        .padding(.horizontal)
                    } else {
                        // Show continent cards
                        VStack(spacing: SeeyaSpacing.sm) {
                            ForEach(viewModel.continents) { continent in
                                let countries = viewModel.countriesByContinent[continent.id] ?? []
                                if !countries.isEmpty {
                                    VisitedContinentCard(
                                        continent: continent,
                                        countries: countries,
                                        selectedCountryIds: viewModel.onboardingData.visitedCountryIds,
                                        isExpanded: viewModel.isContinentExpanded(continent.id),
                                        onToggleExpand: {
                                            withAnimation(.easeInOut(duration: 0.2)) {
                                                viewModel.toggleContinentExpanded(continent.id)
                                            }
                                        },
                                        onToggleCountry: { countryId in
                                            viewModel.toggleVisitedCountry(countryId)
                                        }
                                    )
                                }
                            }
                        }
                        .padding(.horizontal)
                    }

                    // Helper text
                    Text("You can add specific cities later in your profile")
                        .font(SeeyaTypography.caption)
                        .foregroundStyle(Color.seeyaTextTertiary)
                        .padding(.top, SeeyaSpacing.sm)

                    Spacer(minLength: SeeyaSpacing.xl)
                }
            }

            // Bottom buttons
            VStack(spacing: SeeyaSpacing.sm) {
                HStack(spacing: SeeyaSpacing.sm) {
                    Button(action: onBack) {
                        HStack {
                            Image(systemName: "arrow.left")
                            Text("Back")
                        }
                        .font(SeeyaTypography.bodyMedium)
                        .foregroundStyle(Color.seeyaTextSecondary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(Color.seeyaSurface)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                    }

                    Button(action: onContinue) {
                        HStack {
                            Text("Continue")
                            Image(systemName: "arrow.right")
                        }
                    }
                    .buttonStyle(SeeyaPrimaryButtonStyle())
                }

                Button(action: onSkip) {
                    Text("Skip for now")
                        .font(SeeyaTypography.bodyMedium)
                        .foregroundStyle(Color.seeyaTextSecondary)
                }
                .padding(.vertical, SeeyaSpacing.xs)
            }
            .padding(.horizontal)
            .padding(.bottom, SeeyaSpacing.lg)
        }
    }
}

// MARK: - Continent Card

private struct VisitedContinentCard: View {
    let continent: Continent
    let countries: [Country]
    let selectedCountryIds: Set<UUID>
    let isExpanded: Bool
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

    private var continentColor: Color {
        Color.forContinent(continent.name)
    }

    private var selectedCount: Int {
        countries.filter { selectedCountryIds.contains($0.id) }.count
    }

    private let columns = [
        GridItem(.adaptive(minimum: 140), spacing: 8)
    ]

    var body: some View {
        VStack(spacing: 0) {
            // Header
            Button(action: onToggleExpand) {
                HStack(spacing: SeeyaSpacing.md) {
                    // Emoji circle
                    ZStack {
                        Circle()
                            .fill(continentColor.opacity(0.15))
                            .frame(width: 48, height: 48)

                        Text(continentEmoji)
                            .font(.system(size: 24))
                    }

                    // Name and count
                    VStack(alignment: .leading, spacing: 2) {
                        Text(continent.name)
                            .font(SeeyaTypography.headlineMedium)
                            .foregroundStyle(Color.seeyaTextPrimary)

                        Text("\(countries.count) countries")
                            .font(SeeyaTypography.caption)
                            .foregroundStyle(Color.seeyaTextSecondary)
                    }

                    Spacer()

                    // Selected badge
                    if selectedCount > 0 {
                        Text("\(selectedCount)")
                            .font(SeeyaTypography.labelMedium)
                            .foregroundStyle(.white)
                            .frame(width: 28, height: 28)
                            .background(continentColor)
                            .clipShape(Circle())
                    }

                    // Chevron
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Color.seeyaTextSecondary)
                }
                .padding(SeeyaSpacing.md)
            }
            .buttonStyle(.plain)

            // Expanded countries grid
            if isExpanded {
                Divider()
                    .padding(.horizontal, SeeyaSpacing.md)

                LazyVGrid(columns: columns, spacing: 8) {
                    ForEach(countries) { country in
                        VisitedCountryButton(
                            country: country,
                            isSelected: selectedCountryIds.contains(country.id),
                            onTap: { onToggleCountry(country.id) }
                        )
                    }
                }
                .padding(SeeyaSpacing.md)
            }
        }
        .background(Color.seeyaCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 8, y: 2)
    }
}

// MARK: - Country Button

private struct VisitedCountryButton: View {
    let country: Country
    let isSelected: Bool
    let onTap: () -> Void

    private let selectedColor = Color(red: 0.96, green: 0.84, blue: 0.28)

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 8) {
                Text(country.flagEmoji ?? "🏳️")
                    .font(.system(size: 20))

                Text(country.name)
                    .font(SeeyaTypography.labelMedium)
                    .foregroundStyle(Color.seeyaTextPrimary)
                    .lineLimit(1)

                Spacer()

                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 18))
                        .foregroundStyle(selectedColor)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(isSelected ? selectedColor.opacity(0.15) : Color.seeyaSurface)
            .clipShape(RoundedRectangle(cornerRadius: 10))
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(isSelected ? selectedColor : Color.clear, lineWidth: 2)
            )
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Popular Country Chip

private struct PopularCountryChip: View {
    let country: Country
    let isSelected: Bool
    let onTap: () -> Void

    private let selectedColor = Color(red: 0.96, green: 0.84, blue: 0.28)

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: 6) {
                Text(country.flagEmoji ?? "🏳️")
                    .font(.system(size: 20))

                Text(country.name)
                    .font(SeeyaTypography.labelMedium)
                    .foregroundStyle(Color.seeyaTextPrimary)

                if isSelected {
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 14))
                        .foregroundStyle(selectedColor)
                } else {
                    Image(systemName: "plus.circle")
                        .font(.system(size: 14))
                        .foregroundStyle(Color.seeyaTextTertiary)
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(isSelected ? selectedColor.opacity(0.15) : Color.seeyaCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 20))
            .overlay(
                RoundedRectangle(cornerRadius: 20)
                    .stroke(isSelected ? selectedColor : Color.gray.opacity(0.2), lineWidth: isSelected ? 2 : 1)
            )
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Search Results Grid

private struct SearchResultsGrid: View {
    let countries: [Country]
    let selectedIds: Set<UUID>
    let onToggle: (UUID) -> Void

    private let columns = [
        GridItem(.adaptive(minimum: 140), spacing: 8)
    ]

    var body: some View {
        if countries.isEmpty {
            VStack(spacing: SeeyaSpacing.md) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 32))
                    .foregroundStyle(Color.seeyaTextTertiary)

                Text("No countries found")
                    .font(SeeyaTypography.bodyMedium)
                    .foregroundStyle(Color.seeyaTextSecondary)
            }
            .padding(.vertical, SeeyaSpacing.xl)
        } else {
            LazyVGrid(columns: columns, spacing: 8) {
                ForEach(countries) { country in
                    VisitedCountryButton(
                        country: country,
                        isSelected: selectedIds.contains(country.id),
                        onTap: { onToggle(country.id) }
                    )
                }
            }
        }
    }
}

#Preview {
    OnboardingVisitedView(
        viewModel: OnboardingViewModel(),
        onContinue: {},
        onSkip: {},
        onBack: {}
    )
    .background(Color.seeyaBackground)
}
