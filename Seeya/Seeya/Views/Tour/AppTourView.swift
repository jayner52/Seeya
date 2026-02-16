import SwiftUI

// MARK: - Tour Step Data

struct TourStep: Identifiable {
    let id: Int
    let icon: String
    let title: String
    let description: String
}

// MARK: - App Tour View

struct AppTourView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var currentStep = 0
    let onComplete: () -> Void

    private let steps: [TourStep] = [
        TourStep(
            id: 0,
            icon: "airplane",
            title: "Your Trips",
            description: "Plan upcoming trips, log past adventures, and keep everything organized"
        ),
        TourStep(
            id: 1,
            icon: "sparkles",
            title: "Smart Planning",
            description: "AI-powered recommendations, booking parsing, and smart packing lists"
        ),
        TourStep(
            id: 2,
            icon: "person.2.fill",
            title: "Travel Circle",
            description: "Connect with friends, share recommendations, and plan together"
        ),
        TourStep(
            id: 3,
            icon: "globe",
            title: "Explore",
            description: "Discover new destinations with AI recommendations from your circle"
        ),
        TourStep(
            id: 4,
            icon: "calendar",
            title: "Stay Organized",
            description: "Calendar view, notifications, and trip chat keep everyone in sync"
        ),
    ]

    private var isLastStep: Bool {
        currentStep == steps.count - 1
    }

    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                colors: [
                    Color.seeyaPurple,
                    Color.seeyaPurple.opacity(0.8),
                    Color(red: 0.3, green: 0.15, blue: 0.55),
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 0) {
                // Skip button
                HStack {
                    Spacer()
                    if !isLastStep {
                        Button {
                            completeTour()
                        } label: {
                            Text("Skip")
                                .font(SeeyaTypography.bodyMedium)
                                .foregroundStyle(.white.opacity(0.8))
                                .padding(.horizontal, SeeyaSpacing.md)
                                .padding(.vertical, SeeyaSpacing.xs)
                        }
                    }
                }
                .padding(.horizontal, SeeyaSpacing.md)
                .padding(.top, SeeyaSpacing.sm)
                .frame(height: 44)

                Spacer()

                // Content card
                TabView(selection: $currentStep) {
                    ForEach(steps) { step in
                        tourStepCard(step: step)
                            .tag(step.id)
                    }
                }
                .tabViewStyle(.page(indexDisplayMode: .never))
                .animation(.easeInOut(duration: 0.3), value: currentStep)

                Spacer()

                // Step dots
                HStack(spacing: SeeyaSpacing.xs) {
                    ForEach(0..<steps.count, id: \.self) { index in
                        Circle()
                            .fill(index == currentStep ? Color.white : Color.white.opacity(0.4))
                            .frame(width: index == currentStep ? 10 : 8,
                                   height: index == currentStep ? 10 : 8)
                            .animation(.easeInOut(duration: 0.2), value: currentStep)
                    }
                }
                .padding(.bottom, SeeyaSpacing.lg)

                // Navigation buttons
                HStack(spacing: SeeyaSpacing.md) {
                    // Back button
                    if currentStep > 0 {
                        Button {
                            withAnimation {
                                currentStep -= 1
                            }
                        } label: {
                            HStack(spacing: SeeyaSpacing.xxs) {
                                Image(systemName: "chevron.left")
                                    .font(.system(size: SeeyaIconSize.small, weight: .semibold))
                                Text("Back")
                                    .font(SeeyaTypography.bodyMedium)
                            }
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(Color.white.opacity(0.2))
                            .clipShape(RoundedRectangle(cornerRadius: SeeyaRadius.button))
                        }
                    }

                    // Next / Get Started button
                    Button {
                        if isLastStep {
                            completeTour()
                        } else {
                            withAnimation {
                                currentStep += 1
                            }
                        }
                    } label: {
                        Text(isLastStep ? "Get Started" : "Next")
                            .font(SeeyaTypography.headlineMedium)
                            .foregroundStyle(Color.seeyaForeground)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 14)
                            .background(Color.seeyaPrimary)
                            .clipShape(RoundedRectangle(cornerRadius: SeeyaRadius.button))
                    }
                }
                .padding(.horizontal, SeeyaSpacing.lg)
                .padding(.bottom, SeeyaSpacing.xl)
            }
        }
    }

    // MARK: - Tour Step Card

    private func tourStepCard(step: TourStep) -> some View {
        VStack(spacing: SeeyaSpacing.lg) {
            // Icon
            ZStack {
                Circle()
                    .fill(Color.white.opacity(0.15))
                    .frame(width: 120, height: 120)

                Image(systemName: step.icon)
                    .font(.system(size: 52, weight: .medium))
                    .foregroundStyle(.white)
            }
            .padding(.bottom, SeeyaSpacing.sm)

            // Title
            Text(step.title)
                .font(SeeyaTypography.displayLarge)
                .foregroundStyle(.white)
                .multilineTextAlignment(.center)

            // Description
            Text(step.description)
                .font(SeeyaTypography.bodyLarge)
                .foregroundStyle(.white.opacity(0.85))
                .multilineTextAlignment(.center)
                .lineSpacing(4)
                .padding(.horizontal, SeeyaSpacing.xl)
        }
        .padding(.horizontal, SeeyaSpacing.lg)
    }

    // MARK: - Actions

    private func completeTour() {
        onComplete()
        dismiss()
    }
}

#Preview {
    AppTourView {
        print("Tour completed")
    }
}
