import SwiftUI

struct OnboardingWanderlistView: View {
    @Bindable var viewModel: OnboardingViewModel
    let onContinue: () -> Void
    let onSkip: () -> Void
    let onBack: () -> Void

    private let columns = [
        GridItem(.adaptive(minimum: 100), spacing: 8)
    ]

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(spacing: SeeyaSpacing.lg) {
                    // Icon
                    OnboardingIconCircle(
                        icon: "mappin.and.ellipse",
                        backgroundColor: .seeyaPurple
                    )
                    .padding(.top, SeeyaSpacing.xl)

                    // Title
                    Text("Where do you dream of going?")
                        .font(SeeyaTypography.displayLarge)
                        .foregroundStyle(Color.seeyaTextPrimary)
                        .multilineTextAlignment(.center)

                    // Subtitle
                    Text("Add destinations to your Wanderlist")
                        .font(SeeyaTypography.bodyMedium)
                        .foregroundStyle(Color.seeyaTextSecondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)

                    // Popular section
                    if !viewModel.popularCountries.isEmpty {
                        VStack(alignment: .leading, spacing: SeeyaSpacing.sm) {
                            Text("POPULAR")
                                .font(SeeyaTypography.labelSmall)
                                .foregroundStyle(Color.seeyaTextTertiary)
                                .padding(.horizontal)

                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: SeeyaSpacing.xs) {
                                    ForEach(viewModel.popularCountries) { country in
                                        CountryAddChip(
                                            country: country,
                                            isSelected: viewModel.isInWanderlist(country.id),
                                            action: {
                                                viewModel.toggleWanderlistCountry(country.id)
                                            }
                                        )
                                    }
                                }
                                .padding(.horizontal)
                            }
                        }
                    }

                    // Selected countries
                    if !viewModel.wanderlistCountries.isEmpty {
                        VStack(alignment: .leading, spacing: SeeyaSpacing.sm) {
                            Text("YOUR WANDERLIST")
                                .font(SeeyaTypography.labelSmall)
                                .foregroundStyle(Color.seeyaTextTertiary)
                                .padding(.horizontal)

                            LazyVGrid(columns: columns, spacing: 8) {
                                ForEach(viewModel.wanderlistCountries) { country in
                                    CountryRemovableChip(
                                        country: country,
                                        onRemove: {
                                            viewModel.toggleWanderlistCountry(country.id)
                                        }
                                    )
                                }
                            }
                            .padding(.horizontal)
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

                    // Search results or continent sections
                    if !viewModel.countrySearchQuery.isEmpty {
                        // Show filtered results
                        LazyVGrid(columns: columns, spacing: 8) {
                            ForEach(viewModel.filteredCountries) { country in
                                CountryAddChip(
                                    country: country,
                                    isSelected: viewModel.isInWanderlist(country.id),
                                    action: {
                                        viewModel.toggleWanderlistCountry(country.id)
                                    }
                                )
                            }
                        }
                        .padding(.horizontal)
                    } else {
                        // Show continent sections
                        VStack(spacing: 0) {
                            ForEach(viewModel.continents) { continent in
                                let countries = viewModel.countriesByContinent[continent.id] ?? []
                                if !countries.isEmpty {
                                    OnboardingContinentSection(
                                        continent: continent,
                                        countries: countries,
                                        isExpanded: viewModel.isContinentExpanded(continent.id),
                                        selectedCountryIds: viewModel.onboardingData.wanderlistCountryIds,
                                        onToggleExpand: {
                                            viewModel.toggleContinentExpanded(continent.id)
                                        },
                                        onToggleCountry: { countryId in
                                            viewModel.toggleWanderlistCountry(countryId)
                                        }
                                    )

                                    Divider()
                                }
                            }
                        }
                        .padding(.horizontal)
                    }

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
                            Text(viewModel.shouldShowTipsStep ? "Continue" : "Finish")
                            Image(systemName: viewModel.shouldShowTipsStep ? "arrow.right" : "checkmark")
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

// Continent section for wanderlist (uses add chips instead of selection chips)
private struct OnboardingContinentSection: View {
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
        GridItem(.adaptive(minimum: 100), spacing: 8)
    ]

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
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

            if isExpanded {
                LazyVGrid(columns: columns, alignment: .leading, spacing: 8) {
                    ForEach(countries) { country in
                        CountryAddChip(
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
    OnboardingWanderlistView(
        viewModel: OnboardingViewModel(),
        onContinue: {},
        onSkip: {},
        onBack: {}
    )
    .background(Color.seeyaBackground)
}
