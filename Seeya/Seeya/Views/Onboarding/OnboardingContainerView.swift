import SwiftUI

struct OnboardingContainerView: View {
    @State private var viewModel = OnboardingViewModel()
    let onComplete: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            // Progress bar
            OnboardingProgressBar(
                currentStep: viewModel.currentStep,
                totalSteps: OnboardingStep.totalSteps
            )
            .padding(.horizontal)
            .padding(.top, SeeyaSpacing.md)

            // Step indicator
            OnboardingStepIndicator(
                currentStep: viewModel.currentStep
            )
            .padding(.top, SeeyaSpacing.sm)

            // Content
            stepContent
                .transition(.asymmetric(
                    insertion: .move(edge: .trailing).combined(with: .opacity),
                    removal: .move(edge: .leading).combined(with: .opacity)
                ))
                .animation(.easeInOut(duration: 0.3), value: viewModel.currentStep)
        }
        .background(Color.seeyaBackground)
        .task {
            await viewModel.fetchContinentsAndCountries()
        }
    }

    @ViewBuilder
    private var stepContent: some View {
        switch viewModel.currentStep {
        case .welcome:
            OnboardingWelcomeView(
                onContinue: {
                    viewModel.nextStep()
                },
                onSkip: {
                    Task {
                        if await viewModel.skipOnboarding() {
                            onComplete()
                        }
                    }
                }
            )

        case .home:
            OnboardingHomeView(
                viewModel: viewModel,
                onContinue: {
                    viewModel.nextStep()
                },
                onSkip: {
                    Task {
                        if await viewModel.skipOnboarding() {
                            onComplete()
                        }
                    }
                },
                onBack: {
                    viewModel.previousStep()
                }
            )

        case .visited:
            OnboardingVisitedView(
                viewModel: viewModel,
                onContinue: {
                    viewModel.nextStep()
                },
                onSkip: {
                    Task {
                        if await viewModel.skipOnboarding() {
                            onComplete()
                        }
                    }
                },
                onBack: {
                    viewModel.previousStep()
                }
            )

        case .wanderlist:
            OnboardingWanderlistView(
                viewModel: viewModel,
                onContinue: {
                    if viewModel.shouldShowTipsStep {
                        viewModel.nextStep()
                    } else {
                        finishOnboarding()
                    }
                },
                onSkip: {
                    Task {
                        if await viewModel.skipOnboarding() {
                            onComplete()
                        }
                    }
                },
                onBack: {
                    viewModel.previousStep()
                }
            )

        case .tips:
            OnboardingTipsView(
                viewModel: viewModel,
                onFinish: {
                    finishOnboarding()
                },
                onSkip: {
                    finishOnboarding()
                },
                onBack: {
                    viewModel.previousStep()
                }
            )
        }
    }

    private func finishOnboarding() {
        Task {
            if await viewModel.saveOnboardingData() {
                onComplete()
            }
        }
    }
}

#Preview {
    OnboardingContainerView(onComplete: {})
}
