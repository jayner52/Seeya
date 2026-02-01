import SwiftUI

struct OnboardingHomeView: View {
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
                        icon: "house.fill",
                        backgroundColor: yellowBackground,
                        iconColor: .white
                    )
                    .padding(.top, SeeyaSpacing.xl)

                    // Title
                    Text("Where's home base?")
                        .font(SeeyaTypography.displayLarge)
                        .foregroundStyle(Color.seeyaTextPrimary)
                        .multilineTextAlignment(.center)

                    // Subtitle
                    Text("We'll use this to find travel pals near you and suggest nearby destinations")
                        .font(SeeyaTypography.bodyMedium)
                        .foregroundStyle(Color.seeyaTextSecondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)

                    // Search field
                    VStack(alignment: .leading, spacing: SeeyaSpacing.xs) {
                        Text("Your city")
                            .font(SeeyaTypography.labelMedium)
                            .foregroundStyle(Color.seeyaTextSecondary)

                        HStack {
                            Image(systemName: "magnifyingglass")
                                .foregroundStyle(Color.seeyaTextTertiary)

                            TextField("Search for your city...", text: $viewModel.homeCityQuery)
                                .font(SeeyaTypography.bodyMedium)
                                .autocorrectionDisabled()
                                .onChange(of: viewModel.homeCityQuery) { _, newValue in
                                    viewModel.searchHomeCity(query: newValue)
                                }

                            if viewModel.isSearchingCity {
                                ProgressView()
                                    .scaleEffect(0.8)
                            } else if viewModel.selectedHomeCity != nil {
                                Button {
                                    viewModel.clearHomeCity()
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

                        // Predictions list
                        if !viewModel.homeCityPredictions.isEmpty && viewModel.selectedHomeCity == nil {
                            VStack(alignment: .leading, spacing: 0) {
                                ForEach(viewModel.homeCityPredictions) { prediction in
                                    Button {
                                        viewModel.selectHomeCity(prediction)
                                    } label: {
                                        VStack(alignment: .leading, spacing: 2) {
                                            Text(prediction.mainText)
                                                .font(SeeyaTypography.bodyMedium)
                                                .foregroundStyle(Color.seeyaTextPrimary)

                                            if !prediction.secondaryText.isEmpty {
                                                Text(prediction.secondaryText)
                                                    .font(SeeyaTypography.caption)
                                                    .foregroundStyle(Color.seeyaTextSecondary)
                                            }
                                        }
                                        .frame(maxWidth: .infinity, alignment: .leading)
                                        .padding(.vertical, SeeyaSpacing.sm)
                                        .padding(.horizontal, SeeyaSpacing.md)
                                    }

                                    if prediction.id != viewModel.homeCityPredictions.last?.id {
                                        Divider()
                                    }
                                }
                            }
                            .background(Color.seeyaCardBackground)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                            .shadow(color: .black.opacity(0.1), radius: 8, y: 4)
                        }
                    }
                    .padding(.horizontal)

                    // Helper text
                    Text("You can always change this later in settings")
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

#Preview {
    OnboardingHomeView(
        viewModel: OnboardingViewModel(),
        onContinue: {},
        onSkip: {},
        onBack: {}
    )
    .background(Color.seeyaBackground)
}
