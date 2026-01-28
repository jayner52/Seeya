import SwiftUI

struct OnboardingBenefitCard: View {
    let icon: String
    let title: String
    let description: String
    var iconBackground: Color = .seeyaPurple.opacity(0.1)
    var iconColor: Color = .seeyaPurple

    var body: some View {
        HStack(spacing: SeeyaSpacing.md) {
            // Icon circle
            ZStack {
                Circle()
                    .fill(iconBackground)
                    .frame(width: 44, height: 44)

                Image(systemName: icon)
                    .font(.system(size: 18, weight: .medium))
                    .foregroundStyle(iconColor)
            }

            // Text content
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(SeeyaTypography.headlineSmall)
                    .foregroundStyle(Color.seeyaTextPrimary)

                Text(description)
                    .font(SeeyaTypography.bodySmall)
                    .foregroundStyle(Color.seeyaTextSecondary)
            }

            Spacer()
        }
        .padding(SeeyaSpacing.md)
        .background(Color.seeyaCardBackground)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

#Preview {
    VStack(spacing: 12) {
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
    .padding()
    .background(Color.seeyaBackground)
}
