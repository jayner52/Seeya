import SwiftUI
import GoogleSignIn

@main
struct SeeyaApp: App {
    @State private var deepLinkManager = DeepLinkManager()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(deepLinkManager)
                .onOpenURL { url in
                    // Handle Google Sign-In callback
                    if GIDSignIn.sharedInstance.handle(url) {
                        return
                    }
                    // Handle other deep links
                    deepLinkManager.handleURL(url)
                }
                .sheet(isPresented: $deepLinkManager.showInviteReceivedView) {
                    if let code = deepLinkManager.pendingInviteCode {
                        InviteReceivedView(inviteCode: code) {
                            deepLinkManager.clearPendingInvite()
                        }
                    }
                }
        }
    }
}

// MARK: - Deep Link Manager

@Observable
@MainActor
final class DeepLinkManager {
    var pendingInviteCode: String?
    var showInviteReceivedView = false

    func handleURL(_ url: URL) {
        // Handle both custom scheme (seeya://) and Universal Links (https://)
        switch url.scheme {
        case "seeya":
            handleCustomScheme(url)
        case "https", "http":
            handleUniversalLink(url)
        default:
            print("⚠️ [DeepLink] Unknown scheme: \(url.scheme ?? "nil")")
        }
    }

    /// Handle custom URL scheme: seeya://invite/{code}
    private func handleCustomScheme(_ url: URL) {
        switch url.host {
        case "invite":
            extractAndHandleInviteCode(from: url)
        default:
            print("⚠️ [DeepLink] Unknown custom scheme URL: \(url)")
        }
    }

    /// Handle Universal Links: https://yourdomain.com/invite/{code}
    private func handleUniversalLink(_ url: URL) {
        // Check if this is our domain (handles both production and staging)
        guard let host = url.host,
              host.contains("seeya") || host.contains("vercel.app") else {
            print("⚠️ [DeepLink] Unknown domain: \(url.host ?? "nil")")
            return
        }

        // Parse the path: /invite/{code}
        let pathComponents = url.pathComponents.filter { $0 != "/" }

        if pathComponents.first == "invite" {
            extractAndHandleInviteCode(from: url)
        } else {
            print("⚠️ [DeepLink] Unknown universal link path: \(url.path)")
        }
    }

    /// Extract invite code from URL and show the invite received view
    private func extractAndHandleInviteCode(from url: URL) {
        let pathComponents = url.pathComponents.filter { $0 != "/" }

        // Get the code (last path component after "invite")
        if let inviteIndex = pathComponents.firstIndex(of: "invite"),
           inviteIndex + 1 < pathComponents.count {
            let code = pathComponents[inviteIndex + 1]
            pendingInviteCode = code
            showInviteReceivedView = true
            print("📬 [DeepLink] Received invite code: \(code)")
        } else if let code = pathComponents.last, code != "invite" {
            // Fallback: just take the last component
            pendingInviteCode = code
            showInviteReceivedView = true
            print("📬 [DeepLink] Received invite code (fallback): \(code)")
        }
    }

    func clearPendingInvite() {
        pendingInviteCode = nil
        showInviteReceivedView = false
    }
}
