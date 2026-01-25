import SwiftUI
import Supabase

struct MainTabView: View {
    @Bindable var authViewModel: AuthViewModel
    @State private var userEmail: String = "Loading..."

    var body: some View {
        TabView {
            Tab("Trips", systemImage: "airplane") {
                TripsView()
            }

            Tab("Friends", systemImage: "person.2") {
                NavigationStack {
                    Text("Friends Coming Soon")
                        .navigationTitle("Friends")
                }
            }

            Tab("Profile", systemImage: "person.circle") {
                NavigationStack {
                    VStack(spacing: 20) {
                        Image(systemName: "person.circle.fill")
                            .font(.system(size: 80))
                            .foregroundStyle(.secondary)

                        Text(userEmail)
                            .font(.headline)

                        Text("Profile Coming Soon")
                            .foregroundStyle(.secondary)

                        Spacer()

                        Button("Sign Out", role: .destructive) {
                            Task {
                                await authViewModel.signOut()
                            }
                        }
                        .buttonStyle(.bordered)
                        .padding(.bottom, 40)
                    }
                    .padding()
                    .navigationTitle("Profile")
                    .task {
                        await loadUserEmail()
                    }
                }
            }
        }
    }

    private func loadUserEmail() async {
        do {
            let session = try await SupabaseService.shared.client.auth.session
            userEmail = session.user.email ?? "No email"
        } catch {
            userEmail = "Not signed in"
        }
    }
}

#Preview {
    MainTabView(authViewModel: AuthViewModel())
}
