import SwiftUI

struct OnboardingWelcomeView: View {
    let onContinue: () -> Void
    let onSkip: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(spacing: SeeyaSpacing.lg) {
                    // Icon
                    OnboardingIconCircle(
                        icon: "airplane",
                        backgroundColor: .seeyaPurple
                    )
                    .padding(.top, SeeyaSpacing.xl)

                    // Title
                    Text("Welcome to Seeya!")
                        .font(SeeyaTypography.displayLarge)
                        .foregroundStyle(Color.seeyaTextPrimary)
                        .multilineTextAlignment(.center)

                    // Subtitle
                    Text("Let's set up your travel profile in just a few steps")
                        .font(SeeyaTypography.bodyMedium)
                        .foregroundStyle(Color.seeyaTextSecondary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal)

                    // Benefits
                    VStack(spacing: SeeyaSpacing.sm) {
                        OnboardingBenefitCard(
                            icon: "mappin.circle.fill",
                            title: "Track your travels",
                            description: "Mark countries you've visited"
                        )

                        OnboardingBenefitCard(
                            icon: "star.fill",
                            title: "Share recommendations",
                            description: "Help travel pals discover great places"
                        )

                        OnboardingBenefitCard(
                            icon: "person.2.fill",
                            title: "Connect with travelers",
                            description: "See where your travel pals are going"
                        )
                    }
                    .padding(.horizontal)
                    .padding(.top, SeeyaSpacing.sm)

                    // Helper text
                    Text("This only takes 2 minutes \u{2022} You can always update later")
                        .font(SeeyaTypography.caption)
                        .foregroundStyle(Color.seeyaTextTertiary)
                        .padding(.top, SeeyaSpacing.sm)

                    Spacer(minLength: SeeyaSpacing.xl)
                }
            }

            // Bottom buttons
            VStack(spacing: SeeyaSpacing.sm) {
                Button(action: onContinue) {
                    HStack {
                        Text("Let's Go")
                        Image(systemName: "arrow.right")
                    }
                }
                .buttonStyle(SeeyaPrimaryButtonStyle())

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
    OnboardingWelcomeView(
        onContinue: {},
        onSkip: {}
    )
    .background(Color.seeyaBackground)
}
