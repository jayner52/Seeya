import SwiftUI

struct OnboardingStepIndicator: View {
    let currentStep: OnboardingStep
    var onTap: ((OnboardingStep) -> Void)? = nil

    var body: some View {
        HStack(spacing: SeeyaSpacing.sm) {
            ForEach(OnboardingStep.allCases, id: \.rawValue) { step in
                stepLabel(for: step)
            }
        }
    }

    @ViewBuilder
    private func stepLabel(for step: OnboardingStep) -> some View {
        let isActive = step == currentStep
        let isPast = step.rawValue < currentStep.rawValue

        Button {
            onTap?(step)
        } label: {
            Text(step.title)
                .font(isActive ? SeeyaTypography.labelLarge : SeeyaTypography.labelMedium)
                .fontWeight(isActive ? .semibold : .regular)
                .foregroundStyle(isActive ? Color.seeyaTextPrimary : (isPast ? Color.seeyaTextSecondary : Color.seeyaTextTertiary))
        }
        .buttonStyle(.plain)
        .disabled(onTap == nil)
    }
}

#Preview {
    VStack(spacing: 30) {
        OnboardingStepIndicator(currentStep: .welcome)
        OnboardingStepIndicator(currentStep: .home)
        OnboardingStepIndicator(currentStep: .visited)
        OnboardingStepIndicator(currentStep: .wanderlist)
        OnboardingStepIndicator(currentStep: .tips)
    }
    .padding()
}
