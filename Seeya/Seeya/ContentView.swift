import SwiftUI

struct ContentView: View {
    @State private var authViewModel = AuthViewModel()

    var body: some View {
        Group {
            if authViewModel.isLoading {
                ProgressView("Loading...")
            } else if authViewModel.isAuthenticated {
                MainTabView(authViewModel: authViewModel)
            } else {
                LoginView(viewModel: authViewModel)
            }
        }
    }
}

#Preview {
    ContentView()
}
