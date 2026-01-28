import SwiftUI

struct ContentView: View {
    @State private var authViewModel = AuthViewModel()

    var body: some View {
        Group {
            if authViewModel.isLoading {
                ProgressView("Loading...")
            } else if authViewModel.isAuthenticated {
                if authViewModel.needsOnboarding {
                    OnboardingContainerView {
                        Task {
                            await authViewModel.completeOnboarding()
                        }
                    }
                } else {
                    MainTabView(authViewModel: authViewModel)
                }
            } else {
                LoginView(viewModel: authViewModel)
            }
        }
    }
}

#Preview {
    ContentView()
}
