import Foundation
import Supabase
import Auth
import GoogleSignIn
import CryptoKit

@Observable
@MainActor
final class AuthViewModel {
    var isAuthenticated = false
    var isLoading = true
    var errorMessage: String?
    var needsOnboarding = false
    var currentProfile: Profile?

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
                if session != nil {
                    await checkOnboardingStatus()
                }
                isLoading = false
            case .signedIn:
                isAuthenticated = true
                await checkOnboardingStatus()
            case .signedOut:
                isAuthenticated = false
                needsOnboarding = false
                currentProfile = nil
            default:
                break
            }
        }
    }

    func checkOnboardingStatus() async {
        do {
            let session = try await SupabaseService.shared.client.auth.session
            let userId = session.user.id

            let profiles: [Profile] = try await SupabaseService.shared.client
                .from("profiles")
                .select()
                .eq("id", value: userId.uuidString)
                .execute()
                .value

            currentProfile = profiles.first
            needsOnboarding = !(currentProfile?.onboardingCompleted ?? false)
            print("✅ [AuthViewModel] Onboarding status: \(needsOnboarding ? "needs onboarding" : "completed")")
        } catch {
            print("❌ [AuthViewModel] Error checking onboarding status: \(error)")
            // Default to not requiring onboarding if we can't check
            needsOnboarding = false
        }
    }

    func completeOnboarding() async {
        needsOnboarding = false
        await checkOnboardingStatus()
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

    // MARK: - Google Sign-In

    func signInWithGoogle() async {
        errorMessage = nil
        isLoading = true

        do {
            // Get the root view controller
            guard let windowScene = await UIApplication.shared.connectedScenes.first as? UIWindowScene,
                  let rootViewController = await windowScene.windows.first?.rootViewController else {
                errorMessage = "Unable to get root view controller"
                isLoading = false
                return
            }

            // Generate nonce for security
            let nonce = randomNonceString()
            let hashedNonce = sha256(nonce)

            // Configure Google Sign-In with iOS Client ID and Web Client ID (for Supabase)
            let config = GIDConfiguration(
                clientID: "174749214530-b47reag5hhqbt2l36ntmeiu6e5q78p3g.apps.googleusercontent.com",
                serverClientID: "174749214530-fj1a991jjhtr25ff7jlatvrouo6me6h2.apps.googleusercontent.com"
            )
            GIDSignIn.sharedInstance.configuration = config

            // Perform Google Sign-In with nonce
            let result = try await GIDSignIn.sharedInstance.signIn(
                withPresenting: rootViewController,
                hint: nil,
                additionalScopes: nil,
                nonce: hashedNonce
            )

            guard let idToken = result.user.idToken?.tokenString else {
                errorMessage = "Failed to get ID token from Google"
                isLoading = false
                return
            }

            let accessToken = result.user.accessToken.tokenString

            // Sign in to Supabase with Google credentials and nonce
            try await SupabaseService.shared.client.auth.signInWithIdToken(
                credentials: .init(
                    provider: .google,
                    idToken: idToken,
                    accessToken: accessToken,
                    nonce: nonce
                )
            )

            print("✅ [AuthViewModel] Google Sign-In successful")
        } catch {
            print("❌ [AuthViewModel] Google Sign-In error: \(error)")
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }

    // MARK: - Nonce Helpers

    private func randomNonceString(length: Int = 32) -> String {
        precondition(length > 0)
        var randomBytes = [UInt8](repeating: 0, count: length)
        let errorCode = SecRandomCopyBytes(kSecRandomDefault, randomBytes.count, &randomBytes)
        if errorCode != errSecSuccess {
            fatalError("Unable to generate nonce. SecRandomCopyBytes failed with OSStatus \(errorCode)")
        }
        let charset: [Character] = Array("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        let nonce = randomBytes.map { byte in
            charset[Int(byte) % charset.count]
        }
        return String(nonce)
    }

    private func sha256(_ input: String) -> String {
        let inputData = Data(input.utf8)
        let hashedData = SHA256.hash(data: inputData)
        let hashString = hashedData.compactMap {
            String(format: "%02x", $0)
        }.joined()
        return hashString
    }
}
