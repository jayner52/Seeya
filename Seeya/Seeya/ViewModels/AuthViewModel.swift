import Foundation
import Supabase
import Auth

@Observable
@MainActor
final class AuthViewModel {
    var isAuthenticated = false
    var isLoading = true
    var errorMessage: String?

    private nonisolated(unsafe) var authStateTask: Task<Void, Never>?

    init() {
        authStateTask = Task {
            await listenToAuthState()
        }
    }

    deinit {
        authStateTask?.cancel()
    }

    private func listenToAuthState() async {
        for await (event, session) in SupabaseService.shared.client.auth.authStateChanges {
            switch event {
            case .initialSession:
                isAuthenticated = session != nil
                isLoading = false
            case .signedIn:
                isAuthenticated = true
            case .signedOut:
                isAuthenticated = false
            default:
                break
            }
        }
    }

    func signIn(email: String, password: String) async {
        errorMessage = nil
        isLoading = true

        do {
            try await SupabaseService.shared.client.auth.signIn(
                email: email,
                password: password
            )
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func signUp(email: String, password: String, fullName: String, username: String) async {
        errorMessage = nil
        isLoading = true

        do {
            try await SupabaseService.shared.client.auth.signUp(
                email: email,
                password: password,
                data: [
                    "full_name": .string(fullName),
                    "username": .string(username)
                ]
            )
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    func signOut() async {
        do {
            try await SupabaseService.shared.client.auth.signOut()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
