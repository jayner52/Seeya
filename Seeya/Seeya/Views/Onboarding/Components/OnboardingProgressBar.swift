import SwiftUI

struct OnboardingProgressBar: View {
    let currentStep: OnboardingStep
    let totalSteps: Int

    private let completedColor = Color.seeyaPrimary  // Yellow
    private let currentColor = Color.seeyaPrimary    // Yellow (same as completed)
    private let upcomingColor = Color.gray.opacity(0.3)

    var body: some View {
        HStack(spacing: 4) {
            ForEach(0..<totalSteps, id: \.self) { index in
                segmentView(for: index)
            }
        }
        .frame(height: 4)
    }

    @ViewBuilder
    private func segmentView(for index: Int) -> some View {
        let stepValue = currentStep.rawValue

        RoundedRectangle(cornerRadius: 2)
            .fill(color(for: index, currentStepValue: stepValue))
            .animation(.easeInOut(duration: 0.2), value: currentStep)
    }

    private func color(for index: Int, currentStepValue: Int) -> Color {
        if index < currentStepValue {
            return completedColor
        } else if index == currentStepValue {
            return currentColor
        } else {
            return upcomingColor
        }
    }
}

#Preview {
    VStack(spacing: 20) {
        OnboardingProgressBar(currentStep: .welcome, totalSteps: 5)
        OnboardingProgressBar(currentStep: .home, totalSteps: 5)
        OnboardingProgressBar(currentStep: .visited, totalSteps: 5)
        OnboardingProgressBar(currentStep: .wanderlist, totalSteps: 5)
        OnboardingProgressBar(currentStep: .tips, totalSteps: 5)
    }
    .padding()
}
