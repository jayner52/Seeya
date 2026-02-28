import SwiftUI

struct ContentView: View {
    @State private var authViewModel = AuthViewModel()
    @Environment(DeepLinkManager.self) private var deepLinkManager

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
        .onChange(of: authViewModel.isAuthenticated) { _, isAuthenticated in
            // Re-show invite sheet if user just logged in with a pending invite
            if isAuthenticated && deepLinkManager.pendingInviteCode != nil {
                deepLinkManager.showInviteReceivedView = true
            }
        }
    }
}

#Preview {
    ContentView()
}
