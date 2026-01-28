import Foundation

/// Stores user selections during the onboarding flow
struct OnboardingData {
    var homeCity: String?
    var homeCityPlaceId: String?
    var visitedCountryIds: Set<UUID> = []
    var wanderlistCountryIds: Set<UUID> = []
}

/// Represents the current step in the onboarding flow
enum OnboardingStep: Int, CaseIterable {
    case welcome = 0
    case home = 1
    case visited = 2
    case wanderlist = 3
    case tips = 4

    var title: String {
        switch self {
        case .welcome: return "Welcome"
        case .home: return "Home"
        case .visited: return "Visited"
        case .wanderlist: return "Wanderlist"
        case .tips: return "Tips"
        }
    }

    var isFirst: Bool {
        self == .welcome
    }

    var isLast: Bool {
        self == .tips
    }

    var next: OnboardingStep? {
        OnboardingStep(rawValue: rawValue + 1)
    }

    var previous: OnboardingStep? {
        OnboardingStep(rawValue: rawValue - 1)
    }

    static var totalSteps: Int {
        allCases.count
    }
}
