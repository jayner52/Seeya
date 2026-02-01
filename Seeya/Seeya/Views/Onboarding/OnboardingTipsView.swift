import SwiftUI

struct OnboardingTipsView: View {
    @Bindable var viewModel: OnboardingViewModel
    let onFinish: () -> Void
    let onSkip: () -> Void
    let onBack: () -> Void

    @State private var selectedCountryIndex: Int = 0

    private let yellowBackground = Color(red: 0.96, green: 0.84, blue: 0.28)

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(spacing: SeeyaSpacing.lg) {
                    // Icon
                    OnboardingIconCircle(
                        icon: "star.fill",
                        backgroundColor: yellowBackground,
                        iconColor: .white
                    )
                    .padding(.top, SeeyaSpacing.xl)

                    // Title
                    Text("Share your recommendations")
                        .font(SeeyaTypography.displayLarge)
                        .foregroundStyle(Color.seeyaTextPrimary)
                        .multilineTextAlignment(.center)

                    // Subtitle
                    Text("Help your friends discover great places")
                        .font(SeeyaTypography.bodyMedium)
                        .foregroundStyle(Color.seeyaTextSecondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)

                    // Country tabs
                    if !viewModel.visitedCountries.isEmpty {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: SeeyaSpacing.xs) {
                                ForEach(Array(viewModel.visitedCountries.enumerated()), id: \.element.id) { index, country in
                                    CountryTabButton(
                                        country: country,
                                        isSelected: index == selectedCountryIndex,
                                        action: {
                                            selectedCountryIndex = index
                                        }
                                    )
                                }
                            }
                            .padding(.horizontal)
                        }

                        // Add recommendation button
                        if let selectedCountry = viewModel.visitedCountries[safe: selectedCountryIndex] {
                            VStack(spacing: SeeyaSpacing.md) {
                                // Placeholder for recommendations
                                VStack(spacing: SeeyaSpacing.md) {
                                    Image(systemName: "lightbulb")
                                        .font(.system(size: 40))
                                        .foregroundStyle(Color.seeyaTextTertiary)

                                    Text("Share your favorite spots in \(selectedCountry.name)")
                                        .font(SeeyaTypography.bodyMedium)
                                        .foregroundStyle(Color.seeyaTextSecondary)
                                        .multilineTextAlignment(.center)

                                    Button {
                                        // TODO: Open add recommendation sheet
                                    } label: {
                                        HStack {
                                            Image(systemName: "plus")
                                            Text("Add recommendation for \(selectedCountry.name)")
                                        }
                                        .font(SeeyaTypography.bodyMedium)
                                        .foregroundStyle(Color.seeyaPurple)
                                        .padding()
                                        .frame(maxWidth: .infinity)
                                        .background(Color.seeyaPurple.opacity(0.1))
                                        .clipShape(RoundedRectangle(cornerRadius: 12))
                                    }
                                }
                                .padding()
                                .background(Color.seeyaCardBackground)
                                .clipShape(RoundedRectangle(cornerRadius: 12))
                            }
                            .padding(.horizontal)
                        }
                    } else {
                        // No visited countries
                        VStack(spacing: SeeyaSpacing.md) {
                            Image(systemName: "globe")
                                .font(.system(size: 40))
                                .foregroundStyle(Color.seeyaTextTertiary)

                            Text("Select countries you've visited to share recommendations")
                                .font(SeeyaTypography.bodyMedium)
                                .foregroundStyle(Color.seeyaTextSecondary)
                                .multilineTextAlignment(.center)
                        }
                        .padding()
                        .padding(.vertical, SeeyaSpacing.xl)
                    }

                    // Helper text
                    Text("You can always add more recommendations later in your trips")
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

                    Button(action: onFinish) {
                        HStack {
                            Text("Finish")
                            Image(systemName: "checkmark")
                        }
                    }
                    .buttonStyle(SeeyaPrimaryButtonStyle())
                }

                Button(action: onSkip) {
                    Text("Skip & Finish")
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

private struct CountryTabButton: View {
    let country: Country
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Text(country.flagEmoji ?? "")
                    .font(.system(size: 16))

                Text(country.name)
                    .font(SeeyaTypography.labelMedium)
                    .foregroundStyle(isSelected ? .white : Color.seeyaTextPrimary)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(isSelected ? Color.seeyaPurple : Color.seeyaCardBackground)
            .clipShape(RoundedRectangle(cornerRadius: 8))
        }
        .buttonStyle(.plain)
    }
}

// Safe array subscript
private extension Array {
    subscript(safe index: Int) -> Element? {
        guard index >= 0 && index < count else { return nil }
        return self[index]
    }
}

#Preview {
    OnboardingTipsView(
        viewModel: OnboardingViewModel(),
        onFinish: {},
        onSkip: {},
        onBack: {}
    )
    .background(Color.seeyaBackground)
}
